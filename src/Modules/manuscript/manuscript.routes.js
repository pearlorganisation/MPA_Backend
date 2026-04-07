import express from "express";
import { submitManuscript, getMySubmissions, getAllSubmissions, assignEditor, updateSubmissionStatus, assignReviewers, getAssignedToEditor, getManuscriptById, reviseManuscript, getPublishedArticles, editManuscriptByAdmin, deleteManuscriptByAdmin, toggleEditorChoice, getPublishedYears, getLatestPublished } from "./manuscript.controller.js";
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
  { name: 'aiReport', maxCount: 1 },
  { name: 'manuscriptImage', maxCount: 1 },
]), submitManuscript);

router.get("/browse", getPublishedArticles);

router.get("/published", getPublishedArticles);

router.get("/my-submissions", protect, getMySubmissions);

router.get("/admin/all", protect, authorizeRoles("masterAdmin"), getAllSubmissions);

router.put("/admin/assign-editor", protect, authorizeRoles("masterAdmin"), assignEditor);

router.get("/year", getPublishedYears)

router.get("/latest", getLatestPublished);

router.put(
  "/admin/update-status",
  protect,
  authorizeRoles("masterAdmin", "editor"),
  upload.single("feedbackFile"),
  updateSubmissionStatus
);
//assign reviewer route
router.put("/admin/assign-reviewers", protect, authorizeRoles("masterAdmin", "editor"), assignReviewers)

//Get the Manuscript assign by admin to editor
router.get(
  "/editor/assignments",
  protect,
  authorizeRoles("editor"),
  getAssignedToEditor
);


//Revise Route by ID
router.put("/revise/:id", protect, upload.fields([
  { name: 'manuscriptFile', maxCount: 1 },
  { name: 'coverLetter', maxCount: 1 },
  { name: 'figures', maxCount: 1 },
  { name: 'tables', maxCount: 1 },
  { name: 'ethicalDeclaration', maxCount: 1 },
  { name: 'reviewChecklist', maxCount: 1 },
]), reviseManuscript);

// Admin Edit Route
router.put(
  "/admin/edit/:id",
  protect,
  authorizeRoles("masterAdmin"),
  upload.fields([
    { name: "manuscriptFile", maxCount: 1 },
    { name: "coverLetter", maxCount: 1 },
    { name: "figures", maxCount: 1 },
    { name: "tables", maxCount: 1 },
    { name: "ethicalDeclaration", maxCount: 1 },
    { name: "aiReport", maxCount: 1 },
  ]),
  editManuscriptByAdmin
);

// Admin Delete Route
router.delete(
  "/admin/delete/:id",
  protect,
  authorizeRoles("masterAdmin"),
  deleteManuscriptByAdmin
);

router.get("/published/:id", getManuscriptById);
router.get("/:id", protect, getManuscriptById);

router.put("/admin/toggle-editor-choice/:id", protect, authorizeRoles("masterAdmin"), toggleEditorChoice)
export default router;