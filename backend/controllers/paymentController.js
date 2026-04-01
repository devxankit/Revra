const Payment = require('../models/Payment');
const Project = require('../models/Project');
const Milestone = require('../models/Milestone');
const Activity = require('../models/Activity');
const Admin = require('../models/Admin');
const socketService = require('../services/socketService');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { createIncomingTransaction } = require('../utils/financeTransactionHelper');
const { mapPaymentMethodToFinance, mapPaymentTypeToCategory } = require('../utils/paymentMethodMapper');

// @desc    Create payment record
// @route   POST /api/payments
// @access  PM, Admin only
const createPaymentRecord = asyncHandler(async (req, res, next) => {
  const {
    project,
    client,
    milestone,
    amount,
    currency,
    paymentType,
    paymentMethod,
    notes
  } = req.body;

  // Verify project exists and user has access
  const projectDoc = await Project.findById(project);
  if (!projectDoc) {
    return next(new ErrorResponse('Project not found', 404));
  }

  // Check if user is PM of this project or Admin
  if (req.user.role === 'project-manager' && !projectDoc.projectManager.equals(req.user.id)) {
    return next(new ErrorResponse('Not authorized to create payment records for this project', 403));
  }

  // Verify client exists and matches project client
  if (!projectDoc.client.equals(client)) {
    return next(new ErrorResponse('Client does not match project client', 400));
  }

  // If milestone is provided, verify it belongs to the project
  if (milestone) {
    const milestoneDoc = await Milestone.findById(milestone);
    if (!milestoneDoc || !milestoneDoc.project.equals(project)) {
      return next(new ErrorResponse('Milestone does not belong to the specified project', 400));
    }
  }

  // Create payment record
  const payment = await Payment.create({
    project,
    client,
    milestone,
    amount,
    currency,
    paymentType,
    paymentMethod,
    notes,
    createdBy: req.user.id
  });

  // Populate the payment with related data
  await payment.populate([
    { path: 'project', select: 'name status' },
    { path: 'client', select: 'name companyName email' },
    { path: 'milestone', select: 'title sequence' },
    { path: 'createdBy', select: 'name email' }
  ]);

  // Log activity
  await Activity.logProjectActivity(
    project,
    'payment_created',
    req.user.id,
    'PM',
    `Payment record created for project "${projectDoc.name}" - ${amount} ${currency}`,
    { amount, currency, paymentType, projectName: projectDoc.name }
  );

  // Emit WebSocket events
  socketService.emitToProject(project, 'payment_created', {
    payment: payment,
    createdBy: req.user.name,
    timestamp: new Date()
  });

  // Notify client
  socketService.emitToUser(client, 'payment_created', {
    payment: payment,
    message: `New payment record created for project "${projectDoc.name}" - ${amount} ${currency}`
  });

  res.status(201).json({
    success: true,
    data: payment
  });
});

// @desc    Get payments by project
// @route   GET /api/payments/project/:projectId
// @access  PM, Client (if their project)
const getPaymentsByProject = asyncHandler(async (req, res, next) => {
  const { projectId } = req.params;

  // Verify project exists and user has access
  const project = await Project.findById(projectId);
  if (!project) {
    return next(new ErrorResponse('Project not found', 404));
  }

  // Check access permissions
  if (req.user.role === 'client' && !project.client.equals(req.user.id)) {
    return next(new ErrorResponse('Not authorized to access these payments', 403));
  }

  if (req.user.role === 'project-manager' && !project.projectManager.equals(req.user.id)) {
    return next(new ErrorResponse('Not authorized to access these payments', 403));
  }

  const payments = await Payment.find({ project: projectId })
    .populate('project', 'name status')
    .populate('client', 'name companyName email')
    .populate('milestone', 'title sequence')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: payments.length,
    data: payments
  });
});

// @desc    Get payments by client
// @route   GET /api/payments/client/:clientId
// @access  Client (own payments only), PM, Admin
const getPaymentsByClient = asyncHandler(async (req, res, next) => {
  const { clientId } = req.params;

  // Check access permissions
  if (req.user.role === 'client' && req.user.id !== clientId) {
    return next(new ErrorResponse('Not authorized to access these payments', 403));
  }

  const payments = await Payment.find({ client: clientId })
    .populate('project', 'name status')
    .populate('client', 'name companyName email')
    .populate('milestone', 'title sequence')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    count: payments.length,
    data: payments
  });
});

