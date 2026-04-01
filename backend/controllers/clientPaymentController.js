const Payment = require('../models/Payment');
const Project = require('../models/Project');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get client's payment history
// @route   GET /api/client/payments
// @access  Client only
const getClientPayments = asyncHandler(async (req, res, next) => {
  const clientId = req.user.id;
  const { status, paymentType, project, page = 1, limit = 20 } = req.query;
  
  // Build filter - client can only see their own payments
  const filter = { client: clientId };
  if (status) filter.status = status;
  if (paymentType) filter.paymentType = paymentType;
  if (project) filter.project = project;

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const payments = await Payment.find(filter)
    .populate('project', 'name status')
    .populate('milestone', 'title status')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Payment.countDocuments(filter);

  res.json({
    success: true,
    count: payments.length,
    total,
    data: payments,
    pagination: {
      current: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      total
    }
  });
});

// @desc    Get payment details (Client view - only their payments)
// @route   GET /api/client/payments/:id
// @access  Client only
const getClientPaymentById = asyncHandler(async (req, res, next) => {
  const clientId = req.user.id;
  
  const payment = await Payment.findOne({
    _id: req.params.id,
    client: clientId
  })
    .populate('project', 'name status description')
    .populate('milestone', 'title status description');

  if (!payment) {
    return next(new ErrorResponse('Payment not found or you do not have access to this payment', 404));
  }

  res.json({
    success: true,
    data: payment
  });
});

// @desc    Get project payments (Client view - only their projects)
// @route   GET /api/client/payments/project/:projectId
// @access  Client only
const getClientProjectPayments = asyncHandler(async (req, res, next) => {
  const clientId = req.user.id;
  const projectId = req.params.projectId;

  // First verify client owns the project
  const Project = require('../models/Project');
  const project = await Project.findOne({
    _id: projectId,
    client: clientId
  });

  if (!project) {
    return next(new ErrorResponse('Project not found or you do not have access to this project', 404));
  }

  const payments = await Payment.find({ 
    project: projectId,
    client: clientId
  })
    .populate('milestone', 'title sequence status')
    .populate('project', 'name status')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: payments
  });
});

// @desc    Get payment statistics (Client view - only their payments)
// @route   GET /api/client/payments/statistics
// @access  Client only
const getClientPaymentStatistics = asyncHandler(async (req, res, next) => {
  const clientId = req.user.id;

  // Get payment statistics
  const paymentStats = await Payment.aggregate([
    { $match: { client: clientId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);

  // Get payment type statistics
  const paymentTypeStats = await Payment.aggregate([
    { $match: { client: clientId } },
    {
      $group: {
        _id: '$paymentType',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);

  // Get project-wise payment statistics
  const projectPaymentStats = await Payment.aggregate([
    { $match: { client: clientId } },
    {
      $group: {
        _id: '$project',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        paidAmount: {
          $sum: {
            $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0]
          }
        },
        pendingAmount: {
          $sum: {
            $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0]
          }
        }
      }
    },
    {
      $lookup: {
        from: 'projects',
        localField: '_id',
        foreignField: '_id',
        as: 'project'
      }
    },
    { $unwind: '$project' },
    {
      $project: {
        _id: 1,
        projectName: '$project.name',
        projectStatus: '$project.status',
        count: 1,
        totalAmount: 1,
        paidAmount: 1,
        pendingAmount: 1
      }
    }
  ]);

  const result = {
    totalPayments: paymentStats.reduce((sum, stat) => sum + stat.count, 0),
    totalAmount: paymentStats.reduce((sum, stat) => sum + (stat.totalAmount || 0), 0),
    paidAmount: paymentStats.find(p => p._id === 'completed')?.totalAmount || 0,
    pendingAmount: paymentStats.find(p => p._id === 'pending')?.totalAmount || 0,
    failedAmount: paymentStats.find(p => p._id === 'failed')?.totalAmount || 0,
    paymentStatusBreakdown: paymentStats,
    paymentTypeBreakdown: paymentTypeStats,
    projectPaymentBreakdown: projectPaymentStats
  };

  res.json({
    success: true,
    data: result
  });
});

module.exports = {
  getClientPayments,
  getClientPaymentById,
  getClientProjectPayments,
  getClientPaymentStatistics
};
