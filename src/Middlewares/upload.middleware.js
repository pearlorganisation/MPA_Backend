// import dotenv from "dotenv";
// dotenv.config();
// import { v2 as cloudinary } from "cloudinary";
// import { CloudinaryStorage } from "multer-storage-cloudinary";
// import multer from "multer";

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// const storage = new CloudinaryStorage({
//   cloudinary: cloudinary,
//   params: async (req, file) => {
//     const originalName = file.originalname;
//     const lastDotIndex = originalName.lastIndexOf(".");

//     const nameWithoutExt =
//       lastDotIndex !== -1
//         ? originalName.substring(0, lastDotIndex)
//         : originalName;

//     return {
//       folder: "journal_manuscripts",
//       resource_type: "raw",
//       public_id: `${nameWithoutExt}-${Date.now()}`,
//     };
//   },
// });

// const fileFilter = (req, file, cb) => {
//   const isImage = file.mimetype.startsWith("image/");

//   const isDoc =
//     file.mimetype === "application/pdf" ||
//     file.mimetype === "application/msword" ||
//     file.mimetype ===
//     "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

//   if (isImage || isDoc) {
//     cb(null, true);
//   } else {
//     cb(
//       new Error("Only images (JPG, PNG, WEBP, etc.) or documents allowed"),
//       false
//     );
//   }
// };

// const upload = multer({
//   storage: storage,
//   fileFilter: fileFilter,
//   limits: {
//     fileSize: 50 * 1024 * 1024, // 50MB
//   },
// });

// export default upload;


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

    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, "");
    const cleanName = nameWithoutExt.replace(/\s+/g, "_");

    const isPDF = file.mimetype === "application/pdf";

    return {
      folder: "journal_manuscripts",

      // ✅ important
      resource_type: isPDF ? "raw" : "image",

      // ✅ FIX: only PDF gets extension
      public_id: isPDF
        ? `${cleanName}-${Date.now()}.pdf`
        : `${cleanName}-${Date.now()}`,
    };
  },
});

// file filter (same)
const fileFilter = (req, file, cb) => {
  const isImage = file.mimetype.startsWith("image/");

  const isDoc =
    file.mimetype === "application/pdf" ||
    file.mimetype === "application/msword" ||
    file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.mimetype === "application/zip";

  if (isImage || isDoc) {
    cb(null, true);
  } else {
    cb(
      new Error("Only images (JPG, PNG, WEBP, etc.) or documents allowed"),
      false
    );
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

export default upload;