import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import User from "./src/Modules/user/user.model.js";

dotenv.config();

await mongoose.connect(process.env.MONGO_URI);

const createAdmin = async () => {
  try {
    const existing = await User.findOne({ email: "admin@gmail.com" });

    if (existing) {
      console.log("Admin already exists ✅");
      process.exit();
    }

    const hashedPassword = await bcrypt.hash("123456", 10);

    await User.create({
      name: "Master Admin",
      email: "admin@gmail.com",
      password: hashedPassword,
      role: "masterAdmin",
    });

    console.log("Master Admin Created ✅");
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

createAdmin();
