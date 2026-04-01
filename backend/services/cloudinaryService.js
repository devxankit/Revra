const { cloudinary, uploadToCloudinary, deleteFromCloudinary, getFileInfo } = require('../config/cloudinary');
const multer = require('multer');

// Use memory storage instead of CloudinaryStorage to handle uploads manually
// This allows us to check Cloudinary config before uploading
const storage = multer.memoryStorage();

// Multer configuration with memory storage
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit (for videos)
  },
  fileFilter: (req, file, cb) => {
    // Check file type - allow images, videos, documents, and spreadsheets
    const allowedImageTypes = /jpeg|jpg|png|gif|webp/;
    const allowedVideoTypes = /mp4|mov|avi|wmv|flv|webm|mkv/;
    const allowedDocTypes = /pdf|doc|docx|xlsx|xls|csv/;
    
    const extname = allowedImageTypes.test(file.originalname.toLowerCase()) ||
                    allowedVideoTypes.test(file.originalname.toLowerCase()) ||
                    allowedDocTypes.test(file.originalname.toLowerCase());
    
    const mimetype = file.mimetype.startsWith('image/') ||
                     file.mimetype.startsWith('video/') ||
                     /application\/pdf/.test(file.mimetype) ||
                     /application\/msword/.test(file.mimetype) ||
                     /application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document/.test(file.mimetype) ||
                     /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/.test(file.mimetype) ||
                     /application\/vnd\.ms-excel/.test(file.mimetype) ||
                     /text\/csv/.test(file.mimetype);

    if (mimetype || extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images (JPEG, JPG, PNG, GIF, WEBP), videos (MP4, MOV, AVI, WMV, FLV, WEBM, MKV), documents (PDF, DOC, DOCX), and spreadsheets (XLSX, XLS, CSV) are allowed'));
    }
  }
});

// Universal upload function
const uploadFile = async (file, folder = 'appzeto', options = {}) => {
  try {
    const uploadOptions = {
      folder: folder,
      resource_type: 'auto',
      quality: 'auto',
      fetch_format: 'auto',
      ...options
    };

    const result = await cloudinary.uploader.upload(file.path, uploadOptions);
    
    return {
      public_id: result.public_id,
      secure_url: result.secure_url,
      originalName: result.original_filename,
      original_filename: result.original_filename,
      format: result.format,
      size: result.bytes,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      resource_type: result.resource_type,
      uploadedAt: new Date()
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }
};

// Upload to Cloudinary (for use in controllers) - using imported function
// const uploadToCloudinary = async (file, folder = 'appzeto', options = {}) => {
//   return await uploadFile(file, folder, options);
// };

// Delete from Cloudinary (for use in controllers) - using imported function
// const deleteFromCloudinary = async (publicId) => {
//   try {
//     const result = await cloudinary.uploader.destroy(publicId);
//     if (result.result !== 'ok') {
//       throw new Error('Failed to delete file from Cloudinary');
//     }
//     return result;
//   } catch (error) {
//     console.error('Cloudinary delete error:', error);
//     throw new Error(`Delete failed: ${error.message}`);
//   }
// };

// Universal delete function
const deleteFile = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return {
      success: result.result === 'ok',
      data: result
    };
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Get file information (wrapper for imported getFileInfo)
const getFileDetails = async (publicId) => {
  return await getFileInfo(publicId);
};

// Upload multiple files
const uploadMultipleFiles = async (files, folder = 'appzeto', options = {}) => {
  try {
    const uploadPromises = files.map(file => uploadFile(file, folder, options));
    const results = await Promise.all(uploadPromises);
    
    const successful = results.filter(result => result.success);
    const failed = results.filter(result => !result.success);
    
    return {
      success: failed.length === 0,
      data: {
        successful: successful.map(result => result.data),
        failed: failed.map(result => result.error)
      }
    };
  } catch (error) {
    console.error('Multiple files upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Delete multiple files
const deleteMultipleFiles = async (publicIds) => {
  try {
    const deletePromises = publicIds.map(publicId => deleteFile(publicId));
    const results = await Promise.all(deletePromises);
    
    const successful = results.filter(result => result.success);
    const failed = results.filter(result => !result.success);
    
    return {
      success: failed.length === 0,
      data: {
        successful: successful.length,
        failed: failed.length
      }
    };
  } catch (error) {
    console.error('Multiple files delete error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Generate signed upload URL for frontend direct uploads
const generateSignedUploadUrl = (folder = 'appzeto', options = {}) => {
  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      {
        timestamp: timestamp,
        folder: folder,
        ...options
      },
      process.env.CLOUDINARY_API_SECRET
    );

    return {
      success: true,
      data: {
        signature: signature,
        timestamp: timestamp,
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        folder: folder
      }
    };
  } catch (error) {
    console.error('Generate signed URL error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  upload,
  uploadFile,
  uploadToCloudinary, // imported from config
  deleteFile,
  deleteFromCloudinary, // imported from config
  getFileDetails,
  getFileInfo, // imported from config
  uploadMultipleFiles,
  deleteMultipleFiles,
  generateSignedUploadUrl,
  cloudinary
};
