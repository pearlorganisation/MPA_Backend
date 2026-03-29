import User from "./user.model.js";
import bcrypt from "bcryptjs";
import generateToken from "../../utils/generateToken.js";
import crypto from "crypto";
import sendEmail from "../../utils/sendEmail.js";

//Public registration for Researcher
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, affiliation } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate Verification Token
    const verificationToken = crypto.randomBytes(32).toString("hex");

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      affiliation,
      role: "researcher", // Default role
      verificationToken,
    });

    // Send Email Logic
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;
    const message = `<h1>Email Verification</h1>
                     <p>Please click the link below to verify your account:</p>
                     <a href="${verificationUrl}">${verificationUrl}</a>`;

    try {
      await sendEmail({
        email: user.email,
        subject: "Verify your Journal Account",
        html: message,
      });
      res.status(201).json({
        success: true,
        message:
          "Registration successful. Please check your email to verify account.",
      });
    } catch (err) {
      console.log("EMAIL ERROR:", err);
      user.verificationToken = undefined;
      await user.save();
      return res
        .status(500)
        .json({ message: "Email could not be sent, but user registered." });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//Verify Email

export const verifyEmail = async (req, res) => {
  try {
    const user = await User.findOne({ verificationToken: req.params.token });

    if (!user)
      return res.status(400).json({ message: "Invalid or expired token" });

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Email verified successfully. You can now login.",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// LOGIN
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user)
      return res.status(400).json({ message: "Invalid Email or Password" });

    if (user.isBlocked)
      return res.status(403).json({ message: "User is Blocked" });

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch)
      return res.status(400).json({ message: "Invalid Email or Password" });

    if (!user.isVerified) {
      return res.status(403).json({
        message: "Please verify your email before logging in.",
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// CREATE USER (Only Master Admin)
export const createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      isVerified: true,
    });

    res.status(201).json({
      success: true,
      message: "User Created Successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// BLOCK / UNBLOCK
export const toggleBlockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    user.isBlocked = !user.isBlocked;
    await user.save();

    res.json({
      success: true,
      message: `User ${user.isBlocked ? "Blocked" : "Unblocked"} Successfully`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ASSIGN / UPDATE ROLE (Master Admin Only)
export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) return res.status(404).json({ message: "User not found" });

    // Role validation (extra safety)
    const allowedRoles = ["editor", "reviewer", "researcher"];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    user.role = role;
    await user.save();

    res.status(200).json({
      success: true,
      message: "User role updated successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET CURRENT USER PROFILE
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, email, affiliation, password } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }
    }

    user.name = name || user.name;
    user.email = email || user.email;
    user.affiliation = affiliation || user.affiliation;

    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        affiliation: updatedUser.affiliation,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//Get All User
export const getAllUsers = async (req, res) => {
  try {
    const user = await User.find({})
      .select("-password")
      .sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: user.length,
      user,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

//Get All Editor
export const getAllEditors = async (req, res) => {
  try {
    const editors = await User.find({ role: "editor" }).select("-password");
    res.status(200)
      .json({
        success: true,
        count: editors.length,
        data: editors,
      })
  }
  catch (error) {
    res.status(500).json({
      message: error.message
    })
  }
}

//Get All Reviewer
export const getAllReviewers = async (req, res) => {
  try {
    const reviewer = await User.find({ role: "reviewer" }).select("-password");
    res.status(200).json({
      success: true,
      count: reviewer.length,
      data: reviewer,
    })
  }
  catch (error) {
    return res.status(500)
      .json({
        message: error.message
      })
  }
}

//Delete A User
export const deleteUser= async (req,res)=> {
  try{
    const user=await User.findById(req.params.id);
    if(!user)
    {
      return res.status(404)
      .json({message:"User not Found"});
    }
    if(user.role === "masterAdmin")
    {
      return res.status(400)
      .json({message:"Cannot Delete Master Admin"});
    }

    await user.deleteOne();

    res.status(200)
    .json({
      success:true,
      message:"User Deleted Successfully",
    })
  }
  catch(error)
  {
    res.status(500)
    .json({message:error.message});
  }
}
