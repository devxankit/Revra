import React, { useState, useRef } from 'react';
import { uploadToCloudinary, validateFile, getFilePreview } from '../../services/cloudinaryService';
import { Button } from './button';
import { Card } from './card';
import { useToast } from '../../contexts/ToastContext';

const CloudinaryUpload = ({
  onUploadSuccess,
  onUploadError,
  onRemoveExisting,
  folder = 'appzeto',
  maxSize = 10 * 1024 * 1024, // 10MB
  allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  className = '',
  disabled = false,
  multiple = false,
  accept = '.jpg,.jpeg,.png,.pdf,.doc,.docx',
  placeholder = 'Click to upload or drag and drop',
  showPreview = true,
  existingDocument = null
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);
  const { addToast } = useToast();

  const handleFileSelect = async (files) => {
    const fileList = Array.from(files);
    
    if (fileList.length === 0) return;

    // Validate files
    for (const file of fileList) {
      const validation = validateFile(file, { maxSize, allowedTypes });
      if (!validation.isValid) {
        addToast({ type: 'error', message: validation.errors.join(', ') });
        return;
      }
    }

    // Handle single file upload
    if (!multiple && fileList.length > 1) {
      addToast({ type: 'error', message: 'Please select only one file' });
      return;
    }

    setUploading(true);

    try {
      if (multiple) {
        // Handle multiple files
        const results = [];
        for (const file of fileList) {
          const result = await uploadToCloudinary(file, folder);
          if (result.success) {
            results.push(result.data);
          } else {
            throw new Error(result.error);
          }
        }
        
        if (onUploadSuccess) {
          onUploadSuccess(results);
        }
        addToast({ type: 'success', message: `${results.length} file(s) uploaded successfully` });
      } else {
        // Handle single file
        const file = fileList[0];
        
        // Generate preview for images
        if (showPreview && file.type.startsWith('image/')) {
          const previewUrl = await getFilePreview(file);
          setPreview(previewUrl);
        }

        const result = await uploadToCloudinary(file, folder);
        
        if (result.success) {
          if (onUploadSuccess) {
            onUploadSuccess(result.data);
          }
          addToast({ type: 'success', message: 'File uploaded successfully' });
        } else {
          throw new Error(result.error);
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      if (onUploadError) {
        onUploadError(error);
      }
      addToast({ type: 'error', message: `Upload failed: ${error.message}` });
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  };

  const handleFileInputChange = (e) => {
    const files = e.target.files;
    handleFileSelect(files);
  };

  const openFileDialog = () => {
    if (disabled || uploading) return;
    fileInputRef.current?.click();
  };

  const removePreview = () => {
    setPreview(null);
  };

  const removeExistingDocument = () => {
    if (onRemoveExisting) {
      onRemoveExisting();
    }
  };

  const getDocumentUrl = (document) => {
    if (!document) return null;
    return document.secure_url || document.url;
  };

  const getDocumentName = (document) => {
    if (!document) return '';
    return document.originalName || document.original_filename || document.public_id?.split('/').pop() || 'Document';
  };

  const getDocumentSize = (document) => {
    if (!document) return 0;
    return document.size || document.bytes || 0;
  };

  const isImage = (document) => {
    if (!document) return false;
    const url = getDocumentUrl(document);
    if (!url) return false;
    return /\.(jpg|jpeg|png|gif|webp)$/i.test(url) || document.format === 'jpg' || document.format === 'png' || document.format === 'jpeg';
  };


  return (
    <div className={`w-full ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />
      
      <Card
        className={`
          relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer
          ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${uploading ? 'opacity-75 cursor-wait' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <div className="text-center">
          {uploading ? (
            <div className="flex flex-col items-center space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-sm text-gray-600">Uploading...</p>
            </div>
          ) : existingDocument ? (
            <div className="space-y-4">
              {isImage(existingDocument) ? (
                <img
                  src={getDocumentUrl(existingDocument)}
                  alt="Current Document"
                  className="max-h-32 mx-auto rounded-lg shadow-sm"
                />
              ) : (
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-900">{getDocumentName(existingDocument)}</p>
                    <p className="text-xs text-gray-500">
                      {getDocumentSize(existingDocument) > 0 ? `${Math.round(getDocumentSize(existingDocument) / 1024)} KB` : 'Document'}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex justify-center space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeExistingDocument();
                  }}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Remove
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    openFileDialog();
                  }}
                >
                  Change
                </Button>
              </div>
            </div>
          ) : preview ? (
            <div className="space-y-4">
              <img
                src={preview}
                alt="Preview"
                className="max-h-32 mx-auto rounded-lg shadow-sm"
              />
              <div className="flex justify-center space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removePreview();
                  }}
                >
                  Remove
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    openFileDialog();
                  }}
                >
                  Change
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="mx-auto w-12 h-12 text-gray-400">
                <svg
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
              </div>
              <p className="text-sm text-gray-600">{placeholder}</p>
              <p className="text-xs text-gray-500">
                {allowedTypes.includes('image/') ? 'Images' : 'Documents'} up to {Math.round(maxSize / 1024 / 1024)}MB
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default CloudinaryUpload;
