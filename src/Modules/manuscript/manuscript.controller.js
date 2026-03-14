// import sendEmail from "../../utils/sendEmail.js";
// import Manuscript from "./manuscript.model.js";
// import Review from "../review/review.model.js";
// import User from "../user/user.model.js";

export const submitManuscript = async (req, res) => {
  try {
    if (!req.files?.manuscriptFile) {
      return res.status(400).json({
        success: false,
        message: "Manuscript file upload failed or too large",
      });
    }

    const { title, abstract, keywords, authors } = req.body;

    if (!title || !abstract || !authors) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing",
      });
    }

    const count = await Manuscript.countDocuments();
    const mId = `MPA-${new Date().getFullYear()}-${1000 + count + 1}`;

    const newManuscript = await Manuscript.create({
      manuscriptId: mId,
      title,
      abstract,
      keywords: keywords ? keywords.split(",") : [],
      authors: JSON.parse(authors),
      submittedBy: req.user._id,
      files: {
        manuscriptFile: req.files?.manuscriptFile ? req.files.manuscriptFile[0].path : null,
        ethicalDeclaration: req.files?.ethicalDeclaration ? req.files.ethicalDeclaration[0].path : null,
        aiReport: req.files?.aiReport ? req.files.aiReport[0].path : null,
        tables: req.files?.tables ? req.files.tables[0].path : null,
        figures: req.files?.figures ? req.files.figures[0].path : null,
        coverLetter: req.files?.coverLetter ? req.files.coverLetter[0].path : null,
      },
    });

    res.status(201).json({
      success: true,
      message: "Manuscript Submitted",
      manuscriptId: mId,
    });
  } catch (error) {
    console.error("FULL ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getMySubmissions = async (req, res) => {
  const submissions = await Manuscript.find({ submittedBy: req.user._id });
  res.status(200).json({ success: true, submissions });
};

export const getAllSubmissions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await Manuscript.countDocuments();

    const submissions = await Manuscript.find()
      .populate("submittedBy", "name email")
      .populate("assignedEditor", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      count: submissions.length,
      submissions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const assignEditor = async (req, res) => {
  try {
    const { manuscriptId, editorId } = req.body;

    const manuscript = await Manuscript.findById(manuscriptId);

    if (!manuscript) {
      return res.status(404).json({
        success: false,
        message: "Manuscript not found",
      });
    }

    manuscript.assignedEditor = editorId;
    manuscript.status = "Editor Assigned";

    await manuscript.save();

    res.status(200).json({
      success: true,
      message: "Editor Assigned Successfully",
      manuscript,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateSubmissionStatus = async (req, res) => {
  try {
    const { manuscriptId, status, feedback } = req.body;

    const file = req.file ? req.file.path : null;

    const manuscript = await Manuscript.findById(manuscriptId)
      .populate("submittedBy", "name email");

    if (!manuscript) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    manuscript.status = status;

    if (status === "Rejected") {
      manuscript.rejectionFeedback = feedback;

      if (file) {
        manuscript.feedbackFile = file;
      }
    }

    if (status === "Revision Required") {
      manuscript.revisionFeedback = feedback;
      manuscript.isRevised = false;

      if (file) {
        manuscript.feedbackFile = file;
      }
    }

    await manuscript.save();

    if (status === "Rejected") {
      const researcher = manuscript.submittedBy;

      const message = `
        <h2>Manuscript Rejected</h2>
        <p>Dear ${researcher.name},</p>
        <p>Your manuscript <b>${manuscript.manuscriptId}</b> has been rejected after editorial review.</p>
        <h3>Feedback:</h3>
        <p>${feedback || "No feedback provided."}</p>
        <br/><p>Thank you for submitting to our journal.</p>
        <p><b>Editorial Team</b></p>
      `;

      sendEmail({
        email: researcher.email,
        subject: "Manuscript Rejection Notification",
        html: message,
        attachments: file
          ? [
            {
              filename: "feedback-file",
              path: file,
            },
          ]
          : [],
      })
        .then(() => console.log(`✅ Rejection Email sent to ${researcher.email}`))
        .catch((err) => console.error(`❌ Rejection Email failed`, err));
    }

    if (status === "Revision Required") {
      const researcher = manuscript.submittedBy;

      const revisionUrl = `${process.env.FRONTEND_URL}/revise-manuscript/${manuscript._id}`;

      const message = `
        <h2>Action Required: Revisions for your Manuscript</h2>
        <p>Dear ${researcher.name},</p>
        <p>The editorial team has reviewed your manuscript <b>${manuscript.manuscriptId}</b>.</p>

        <div style="background-color:#f3f4f6;padding:15px;border-left:4px solid #F97316;margin:20px 0;">
          <h3 style="margin-top:0;color:#C2410C;">Editorial Feedback:</h3>
          <p style="white-space:pre-wrap;">${feedback}</p>
        </div>

        <p>Click below to upload revised files:</p>

        <a href="${revisionUrl}" 
        style="display:inline-block;padding:10px 20px;background:#F97316;color:white;text-decoration:none;border-radius:5px;">
        Revise Manuscript
        </a>

        <br/><br/>
        <p><b>Editorial Team</b></p>
      `;

      sendEmail({
        email: researcher.email,
        subject: `Revision Required: ${manuscript.manuscriptId}`,
        html: message,
        attachments: file
          ? [
            {
              filename: "revision-feedback",
              path: file,
            },
          ]
          : [],
      })
        .then(() => console.log(`✅ Revision Email sent to ${researcher.email}`))
        .catch((err) => console.error(`❌ Revision Email failed`, err));
    }

    res.status(200).json({
      success: true,
      message: `Status updated to ${status}`,
      manuscript,
    });

  } catch (error) {
    console.error("STATUS UPDATE ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const assignReviewers = async (req, res) => {
  try {
    const { manuscriptId, reviewerIds } = req.body;

    const manuscript = await Manuscript.findByIdAndUpdate(
      manuscriptId,
      { assignedReviewers: reviewerIds, status: "Under Review" },
      { new: true }
    );

    for (const rId of reviewerIds) {
      const existingReview = await Review.findOne({
        manuscriptId,
        reviewerId: rId,
      });

      if (!existingReview) {
        await Review.create({
          manuscriptId,
          reviewerId: rId,
          invitationStatus: "Pending",
        });

        const reviewer = await User.findById(rId);

        if (reviewer) {
          const message = `
            <h2>Reviewer Invitation</h2>
            <p>Dear ${reviewer.name},</p>
            <p>You have been assigned to review the manuscript: <b>${manuscript.title}</b>.</p>
            <p>Please login to your dashboard to Accept or Decline this request.</p>
          `;

          sendEmail({
            email: reviewer.email,
            subject: "New Manuscript Review Invitation",
            html: message,
          }).catch(console.error);
        }
      }
    }

    res.status(200).json({
      success: true,
      message: "Reviewers Assigned & Notified",
      manuscript,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAssignedToEditor = async (req, res) => {
  try {
    const manuscripts = await Manuscript.find({
      assignedEditor: req.user._id,
    })
      .populate("submittedBy", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: manuscripts.length,
      manuscripts,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getManuscriptById = async (req, res) => {
  try {
    const manuscript = await Manuscript.findById(req.params.id);

    if (!manuscript) {
      return res.status(404).json({
        success: false,
        message: "Manuscript not found",
      });
    }

    if (
      manuscript.submittedBy.toString() !== req.user._id.toString() &&
      req.user.role === "researcher"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      });
    }

    res.status(200).json({
      success: true,
      manuscript,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const reviseManuscript = async (req, res) => {
  try {
    const manuscript = await Manuscript.findById(req.params.id);

    if (!manuscript) {
      return res.status(404).json({
        success: false,
        message: "Manuscript not found",
      });
    }

    if (manuscript.submittedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to edit",
      });
    }

    if (req.files) {
      if (req.files.manuscriptFile)
        manuscript.files.manuscriptFile = req.files.manuscriptFile[0].path;

      if (req.files.coverLetter)
        manuscript.files.coverLetter = req.files.coverLetter[0].path;

      if (req.files.ethicalDeclaration)
        manuscript.files.ethicalDeclaration = req.files.ethicalDeclaration[0].path;

      if (req.files.aiReport)
        manuscript.files.aiReport = req.files.aiReport[0].path;

      if (req.files.figures)
        manuscript.files.figures = req.files.figures[0].path;

      if (req.files.tables)
        manuscript.files.tables = req.files.tables[0].path;
    }

    manuscript.status = "Submitted";
    manuscript.isRevised = true;

    await manuscript.save();

    res.status(200).json({
      success: true,
      message: "Revision submitted successfully",
      manuscript,
    });

  } catch (error) {
    console.error("REVISION ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};





import User from "../user/user.model.js";
import bcrypt from "bcryptjs";
import generateToken from "../../utils/generateToken.js";

// =============================
// SET YOUR REGISTRATION LIMIT
// =============================
// 1 => sirf 1 registration allowed
// 2 => sirf 2 registrations allowed
// 5 => sirf 5 registrations allowed
const REGISTRATION_LIMIT = 1;

// Public registration for Researcher
export const registerUser = async (req, res) => {
  try {
    const { name, email, password, affiliation } = req.body;

    if (!name || !email || !password || !affiliation) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    // Check existing email
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already exists.",
      });
    }

    // Check total allowed registrations
    const totalResearchers = await User.countDocuments({ role: "researcher" });

    if (totalResearchers >= REGISTRATION_LIMIT) {
      return res.status(403).json({
        success: false,
        code: "SECURITY_THRESHOLD_REACHED",
        message:
          "Registration blocked due to security threshold reached. Please contact the administrator.",
      });
    }

    // Hash password only when registration is allowed
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      affiliation,
      role: "researcher",
      isVerified: true, // verify email removed
    });

    return res.status(201).json({
      success: true,
      message: "Account created successfully. You can now log in.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        affiliation: user.affiliation,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Registration failed due to an internal security processing issue.",
    });
  }
};

// LOGIN
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked by admin.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        affiliation: user.affiliation,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Login failed. Please try again later.",
    });
  }
};

// CREATE USER (Only Master Admin)
export const createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      isVerified: true,
    });

    return res.status(201).json({
      success: true,
      message: "User Created Successfully",
      user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// BLOCK / UNBLOCK
export const toggleBlockUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.isBlocked = !user.isBlocked;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `User ${user.isBlocked ? "Blocked" : "Unblocked"} Successfully`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ASSIGN / UPDATE ROLE
export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const allowedRoles = ["editor", "reviewer", "researcher"];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    user.role = role;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "User role updated successfully",
      user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET CURRENT USER PROFILE
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET ALL USERS
export const getAllUsers = async (req, res) => {
  try {
    const user = await User.find({}).select("-password").sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: user.length,
      user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET ALL EDITORS
export const getAllEditors = async (req, res) => {
  try {
    const editors = await User.find({ role: "editor" }).select("-password");

    return res.status(200).json({
      success: true,
      count: editors.length,
      data: editors,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET ALL REVIEWERS
export const getAllReviewers = async (req, res) => {
  try {
    const reviewer = await User.find({ role: "reviewer" }).select("-password");

    return res.status(200).json({
      success: true,
      count: reviewer.length,
      data: reviewer,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};