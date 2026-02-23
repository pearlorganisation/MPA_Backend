import express from "express";
import { submitManuscript, getMySubmissions, getAllSubmissions, assignEditor, updateSubmissionStatus } from "./manuscript.controller.js";
import { protect } from "../../Middlewares/auth.middleware.js";
import upload from "../../Middlewares/upload.middleware.js";
import { authorizeRoles } from "../../Middlewares/role.middleware.js";

const router = express.Router();

router.post("/submit", protect, upload.fields([
    { name: 'manuscriptFile', maxCount: 1 },
    { name: 'coverLetter', maxCount: 1 }
]), submitManuscript);

router.get("/my-submissions", protect, getMySubmissions);

router.get("/admin/all", protect, authorizeRoles("masterAdmin"),getAllSubmissions);

router.put("/admin/assign-editor", protect, authorizeRoles("masterAdmin"),assignEditor);

router.put("/admin/update-status", protect, authorizeRoles("masterAdmin"),updateSubmissionStatus);


export default router;