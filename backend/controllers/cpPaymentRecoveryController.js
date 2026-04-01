const Client = require('../models/Client');
const Payment = require('../models/Payment');
const Project = require('../models/Project');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get pending payments
// @route   GET /api/cp/payment-recovery/pending
// @access  Private (Channel Partner only)
exports.getPendingPayments = asyncHandler(async (req, res, next) => {
  const cpId = req.channelPartner.id;
  const { page = 1, limit = 20 } = req.query;

  // Get clients created by this CP
  const clients = await Client.find({
    createdBy: cpId,
    creatorModel: 'ChannelPartner'
  }).select('_id');

  const clientIds = clients.map(c => c._id);

  if (clientIds.length === 0) {
    return res.status(200).json({
      success: true,
      count: 0,
      total: 0,
      page: 1,
      pages: 0,
      data: []
    });
  }

  // Get projects for these clients
  const projects = await Project.find({
    client: { $in: clientIds }
  }).select('_id client name');

  const projectIds = projects.map(p => p._id);

  if (projectIds.length === 0) {
    return res.status(200).json({
      success: true,
      count: 0,
      total: 0,
      page: 1,
      pages: 0,
      data: []
    });
  }

  // Get pending payments
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const payments = await Payment.find({
    project: { $in: projectIds },
    status: { $in: ['pending', 'overdue'] }
  })
    .populate('project', 'name client')
    .populate({
      path: 'project',
      populate: {
        path: 'client',
        select: 'name email phoneNumber companyName'
      }
    })
    .sort({ dueDate: 1 })
    .skip(skip)
    .limit(limitNum);

  const total = await Payment.countDocuments({
    project: { $in: projectIds },
    status: { $in: ['pending', 'overdue'] }
  });

  res.status(200).json({
    success: true,
    count: payments.length,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
    data: payments
  });
});

// @desc    Get payment history
// @route   GET /api/cp/payment-recovery/history
// @access  Private (Channel Partner only)
exports.getPaymentHistory = asyncHandler(async (req, res, next) => {
  const cpId = req.channelPartner.id;
  const { status, page = 1, limit = 20 } = req.query;

  // Get clients created by this CP
  const clients = await Client.find({
    createdBy: cpId,
    creatorModel: 'ChannelPartner'
  }).select('_id');

  const clientIds = clients.map(c => c._id);

  if (clientIds.length === 0) {
    return res.status(200).json({
      success: true,
      count: 0,
      total: 0,
      page: 1,
      pages: 0,
      data: []
    });
  }

  // Get projects for these clients
  const projects = await Project.find({
    client: { $in: clientIds }
  }).select('_id');

  const projectIds = projects.map(p => p._id);

  if (projectIds.length === 0) {
    return res.status(200).json({
      success: true,
      count: 0,
      total: 0,
      page: 1,
      pages: 0,
      data: []
    });
  }

  const query = { project: { $in: projectIds } };
  if (status) query.status = status;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const payments = await Payment.find(query)
    .populate('project', 'name client')
    .populate({
      path: 'project',
      populate: {
        path: 'client',
        select: 'name email phoneNumber companyName'
      }
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const total = await Payment.countDocuments(query);

  res.status(200).json({
    success: true,
    count: payments.length,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
    data: payments
  });
});

// @desc    Update payment status (for tracking)
// @route   PATCH /api/cp/payment-recovery/:id/status
// @access  Private (Channel Partner only)
exports.updatePaymentStatus = asyncHandler(async (req, res, next) => {
  const cpId = req.channelPartner.id;
  const paymentId = req.params.id;
  const { notes } = req.body;

  // Verify payment belongs to CP's client
  const payment = await Payment.findById(paymentId)
    .populate({
      path: 'project',
      populate: {
        path: 'client'
      }
    });

  if (!payment) {
    return next(new ErrorResponse('Payment not found', 404));
  }

  const client = payment.project?.client;
  if (!client || client.createdBy?.toString() !== cpId || client.creatorModel !== 'ChannelPartner') {
    return next(new ErrorResponse('Payment does not belong to your clients', 403));
  }

  // Add notes if provided (for tracking purposes)
  // Note: Actual status update should be done by admin/PM
  if (notes) {
    payment.notes = notes;
    await payment.save();
  }

  res.status(200).json({
    success: true,
    message: 'Payment notes updated successfully',
    data: payment
  });
});
