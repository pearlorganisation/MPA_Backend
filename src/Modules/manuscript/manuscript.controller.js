import sendEmail from "../../utils/sendEmail.js";
import Manuscript from "./manuscript.model.js";
import Review from "../review/review.model.js";
import User from "../user/user.model.js";
import {
  buildRejectionEmail,
  buildRevisionEmail,
  buildAcceptanceEmail,
  buildPublishedEmail,
  buildReviewerInvitationEmail,
  buildReviewerReReviewEmail
} from "../../utils/emailTemplates.js";

//  Volume + Issue calculate
const getVolumeIssue = (publishDate) => {
  const date = new Date(publishDate);

  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  const baseYear = 2026;
  const volume = year - baseYear + 1;

  let issue = 1;
  let issueLabel = "";

  if (month <= 3) {
    issue = 1;
    issueLabel = "Jan–Mar";
  } else if (month <= 6) {
    issue = 2;
    issueLabel = "Apr–Jun";
  } else if (month <= 9) {
    issue = 3;
    issueLabel = "Jul–Sep";
  } else {
    issue = 4;
    issueLabel = "Oct–Dec";
  }

  return { volume, issue, issueLabel };
};

//  Paper number generate
const generatePaperNumber = async (volume, issue) => {
  const count = await Manuscript.countDocuments({
    volume,
    issue,
    status: "Published",
  });

  const sequence = count + 1;

  return {
    paperSequence: sequence,
    paperNumber: `${volume}.${issue}.${sequence}`,
  };
};

