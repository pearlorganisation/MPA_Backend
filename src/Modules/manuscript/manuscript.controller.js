import sendEmail from "../../utils/sendEmail.js";
import Manuscript from "./manuscript.model.js";
import Review from "../review/review.model.js";
import User from "../user/user.model.js";

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