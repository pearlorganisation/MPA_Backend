import express from "express";
import { protect } from "../../Middlewares/auth.middleware.js";
import { authorizeRoles } from "../../Middlewares/role.middleware.js";
import upload from "../../Middlewares/upload.middleware.js";
import { getAllReviewTracking, getEligibleReviewersForManuscript, getMyAssignments, respondToInvitation, submitReview } from "./review.controller.js";

const router = express.Router();

// Get assignments for dashboard
router.get("/my-assignments", protect, authorizeRoles("reviewer"), getMyAssignments);

// Accept or Decline
router.put("/respond", protect, authorizeRoles("reviewer"), respondToInvitation);

// Submit Review Form (with optional file upload)
router.put("/submit/:id", protect, authorizeRoles("reviewer"), upload.single("annotatedFile"), submitReview);

// Admin review tracking
router.get(
    "/admin-review-tracking",
    protect,
    authorizeRoles("masterAdmin"),
    getAllReviewTracking
);

router.get(
    "/eligible-reviewers/:manuscriptId",
    protect,
    authorizeRoles("masterAdmin"),
    getEligibleReviewersForManuscript
);
export default router;