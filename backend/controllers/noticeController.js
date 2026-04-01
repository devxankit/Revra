const Notice = require('../models/Notice');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Create new notice
// @route   POST /api/admin/notices
// @access  Admin only
const createNotice = asyncHandler(async (req, res, next) => {
  const {
    title,
    content,
    type,
    priority,
    targetAudience,
    status,
    isPinned
  } = req.body;

  // Validate required fields
  if (!title || !title.trim()) {
    return next(new ErrorResponse('Title is required', 400));
  }
  
  if (!content || !content.trim()) {
    return next(new ErrorResponse('Content is required', 400));
  }

  // Validate notice type
  const validTypes = ['text', 'image', 'video'];
  const noticeType = type || 'text';
  if (!validTypes.includes(noticeType)) {
    return next(new ErrorResponse('Invalid notice type. Must be text, image, or video', 400));
  }

  // Validate that file is provided for image/video types
  if (noticeType === 'image' && !req.file) {
    console.error('Image notice created but no file received:', {
      hasFile: !!req.file,
      body: req.body,
      files: req.files
    });
    return next(new ErrorResponse('Image file is required for image notices', 400));
  }
  
  if (noticeType === 'video' && !req.file) {
    console.error('Video notice created but no file received:', {
      hasFile: !!req.file,
      body: req.body,
      files: req.files
    });
    return next(new ErrorResponse('Video file is required for video notices', 400));
  }

  // Validate file type matches notice type
  if (req.file) {
    if (noticeType === 'image' && !req.file.mimetype.startsWith('image/')) {
      return next(new ErrorResponse('File must be an image for image notices', 400));
    }
    
    if (noticeType === 'video' && !req.file.mimetype.startsWith('video/')) {
      return next(new ErrorResponse('File must be a video for video notices', 400));
    }

    // Validate file size (5MB for images, 50MB for videos)
    const maxImageSize = 5 * 1024 * 1024; // 5MB
    const maxVideoSize = 50 * 1024 * 1024; // 50MB
    
    if (noticeType === 'image' && req.file.size > maxImageSize) {
      return next(new ErrorResponse('Image size must be less than 5MB', 400));
    }
    
    if (noticeType === 'video' && req.file.size > maxVideoSize) {
      return next(new ErrorResponse('Video size must be less than 50MB', 400));
    }
  }

  // Determine author model and ID
  let authorModel = 'Admin';
  let authorId = req.user.id;
  let authorName = req.user.name || 'Admin';

  if (req.user.role === 'admin') {
    authorModel = 'Admin';
  } else if (req.user.role === 'project-manager') {
    authorModel = 'PM';
  } else if (req.user.role === 'sales') {
    authorModel = 'Sales';
  } else if (req.user.role === 'employee') {
    authorModel = 'Employee';
  }

  // Validate status
  const validStatuses = ['published', 'draft'];
  const noticeStatus = status && validStatuses.includes(status) ? status : 'published';

  // Build notice data
  const noticeData = {
    title: title.trim(),
    content: content.trim(),
    type: noticeType,
    priority: priority || 'medium',
    targetAudience: targetAudience || 'all',
    status: noticeStatus,
    author: authorId,
    authorModel,
    authorName,
    isPinned: isPinned === true || isPinned === 'true'
  };

  // Handle image upload
  if (noticeType === 'image' && req.file) {
    try {
      console.log('Uploading image file:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        hasBuffer: !!req.file.buffer,
        bufferLength: req.file.buffer?.length,
        fieldname: req.file.fieldname
      });

      // Verify file buffer exists
      if (!req.file.buffer) {
        return next(new ErrorResponse('File buffer is missing. Multer may not have processed the file correctly.', 400));
      }

      const uploadResult = await uploadToCloudinary(req.file, 'appzeto/notices');
      
      if (uploadResult.success) {
        noticeData.imageUrl = uploadResult.data.secure_url;
        noticeData.imagePublicId = uploadResult.data.public_id;
        noticeData.imageData = {
          public_id: uploadResult.data.public_id,
          secure_url: uploadResult.data.secure_url,
          original_filename: uploadResult.data.original_filename,
          format: uploadResult.data.format,
          bytes: uploadResult.data.bytes,
          width: uploadResult.data.width || null,
          height: uploadResult.data.height || null,
          resource_type: uploadResult.data.resource_type || 'image',
          uploadedAt: new Date()
        };
      } else {
        console.error('Cloudinary upload failed:', uploadResult.error);
        return next(new ErrorResponse(`Failed to upload image: ${uploadResult.error || 'Unknown error'}`, 500));
      }
    } catch (error) {
      console.error('Image upload error:', error);
      return next(new ErrorResponse(`Image upload failed: ${error.message}`, 500));
    }
  }

  // Handle video upload
  if (noticeType === 'video' && req.file) {
    try {
      console.log('Uploading video file:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        hasBuffer: !!req.file.buffer,
        bufferLength: req.file.buffer?.length,
        fieldname: req.file.fieldname
      });

      // Verify file buffer exists
      if (!req.file.buffer) {
        return next(new ErrorResponse('File buffer is missing. Multer may not have processed the file correctly.', 400));
      }

      const uploadResult = await uploadToCloudinary(req.file, 'appzeto/notices', {
        resource_type: 'video'
      });
      
      if (uploadResult.success) {
        noticeData.videoUrl = uploadResult.data.secure_url;
        noticeData.videoPublicId = uploadResult.data.public_id;
        noticeData.videoData = {
          public_id: uploadResult.data.public_id,
          secure_url: uploadResult.data.secure_url,
          original_filename: uploadResult.data.original_filename,
          format: uploadResult.data.format,
          bytes: uploadResult.data.bytes,
          width: uploadResult.data.width || null,
          height: uploadResult.data.height || null,
          resource_type: uploadResult.data.resource_type || 'video',
          duration: uploadResult.data.duration || null,
          uploadedAt: new Date()
        };
      } else {
        console.error('Cloudinary upload failed:', uploadResult.error);
        return next(new ErrorResponse(`Failed to upload video: ${uploadResult.error || 'Unknown error'}`, 500));
      }
    } catch (error) {
      console.error('Video upload error:', error);
      return next(new ErrorResponse(`Video upload failed: ${error.message}`, 500));
    }
  }

  // Create notice
  const notice = await Notice.create(noticeData);

  res.status(201).json({
    success: true,
    data: notice
  });
});

