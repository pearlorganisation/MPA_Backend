import dotenv from "dotenv";
dotenv.config();

import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
        folder: "editorials",
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
    }),
});

const imageUpload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
});

export default imageUpload;