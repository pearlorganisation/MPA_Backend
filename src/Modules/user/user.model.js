import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
       required: true,
    },
    role: {
      type: String,
      enum: ["masterAdmin", "editor", "reviewer", "researcher"],
      default: "researcher",
    },
    isVerified:{
      type: Boolean,
      default: false,
    },
    verificationToken: String,
    resetPasswordToken: String,
    isBlocked: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
