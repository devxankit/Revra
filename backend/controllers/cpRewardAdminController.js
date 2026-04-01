const CPReward = require('../models/CPReward');
const { CPWalletTransaction } = require('../models/CPWallet');
const ChannelPartner = require('../models/ChannelPartner');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all channel partner rewards
// @route   GET /api/admin/channel-partners/rewards
// @access  Private (Admin only)
exports.getAllCPRewards = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 20, isActive } = req.query;
  
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Build filter
  let filter = {};
  if (isActive !== undefined) {
    filter.isActive = isActive === 'true';
  }

  // Get total count
  const total = await CPReward.countDocuments(filter);

  // Get rewards
  const rewards = await CPReward.find(filter)
    .populate('createdBy', 'name email')
    .sort({ order: 1, createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  // Get count of channel partners who won each reward
  const rewardsWithCounts = await Promise.all(
    rewards.map(async (reward) => {
      // Count unique channel partners who have received this reward
      // We'll match by description or reference that contains reward name/level
      const rewardTransactions = await CPWalletTransaction.find({
        type: 'credit',
        transactionType: 'reward',
        description: { $regex: reward.name, $options: 'i' }
      }).distinct('channelPartner');

      const winnersCount = rewardTransactions.length;

      return {
        ...reward.toObject(),
        winnersCount
      };
    })
  );

  res.status(200).json({
    success: true,
    count: rewardsWithCounts.length,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
    data: rewardsWithCounts
  });
});

// @desc    Get single channel partner reward
// @route   GET /api/admin/channel-partners/rewards/:id
// @access  Private (Admin only)
exports.getCPReward = asyncHandler(async (req, res, next) => {
  const reward = await CPReward.findById(req.params.id)
    .populate('createdBy', 'name email');
  
  if (!reward) {
    return next(new ErrorResponse('Reward not found', 404));
  }

  // Get count of winners
  const rewardTransactions = await CPWalletTransaction.find({
    type: 'credit',
    transactionType: 'reward',
    description: { $regex: reward.name, $options: 'i' }
  }).distinct('channelPartner');

  const winnersCount = rewardTransactions.length;

  // Get list of winners
  const winners = await ChannelPartner.find({
    _id: { $in: rewardTransactions }
  }).select('name email phoneNumber partnerId');

  res.status(200).json({
    success: true,
    data: {
      ...reward.toObject(),
      winnersCount,
      winners
    }
  });
});

// @desc    Create channel partner reward
// @route   POST /api/admin/channel-partners/rewards
// @access  Private (Admin only)
exports.createCPReward = asyncHandler(async (req, res, next) => {
  const { name, description, level, requirement, rewardAmount, order } = req.body;

  // Validation
  if (!name || !level || !requirement || !requirement.type || requirement.value === undefined || !rewardAmount) {
    return next(new ErrorResponse('Please provide all required fields', 400));
  }

  // Check if reward with same level already exists
  const existingReward = await CPReward.findOne({ level: level.trim() });
  if (existingReward) {
    return next(new ErrorResponse('Reward with this level already exists', 400));
  }

  const reward = await CPReward.create({
    name: name.trim(),
    description: description?.trim(),
    level: level.trim(),
    requirement: {
      type: requirement.type,
      value: requirement.value,
      description: requirement.description?.trim()
    },
    rewardAmount,
    order: order || 0,
    createdBy: req.admin.id
  });

  await reward.populate('createdBy', 'name email');

  res.status(201).json({
    success: true,
    message: 'Reward created successfully',
    data: reward
  });
});

// @desc    Update channel partner reward
// @route   PUT /api/admin/channel-partners/rewards/:id
// @access  Private (Admin only)
exports.updateCPReward = asyncHandler(async (req, res, next) => {
  const { name, description, level, requirement, rewardAmount, isActive, order } = req.body;

  let reward = await CPReward.findById(req.params.id);
  
  if (!reward) {
    return next(new ErrorResponse('Reward not found', 404));
  }

  // Check if level is being changed and if new level already exists
  if (level && level.trim() !== reward.level) {
    const existingReward = await CPReward.findOne({ level: level.trim(), _id: { $ne: reward._id } });
    if (existingReward) {
      return next(new ErrorResponse('Reward with this level already exists', 400));
    }
  }

  // Update fields
  if (name) reward.name = name.trim();
  if (description !== undefined) reward.description = description?.trim();
  if (level) reward.level = level.trim();
  if (requirement) {
    if (requirement.type) reward.requirement.type = requirement.type;
    if (requirement.value !== undefined) reward.requirement.value = requirement.value;
    if (requirement.description !== undefined) reward.requirement.description = requirement.description?.trim();
  }
  if (rewardAmount !== undefined) reward.rewardAmount = rewardAmount;
  if (isActive !== undefined) reward.isActive = isActive;
  if (order !== undefined) reward.order = order;

  await reward.save();
  await reward.populate('createdBy', 'name email');

  res.status(200).json({
    success: true,
    message: 'Reward updated successfully',
    data: reward
  });
});

// @desc    Delete channel partner reward
// @route   DELETE /api/admin/channel-partners/rewards/:id
// @access  Private (Admin only)
exports.deleteCPReward = asyncHandler(async (req, res, next) => {
  const reward = await CPReward.findById(req.params.id);
  
  if (!reward) {
    return next(new ErrorResponse('Reward not found', 404));
  }

  await CPReward.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Reward deleted successfully'
  });
});

// @desc    Get reward statistics
// @route   GET /api/admin/channel-partners/rewards/statistics
// @access  Private (Admin only)
exports.getCPRewardStatistics = asyncHandler(async (req, res, next) => {
  const [totalRewards, activeRewards, totalDistributed] = await Promise.all([
    CPReward.countDocuments(),
    CPReward.countDocuments({ isActive: true }),
    CPWalletTransaction.countDocuments({
      type: 'credit',
      transactionType: 'reward'
    })
  ]);

  // Get total reward amount distributed
  const totalAmountDistributed = await CPWalletTransaction.aggregate([
    {
      $match: {
        type: 'credit',
        transactionType: 'reward'
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$amount' }
      }
    }
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalRewards,
      activeRewards,
      totalDistributed,
      totalAmountDistributed: totalAmountDistributed[0]?.total || 0
    }
  });
});