// Submit new manuscript
export const submitManuscript = async (req, res) => {
  try {
    // Check required main file
    if (!req.files?.manuscriptFile) {
      return res.status(400).json({
        success: false,
        message: "Manuscript file upload failed or too large",
      });
    }

    const { title, abstract, keywords, authors, discipline, manuscriptType } = req.body;
    let parsedAuthors;

    try {
      parsedAuthors = JSON.parse(authors);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: "Invalid authors format (must be JSON)",
      });
    }

    // Must be array
    if (!Array.isArray(parsedAuthors)) {
      return res.status(400).json({
        success: false,
        message: "Authors must be an array",
      });
    }

    // Min / Max validation
    if (parsedAuthors.length < 1) {
      return res.status(400).json({
        success: false,
        message: "At least 1 author is required",
      });
    }

    if (parsedAuthors.length > 15) {
      return res.status(400).json({
        success: false,
        message: "Maximum 15 authors allowed",
      });
    }

    // Validate each author
    for (const author of parsedAuthors) {
      if (!author.name || !author.email) {
        return res.status(400).json({
          success: false,
          message: "Each author must have name and email",
        });
      }

      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(author.email)) {
        return res.status(400).json({
          success: false,
          message: `Invalid email for ${author.name}`,
        });
      }
    }

    // Duplicate email check
    const emails = parsedAuthors.map(a => a.email.toLowerCase());

    if (new Set(emails).size !== emails.length) {
      return res.status(400).json({
        success: false,
        message: "Duplicate author emails are not allowed",
      });
    }
    // Validate required fields
    if (!title || !abstract || !authors || !discipline || !manuscriptType) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing",
      });
    }

    // Generate manuscript id
    const count = await Manuscript.countDocuments();
    const mId = `MPA-${new Date().getFullYear()}-${1000 + count + 1}`;

    // Create manuscript
    const newManuscript = await Manuscript.create({
      manuscriptId: mId,
      title,
      discipline,
      abstract,
      manuscriptType,
      keywords: keywords ? keywords.split(",") : [],
      authors: parsedAuthors,
      submittedBy: req.user._id,
      files: {
        manuscriptFile: req.files?.manuscriptFile
          ? req.files.manuscriptFile[0].path
          : null,
        ethicalDeclaration: req.files?.ethicalDeclaration
          ? req.files.ethicalDeclaration[0].path
          : null,
        aiReport: req.files?.aiReport ? req.files.aiReport[0].path : null,
        tables: req.files?.tables ? req.files.tables[0].path : null,
        figures: req.files?.figures ? req.files.figures[0].path : null,
        coverLetter: req.files?.coverLetter
          ? req.files.coverLetter[0].path
          : null,
      },
    });

    res.status(201).json({
      success: true,
      message: "Manuscript Submitted",
      manuscriptId: mId,
      manuscript: newManuscript,
    });
  } catch (error) {
    console.error("FULL ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get submissions of logged-in researcher
export const getMySubmissions = async (req, res) => {
  try {
    const submissions = await Manuscript.find({ submittedBy: req.user._id });

    res.status(200).json({
      success: true,
      submissions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all submissions for admin with pagination
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

// Assign editor to manuscript
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

// Update final manuscript status
export const updateSubmissionStatus = async (req, res) => {
  try {
    const { manuscriptId, status, feedback, publishDate } = req.body;

    // Uploaded feedback file
    const file = req.file ? req.file.path : null;

    // --- NEW SECURITY CHECK FOR ACCEPT/PUBLISH ---
    // Check if the admin is trying to Accept or Publish the manuscript
    if (status === "Accepted" || status === "Published") {
      // Count how many reviewers gave the final recommendation of "Accept"
      const acceptRecommendationsCount = await Review.countDocuments({
        manuscriptId: manuscriptId,
        reviewStatus: "Completed",
        recommendation: "Accept",
      });

      // If less than 2 reviewers recommended "Accept", stop the process
      if (acceptRecommendationsCount < 2) {
        return res.status(400).json({
          success: false,
          message: "Action Denied: You need at least 2 'Accept' recommendations from reviewers to Accept or Publish this manuscript.",
        });
      }
    }
    // --- END OF SECURITY CHECK ---

    // Find manuscript with researcher info
    const manuscript = await Manuscript.findById(manuscriptId).populate(
      "submittedBy",
      "name email"
    );

    if (!manuscript) {
      return res.status(404).json({
        success: false,
        message: "Not found",
      });
    }

    // Reject manuscript
    if (status === "Rejected") {
      manuscript.status = "Rejected";
      manuscript.rejectionFeedback = feedback || "";

      if (file) {
        manuscript.feedbackFile = file;
      }
    }

    // Ask for revision
    if (status === "Revision Required") {
      manuscript.status = "Revision Required";
      manuscript.revisionFeedback = feedback || "";
      manuscript.isRevised = false;

      if (file) {
        manuscript.feedbackFile = file;
      }
    }

    // Accept manuscript and save publish date
    if (status === "Accepted") {
      if (!publishDate) {
        return res.status(400).json({
          success: false,
          message: "Publish date is required when accepting manuscript",
        });
      }

      const selectedPublishDate = new Date(publishDate);

      if (isNaN(selectedPublishDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid publish date",
        });
      }

      if (selectedPublishDate < new Date()) {
        return res.status(400).json({
          success: false,
          message: "Publish date cannot be in the past",
        });
      }

      manuscript.status = "Accepted";
      manuscript.acceptedAt = new Date();
      manuscript.publishDate = selectedPublishDate;
      manuscript.publishedAt = null;
    }

    // Publish manuscript immediately
    if (status === "Published") {
      manuscript.status = "Published";
      manuscript.publishedAt = new Date();

      if (!manuscript.publishDate) {
        manuscript.publishDate = new Date();
      }

      //  STEP 1: Volume & Issue
      const { volume, issue, issueLabel } = getVolumeIssue(manuscript.publishDate);

      //  STEP 2: Paper Number
      const { paperSequence, paperNumber } = await generatePaperNumber(volume, issue);

      //  SAVE
      manuscript.volume = volume;
      manuscript.issue = issue;
      manuscript.issueLabel = issueLabel;
      manuscript.paperSequence = paperSequence;
      manuscript.paperNumber = paperNumber;
    }

    await manuscript.save();

    // Send rejection email
    if (status === "Rejected") {
      const researcher = manuscript.submittedBy;
      const html = buildRejectionEmail(
        researcher.name,
        manuscript.manuscriptId,
        feedback
      );

      sendEmail({
        email: researcher.email,
        subject: "Manuscript Rejection Notification",
        html,
        attachments: file
          ? [{ filename: "feedback-file", path: file }]
          : [],
      })
        .then(() => console.log(`✅ Rejection Email sent to ${researcher.email}`))
        .catch((err) => console.error("❌ Rejection Email failed", err));
    }

    // Send revision required email
    if (status === "Revision Required") {
      const researcher = manuscript.submittedBy;

      const revisionUrl = `${process.env.FRONTEND_URL}/revise-manuscript/${manuscript._id}`;

      const html = buildRevisionEmail(
        researcher.name,
        manuscript.manuscriptId,
        feedback,
        revisionUrl
      );

      sendEmail({
        email: researcher.email,
        subject: `Revision Required: ${manuscript.manuscriptId}`,
        html,
        attachments: file
          ? [{ filename: "revision-feedback", path: file }]
          : [],
      })
        .then(() => console.log(`✅ Revision Email sent to ${researcher.email}`))
        .catch((err) => console.error("❌ Revision Email failed", err));
    }

    // Send acceptance email with scheduled publish date
    if (status === "Accepted") {
      const researcher = manuscript.submittedBy;
      const html = buildAcceptanceEmail(
        researcher.name,
        manuscript.manuscriptId,
        manuscript.publishDate
      );

      sendEmail({
        email: researcher.email,
        subject: `Manuscript Accepted: ${manuscript.manuscriptId}`,
        html,
      })
        .then(() => console.log(`✅ Acceptance Email sent to ${researcher.email}`))
        .catch((err) => console.error("❌ Acceptance Email failed", err));
    }

    // Send publication email
    if (status === "Published") {
      const researcher = manuscript.submittedBy;
      const html = buildPublishedEmail(
        researcher.name,
        manuscript.manuscriptId,
        manuscript.publishedAt
      );

      sendEmail({
        email: researcher.email,
        subject: `Manuscript Published: ${manuscript.manuscriptId}`,
        html,
      })
        .then(() =>
          console.log(`✅ Publication Email sent to ${researcher.email}`)
        )
        .catch((err) => console.error("❌ Publication Email failed", err));
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

// Assign reviewers to manuscript
export const assignReviewers = async (req, res) => {
  try {
    const { manuscriptId, reviewerIds } = req.body;
    if (!reviewerIds || reviewerIds.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Minimum 2 reviewers are required",
      });
    }

    // BUG FIX: Using $addToSet prevents overwriting existing assigned reviewers
    const manuscript = await Manuscript.findByIdAndUpdate(
      manuscriptId,
      {
        $addToSet: { assignedReviewers: { $each: reviewerIds } },
        status: "Under Review"
      },
      { new: true }
    );

    if (!manuscript) {
      return res.status(404).json({
        success: false,
        message: "Manuscript not found",
      });
    }

    for (const rId of reviewerIds) {
      const existingReview = await Review.findOne({
        manuscriptId,
        reviewerId: rId,
      });

      if (!existingReview) {
        // CASE 1: Completely New Reviewer
        await Review.create({
          manuscriptId,
          reviewerId: rId,
          invitationStatus: "Pending",
        });

        const reviewer = await User.findById(rId);

        if (reviewer) {
          const html = buildReviewerInvitationEmail(
            reviewer.name,
            manuscript.title
          );

          sendEmail({
            email: reviewer.email,
            subject: "New Manuscript Review Invitation",
            html,
          }).catch(console.error);
        }
      } else {
        // CASE 2: Iterative Review (Re-assigning for the next round)
        if (existingReview.reviewStatus === "Completed") {

          // Step A: Save old review to history
          existingReview.history = existingReview.history || [];
          existingReview.history.push({
            scores: existingReview.scores,
            commentsToAuthor: existingReview.commentsToAuthor,
            commentsToEditor: existingReview.commentsToEditor,
            annotatedFile: existingReview.annotatedFile,
            recommendation: existingReview.recommendation,
            reviewedAt: existingReview.updatedAt
          });

          // Step B: Reset status so they can review the new files
          existingReview.invitationStatus = "Pending";
          existingReview.reviewStatus = "Pending";
          existingReview.recommendation = null;
          existingReview.scores = { originality: null, clarity: null, methodology: null, contribution: null };
          existingReview.commentsToAuthor = "";
          existingReview.commentsToEditor = "";
          existingReview.annotatedFile = null;

          await existingReview.save();

          // Step C: Send specific email for Re-review
          const reviewer = await User.findById(rId);
          if (reviewer) {
            const html = buildReviewerReReviewEmail(
              reviewer.name,
              manuscript.title
            );

            sendEmail({
              email: reviewer.email,
              subject: "Revised Manuscript Review Request",
              html,
            }).catch(console.error);
          }
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

// Get single manuscript by id
export const getManuscriptById = async (req, res) => {
  try {
    const manuscript = await Manuscript.findById(req.params.id);

    if (!manuscript) {
      return res.status(404).json({
        success: false,
        message: "Manuscript not found",
      });
    }

    // Researcher can only access own manuscript
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

// Submit revised manuscript
export const reviseManuscript = async (req, res) => {
  try {
    const manuscript = await Manuscript.findById(req.params.id);

    if (!manuscript) {
      return res.status(404).json({
        success: false,
        message: "Manuscript not found",
      });
    }

    // Only owner can revise manuscript
    if (manuscript.submittedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to edit",
      });
    }

    // Update uploaded files if present
    if (req.files) {
      if (req.files.manuscriptFile) {
        manuscript.files.manuscriptFile = req.files.manuscriptFile[0].path;
      }

      if (req.files.coverLetter) {
        manuscript.files.coverLetter = req.files.coverLetter[0].path;
      }

      if (req.files.ethicalDeclaration) {
        manuscript.files.ethicalDeclaration =
          req.files.ethicalDeclaration[0].path;
      }

      if (req.files.aiReport) {
        manuscript.files.aiReport = req.files.aiReport[0].path;
      }

      if (req.files.figures) {
        manuscript.files.figures = req.files.figures[0].path;
      }

      if (req.files.tables) {
        manuscript.files.tables = req.files.tables[0].path;
      }
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


// Get only published articles for the public website
// export const getPublishedArticles = async (req, res) => {
//   try {
//     const articles = await Manuscript.find({ status: "Published" })
//       .populate("submittedBy", "name affiliation") // Optional: include author info
//       .sort({ publishedAt: -1 });

//     res.status(200).json({
//       success: true,
//       count: articles.length,
//       articles,
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// };


export const getPublishedArticles = async (req, res) => {
  try {
    const { search } = req.query;

    let query = { status: "Published" };

    // ✅ Add search condition if search exists
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { keywords: { $regex: search, $options: "i" } },
        { abstract: { $regex: search, $options: "i" } }, // optional
      ];
    }

    const articles = await Manuscript.find(query)
      .populate("submittedBy", "name affiliation")
      .sort({ publishedAt: -1 });

    res.status(200).json({
      success: true,
      count: articles.length,
      articles,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};