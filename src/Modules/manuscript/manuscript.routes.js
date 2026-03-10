import express from "express";
import { submitManuscript, getMySubmissions, getAllSubmissions, assignEditor, updateSubmissionStatus, assignReviewers, getAssignedToEditor, getManuscriptById, reviseManuscript } from "./manuscript.controller.js";
import { protect } from "../../Middlewares/auth.middleware.js";
import upload from "../../Middlewares/upload.middleware.js";
import { authorizeRoles } from "../../Middlewares/role.middleware.js";

const router = express.Router();

router.post("/submit", protect, upload.fields([
  { name: 'manuscriptFile', maxCount: 1 },
  { name: 'coverLetter', maxCount: 1 },
  { name: 'figures', maxCount: 1 },
  { name: 'tables', maxCount: 1 },
  { name: 'ethicalDeclaration', maxCount: 1 },
  { name: 'aiReport', maxCount: 1 }
]), submitManuscript);

router.get("/my-submissions", protect, getMySubmissions);

router.get("/admin/all", protect, authorizeRoles("masterAdmin"), getAllSubmissions);

router.put("/admin/assign-editor", protect, authorizeRoles("masterAdmin"), assignEditor);

router.put("/admin/update-status", protect, authorizeRoles("masterAdmin", "editor"), updateSubmissionStatus);

//assign reviewer route
router.put("/admin/assign-reviewers", protect, authorizeRoles("masterAdmin", "editor"), assignReviewers)

//Get the Manuscript assign by admin to editor
router.get(
  "/editor/assignments",
  protect,
  authorizeRoles("editor"),
  getAssignedToEditor
);
// Revision Routes
router.get("/:id", protect, getManuscriptById);

//Revise Route by ID
router.put("/revise/:id", protect, upload.fields([
  { name: 'manuscriptFile', maxCount: 1 },
  { name: 'coverLetter', maxCount: 1 },
  { name: 'figures', maxCount: 1 },
  { name: 'tables', maxCount: 1 },
  { name: 'ethicalDeclaration', maxCount: 1 },
  { name: 'ethicalDeclaration', maxCount: 1 }
]), reviseManuscript);
export default router;