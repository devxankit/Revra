// Cloudinary configuration
const cloudinaryConfig = {
  cloud_name: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
  api_key: import.meta.env.VITE_CLOUDINARY_API_KEY,
  upload_preset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET,
  secure: true
};

// Upload file to Cloudinary
export const uploadToCloudinary = async (file, folder = 'appzeto', options = {}) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', cloudinaryConfig.upload_preset);
    formData.append('folder', folder);
    
    // Add additional options
    Object.keys(options).forEach(key => {
      formData.append(key, options[key]);
    });

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloud_name}/upload`,
      {
        method: 'POST',
        body: formData
      }
    );

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    return {
      success: true,
      data: {
        public_id: result.public_id,
        secure_url: result.secure_url,
        original_filename: result.original_filename,
        format: result.format,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
        created_at: result.created_at
      }
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Delete file from Cloudinary
export const deleteFromCloudinary = async (publicId) => {
  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloud_name}/image/destroy`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          public_id: publicId,
          api_key: cloudinaryConfig.api_key,
          timestamp: Math.round(new Date().getTime() / 1000),
          signature: generateSignature(publicId)
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Delete failed: ${response.statusText}`);
    }

    const result = await response.json();
    
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

// Generate signature for secure operations
const generateSignature = (publicId) => {
  // Note: In production, this should be done on the backend for security
  // This is a simplified version for development
  const timestamp = Math.round(new Date().getTime() / 1000);
  const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${import.meta.env.VITE_CLOUDINARY_API_SECRET}`;
  
  // Simple hash function (in production, use proper crypto)
  let hash = 0;
  for (let i = 0; i < stringToSign.length; i++) {
    const char = stringToSign.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
};


// Get optimized image URL
export const getOptimizedImageUrl = (publicId, options = {}) => {
  const defaultOptions = {
    quality: 'auto',
    fetch_format: 'auto',
    width: 800,
    height: 600,
    crop: 'limit'
  };
  
  const finalOptions = { ...defaultOptions, ...options };
  const params = new URLSearchParams(finalOptions).toString();
  return `https://res.cloudinary.com/${cloudinaryConfig.cloud_name}/image/upload/${params}/${publicId}`;
};

// Get document URL (for PDFs, docs, etc.)
export const getDocumentUrl = (publicId, options = {}) => {
  const defaultOptions = {
    resource_type: 'raw',
    ...options
  };
  
  const params = new URLSearchParams(defaultOptions).toString();
  return `https://res.cloudinary.com/${cloudinaryConfig.cloud_name}/raw/upload/${params}/${publicId}`;
};

// Upload multiple files
export const uploadMultipleFiles = async (files, folder = 'appzeto', options = {}) => {
  try {
    const uploadPromises = files.map(file => uploadToCloudinary(file, folder, options));
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
export const deleteMultipleFiles = async (publicIds) => {
  try {
    const deletePromises = publicIds.map(publicId => deleteFromCloudinary(publicId));
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

// File validation helper
export const validateFile = (file, options = {}) => {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx']
  } = options;

  const errors = [];

  // Check file size
  if (file.size > maxSize) {
    errors.push(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    errors.push('Invalid file type. Only images (JPEG, JPG, PNG) and documents (PDF, DOC, DOCX) are allowed.');
  }

  // Check file extension
  const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
  if (!allowedExtensions.includes(fileExtension)) {
    errors.push('Invalid file extension.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Get file preview URL
export const getFilePreview = (file) => {
  return new Promise((resolve) => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    } else {
      // For non-image files, return a generic icon
      resolve('/icons/document-icon.png');
    }
  });
};

export default {
  uploadToCloudinary,
  deleteFromCloudinary,
  getOptimizedImageUrl,
  getDocumentUrl,
  uploadMultipleFiles,
  deleteMultipleFiles,
  validateFile,
  getFilePreview
};
