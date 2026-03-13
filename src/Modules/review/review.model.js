import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    manuscriptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Manuscript",
      required: true,
    },
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    invitationStatus: {
      type: String,
      enum: ["Pending", "Accepted", "Declined"],
      default: "Pending", // Default pending rahega jab editor assign karega
    },
    reviewStatus: {
      type: String,
      enum: ["Pending", "Completed"],
      default: "Pending", // Form submit hone ke baad Completed hoga
    },
    // Structured Review Form Data
    scores: {
      originality: { type: Number, min: 1, max: 5 },
      clarity: { type: Number, min: 1, max: 5 },
      methodology: { type: Number, min: 1, max: 5 },
      contribution: { type: Number, min: 1, max: 5 },
    },
    commentsToAuthor: { type: String, default: "" },
    commentsToEditor: { type: String, default: "" }, // Confidential
    annotatedFile: { type: String, default: null }, // Agar reviewer PDF me mistakes mark karke upload kare
    recommendation: {
      type: String,
      enum: ["Accept", "Minor revisions", "Major revisions", "Reject", null],
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Review", reviewSchema);