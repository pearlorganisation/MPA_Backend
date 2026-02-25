import mongoose from "mongoose";

const manuscriptSchema = new mongoose.Schema(
  {
    manuscriptId: { type: String, unique: true },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    title: { type: String, required: true },
    abstract: { type: String, required: true },
    keywords: [String, ],
    authors: [{ name: String, email: String, affiliation: String }],

    files: {
      manuscriptFile: String,
      coverLetter: String,
      ethicalDeclaration: String,
      figures: String,
      tables: String,
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
    },

    assignedEditor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Manuscript", manuscriptSchema);