// @desc    Get all notices
// @route   GET /api/admin/notices
// @access  Admin only
const getAllNotices = asyncHandler(async (req, res, next) => {
  const { type, status, priority, targetAudience, isPinned, search } = req.query;

  // Build query
  const query = {};

  if (type && ['text', 'image', 'video'].includes(type)) query.type = type;
  if (status && ['draft', 'published', 'scheduled'].includes(status)) query.status = status;
  if (priority && ['low', 'medium', 'high', 'urgent'].includes(priority)) query.priority = priority;
  if (targetAudience && ['all', 'sales', 'development', 'project-managers', 'hr', 'admin'].includes(targetAudience)) {
    query.targetAudience = targetAudience;
  }
  if (isPinned !== undefined) {
    query.isPinned = isPinned === 'true' || isPinned === true;
  }

  // Search functionality
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } },
      { authorName: { $regex: search, $options: 'i' } }
    ];
  }

  // Execute query with sorting (pinned first, then by date)
  const notices = await Notice.find(query)
    .populate('author', 'name email')
    .sort({ isPinned: -1, createdAt: -1 });

  res.status(200).json({
    success: true,
    count: notices.length,
    data: notices
  });
});

// @desc    Get single notice by ID
// @route   GET /api/admin/notices/:id
// @access  Admin only
const getNoticeById = asyncHandler(async (req, res, next) => {
  const notice = await Notice.findById(req.params.id)
    .populate('author', 'name email');

  if (!notice) {
    return next(new ErrorResponse(`Notice not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: notice
  });
});

// @desc    Update notice
// @route   PUT /api/admin/notices/:id
// @access  Admin only
const updateNotice = asyncHandler(async (req, res, next) => {
  let notice = await Notice.findById(req.params.id);

  if (!notice) {
    return next(new ErrorResponse(`Notice not found with id of ${req.params.id}`, 404));
  }

  const {
    title,
    content,
    type,
    priority,
    targetAudience,
    status,
    isPinned
  } = req.body;

  // Validate required fields if provided
  if (title !== undefined) {
    if (!title || !title.trim()) {
      return next(new ErrorResponse('Title cannot be empty', 400));
    }
    notice.title = title.trim();
  }
  
  if (content !== undefined) {
    if (!content || !content.trim()) {
      return next(new ErrorResponse('Content cannot be empty', 400));
    }
    notice.content = content.trim();
  }

  // Validate type if changed
  if (type !== undefined) {
    const validTypes = ['text', 'image', 'video'];
    if (!validTypes.includes(type)) {
      return next(new ErrorResponse('Invalid notice type. Must be text, image, or video', 400));
    }
    
    // If changing to image/video, require file upload
    if (type === 'image' && !req.file && !notice.imageUrl) {
      return next(new ErrorResponse('Image file is required when creating or updating image notices', 400));
    }
    
    if (type === 'video' && !req.file && !notice.videoUrl) {
      return next(new ErrorResponse('Video file is required when creating or updating video notices', 400));
    }
    
    notice.type = type;
  }

  // Validate file if provided
  if (req.file) {
    const currentType = type || notice.type;
    
    if (currentType === 'image' && !req.file.mimetype.startsWith('image/')) {
      return next(new ErrorResponse('File must be an image for image notices', 400));
    }
    
    if (currentType === 'video' && !req.file.mimetype.startsWith('video/')) {
      return next(new ErrorResponse('File must be a video for video notices', 400));
    }

    // Validate file size
    const maxImageSize = 5 * 1024 * 1024; // 5MB
    const maxVideoSize = 50 * 1024 * 1024; // 50MB
    
    if (currentType === 'image' && req.file.size > maxImageSize) {
      return next(new ErrorResponse('Image size must be less than 5MB', 400));
    }
    
    if (currentType === 'video' && req.file.size > maxVideoSize) {
      return next(new ErrorResponse('Video size must be less than 50MB', 400));
    }
  }

  // Update other fields
  if (priority !== undefined) notice.priority = priority;
  if (targetAudience !== undefined) notice.targetAudience = targetAudience;
  if (isPinned !== undefined) notice.isPinned = isPinned === true || isPinned === 'true';
  
  // Validate and update status
  if (status !== undefined) {
    const validStatuses = ['published', 'draft'];
    if (validStatuses.includes(status)) {
      notice.status = status;
    } else {
      return next(new ErrorResponse('Invalid status. Must be published or draft', 400));
    }
  }

  // Handle image upload/replacement
  const currentType = type || notice.type;
  if (currentType === 'image' && req.file) {
    try {
      // Delete old image if exists (fail silently)
      if (notice.imagePublicId) {
        try {
          await deleteFromCloudinary(notice.imagePublicId, { resource_type: 'image' });
        } catch (error) {
          console.warn(`Failed to delete old image ${notice.imagePublicId} from Cloudinary:`, error);
        }
      }

      const uploadResult = await uploadToCloudinary(req.file, 'appzeto/notices');
      
      if (uploadResult.success) {
        notice.imageUrl = uploadResult.data.secure_url;
        notice.imagePublicId = uploadResult.data.public_id;
        notice.imageData = {
          public_id: uploadResult.data.public_id,
          secure_url: uploadResult.data.secure_url,
          original_filename: uploadResult.data.original_filename,
          format: uploadResult.data.format,
          bytes: uploadResult.data.bytes,
          width: uploadResult.data.width || null,
          height: uploadResult.data.height || null,
          resource_type: uploadResult.data.resource_type || 'image',
          uploadedAt: new Date()
        };
      } else {
        return next(new ErrorResponse('Failed to upload image', 500));
      }
    } catch (error) {
      return next(new ErrorResponse(`Image upload failed: ${error.message}`, 500));
    }
  }

  // Handle video upload/replacement
  if (currentType === 'video' && req.file) {
    try {
      // Delete old video if exists (fail silently)
      if (notice.videoPublicId) {
        try {
          await deleteFromCloudinary(notice.videoPublicId, { resource_type: 'video' });
        } catch (error) {
          console.warn(`Failed to delete old video ${notice.videoPublicId} from Cloudinary:`, error);
        }
      }

      const uploadResult = await uploadToCloudinary(req.file, 'appzeto/notices', {
        resource_type: 'video'
      });
      
      if (uploadResult.success) {
        notice.videoUrl = uploadResult.data.secure_url;
        notice.videoPublicId = uploadResult.data.public_id;
        notice.videoData = {
          public_id: uploadResult.data.public_id,
          secure_url: uploadResult.data.secure_url,
          original_filename: uploadResult.data.original_filename,
          format: uploadResult.data.format,
          bytes: uploadResult.data.bytes,
          width: uploadResult.data.width || null,
          height: uploadResult.data.height || null,
          resource_type: uploadResult.data.resource_type || 'video',
          duration: uploadResult.data.duration || null,
          uploadedAt: new Date()
        };
      } else {
        return next(new ErrorResponse('Failed to upload video', 500));
      }
    } catch (error) {
      return next(new ErrorResponse(`Video upload failed: ${error.message}`, 500));
    }
  }

  await notice.save();

  res.status(200).json({
    success: true,
    data: notice
  });
});

// @desc    Delete notice
// @route   DELETE /api/admin/notices/:id
// @access  Admin only
const deleteNotice = asyncHandler(async (req, res, next) => {
  const notice = await Notice.findById(req.params.id);

  if (!notice) {
    return next(new ErrorResponse(`Notice not found with id of ${req.params.id}`, 404));
  }

  // Delete associated media from Cloudinary (fail silently to allow notice deletion)
  try {
    if (notice.imagePublicId) {
      const deleteResult = await deleteFromCloudinary(notice.imagePublicId, { resource_type: 'image' });
      if (!deleteResult.success) {
        console.warn(`Failed to delete image ${notice.imagePublicId} from Cloudinary, continuing with notice deletion`);
      }
    }

    if (notice.videoPublicId) {
      const deleteResult = await deleteFromCloudinary(notice.videoPublicId, { resource_type: 'video' });
      if (!deleteResult.success) {
        console.warn(`Failed to delete video ${notice.videoPublicId} from Cloudinary, continuing with notice deletion`);
      }
    }

    // Delete attachments if any
    if (notice.attachments && notice.attachments.length > 0) {
      const deletePromises = notice.attachments
        .filter(att => att.public_id)
        .map(async (att) => {
          try {
            const result = await deleteFromCloudinary(att.public_id);
            return result.success;
          } catch (error) {
            console.warn(`Failed to delete attachment ${att.public_id} from Cloudinary:`, error);
            return false;
          }
        });
      await Promise.all(deletePromises);
    }
  } catch (error) {
    // Log error but don't fail notice deletion
    console.error('Error deleting media from Cloudinary:', error);
  }

  await notice.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Toggle pin notice
// @route   PATCH /api/admin/notices/:id/pin
// @access  Admin only
const togglePinNotice = asyncHandler(async (req, res, next) => {
  const notice = await Notice.findById(req.params.id);

  if (!notice) {
    return next(new ErrorResponse(`Notice not found with id of ${req.params.id}`, 404));
  }

  notice.isPinned = !notice.isPinned;
  await notice.save();

  res.status(200).json({
    success: true,
    data: notice
  });
});

// @desc    Get notice statistics
// @route   GET /api/admin/notices/statistics
// @access  Admin only
const getNoticeStatistics = asyncHandler(async (req, res, next) => {
  const totalNotices = await Notice.countDocuments();
  const publishedNotices = await Notice.countDocuments({ status: 'published' });
  const draftNotices = await Notice.countDocuments({ status: 'draft' });
  const scheduledNotices = await Notice.countDocuments({ status: 'scheduled' });
  const pinnedNotices = await Notice.countDocuments({ isPinned: true });
  
  const typeStats = {
    text: await Notice.countDocuments({ type: 'text' }),
    image: await Notice.countDocuments({ type: 'image' }),
    video: await Notice.countDocuments({ type: 'video' })
  };

  const priorityStats = {
    low: await Notice.countDocuments({ priority: 'low' }),
    medium: await Notice.countDocuments({ priority: 'medium' }),
    high: await Notice.countDocuments({ priority: 'high' }),
    urgent: await Notice.countDocuments({ priority: 'urgent' })
  };

  res.status(200).json({
    success: true,
    data: {
      total: totalNotices,
      published: publishedNotices,
      draft: draftNotices,
      scheduled: scheduledNotices,
      pinned: pinnedNotices,
      byType: typeStats,
      byPriority: priorityStats
    }
  });
});

// @desc    Increment notice views
// @route   POST /api/admin/notices/:id/view
// @access  Protected (All authenticated users)
const incrementNoticeViews = asyncHandler(async (req, res, next) => {
  const notice = await Notice.findById(req.params.id);

  if (!notice) {
    return next(new ErrorResponse(`Notice not found with id of ${req.params.id}`, 404));
  }

  // Determine user model
  let userModel = 'Admin';
  if (req.user.role === 'project-manager') {
    userModel = 'PM';
  } else if (req.user.role === 'sales') {
    userModel = 'Sales';
  } else if (req.user.role === 'employee') {
    userModel = 'Employee';
  }

  await notice.incrementViews(req.user.id, userModel);

  res.status(200).json({
    success: true,
    data: { views: notice.views }
  });
});

// @desc    Get published notices for sales employees
// @route   GET /api/sales/notices
// @access  Protected (Sales employees only)
const getPublishedNoticesForSales = asyncHandler(async (req, res, next) => {
  const { type, priority, isPinned, search } = req.query;

  // Build query - only published notices targeted to 'sales' or 'all'
  const query = {
    status: 'published',
    $or: [
      { targetAudience: 'sales' },
      { targetAudience: 'all' }
    ]
  };

  // Add type filter
  if (type && ['text', 'image', 'video'].includes(type)) {
    query.type = type;
  }

  // Add priority filter
  if (priority && ['low', 'medium', 'high', 'urgent'].includes(priority)) {
    query.priority = priority;
  }

  // Add pinned filter
  if (isPinned !== undefined) {
    query.isPinned = isPinned === 'true' || isPinned === true;
  }

  // Search functionality - combine with $and to work with existing $or
  if (search) {
    query.$and = [
      {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { content: { $regex: search, $options: 'i' } },
          { authorName: { $regex: search, $options: 'i' } }
        ]
      }
    ];
    // Rebuild query to properly combine $or and $and
    const audienceFilter = query.$or;
    delete query.$or;
    query.$and = [
      ...query.$and,
      { $or: audienceFilter }
    ];
  }

  // Execute query with sorting (pinned first, then by date)
  const notices = await Notice.find(query)
    .populate('author', 'name email')
    .sort({ isPinned: -1, createdAt: -1 });

  // Format dates for frontend
  const formattedNotices = notices.map(notice => {
    const noticeObj = notice.toObject();
    const createdAt = new Date(notice.createdAt);
    
    return {
      ...noticeObj,
      id: noticeObj._id,
      date: createdAt.toISOString().split('T')[0],
      time: createdAt.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
      }),
      author: noticeObj.authorName || (noticeObj.author?.name || 'Admin'),
      imageUrl: noticeObj.imageUrl || noticeObj.imageData?.secure_url || '',
      videoUrl: noticeObj.videoUrl || noticeObj.videoData?.secure_url || ''
    };
  });

  res.status(200).json({
    success: true,
    count: formattedNotices.length,
    data: formattedNotices
  });
});

// @desc    Get published notices for project managers
// @route   GET /api/pm/notices
// @access  Protected (Project managers only)
const getPublishedNoticesForPM = asyncHandler(async (req, res, next) => {
  const { type, priority, isPinned, search } = req.query;

  // Build query - only published notices targeted to 'project-managers' or 'all'
  const query = {
    status: 'published',
    $or: [
      { targetAudience: 'project-managers' },
      { targetAudience: 'all' }
    ]
  };

  // Add type filter
  if (type && ['text', 'image', 'video'].includes(type)) {
    query.type = type;
  }

  // Add priority filter
  if (priority && ['low', 'medium', 'high', 'urgent'].includes(priority)) {
    query.priority = priority;
  }

  // Add pinned filter
  if (isPinned !== undefined) {
    query.isPinned = isPinned === 'true' || isPinned === true;
  }

  // Search functionality - combine with $and to work with existing $or
  if (search) {
    query.$and = [
      {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { content: { $regex: search, $options: 'i' } },
          { authorName: { $regex: search, $options: 'i' } }
        ]
      }
    ];
    // Rebuild query to properly combine $or and $and
    const audienceFilter = query.$or;
    delete query.$or;
    query.$and = [
      ...query.$and,
      { $or: audienceFilter }
    ];
  }

  // Execute query with sorting (pinned first, then by date)
  const notices = await Notice.find(query)
    .populate('author', 'name email')
    .sort({ isPinned: -1, createdAt: -1 });

  // Format dates for frontend
  const formattedNotices = notices.map(notice => {
    const noticeObj = notice.toObject();
    const createdAt = new Date(notice.createdAt);
    
    return {
      ...noticeObj,
      id: noticeObj._id,
      date: createdAt.toISOString().split('T')[0],
      time: createdAt.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
      }),
      author: noticeObj.authorName || (noticeObj.author?.name || 'Admin'),
      imageUrl: noticeObj.imageUrl || noticeObj.imageData?.secure_url || '',
      videoUrl: noticeObj.videoUrl || noticeObj.videoData?.secure_url || ''
    };
  });

  res.status(200).json({
    success: true,
    count: formattedNotices.length,
    data: formattedNotices
  });
});

// @desc    Get published notices for employees
// @route   GET /api/employee/notices
// @access  Protected (Employees only)
const getPublishedNoticesForEmployee = asyncHandler(async (req, res, next) => {
  const { type, priority, isPinned, search } = req.query;

  // Build query - only published notices targeted to 'development' or 'all'
  const query = {
    status: 'published',
    $or: [
      { targetAudience: 'development' },
      { targetAudience: 'all' }
    ]
  };

  // Add type filter
  if (type && ['text', 'image', 'video'].includes(type)) {
    query.type = type;
  }

  // Add priority filter
  if (priority && ['low', 'medium', 'high', 'urgent'].includes(priority)) {
    query.priority = priority;
  }

  // Add pinned filter
  if (isPinned !== undefined) {
    query.isPinned = isPinned === 'true' || isPinned === true;
  }

  // Search functionality - combine with $and to work with existing $or
  if (search) {
    query.$and = [
      {
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { content: { $regex: search, $options: 'i' } },
          { authorName: { $regex: search, $options: 'i' } }
        ]
      }
    ];
    // Rebuild query to properly combine $or and $and
    const audienceFilter = query.$or;
    delete query.$or;
    query.$and = [
      ...query.$and,
      { $or: audienceFilter }
    ];
  }

  // Execute query with sorting (pinned first, then by date)
  const notices = await Notice.find(query)
    .populate('author', 'name email')
    .sort({ isPinned: -1, createdAt: -1 });

  // Format dates for frontend
  const formattedNotices = notices.map(notice => {
    const noticeObj = notice.toObject();
    const createdAt = new Date(notice.createdAt);
    
    return {
      ...noticeObj,
      id: noticeObj._id,
      date: createdAt.toISOString().split('T')[0],
      time: createdAt.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
      }),
      author: noticeObj.authorName || (noticeObj.author?.name || 'Admin'),
      imageUrl: noticeObj.imageUrl || noticeObj.imageData?.secure_url || '',
      videoUrl: noticeObj.videoUrl || noticeObj.videoData?.secure_url || ''
    };
  });

  res.status(200).json({
    success: true,
    count: formattedNotices.length,
    data: formattedNotices
  });
});

module.exports = {
  createNotice,
  getAllNotices,
  getNoticeById,
  updateNotice,
  deleteNotice,
  togglePinNotice,
  getNoticeStatistics,
  incrementNoticeViews,
  getPublishedNoticesForSales,
  getPublishedNoticesForPM,
  getPublishedNoticesForEmployee
};

