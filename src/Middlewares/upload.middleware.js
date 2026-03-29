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
  cloudinary: cloudinary,
  params: async (req, file) => {
    const originalName = file.originalname;
    const lastDotIndex = originalName.lastIndexOf(".");

    const nameWithoutExt =
      lastDotIndex !== -1
        ? originalName.substring(0, lastDotIndex)
        : originalName;

    const ext = originalName.split(".").pop(); // ✅ EXTENSION nikal

    return {
      folder: "journal_manuscripts",
      resource_type: file.mimetype.startsWith("image/")
        ? "image"
        : "raw",
      public_id: `${nameWithoutExt}-${Date.now()}.${ext}`, // ✅ EXTENSION add
    };
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.oasis.opendocument.text",
    "image/jpeg",
    "image/png",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error("Invalid file type. Only PDF, DOC, DOCX, JPG, PNG allowed!"),
      false,
    );
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

export default upload;