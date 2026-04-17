import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import User from "./src/Modules/user/user.model.js";

dotenv.config();

await mongoose.connect(process.env.MONGO_URI);

const createAdmin = async () => {
  try {
    const existing = await User.findOne({ email: "mpaadmin@mparesearch.com" });

    if (existing) {
      console.log("Admin already exists ✅");
      process.exit();
    }

    const hashedPassword = await bcrypt.hash("mpaadmin@2005", 10);

    await User.create({
      name: "Master Admin",
      email: "mpaadmin@mparesearch.com",
      password: hashedPassword,
      role: "masterAdmin",
      isVerified: true,
    });

    console.log("Master Admin Created ✅");
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

createAdmin();
