const { body, param, query, validationResult } = require('express-validator');

// @desc    Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// @desc    Validate project creation/update
const validateProject = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Project name is required')
    .isLength({ max: 100 })
    .withMessage('Project name cannot exceed 100 characters'),
  
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Project description is required')
    .isLength({ max: 1000 })
    .withMessage('Project description cannot exceed 1000 characters'),
  
  body('client')
    .isMongoId()
    .withMessage('Valid client ID is required'),
  
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Priority must be one of: low, normal, high, urgent'),
  
  body('dueDate')
    .isISO8601()
    .withMessage('Valid due date is required'),
  
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Valid start date is required'),
  
  body('assignedTeam')
    .optional()
    .isArray()
    .withMessage('Assigned team must be an array'),
  
  body('assignedTeam.*')
    .optional()
    .isMongoId()
    .withMessage('Each team member must have a valid ID'),
  
  body('budget')
    .optional()
    .isNumeric()
    .withMessage('Budget must be a number')
    .isFloat({ min: 0 })
    .withMessage('Budget cannot be negative'),
  
  body('estimatedHours')
    .optional()
    .isNumeric()
    .withMessage('Estimated hours must be a number')
    .isFloat({ min: 0 })
    .withMessage('Estimated hours cannot be negative'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('tags.*')
    .optional()
    .isString()
    .trim()
    .withMessage('Each tag must be a string'),
  
  handleValidationErrors
];

// @desc    Validate milestone creation/update
const validateMilestone = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Milestone title is required')
    .isLength({ max: 100 })
    .withMessage('Milestone title cannot exceed 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Milestone description cannot exceed 500 characters'),
  
  body('project')
    .isMongoId()
    .withMessage('Valid project ID is required'),
  
  body('sequence')
    .isInt({ min: 1 })
    .withMessage('Sequence must be a positive integer'),
  
  body('dueDate')
    .isISO8601()
    .withMessage('Valid due date is required'),
  
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Priority must be one of: low, normal, high, urgent'),
  
  body('assignedTo')
    .optional()
    .isArray()
    .withMessage('Assigned to must be an array'),
  
  body('assignedTo.*')
    .optional()
    .isMongoId()
    .withMessage('Each assignee must have a valid ID'),
  
  handleValidationErrors
];

// @desc    Validate task creation/update
const validateTask = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Task title is required')
    .isLength({ max: 100 })
    .withMessage('Task title cannot exceed 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Task description cannot exceed 1000 characters'),
  
  body('project')
    .isMongoId()
    .withMessage('Valid project ID is required'),
  
  body('milestone')
    .isMongoId()
    .withMessage('Valid milestone ID is required'),
  
  body('assignedTo')
    .optional()
    .isArray()
    .withMessage('Assigned to must be an array'),
  
  body('assignedTo.*')
    .optional()
    .isMongoId()
    .withMessage('Each assignee must have a valid ID'),
  
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Priority must be one of: low, normal, high, urgent'),
  
  body('dueDate')
    .isISO8601()
    .withMessage('Valid due date is required'),
  
  body('estimatedHours')
    .optional()
    .isNumeric()
    .withMessage('Estimated hours must be a number')
    .isFloat({ min: 0 })
    .withMessage('Estimated hours cannot be negative'),
  
  handleValidationErrors
];

// @desc    Validate urgent task creation
const validateUrgentTask = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Task title is required')
    .isLength({ max: 100 })
    .withMessage('Task title cannot exceed 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Task description cannot exceed 1000 characters'),
  
  body('project')
    .isMongoId()
    .withMessage('Valid project ID is required'),
  
  body('milestone')
    .isMongoId()
    .withMessage('Valid milestone ID is required'),
  
  body('assignedTo')
    .optional()
    .isArray()
    .withMessage('Assigned to must be an array'),
  
  body('assignedTo.*')
    .optional()
    .isMongoId()
    .withMessage('Each assignee must have a valid ID'),
  
  body('dueDate')
    .isISO8601()
    .withMessage('Valid due date is required'),
  
  body('estimatedHours')
    .optional()
    .isNumeric()
    .withMessage('Estimated hours must be a number')
    .isFloat({ min: 0 })
    .withMessage('Estimated hours cannot be negative'),
  
  handleValidationErrors
];

