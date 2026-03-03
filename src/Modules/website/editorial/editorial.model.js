import mongoose from "mongoose";

const editorialSchema = new mongoose.Schema(
  {
    /* ===== CATEGORY ===== */
    type: {
      type: String,
      enum: ["topLeader", "editor"],
      required: true,
    },

    /* ===== COMMON ===== */
    name: {
      type: String,
      required: true,
      trim: true,
    },

    role: {
      type: String,
      required: true,
      trim: true,
    },

    image: String,

    email: {
      type: String,
      required: true,
      lowercase: true,
    },

    linkedin: String,

    isActive: {
      type: Boolean,
      default: true,
    },

    /* ===== TOP LEADER ONLY ===== */
    bio: {
      type: String,
      required: function () {
        return this.type === "topLeader";
      },
    },

    /* ===== REGULAR EDITOR ONLY ===== */
    institution: {
      type: String,
      required: function () {
        return this.type === "editor";
      },
    },

    interests: {
      type: String,
      required: function () {
        return this.type === "editor";
      },
    },

    initials: String,
    profileLink: String,
  },
  { timestamps: true }
);

export default mongoose.model("Editorial", editorialSchema);