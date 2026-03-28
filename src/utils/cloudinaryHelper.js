import dotenv from "dotenv";
dotenv.config();
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
export const deleteFromCloudinary = async (fileUrl) => {
  if (!fileUrl) return;

  try {
    const urlParts = fileUrl.split("/upload/");
    
    if (urlParts.length > 1) {

      const pathParts = urlParts[1].split("/");
      pathParts.shift(); 
      const publicId = pathParts.join("/"); 
      let resourceType = "raw";
      if (fileUrl.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
        resourceType = "image";
      }

      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
      console.log(`✅ File deleted from Cloudinary: ${publicId}`);
    }
  } catch (error) {
    console.error("❌ Cloudinary deletion error:", error);
  }
};