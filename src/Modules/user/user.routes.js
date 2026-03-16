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
import passport from "passport";
import User from "./user.model.js";

 // adjust path if needed
import generateToken from "../../utils/generateToken.js";


const router = express.Router();

//Admin Login route
router.post("/login", loginUser);

// Only Master Admin Can Access
router.post("/create", protect, authorizeRoles("masterAdmin"),createUser);

//Get All Editor
router.get("/editors", protect, authorizeRoles("masterAdmin"),getAllEditors);

//Get All Reviewer
router.get("/reviewers", protect, authorizeRoles("masterAdmin","editor"),getAllReviewers);

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

//google auth routes

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
)

// router.get(
//   "/google/callback",
//   passport.authenticate("google", { session: false }),
//   (req, res) => {
//     const email = req.user.email;
     
//      const isExistingUser =

//     const token = jwt.sign(req.user, process.env.JWT_SECRET)

//     // Redirect to frontend with token
//     res.redirect(`${process.env.FRONTEND_URL}/login-success?token=${token}`)
//   }
// )

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  async (req, res) => {
    try {
      const { email, name } = req.user;

      // 1️⃣ Check if user already exists
      let user = await User.findOne({ email });

      // 2️⃣ If not exist → create new user
      if (!user) {
        user = await User.create({
          name,
          email,
          password: "google-oauth-user", // dummy password
          isVerified: true, // Google users are already verified
        });
      }

      // 3️⃣ Create token using user._id
     const token = generateToken(user._id);

      // 4️⃣ Redirect to frontend
      res.redirect(
        `${process.env.FRONTEND_URL}/login-success?token=${token}`
      );
      console.log("Google login successful", { email, name });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Google login failed" });
    }
  }
);


export default router;
