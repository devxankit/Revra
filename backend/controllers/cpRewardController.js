const ChannelPartner = require('../models/ChannelPartner');
const CPLead = require('../models/CPLead');
const Client = require('../models/Client');
const { CPWalletTransaction } = require('../models/CPWallet');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get rewards/incentives
// @route   GET /api/cp/rewards
// @access  Private (Channel Partner only)
exports.getRewards = asyncHandler(async (req, res, next) => {
  const cpId = req.channelPartner.id;

  // Get all active rewards set by admin
  const CPReward = require('../models/CPReward');
  const rewards = await CPReward.find({ isActive: true })
    .sort({ order: 1, createdAt: -1 })
    .select('name description level requirement rewardAmount order');

  // Get CP's conversion count to determine which rewards are unlocked
  const convertedLeads = await CPLead.countDocuments({
    assignedTo: cpId,
    status: 'converted'
  });

  // Check which rewards this CP has received (from wallet transactions)
  const receivedRewardTransactions = await CPWalletTransaction.find({
    channelPartner: cpId,
    type: 'credit',
    transactionType: 'reward'
  }).select('description createdAt');

  // Map rewards with status
  const rewardsWithStatus = rewards.map(reward => {
    const requirementValue = reward.requirement?.value || 0;
    const requirementType = reward.requirement?.type || 'conversions';
    
    // Check if CP has received this reward
    const hasReceived = receivedRewardTransactions.some(transaction => 
      transaction.description && transaction.description.includes(reward.name)
    );

    // Determine status
    let status = 'locked';
    if (hasReceived) {
      status = 'unlocked';
    } else if (requirementType === 'conversions' && convertedLeads >= requirementValue) {
      status = 'unlocked'; // Eligible but not yet distributed
    } else if (requirementType === 'conversions' && convertedLeads > 0 && convertedLeads < requirementValue) {
      status = 'in-progress';
    }

    return {
      ...reward.toObject(),
      status,
      currentProgress: requirementType === 'conversions' ? convertedLeads : 0,
      requirementValue
    };
  });

  res.status(200).json({
    success: true,
    count: rewardsWithStatus.length,
    data: rewardsWithStatus
  });
});

// @desc    Get incentives earned
// @route   GET /api/cp/rewards/incentives
// @access  Private (Channel Partner only)
exports.getIncentives = asyncHandler(async (req, res, next) => {
  const cpId = req.channelPartner.id;

  // Get incentive transactions
  const incentives = await CPWalletTransaction.find({
    channelPartner: cpId,
    type: 'credit',
    transactionType: 'incentive'
  })
    .sort({ createdAt: -1 });

  const totalIncentives = incentives.reduce((sum, inv) => sum + inv.amount, 0);

  res.status(200).json({
    success: true,
    count: incentives.length,
    total: totalIncentives,
    data: incentives
  });
});

// @desc    Get performance metrics
// @route   GET /api/cp/rewards/performance
// @access  Private (Channel Partner only)
exports.getPerformanceMetrics = asyncHandler(async (req, res, next) => {
  const cpId = req.channelPartner.id;

  // Get lead statistics
  const totalLeads = await CPLead.countDocuments({ assignedTo: cpId });
  const convertedLeads = await CPLead.countDocuments({
    assignedTo: cpId,
    status: 'converted'
  });
  const activeLeads = await CPLead.countDocuments({
    assignedTo: cpId,
    status: { $in: ['new', 'connected', 'followup'] }
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

  // Get earnings breakdown
  const earnings = await CPWalletTransaction.aggregate([
    {
      $match: {
        channelPartner: cpId,
        type: 'credit'
      }
    },
    {
      $group: {
        _id: '$transactionType',
        total: { $sum: '$amount' }
      }
    }
  ]);

  const earningsBreakdown = earnings.reduce((acc, item) => {
    acc[item._id] = item.total;
    return acc;
  }, {});

  // Get current level based on rewards
  const CPReward = require('../models/CPReward');
  const allRewards = await CPReward.find({ isActive: true })
    .sort({ order: 1, 'requirement.value': 1 });

  // Find current level (highest unlocked reward)
  let currentLevel = 'Bronze Partner';
  let nextLevel = 'Silver Partner';
  let progress = 0;

  // Check which rewards the CP has received
  const receivedRewardTransactions = await CPWalletTransaction.find({
    channelPartner: cpId,
    type: 'credit',
    transactionType: 'reward'
  }).select('description');

  // Find the highest level reward the CP has received
  let highestUnlockedReward = null;
  for (const reward of allRewards) {
    const hasReceived = receivedRewardTransactions.some(transaction => 
      transaction.description && transaction.description.includes(reward.name)
    );
    if (hasReceived) {
      highestUnlockedReward = reward;
      currentLevel = reward.level;
    }
  }

  // Find next level
  const nextReward = allRewards.find(reward => {
    if (highestUnlockedReward) {
      return reward.order > highestUnlockedReward.order || 
             (reward.requirement.value > (highestUnlockedReward.requirement.value || 0));
    } else {
      return reward.requirement.value > convertedLeads;
    }
  });

  if (nextReward) {
    nextLevel = nextReward.level;
    const currentRequirement = highestUnlockedReward?.requirement?.value || 0;
    const nextRequirement = nextReward.requirement.value;
    const progressValue = nextRequirement > currentRequirement 
      ? ((convertedLeads - currentRequirement) / (nextRequirement - currentRequirement)) * 100
      : 0;
    progress = Math.max(0, Math.min(100, progressValue));
  } else {
    // If no next reward, CP has reached the highest level
    progress = 100;
  }

  res.status(200).json({
    success: true,
    data: {
      leads: {
        total: totalLeads,
        converted: convertedLeads,
        active: activeLeads,
        conversionRate: parseFloat(conversionRate.toFixed(2))
      },
      clients: {
        total: totalClients
      },
      revenue: {
        total: totalRevenue
      },
      earnings: earningsBreakdown,
      currentLevel,
      nextLevel,
      progress: parseFloat(progress.toFixed(2)),
      convertedLeads
    }
  });
});
