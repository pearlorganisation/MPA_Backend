import sendEmail from "../../utils/sendEmail.js";
import Manuscript from "./manuscript.model.js";
import Review from "../review/review.model.js";
import User from "../user/user.model.js";
import { deleteFromCloudinary } from "../../utils/cloudinaryHelper.js";
import { buildEditorAssignmentEmail } from "../../utils/emailTemplates.js";
import { submitUrlToCopyleaks } from "../../utils/copyleaksService.js";
import {
  buildRejectionEmail,
  buildRevisionEmail,
  buildAcceptanceEmail,
  buildPublishedEmail,
  buildReviewerInvitationEmail,
  buildReviewerReReviewEmail,
  buildNewSubmissionEmail
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

  console.log("HEADERS:", req.headers);
  console.log("BODY:", req.body);
  console.log("FILES:", req.files);
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
    if (
      !req.body.title ||
      !req.body.abstract ||
      !req.body.authors ||
      !req.body.discipline ||
      !req.body.manuscriptType
    ) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing",
      });
    }

    // Generate manuscript id
    const count = await Manuscript.countDocuments();
    const mId = `MPA-${new Date().getFullYear()}-${1000 + count + 1}`;

    //  manuscript file URL (Cloudinary se)
    const manuscriptUrl =
      req.files?.manuscriptFile?.[0]?.path || null;

    //  Copyleaks call
    let scanId = null;
    if (manuscriptUrl) {
      scanId = await submitUrlToCopyleaks(manuscriptUrl);
    }

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
      scanId: scanId,
      plagiarismStatus: "pending",
      files: {
        manuscriptFile: req.files?.manuscriptFile
          ? {
            url: req.files.manuscriptFile[0].path,
            publicId: req.files.manuscriptFile[0].filename,
          }
          : null,

        coverLetter: req.files?.coverLetter
          ? {
            url: req.files.coverLetter[0].path,
            publicId: req.files.coverLetter[0].filename,
          }
          : null,

        ethicalDeclaration: req.files?.ethicalDeclaration
          ? {
            url: req.files.ethicalDeclaration[0].path,
            publicId: req.files.ethicalDeclaration[0].filename,
          }
          : null,

        aiReport: req.files?.aiReport
          ? {
            url: req.files.aiReport[0].path,
            publicId: req.files.aiReport[0].filename,
          }
          : null,

        tables: req.files?.tables
          ? {
            url: req.files.tables[0].path,
            publicId: req.files.tables[0].filename,
          }
          : null,

        figures: req.files?.figures
          ? req.files.figures.map(file => ({
            url: file.path,
            publicId: file.filename,
          }))
          : [],

        manuscriptImage: req.files?.manuscriptImage
          ? req.files.manuscriptImage[0].path
          : null,
      },
    });

    //Send Email to Admin if Any ManuScript Submitted
    const admin = await User.findOne({ role: "masterAdmin" });
    if (admin) {
      const html = buildNewSubmissionEmail(
        admin.name,
        mId,
        title,
        parsedAuthors[0]?.name || "Unknown Author"
      );

      sendEmail({
        email: admin.email,
        subject: `New Manuscript Submmited ${mId}`,
        html,
      })
    }

    res.status(201).json({
      success: true,
      message: "Manuscript Submitted",
      manuscriptId: mId,
      manuscript: newManuscript,
      scanId: scanId,
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

    if (["Published", "Rejected"].includes(manuscript.status)) {
      return res.status(400).json({
        success: false,
        message: `Action Denied: This manuscript has already been ${manuscript.status} and cannot be assigned to reviewers.`
      });
    }

    manuscript.assignedEditor = editorId;
    manuscript.status = "Editor Assigned";



    await manuscript.save();

    const editor = await User.findById(editorId);
    if (editor) {
      const admin = await User.findOne({ role: "masterAdmin" });
      const html = buildEditorAssignmentEmail(
        editor.name,
        manuscript.manuscriptId,
        manuscript.title,
        admin?.name
      );
      await sendEmail({
        email: editor.email,
        subject: `Editor Assignment: ${manuscript.manuscriptId}`,
        html,
      });
    }

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
    const { manuscriptId, status, feedback, publishDate } = req.body;
    const userRole = req.user.role;

    const file = req.file ? req.file.path : null;

    const manuscript = await Manuscript.findById(manuscriptId).populate(
      "submittedBy",
      "name email"
    );

    if (!manuscript) {
      return res.status(404).json({
        success: false,
        message: "Manuscript not found",
      });
    }

    //Gaurd if paper publish or reject then status cannot be change after that
    const finalizedStatus = ["Published", "Rejected"];
    if (finalizedStatus.includes(manuscript.status)) {
      return res.status(400).json({
        success: false,
        message: `Modification Denied: This manuscript is already ${manuscript.status} and cannot be updated.`,
      });
    }


    if (userRole === "editor") {

      if (status === "Revision Required") {
        manuscript.status = "Revision Required";
        manuscript.revisionFeedback = feedback || "";
        manuscript.isRevised = false;
        if (file) manuscript.feedbackFile = file;

        await manuscript.save();

        const researcher = manuscript.submittedBy;
        const revisionUrl = `${process.env.FRONTEND_URL}/revise-manuscript/${manuscript._id}`;
        const html = buildRevisionEmail(researcher.name, manuscript.manuscriptId, feedback, revisionUrl);

        sendEmail({
          email: researcher.email,
          subject: `Revision Required: ${manuscript.manuscriptId}`,
          html,
          attachments: file ? [{ filename: "Editor-Comments.pdf", path: file }] : [],
        }).catch(err => console.error("Email Error:", err));

        return res.status(200).json({
          success: true,
          message: "Revision request sent directly to the researcher.",
          manuscript,
        });

      } else {
        if (status === "Accepted") {
          const acceptRecommendationsCount = await Review.countDocuments({
            manuscriptId: manuscriptId,
            reviewStatus: "Completed",
            recommendation: "Accept",
          });

          if (acceptRecommendationsCount < 2) {
            return res.status(400).json({
              success: false,
              message: `Action Denied: Minimum 2 'Accept' recommendations required. (Current: ${acceptRecommendationsCount})`,
            });
          }
          manuscript.editorRecommendation = "Recommend Acceptance";
        }

        else if (status === "Rejected") {
          manuscript.editorRecommendation = "Recommend Rejection";
        }
        else {
          manuscript.editorRecommendation = "Recommend Revision";
        }

        manuscript.status = "Awaiting Admin Decision";
        manuscript.editorInternalComments = feedback;
        if (file) manuscript.feedbackFile = file;

        await manuscript.save();

        return res.status(200).json({
          success: true,
          message: "Recommendation sent to the Admin.",
          manuscript,
        });
      }
    }
    if (userRole === "masterAdmin") {

      if (["Accepted", "Published", "Approved"].includes(status)) {
        const acceptRecommendationsCount = await Review.countDocuments({
          manuscriptId: manuscriptId,
          reviewStatus: "Completed",
          recommendation: "Accept",
        });

        if (acceptRecommendationsCount < 2) {
          return res.status(400).json({
            success: false,
            message: "Action Denied: Minimum 2 'Accept' recommendations required.",
          });
        }
      }


      if (status === "Rejected") {
        manuscript.status = "Rejected";
        manuscript.rejectionFeedback = feedback || "";
      } else if (status === "Revision Required") {
        manuscript.status = "Revision Required";
        manuscript.revisionFeedback = feedback || "";
        manuscript.isRevised = false;

        const researcher = manuscript.submittedBy;

        const revisionUrl = `${process.env.FRONTEND_URL}/revise-manuscript/${manuscript._id}`;

        const html = buildRevisionEmail(
          researcher.name,
          manuscript.manuscriptId,
          feedback,
          revisionUrl
        );

        await sendEmail({
          email: researcher.email,
          subject: `Revision Required: ${manuscript.manuscriptId}`,
          html,
          attachments: file
            ? [{ filename: "Revision-Document.pdf", path: file }]
            : [],
        }).catch(err => console.error("EMAIL ERROR:", err))
      }

      else if (status === "Approved") {
        manuscript.status = "Approved";
        manuscript.acceptedAt = new Date();
      }

      else if (status === "Accepted") {
        if (!publishDate) return res.status(400).json({ success: false, message: "Publish date required" });
        manuscript.status = "Accepted";
        manuscript.acceptedAt = new Date();
        manuscript.publishDate = new Date(publishDate);
      } else if (status === "Published") {

        if (!["Accepted", "Approved"].includes(manuscript.status)) {
          return res.status(400).json({
            success: false,
            message: "Only approved/accepted manuscripts can be published",
          });
        }

        manuscript.status = "Published";
        manuscript.publishedAt = new Date();

        const { volume, issue, issueLabel } = getVolumeIssue(
          manuscript.publishDate || new Date()
        );

        const { paperSequence, paperNumber } =
          await generatePaperNumber(volume, issue);

        manuscript.volume = volume;
        manuscript.issue = issue;
        manuscript.issueLabel = issueLabel;
        manuscript.paperSequence = paperSequence;
        manuscript.paperNumber = paperNumber;
      }

      if (file) manuscript.feedbackFile = file;
      await manuscript.save();

      const researcher = manuscript.submittedBy;

      if (status === "Rejected") {
        const html = buildRejectionEmail(researcher.name, manuscript.manuscriptId, feedback);
        sendEmail({ email: researcher.email, subject: "Manuscript Update", html });
      } else if (status === "Accepted" || status === "Approved") {
        const html = buildAcceptanceEmail(
          researcher.name,
          manuscript.manuscriptId,
          status === "Accepted" ? manuscript.publishDate : null
        );

        sendEmail({
          email: researcher.email,
          subject: "Manuscript Accepted",
          html
        });
      } else if (status === "Published") {
        const articleUrl = `${process.env.FRONTEND_URL}/articles/${manuscript._id}`;
        const html = buildPublishedEmail(
          researcher.name,
          manuscript.manuscriptId,
          manuscript.publishedAt,
          manuscript.volume,
          manuscript.issue,
          manuscript.issueLabel,
          manuscript.paperNumber,
          articleUrl,

        );
        sendEmail({ email: researcher.email, subject: "Manuscript Published", html });
      }

      return res.status(200).json({
        success: true,
        message: `Status updated to ${status} and Researcher notified.`,
        manuscript,
      });
    }

    return res.status(403).json({ success: false, message: "Unauthorized" });

  } catch (error) {
    console.error("STATUS UPDATE ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};



export const assignReviewers = async (req, res) => {
  try {
    const { manuscriptId, reviewerIds } = req.body;

    // Check status before assigning
    const manuscriptCheck = await Manuscript.findById(manuscriptId);
    if (["Published", "Rejected"].includes(manuscriptCheck.status)) {
      return res.status(400).json({
        success: false,
        message: `Action Denied: This manuscript has already been ${manuscriptCheck.status} and cannot be assigned to reviewers.`
      });
    }

    if (!reviewerIds || reviewerIds.length < 0) {
      return res.status(400).json({
        success: false,
        message: "Minimum 2 reviewers are required",
      });
    }
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

          existingReview.invitationStatus = "Pending";
          existingReview.reviewStatus = "Pending";
          existingReview.recommendation = null;
          existingReview.scores = { originality: null, clarity: null, methodology: null, contribution: null };
          existingReview.commentsToAuthor = "";
          existingReview.commentsToEditor = "";
          existingReview.annotatedFile = null;

          await existingReview.save();

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
    const manuscript = await Manuscript.findById(req.params.id)
      .populate("submittedBy", "name affiliation email");

    if (!manuscript) {
      return res.status(404).json({ success: false, message: "Manuscript not found" });
    }

    //For views
    if (manuscript.status === "Published") {
      manuscript.views += 1;
      await manuscript.save();
    }

    // Logic: If it's published, anyone can see it. 
    // If not published, only the owner or admins can see it.
    if (manuscript.status !== "Published") {
      if (!req.user || (manuscript.submittedBy._id.toString() !== req.user._id.toString() && req.user.role === "researcher")) {
        return res.status(403).json({ success: false, message: "Not authorized to view this yet" });
      }
    }

    res.status(200).json({
      success: true,
      manuscript, // This key MUST match what your frontend expects
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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
        manuscript.files.manuscriptFile = {
          url: req.files.manuscriptFile[0].path,
          publicId: req.files.manuscriptFile[0].filename,
        };
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
      if (req.files.reviewChecklist) {
        manuscript.files.reviewChecklist = req.files.reviewChecklist[0].path;
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


//Get Publish Article For Website
export const getPublishedArticles = async (req, res) => {
  try {
    const { search, discipline, page = 1, limit = 10, type, year } = req.query;
    const skip = (page - 1) * limit;

    // 1. Logic for specialized sections (Home Page)
    if (type === "homepage") {
      const editorChoice = await Manuscript.find({ status: "Published", isEditorChoice: true })
        .limit(3)
        .sort({ publishedAt: -1 });

      const currentIssue = await Manuscript.find({ status: "Published" })
        .limit(6)
        .sort({ publishedAt: -1 });

      const mostViewed = await Manuscript.find({ status: "Published" })
        .limit(5)
        .sort({ views: -1 });

      return res.status(200).json({
        success: true,
        data: { editorChoice, currentIssue, mostViewed }
      });
    }

    // 2. Logic for "View All" / Search / Filter
    let query = { status: "Published" };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { keywords: { $regex: search, $options: "i" } },
        { abstract: { $regex: search, $options: "i" } },
        { "authors.name": { $regex: search, $options: "i" } }
      ];
    }

    if (year) {
      query.publishedAt = {
        $gte: new Date(`${year}-01-01`),
        $lte: new Date(`${year}-12-31`)
      };
    }

    if (discipline) {
      query.discipline = discipline;
    }

    const total = await Manuscript.countDocuments(query);
    const articles = await Manuscript.find(query)
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      articles,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPublishedYears = async (req, res) => {
  try {
    const years = await Manuscript.aggregate([
      {
        $match: { status: "Published", publishedAt: { $ne: null } }
      },
      {
        $group: {
          _id: { $year: "$publishedAt" }
        }
      },
      {
        $sort: { _id: -1 }
      }
    ]);

    const formattedYears = years.map(y => y._id);

    res.status(200).json({
      success: true,
      years: formattedYears
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: Edit Manuscript Details
export const editManuscriptByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, abstract, keywords, authors, discipline, manuscriptType } = req.body;

    const manuscript = await Manuscript.findById(id);
    if (!manuscript) {
      return res.status(404).json({ success: false, message: "Manuscript not found" });
    }

    // Parse authors if provided
    let parsedAuthors = manuscript.authors;
    if (authors) {
      try {
        parsedAuthors = JSON.parse(authors);
        if (!Array.isArray(parsedAuthors) || parsedAuthors.length < 1 || parsedAuthors.length > 15) {
          return res.status(400).json({ success: false, message: "Authors must be an array (1-15 authors)" });
        }
      } catch (err) {
        return res.status(400).json({ success: false, message: "Invalid authors format" });
      }
    }

    // Handle new file uploads (Replace old files if new ones are uploaded)
    const updatedFiles = { ...manuscript.files };
    if (req.files) {
      const fileFields = ["manuscriptFile", "ethicalDeclaration", "aiReport", "tables", "figures", "coverLetter"];

      for (const field of fileFields) {
        if (req.files[field]) {
          // Delete old file from Cloudinary
          if (updatedFiles[field]?.publicId) {
            await deleteFromCloudinary(updatedFiles[field].publicId);
          }

          updatedFiles[field] = {
            url: req.files[field][0].path,
            publicId: req.files[field][0].filename,
          };
        }
      }
    }

    // Update the document
    manuscript.title = title || manuscript.title;
    manuscript.abstract = abstract || manuscript.abstract;
    manuscript.discipline = discipline || manuscript.discipline;
    manuscript.manuscriptType = manuscriptType || manuscript.manuscriptType;
    manuscript.keywords = keywords ? keywords.split(",") : manuscript.keywords;
    manuscript.authors = parsedAuthors;
    manuscript.files = updatedFiles;

    await manuscript.save();

    res.status(200).json({
      success: true,
      message: "Manuscript updated successfully by Admin",
      manuscript,
    });
  } catch (error) {
    console.error("ADMIN EDIT ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin: Delete Manuscript Completely
export const deleteManuscriptByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const manuscript = await Manuscript.findById(id);

    if (!manuscript) {
      return res.status(404).json({ success: false, message: "Manuscript not found" });
    }

    // Delete all associated files from Cloudinary
    const fileFields = ["manuscriptFile", "ethicalDeclaration", "aiReport", "tables", "figures", "coverLetter"];
    for (const field of fileFields) {
      if (manuscript.files[field]) {
        const file = manuscript.files[field];

        if (file?.publicId) {
          await deleteFromCloudinary(file.publicId, "raw");
        }
      }
    }

    // Delete from Database
    await Manuscript.findByIdAndDelete(id);

    await Review.deleteMany({ manuscriptId: id });

    res.status(200).json({
      success: true,
      message: "Manuscript and associated files deleted successfully",
    });
  } catch (error) {
    console.error("ADMIN DELETE ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


// toggleEditorChoice
export const toggleEditorChoice = async (req, res) => {
  try {
    const manuscript = await Manuscript.findById(req.params.id);

    if (!manuscript) {
      return res.status(404).json({
        success: false,
        message: "Manuscript not found",
      });
    }

    if (manuscript.status !== "Published") {
      return res.status(400).json({
        success: false,
        message: "Only published manuscripts allowed",
      });
    }

    // Optional limit (max 3)
    if (!manuscript.isEditorChoice) {
      const count = await Manuscript.countDocuments({
        isEditorChoice: true,
        status: "Published",
      });

      if (count >= 3) {
        return res.status(400).json({
          success: false,
          message: "Max 3 Editor Choice allowed",
        });
      }
    }

    manuscript.isEditorChoice = !manuscript.isEditorChoice;

    await manuscript.save();

    res.status(200).json({
      success: true,
      manuscript,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getLatestPublished = async (req, res) => {
  try {
    const article = await Manuscript.findOne({
      status: "Published",
      publishedAt: { $ne: null }
    })
      .sort({ publishedAt: -1 });

    res.status(200).json({
      success: true,
      article,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};