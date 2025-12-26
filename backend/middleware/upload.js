const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

/* =====================================================
   CLOUDINARY CONFIGURATION
===================================================== */
console.log('[Cloudinary] Initializing configuration...');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log('[Cloudinary] Config loaded:', {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? '✅ set' : '❌ missing',
  api_key: process.env.CLOUDINARY_API_KEY ? '✅ set' : '❌ missing',
  api_secret: process.env.CLOUDINARY_API_SECRET ? '✅ set' : '❌ missing'
});

/* =====================================================
   CLOUDINARY STORAGE (DIRECT UPLOAD)
===================================================== */
console.log('[Upload] Setting up Cloudinary storage...');

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    console.log('[Upload] Preparing upload params:', {
      filename: file.originalname,
      mimetype: file.mimetype
    });

    return {
      folder: 'asiyo-app',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov'],
      resource_type: 'auto'
    };
  }
});

/* =====================================================
   MULTER INSTANCE (MEDIA IS OPTIONAL)
===================================================== */
console.log('[Upload] Initializing multer instance...');

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log('[Upload] File received:', {
      originalname: file.originalname,
      mimetype: file.mimetype
    });

    if (
      file.mimetype.startsWith('image/') ||
      file.mimetype.startsWith('video/')
    ) {
      console.log('[Upload] File accepted');
      cb(null, true);
    } else {
      console.error('[Upload] File rejected: invalid type');
      cb(new Error('Only image and video files are allowed'), false);
    }
  }
});

/* =====================================================
   NORMALIZE MULTIPART POST PAYLOAD
===================================================== */
const normalizePostPayload = (req, res, next) => {
  try {
    console.log('[Normalize] Incoming multipart payload');

    if (typeof req.body.content === 'string') {
      console.log('[Normalize] Parsing content JSON');
      req.body.content = JSON.parse(req.body.content);
    }

    if (typeof req.body.sharedTo === 'string') {
      console.log('[Normalize] Parsing sharedTo JSON');
      req.body.sharedTo = JSON.parse(req.body.sharedTo);
    }

    if (req.file) {
      console.log('[Normalize] Cloudinary file detected:', {
        path: req.file.path,
        resource_type: req.file.resource_type
      });

      const isImage = req.file.resource_type === 'image';
      const isVideo = req.file.resource_type === 'video';

      req.body.type = isImage ? 'image' : 'video';

      req.body.content = {
        ...(req.body.content || {}),
        imageUrl: isImage ? req.file.path : null,
        videoUrl: isVideo ? req.file.path : null
      };
    } else {
      console.log('[Normalize] No media attached');
    }

    next();
  } catch (error) {
    console.error('[Normalize] Payload parsing failed:', error.message);

    return res.status(400).json({
      success: false,
      message: 'Invalid multipart payload format',
      error: error.message
    });
  }
};

/* =====================================================
   OPTIONAL DIRECT CLOUDINARY UPLOAD
===================================================== */
const uploadToCloudinary = async (filePath, options = {}) => {
  try {
    console.log('[Cloudinary] Direct upload started:', filePath);

    const result = await cloudinary.uploader.upload(filePath, options);

    console.log('[Cloudinary] Direct upload success:', {
      public_id: result.public_id,
      secure_url: result.secure_url
    });

    return result;
  } catch (error) {
    console.error('[Cloudinary] Direct upload failed:', error.message);
    throw new Error(`Cloudinary upload failed: ${error.message}`);
  }
};

/* =====================================================
   DELETE FROM CLOUDINARY
===================================================== */
const deleteFromCloudinary = async (publicId) => {
  try {
    console.log('[Cloudinary] Deleting asset:', publicId);

    await cloudinary.uploader.destroy(publicId);

    console.log('[Cloudinary] Asset deleted successfully');
  } catch (error) {
    console.error('[Cloudinary] Delete failed:', error.message);
    throw new Error(`Cloudinary delete failed: ${error.message}`);
  }
};

module.exports = { 
  upload, 
  normalizePostPayload,
  uploadToCloudinary, 
  deleteFromCloudinary 
};
