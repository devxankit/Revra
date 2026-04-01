const CPLead = require('../models/CPLead');
const Client = require('../models/Client');
const ChannelPartner = require('../models/ChannelPartner');
const { CPWalletTransaction } = require('../models/CPWallet');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get dashboard statistics
// @route   GET /api/cp/dashboard/stats
// @access  Private (Channel Partner only)
exports.getDashboardStats = asyncHandler(async (req, res, next) => {
  const cpId = req.channelPartner.id;

  // Get lead statistics
  const totalLeads = await CPLead.countDocuments({ assignedTo: cpId });
  const convertedLeads = await CPLead.countDocuments({
    assignedTo: cpId,
    status: 'converted'
  });
  const pendingLeads = await CPLead.countDocuments({
    assignedTo: cpId,
    status: { $in: ['new', 'connected', 'followup'] }
  });
  const lostLeads = await CPLead.countDocuments({
    assignedTo: cpId,
    status: 'lost'
  });

  // Get client statistics
  const totalClients = await Client.countDocuments({
    createdBy: cpId,
    creatorModel: 'ChannelPartner'
  });

  // Get revenue
  const cp = await ChannelPartner.findById(cpId);
  const totalRevenue = cp?.totalRevenue || 0;

  // Get conversion rate
  const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

  // Get wallet balance
  const { CPWallet } = require('../models/CPWallet');
  const wallet = await CPWallet.findOne({ channelPartner: cpId });
  const walletBalance = wallet?.balance || 0;

  res.status(200).json({
    success: true,
    data: {
      leads: {
        total: totalLeads,
        converted: convertedLeads,
        pending: pendingLeads,
        lost: lostLeads,
        conversionRate: parseFloat(conversionRate.toFixed(2))
      },
      clients: {
        total: totalClients
      },
      revenue: {
        total: totalRevenue
      },
      wallet: {
        balance: walletBalance
      }
    }
  });
});

// @desc    Get recent activity
// @route   GET /api/cp/dashboard/activity
// @access  Private (Channel Partner only)
exports.getRecentActivity = asyncHandler(async (req, res, next) => {
  const cpId = req.channelPartner.id;
  const { limit = 10 } = req.query;

  const limitNum = parseInt(limit, 10);

  // Get recent leads
  const recentLeads = await CPLead.find({ assignedTo: cpId })
    .populate('category', 'name color icon')
    .sort({ createdAt: -1 })
    .limit(limitNum)
    .select('name phone status priority createdAt');

  // Get recent clients
  const recentClients = await Client.find({
    createdBy: cpId,
    creatorModel: 'ChannelPartner'
  })
    .sort({ createdAt: -1 })
    .limit(limitNum)
    .select('name email phoneNumber companyName createdAt');

  // Get recent transactions
  const { CPWallet } = require('../models/CPWallet');
  const wallet = await CPWallet.findOne({ channelPartner: cpId });
  let recentTransactions = [];
  if (wallet) {
    recentTransactions = await CPWalletTransaction.find({ wallet: wallet._id })
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .select('type amount transactionType description createdAt');
  }

  res.status(200).json({
    success: true,
    data: {
      leads: recentLeads,
      clients: recentClients,
      transactions: recentTransactions
    }
  });
});

// @desc    Get lead trends
// @route   GET /api/cp/dashboard/lead-trends
// @access  Private (Channel Partner only)
exports.getLeadTrends = asyncHandler(async (req, res, next) => {
  const cpId = req.channelPartner.id;
  const { days = 30 } = req.query;

  const daysNum = parseInt(days, 10);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysNum);

  // Get leads by date
  const leadsByDate = await CPLead.aggregate([
    {
      $match: {
        assignedTo: cpId,
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        count: { $sum: 1 },
        converted: {
          $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] }
        }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
  ]);

  res.status(200).json({
    success: true,
    data: leadsByDate
  });
});

// @desc    Get conversion funnel
// @route   GET /api/cp/dashboard/conversion-funnel
// @access  Private (Channel Partner only)
exports.getConversionFunnel = asyncHandler(async (req, res, next) => {
  const cpId = req.channelPartner.id;

  const funnel = await CPLead.aggregate([
    {
      $match: { assignedTo: cpId }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const funnelData = funnel.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});

  res.status(200).json({
    success: true,
    data: funnelData
  });
});

// @desc    Get revenue chart data (uses conversionData.totalCost when available, else lead.value)
// @route   GET /api/cp/dashboard/revenue-chart
// @access  Private (Channel Partner only)
exports.getRevenueChart = asyncHandler(async (req, res, next) => {
  const cpId = req.channelPartner.id;
  const { months = 12 } = req.query;

  const monthsNum = parseInt(months, 10);
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - monthsNum);

  // Get revenue from converted leads; use leadProfile.conversionData.totalCost when available
  const revenueByMonth = await CPLead.aggregate([
    {
      $match: {
        assignedTo: cpId,
        status: 'converted',
        convertedAt: { $gte: startDate }
      }
    },
    {
      $lookup: {
        from: 'cpleadprofiles',
        localField: 'leadProfile',
        foreignField: '_id',
        as: 'profile'
      }
    },
    { $unwind: { path: '$profile', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: {
          year: { $year: '$convertedAt' },
          month: { $month: '$convertedAt' }
        },
        revenue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ['$profile', null] },
                  { $ne: ['$profile.conversionData', null] },
                  { $gt: ['$profile.conversionData.totalCost', 0] }
                ]
              },
              '$profile.conversionData.totalCost',
              '$value'
            ]
          }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  res.status(200).json({
    success: true,
    data: revenueByMonth
  });
});
