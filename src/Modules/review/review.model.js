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
      default: "Pending", 
    },
    reviewStatus: {
      type: String,
      enum: ["Pending", "Completed"],
      default: "Pending", 
    },
    scores: {
      originality: { type: Number, min: 1, max: 5 },
      clarity: { type: Number, min: 1, max: 5 },
      methodology: { type: Number, min: 1, max: 5 },
      contribution: { type: Number, min: 1, max: 5 },
    },
    commentsToAuthor: { type: String, default: "" },
    commentsToEditor: { type: String, default: "" }, 
    annotatedFile: { type: String, default: null }, 
    recommendation: {
      type: String,
      enum: ["Accept", "Minor revisions", "Major revisions", "Reject", null],
      default: null,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Review", reviewSchema);