// @desc    Update payment status
// @route   PUT /api/payments/:id
// @access  PM, Admin only
const updatePaymentStatus = asyncHandler(async (req, res, next) => {
  const { status, transactionId, notes } = req.body;
  let payment = await Payment.findById(req.params.id);

  if (!payment) {
    return next(new ErrorResponse('Payment record not found', 404));
  }

  // Verify user has access to this payment
  const project = await Project.findById(payment.project);
  if (req.user.role === 'project-manager' && !project.projectManager.equals(req.user.id)) {
    return next(new ErrorResponse('Not authorized to update this payment', 403));
  }

  // Store previous status for transaction creation
  const previousStatus = payment.status;

  // Update payment based on status
  if (status === 'completed') {
    await payment.markPaid(transactionId);
    
    // Create finance transaction when payment is completed
    try {
      // Get Admin ID for createdBy - use req.admin.id if admin, otherwise find first admin
      let adminId = null;
      if (req.admin && req.admin.id) {
        adminId = req.admin.id;
      } else if (req.user && req.user.role === 'admin') {
        adminId = req.user.id;
      } else {
        // Find first active admin as fallback
        const admin = await Admin.findOne({ isActive: true }).select('_id');
        adminId = admin ? admin._id : null;
      }

      if (adminId && previousStatus !== 'completed') {
        await createIncomingTransaction({
          amount: payment.amount,
          category: mapPaymentTypeToCategory(payment.paymentType),
          transactionDate: payment.paidAt || new Date(),
          createdBy: adminId,
          client: payment.client,
          project: payment.project,
          paymentMethod: mapPaymentMethodToFinance(payment.paymentMethod),
          description: `${mapPaymentTypeToCategory(payment.paymentType)} payment for project "${project.name}" - ${payment.amount} ${payment.currency}`,
          metadata: {
            sourceType: 'payment',
            sourceId: payment._id.toString(),
            paymentType: payment.paymentType,
            milestoneId: payment.milestone ? payment.milestone.toString() : null
          },
          checkDuplicate: true
        });

      }
    } catch (error) {
      // Log error but don't fail the payment update
      console.error('Error creating finance transaction for payment:', error);
    }
  } else if (status === 'failed') {
    await payment.markFailed(notes);
  } else if (status === 'refunded') {
    await payment.markRefunded(notes);
  } else {
    payment.status = status;
    if (notes) payment.notes = notes;
    await payment.save();
  }

  // Populate payment data
  await payment.populate([
    { path: 'project', select: 'name status' },
    { path: 'client', select: 'name companyName email' },
    { path: 'milestone', select: 'title sequence' },
    { path: 'createdBy', select: 'name email' }
  ]);

  // Log activity
  await Activity.logProjectActivity(
    payment.project,
    'payment_updated',
    req.user.id,
    'PM',
    `Payment status updated to ${status} for project "${project.name}"`,
    { amount: payment.amount, currency: payment.currency, status, projectName: project.name }
  );

  res.json({
    success: true,
    data: payment
  });
});

// @desc    Get payment statistics
// @route   GET /api/payments/statistics
// @access  PM, Admin
const getPaymentStatistics = asyncHandler(async (req, res, next) => {
  const filter = {};

  // Role-based filtering
  if (req.user.role === 'project-manager') {
    const pmProjects = await Project.find({ projectManager: req.user.id }).select('_id');
    filter.project = { $in: pmProjects.map(p => p._id) };
  } else if (req.user.role === 'client') {
    filter.client = req.user.id;
  }

  const stats = await Payment.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);

  const paymentTypeStats = await Payment.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$paymentType',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);

  const result = {
    byStatus: {
      pending: { count: 0, totalAmount: 0 },
      completed: { count: 0, totalAmount: 0 },
      failed: { count: 0, totalAmount: 0 },
      refunded: { count: 0, totalAmount: 0 }
    },
    byType: {
      advance: { count: 0, totalAmount: 0 },
      milestone: { count: 0, totalAmount: 0 },
      final: { count: 0, totalAmount: 0 },
      additional: { count: 0, totalAmount: 0 }
    },
    total: { count: 0, totalAmount: 0 }
  };

  stats.forEach(stat => {
    result.byStatus[stat._id] = {
      count: stat.count,
      totalAmount: stat.totalAmount
    };
    result.total.count += stat.count;
    result.total.totalAmount += stat.totalAmount;
  });

  paymentTypeStats.forEach(stat => {
    result.byType[stat._id] = {
      count: stat.count,
      totalAmount: stat.totalAmount
    };
  });

  res.json({
    success: true,
    data: result
  });
});

// @desc    Get project payment statistics
// @route   GET /api/payments/project/:projectId/statistics
// @access  PM, Client (if their project)
const getProjectPaymentStatistics = asyncHandler(async (req, res, next) => {
  const { projectId } = req.params;

  // Verify project exists and user has access
  const project = await Project.findById(projectId);
  if (!project) {
    return next(new ErrorResponse('Project not found', 404));
  }

  // Check access permissions
  if (req.user.role === 'client' && !project.client.equals(req.user.id)) {
    return next(new ErrorResponse('Not authorized to access these statistics', 403));
  }

  if (req.user.role === 'project-manager' && !project.projectManager.equals(req.user.id)) {
    return next(new ErrorResponse('Not authorized to access these statistics', 403));
  }

  const stats = await Payment.getProjectPaymentStats(projectId);

  res.json({
    success: true,
    data: stats
  });
});

// @desc    Get client payment statistics
// @route   GET /api/payments/client/:clientId/statistics
// @access  Client (own statistics only), PM, Admin
const getClientPaymentStatistics = asyncHandler(async (req, res, next) => {
  const { clientId } = req.params;

  // Check access permissions
  if (req.user.role === 'client' && req.user.id !== clientId) {
    return next(new ErrorResponse('Not authorized to access these statistics', 403));
  }

  const stats = await Payment.getClientPaymentStats(clientId);

  res.json({
    success: true,
    data: stats
  });
});

module.exports = {
  createPaymentRecord,
  getPaymentsByProject,
  getPaymentsByClient,
  updatePaymentStatus,
  getPaymentStatistics,
  getProjectPaymentStatistics,
  getClientPaymentStatistics
};
