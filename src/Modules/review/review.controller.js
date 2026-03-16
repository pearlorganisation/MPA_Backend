import mongoose from "mongoose";
import Review from "./review.model.js";
import User from "../user/user.model.js";
// 1. Get all assigned papers for logged-in reviewer
export const getMyAssignments = async (req, res) => {
  try {
    const reviews = await Review.find({ reviewerId: req.user._id })
      .populate("manuscriptId", "manuscriptId title abstract status keywords")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Accept or Decline the Invitation
export const respondToInvitation = async (req, res) => {
  try {
    const { reviewId, status } = req.body;

    if (!["Accepted", "Declined"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const review = await Review.findOneAndUpdate(
      { _id: reviewId, reviewerId: req.user._id },
      { invitationStatus: status },
      { new: true }
    );

    if (!review) return res.status(404).json({ success: false, message: "Review assignment not found" });

    res.status(200).json({ success: true, message: `Invitation ${status} successfully`, review });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Submit the Full Review Form
export const submitReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { originality, clarity, methodology, contribution, commentsToAuthor, commentsToEditor, recommendation } = req.body;

    const review = await Review.findOne({ _id: id, reviewerId: req.user._id });

    if (!review) return res.status(404).json({ success: false, message: "Review not found" });
    if (review.invitationStatus !== "Accepted") {
      return res.status(400).json({ success: false, message: "You must accept the invitation first." });
    }

    // Update the review data
    review.scores = { originality, clarity, methodology, contribution };
    review.commentsToAuthor = commentsToAuthor;
    review.commentsToEditor = commentsToEditor;
    review.recommendation = recommendation;
    review.reviewStatus = "Completed";

    // Agar Reviewer ne koi annotated file upload ki hai
    if (req.file) {
      review.annotatedFile = req.file.path;
    }

    await review.save();

    res.status(200).json({ success: true, message: "Review submitted successfully", review });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// Admin can see all review tracking
export const getAllReviewTracking = async (req, res) => {
  try {
    const reviews = await Review.aggregate([
      { $lookup: { from: "manuscripts", localField: "manuscriptId", foreignField: "_id", as: "manuscript" } },
      { $unwind: "$manuscript" },
      { $lookup: { from: "users", localField: "reviewerId", foreignField: "_id", as: "reviewer" } },
      { $unwind: "$reviewer" },
      {
        $group: {
          _id: "$manuscriptId",
          manuscript: {
            $first: {
              _id: "$manuscript._id",
              manuscriptId: "$manuscript.manuscriptId",
              title: "$manuscript.title",
              status: "$manuscript.status"
            }
          },
          reviewers: {
            $push: {
              reviewId: "$_id",
              reviewerId: "$reviewer._id",
              name: "$reviewer.name",
              email: "$reviewer.email",
              invitationStatus: "$invitationStatus",
              reviewStatus: "$reviewStatus",
              recommendation: "$recommendation",
              scores: "$scores",
              commentsToAuthor: "$commentsToAuthor",
              commentsToEditor: "$commentsToEditor",
              annotatedFile: "$annotatedFile",
              updatedAt: "$updatedAt"
            }
          }
        }
      },
      { $sort: { "manuscript.manuscriptId": -1 } }
    ]);

    res.status(200).json({ success: true, reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};



// Admin: get eligible reviewers for a manuscript
export const getEligibleReviewersForManuscript = async (req, res) => {
  try {
    const { manuscriptId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(manuscriptId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid manuscript id",
      });
    }

    const existingReviews = await Review.find({ manuscriptId }).select(
      "reviewerId invitationStatus"
    );

    const blockedReviewerIds = existingReviews.map((item) => item.reviewerId);

    const reviewers = await User.find({
      role: "reviewer",
      _id: { $nin: blockedReviewerIds },
    })
      .select("_id name email")
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      reviewers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};