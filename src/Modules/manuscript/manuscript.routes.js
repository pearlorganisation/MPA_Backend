import express from "express";
import { submitManuscript, getMySubmissions } from "./manuscript.controller.js";
import { protect } from "../../Middlewares/auth.middleware.js";
import upload from "../../Middlewares/upload.middleware.js";

const router = express.Router();

router.post("/submit", protect, upload.fields([
    { name: 'manuscriptFile', maxCount: 1 },
    { name: 'coverLetter', maxCount: 1 }
]), submitManuscript);

router.get("/my-submissions", protect, getMySubmissions);

export default router;