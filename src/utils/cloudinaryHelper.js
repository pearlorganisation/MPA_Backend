import dotenv from "dotenv";
dotenv.config();
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
export const deleteFromCloudinary = async (publicId, resourceType = "raw") => {
  if (!publicId) {
    console.log("❌ No publicId provided");
    return;
  }

  try {
    console.log("🧨 Deleting:", publicId);

    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });

    console.log("Cloudinary Response:", result);

    if (result.result === "ok") {
      console.log("✅ Deleted:", publicId);
    } else {
      console.log("⚠️ Not deleted:", result);
    }
  } catch (error) {
    console.error("❌ Delete error:", error);
  }
};