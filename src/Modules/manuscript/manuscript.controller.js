import sendEmail from "../../utils/sendEmail.js";
import Manuscript from "./manuscript.model.js";

export const submitManuscript = async (req, res) => {
  try {
    console.log("BODY:", req.body);
    console.log("FILES:", req.files);

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

    //  researcher info bhi fetch karenge
    const manuscript = await Manuscript.findById(manuscriptId)
      .populate("submittedBy", "name email");

    if (!manuscript) {
      return res.status(404).json({
        success: false,
        message: "Not found",
      });
    }

    // update status
    manuscript.status = status;

    if (status === "Rejected" && feedback) {
      manuscript.rejectionFeedback = feedback;
    }

    await manuscript.save();

    //  EMAIL SEND WHEN REJECTED
    if (status === "Rejected") {
      const researcher = manuscript.submittedBy;

      const message = `
        <h2>Manuscript Rejected</h2>

        <p>Dear ${researcher.name},</p>

        <p>Your manuscript <b>${manuscript.manuscriptId}</b>
        has been rejected after editorial review.</p>

        <h3>Feedback:</h3>
        <p>${feedback || "No feedback provided."}</p>

        <br/>
        <p>Thank you for submitting to our journal.</p>
        <p><b>Editorial Team</b></p>
      `;

      await sendEmail({
        email: researcher.email,
        subject: "Manuscript Rejection Notification",
        html: message,
      });
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
//Assign Review  By Admin
export const assignReviewers = async (req, res) => {
  try {
    const { manuscriptId, reviewerIds } = req.body; // array of IDs

    const manuscript = await Manuscript.findByIdAndUpdate(
      manuscriptId,
      {
        assignedReviewers: reviewerIds,
        status: "Under Review"
      },
      { new: true }
    );

    res.status(200).json({ success: true, message: "Reviewers Assigned", manuscript });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get manuscripts assigned to logged-in editor
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
