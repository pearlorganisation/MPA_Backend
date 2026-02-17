import mongoose from "mongoose";

const manuscriptSchema = new mongoose.Schema({
  manuscriptId: { type: String, unique: true },
  title: { type: String, required: true },
  abstract: { type: String, required: true },
  keywords: [String],
  authors: [{ name: String, email: String, affiliation: String }],
  
  files: {
    manuscriptFile: String, 
    coverLetter: String,
    ethicalDeclaration: String
  },
  
  status: {
    type: String,
    enum: ["Submitted", "Editor Assigned", "Under Review", "Revision Required", "Accepted", "Rejected", "Published"],
    default: "Submitted"
  },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

export default mongoose.model("Manuscript", manuscriptSchema);