import express from "express";
import {
  createUser,
  getAllUsers,
  getMe,
  loginUser,
  toggleBlockUser,
  updateUserRole,
} from "./user.controller.js";
import { protect } from "../../Middlewares/auth.middleware.js";
import { authorizeRoles } from "../../Middlewares/role.middleware.js";

const router = express.Router();

//Admin Login
router.post("/login",loginUser)

// Only Master Admin Can Access
router.post(
  "/create",
  protect,
  authorizeRoles("masterAdmin"),
  createUser
);

router.put(
  "/block/:id",
  protect,
  authorizeRoles("masterAdmin"),
  toggleBlockUser
);

router.put(
  "/assign-role/:id",
  protect,
  authorizeRoles("masterAdmin"),
  updateUserRole
);

router.get("/all",protect,authorizeRoles("masterAdmin"),getAllUsers)
router.get("/me",protect,getMe)


export default router;
