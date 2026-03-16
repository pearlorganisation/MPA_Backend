import mongoose from "mongoose";

const authorSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    affiliation: { type: String, trim: true },
  },
  { _id: false }
);

const manuscriptSchema = new mongoose.Schema(
  {
    manuscriptId: {
      type: String,
      unique: true,
      index: true,
      trim: true,
    },

    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    abstract: {
      type: String,
      required: true,
      trim: true,
    },

    keywords: [
      {
        type: String,
        trim: true,
      },
    ],

    authors: [authorSchema],

    files: {
      manuscriptFile: { type: String, default: null },
      coverLetter: { type: String, default: null },
      ethicalDeclaration: { type: String, default: null },
      aiReport: { type: String, default: null },
      figures: { type: String, default: null },
      tables: { type: String, default: null },
    },

    status: {
      type: String,
      enum: [
        "Submitted",
        "Editor Assigned",
        "Under Review",
        "Revision Required",
        "Accepted",
        "Rejected",
        "Published",
      ],
      default: "Submitted",
      index: true,
    },

    assignedEditor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    assignedReviewers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    rejectionFeedback: {
      type: String,
      default: "",
      trim: true,
    },

    revisionFeedback: {
      type: String,
      default: "",
      trim: true,
    },

    feedbackFile: {
      type: String,
      default: "",
    },

    isRevised: {
      type: Boolean,
      default: false,
    },

    acceptedAt: {
      type: Date,
      default: null,
    },

    publishDate: {
      type: Date,
      default: null,
      index: true,
    },

    publishedAt: {
      type: Date,
      default: null,
    },

    emailSentAt: {
      type: Date,
      default: null,
    },

    lastEmailError: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Important compound index for publish cron performance
manuscriptSchema.index({ status: 1, publishDate: 1, publishedAt: 1 });

const Manuscript = mongoose.model("Manuscript", manuscriptSchema);

export default Manuscript;