// @desc    Validate payment creation/update
const validatePayment = [
  body('project')
    .isMongoId()
    .withMessage('Valid project ID is required'),
  
  body('client')
    .isMongoId()
    .withMessage('Valid client ID is required'),
  
  body('milestone')
    .optional()
    .isMongoId()
    .withMessage('Valid milestone ID is required'),
  
  body('amount')
    .isNumeric()
    .withMessage('Amount must be a number')
    .isFloat({ min: 0 })
    .withMessage('Amount cannot be negative'),
  
  body('currency')
    .optional()
    .isIn(['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD'])
    .withMessage('Currency must be one of: USD, EUR, GBP, INR, CAD, AUD'),
  
  body('paymentType')
    .isIn(['advance', 'milestone', 'final', 'additional'])
    .withMessage('Payment type must be one of: advance, milestone, final, additional'),
  
  body('paymentMethod')
    .optional()
    .isIn(['bank_transfer', 'credit_card', 'debit_card', 'paypal', 'stripe', 'check', 'cash', 'other'])
    .withMessage('Invalid payment method'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
  
  handleValidationErrors
];

// @desc    Validate task status update
const validateTaskStatus = [
  body('status')
    .isIn(['pending', 'in-progress', 'testing', 'completed', 'cancelled'])
    .withMessage('Status must be one of: pending, in-progress, testing, completed, cancelled'),
  
  handleValidationErrors
];

// @desc    Validate task assignment
const validateTaskAssignment = [
  body('assignedTo')
    .isArray()
    .withMessage('Assigned to must be an array'),
  
  body('assignedTo.*')
    .isMongoId()
    .withMessage('Each assignee must have a valid ID'),
  
  handleValidationErrors
];

// @desc    Validate task comment
const validateTaskComment = [
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Comment message is required')
    .isLength({ max: 500 })
    .withMessage('Comment cannot exceed 500 characters'),
  
  handleValidationErrors
];

// @desc    Validate milestone progress update
const validateMilestoneProgress = [
  body('progress')
    .isInt({ min: 0, max: 100 })
    .withMessage('Progress must be an integer between 0 and 100'),
  
  handleValidationErrors
];

// @desc    Validate payment status update
const validatePaymentStatus = [
  body('status')
    .isIn(['pending', 'completed', 'failed', 'refunded'])
    .withMessage('Status must be one of: pending, completed, failed, refunded'),
  
  body('transactionId')
    .optional()
    .trim()
    .withMessage('Transaction ID must be a string'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
  
  handleValidationErrors
];

// @desc    Validate MongoDB ObjectId parameters
const validateObjectId = (paramName) => [
  param(paramName)
    .isMongoId()
    .withMessage(`Valid ${paramName} is required`),
  
  handleValidationErrors
];

// @desc    Validate query parameters for pagination
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('sortBy')
    .optional()
    .isString()
    .trim()
    .withMessage('Sort by must be a string'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc'),
  
  handleValidationErrors
];

// @desc    Validate file upload
const validateFileUpload = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded'
    });
  }

  // Check file size (5MB limit)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (req.file.size > maxSize) {
    return res.status(400).json({
      success: false,
      message: 'File size cannot exceed 5MB'
    });
  }

  // Check file type
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip',
    'application/x-rar-compressed'
  ];

  if (!allowedTypes.includes(req.file.mimetype)) {
    return res.status(400).json({
      success: false,
      message: 'File type not allowed'
    });
  }

  next();
};

module.exports = {
  validateProject,
  validateMilestone,
  validateTask,
  validateUrgentTask,
  validatePayment,
  validateTaskStatus,
  validateTaskAssignment,
  validateTaskComment,
  validateMilestoneProgress,
  validatePaymentStatus,
  validateObjectId,
  validatePagination,
  validateFileUpload,
  handleValidationErrors
};
