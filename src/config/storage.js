const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// --- STEP 1 FIX: Fail fast with a clear error if Cloudinary env vars are missing ---
const requiredEnvVars = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
const missing = requiredEnvVars.filter((key) => !process.env[key] || process.env[key].startsWith('your_'));

if (missing.length > 0) {
  console.error(
    `\n❌  CLOUDINARY CONFIG ERROR: Missing environment variables: ${missing.join(', ')}` +
    `\n   Please set them in your .env file with real values from https://console.cloudinary.com\n`
  );
  // Don't crash the whole server — export a dummy upload middleware that returns an error
  const dummyUpload = {
    single: () => (req, res, next) => {
      return res.status(503).json({
        message: 'File uploads are disabled — Cloudinary is not configured. Ask your admin to set CLOUDINARY env vars.',
        statusCode: 503
      });
    }
  };
  module.exports = { cloudinary: null, upload: dummyUpload };
} else {
  // Configure Cloudinary
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  // Set up Storage Engine
  const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'college_app', // Folder name in Cloudinary
      allowed_formats: ['jpg', 'png', 'pdf', 'docx'],
      resource_type: 'auto', // Support both images and raw files like PDFs
    },
  });

  const upload = multer({ storage: storage });

  module.exports = { cloudinary, upload };
}