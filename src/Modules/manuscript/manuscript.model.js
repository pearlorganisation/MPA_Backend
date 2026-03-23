import mongoose from "mongoose";


const authorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },
    affiliation: {
      type: String,
      trim: true,
      maxlength: 200,
    },
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
    discipline: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    abstract: {
      type: String,
      required: true,
      trim: true,
    },

    manuscriptType: {
      type: String,
      enum: ["review", "response"],
       required: true,
    },

    keywords: [
      {
        type: String,
        trim: true,
      },
    ],

    authors: {
      type: [authorSchema],
      validate: [
        {
          validator: function (value) {
            return value.length >= 1;
          },
          message: "At least 1 author is required",
        },
        {
          validator: function (value) {
            return value.length <= 15;
          },
          message: "Maximum 15 authors allowed",
        },
      ],
    },

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
    volume: {
      type: Number,
      default: null,
    },

    issue: {
      type: Number,
      default: null,
    },

    issueLabel: {
      type: String,
      default: "",
    },

    paperSequence: {
      type: Number,
      default: null,
    },

    paperNumber: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

//Index for good performance of Assign volume and issue
manuscriptSchema.index({ volume: 1, issue: 1 });

// Important compound index for publish cron performance
manuscriptSchema.index({ status: 1, publishDate: 1, publishedAt: 1 });

const Manuscript = mongoose.model("Manuscript", manuscriptSchema);

export default Manuscript;