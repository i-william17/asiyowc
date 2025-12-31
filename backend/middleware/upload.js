const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");
require("dotenv").config();

/* =====================================================
   CLOUDINARY CONFIGURATION
===================================================== */
console.log("[Cloudinary] Initializing configuration...");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

console.log("[Cloudinary] Config loaded:", {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? "✅ set" : "❌ missing",
  api_key: process.env.CLOUDINARY_API_KEY ? "✅ set" : "❌ missing",
  api_secret: process.env.CLOUDINARY_API_SECRET ? "✅ set" : "❌ missing",
});

/* =====================================================
   MULTER STORAGE (DISK — SAFE FOR VIDEO)
===================================================== */
const uploadDir = path.join(process.cwd(), "uploads/tmp");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) =>
    cb(null, `${Date.now()}-${file.originalname}`),
});

/* =====================================================
   MULTER INSTANCE
===================================================== */
console.log("[Upload] Initializing multer instance...");

const upload = multer({
  storage,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB
  },
  fileFilter: (req, file, cb) => {
    console.log("[Upload] File received:", {
      originalname: file.originalname,
      mimetype: file.mimetype,
    });

    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("video/")
    ) {
      console.log("[Upload] File accepted");
      cb(null, true);
    } else {
      console.error("[Upload] File rejected: invalid type");
      cb(new Error("Only image and video files are allowed"), false);
    }
  },
});

/* =====================================================
   CLOUDINARY UPLOAD (IMAGE + VIDEO WITH COMPRESSION)
===================================================== */
const uploadToCloudinary = async (filePath, mime) => {
  const isVideo = mime.startsWith("video/");

  console.log("[Cloudinary] Uploading:", {
    filePath,
    type: isVideo ? "video" : "image",
  });

  const result = await cloudinary.uploader.upload(filePath, {
    folder: "asiyo-app",
    resource_type: isVideo ? "video" : "image",
    chunk_size: isVideo ? 6_000_000 : undefined,
    timeout: 120_000,

    // 🔥 OPTION 3: Cloudinary-side video compression
    eager: isVideo
      ? [
          {
            width: 720,
            height: 720,
            crop: "limit",
            quality: "auto",
            fetch_format: "mp4",
          },
        ]
      : undefined,
  });

  // cleanup temp file
  fs.unlinkSync(filePath);

  console.log("[Cloudinary] Upload success:", {
    public_id: result.public_id,
    resource_type: result.resource_type,
  });

  return result;
};

/* =====================================================
   NORMALIZE MULTIPART POST PAYLOAD
===================================================== */
const normalizePostPayload = async (req, res, next) => {
  try {
    console.log("[Normalize] Incoming multipart payload");

    if (typeof req.body.content === "string") {
      req.body.content = JSON.parse(req.body.content);
    }

    if (typeof req.body.sharedTo === "string") {
      req.body.sharedTo = JSON.parse(req.body.sharedTo);
    }

    if (!req.file) {
      console.log("[Normalize] No media attached");
      return next();
    }

    const uploaded = await uploadToCloudinary(
      req.file.path,
      req.file.mimetype
    );

    const isVideo = uploaded.resource_type === "video";

    // 🔥 USE COMPRESSED VIDEO URL IF AVAILABLE
    const compressedVideoUrl = isVideo
      ? uploaded.eager?.[0]?.secure_url || uploaded.secure_url
      : undefined;

    req.body.type = isVideo ? "video" : "image";
    req.body.content = {
      ...(req.body.content || {}),
      imageUrl: !isVideo ? uploaded.secure_url : undefined,
      videoUrl: compressedVideoUrl,
      publicId: uploaded.public_id,
    };

    next();
  } catch (error) {
    console.error("[Normalize] Failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Media upload failed",
      error: error.message,
    });
  }
};

/* =====================================================
   DELETE FROM CLOUDINARY
===================================================== */
const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return;

    console.log("[Cloudinary] Deleting asset:", publicId);
    await cloudinary.uploader.destroy(publicId, {
      resource_type: "auto",
    });

    console.log("[Cloudinary] Asset deleted successfully");
  } catch (error) {
    console.error("[Cloudinary] Delete failed:", error.message);
    throw new Error(`Cloudinary delete failed: ${error.message}`);
  }
};

/* =====================================================
   EXPORTS
===================================================== */
module.exports = {
  upload,
  normalizePostPayload,
  uploadToCloudinary,
  deleteFromCloudinary,
};
