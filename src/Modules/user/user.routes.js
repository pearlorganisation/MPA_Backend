import express from "express";
import {
  createUser,
  getAllEditors,
  getAllReviewers,
  getAllUsers,
  getMe,
  loginUser,
  registerUser,
  toggleBlockUser,
  updateUserRole,
  verifyEmail,
} from "./user.controller.js";
import { protect } from "../../Middlewares/auth.middleware.js";
import { authorizeRoles } from "../../Middlewares/role.middleware.js";

const router = express.Router();

//Admin Login route
router.post("/login", loginUser);

// Only Master Admin Can Access
router.post("/create", protect, authorizeRoles("masterAdmin"),createUser);

//Get All Editor
router.get("/editors", protect, authorizeRoles("masterAdmin"),getAllEditors);

//Get All Reviewer
router.get("/reviewers", protect, authorizeRoles("masterAdmin"),getAllReviewers);

router.put(
  "/block/:id",
  protect,
  authorizeRoles("masterAdmin"),
  toggleBlockUser,
);

router.put(
  "/assign-role/:id",
  protect,
  authorizeRoles("masterAdmin"),
  updateUserRole,
);

router.get("/all", protect, authorizeRoles("masterAdmin"), getAllUsers);
router.get("/me", protect, getMe);

router.post("/register", registerUser);
router.get("/verify-email/:token", verifyEmail);

export default router;
