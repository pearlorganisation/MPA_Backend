import express from "express";
import { createEnquiry, getEnquiries, deleteEnquiry } from "./enquiry.controller.js";

const router = express.Router();

router.post("/send", createEnquiry); 
router.get("/", getEnquiries); 
router.delete("/:id", deleteEnquiry);

export default router;