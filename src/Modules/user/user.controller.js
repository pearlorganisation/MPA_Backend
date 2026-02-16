import User from "./user.model.js";
import bcrypt from "bcryptjs";
import generateToken from "../../utils/generateToken.js";

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
