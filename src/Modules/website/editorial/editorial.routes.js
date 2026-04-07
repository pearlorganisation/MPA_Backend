import express from "express";
import {
  createEditorial,
  getEditorials,
  updateEditorial,
  deleteEditorial,
  getTopLeaders,
} from "./editorial.controller.js";
import { protect } from "../../../Middlewares/auth.middleware.js";
import { authorizeRoles } from "../../../Middlewares/role.middleware.js";
import upload from "../../../Middlewares/upload.middleware.js";


const router = express.Router();

router.post("/", protect, authorizeRoles("masterAdmin"), upload.single("image"), createEditorial);
router.get("/", getEditorials);
router.get("/top-leaders", getTopLeaders);
router.put("/:id", protect, authorizeRoles("masterAdmin"), upload.single("image"), updateEditorial);
router.delete("/:id", protect, authorizeRoles("masterAdmin"), deleteEditorial);

export default router;