const mongoose = require('mongoose');
const Reward = require('../models/Reward');
const RewardTag = require('../models/RewardTag');
const Employee = require('../models/Employee');
const PM = require('../models/PM');
const Task = require('../models/Task');
const EmployeeReward = require('../models/EmployeeReward');
const PMReward = require('../models/PMReward');
const RewardSystemLog = require('../models/RewardSystemLog');
const rewardService = require('../services/rewardService');
const Salary = require('../models/Salary');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// Reward management page is for dev and PM only (sales rewards are in sales management)
const DEV_PM_TEAMS = ['dev', 'pm'];

const buildRewardQuery = (filters = {}) => {
  const query = {};

  if (filters.team && filters.team !== 'all') {
    query.team = filters.team;
  } else {
    query.team = { $in: DEV_PM_TEAMS };
  }

  if (filters.status) {
    query.isActive = filters.status === 'active';
  }

  if (filters.tag && filters.tag !== 'all' && mongoose.Types.ObjectId.isValid(filters.tag)) {
    query.tags = filters.tag;
  }

  if (filters.search) {
    const searchRegex = new RegExp(filters.search.trim(), 'i');
    query.$or = [
      { name: searchRegex },
      { description: searchRegex }
    ];
  }

  return query;
};

exports.getRewards = asyncHandler(async (req, res) => {
  const { team, status, tag, search } = req.query;
  const filters = buildRewardQuery({ team, status, tag, search });

  const rewards = await Reward.find(filters)
    .populate('tags')
    .sort({ createdAt: -1 })
    .lean();

  const totals = {
    count: rewards.length,
    active: rewards.filter(reward => reward.isActive).length,
    inactive: rewards.filter(reward => !reward.isActive).length,
    budget: rewards.reduce((sum, reward) => sum + reward.amount, 0)
  };

  res.json({
    success: true,
    data: rewards,
    totals
  });
});

exports.getRewardById = asyncHandler(async (req, res, next) => {
  const reward = await Reward.findById(req.params.id).populate('tags');

  if (!reward) {
    return next(new ErrorResponse('Reward not found', 404));
  }

  res.json({
    success: true,
    data: reward
  });
});

exports.createReward = asyncHandler(async (req, res, next) => {
  const {
    name,
    description,
    amount,
    team,
    criteriaType,
    criteriaValue,
    criteriaDescription,
    tags = [],
    startsOn,
    endsOn
  } = req.body;

  if (!name || !amount || !team || !criteriaType) {
    return next(new ErrorResponse('Name, amount, team and criteriaType are required', 400));
  }

  if (!['dev', 'pm'].includes(team)) {
    return next(new ErrorResponse('Team must be either dev or pm (sales rewards are managed in Sales Management)', 400));
  }

  if (typeof amount !== 'number' || Number.isNaN(amount) || amount <= 0) {
    return next(new ErrorResponse('Amount must be a positive number', 400));
  }

  const criteria = {
    type: criteriaType,
    value: criteriaValue,
    description: criteriaDescription
  };

  if (tags.length > 0) {
    const validTagIds = tags.filter(tagId => mongoose.Types.ObjectId.isValid(tagId));
    if (validTagIds.length !== tags.length) {
      return next(new ErrorResponse('One or more tags are invalid', 400));
    }

    const existingTags = await RewardTag.find({ _id: { $in: validTagIds }, isActive: true }).select('_id');
    if (existingTags.length !== validTagIds.length) {
      return next(new ErrorResponse('One or more tags do not exist or are inactive', 400));
    }
  }

  const reward = await Reward.create({
    name,
    description,
    amount,
    team,
    criteria,
    tags,
    startsOn,
    endsOn
  });

  const populatedReward = await Reward.findById(reward._id).populate('tags');

  res.status(201).json({
    success: true,
    data: populatedReward
  });
});

exports.updateReward = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const updates = { ...req.body };

  const reward = await Reward.findById(id);

  if (!reward) {
    return next(new ErrorResponse('Reward not found', 404));
  }

  if (updates.amount !== undefined) {
    if (typeof updates.amount !== 'number' || Number.isNaN(updates.amount) || updates.amount <= 0) {
      return next(new ErrorResponse('Amount must be a positive number', 400));
    }
  }

  if (updates.team && !['dev', 'pm'].includes(updates.team)) {
    return next(new ErrorResponse('Team must be either dev or pm', 400));
  }

  if (updates.criteriaType || updates.criteriaValue !== undefined || updates.criteriaDescription !== undefined) {
    reward.criteria = {
      type: updates.criteriaType || reward.criteria.type,
      value: updates.criteriaValue !== undefined ? updates.criteriaValue : reward.criteria.value,
      description: updates.criteriaDescription !== undefined ? updates.criteriaDescription : reward.criteria.description
    };

    delete updates.criteriaType;
    delete updates.criteriaValue;
    delete updates.criteriaDescription;
  }

  if (updates.tags) {
    const tags = Array.isArray(updates.tags) ? updates.tags : [];
    const validTagIds = tags.filter(tagId => mongoose.Types.ObjectId.isValid(tagId));
    if (validTagIds.length !== tags.length) {
      return next(new ErrorResponse('One or more tags are invalid', 400));
    }

    const existingTags = await RewardTag.find({ _id: { $in: validTagIds }, isActive: true }).select('_id');
    if (existingTags.length !== validTagIds.length) {
      return next(new ErrorResponse('One or more tags do not exist or are inactive', 400));
    }

    reward.tags = tags;
    delete updates.tags;
  }

  Object.assign(reward, updates);
  await reward.save();

  const populatedReward = await Reward.findById(id).populate('tags');

  res.json({
    success: true,
    data: populatedReward
  });
});

exports.toggleRewardStatus = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const reward = await Reward.findById(id);

  if (!reward) {
    return next(new ErrorResponse('Reward not found', 404));
  }

  reward.isActive = !reward.isActive;
  await reward.save();

  res.json({
    success: true,
    data: reward
  });
});

exports.deleteReward = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const reward = await Reward.findById(id);

  if (!reward) {
    return next(new ErrorResponse('Reward not found', 404));
  }

  await reward.deleteOne();

  res.json({
    success: true,
    message: 'Reward deleted successfully'
  });
});

exports.getTags = asyncHandler(async (req, res) => {
  const tags = await RewardTag.find({}).sort({ name: 1 }).lean();

  res.json({
    success: true,
    data: tags
  });
});

exports.createTag = asyncHandler(async (req, res, next) => {
  const { name, description, color } = req.body;

  if (!name) {
    return next(new ErrorResponse('Tag name is required', 400));
  }

  const existing = await RewardTag.findOne({ name: name.trim() });
  if (existing) {
    return next(new ErrorResponse('Tag name already exists', 409));
  }

  const tag = await RewardTag.create({
    name: name.trim(),
    description,
    color
  });

  res.status(201).json({
    success: true,
    data: tag
  });
});

exports.deleteTag = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const tag = await RewardTag.findById(id);

  if (!tag) {
    return next(new ErrorResponse('Tag not found', 404));
  }

  const isTagUsed = await Reward.exists({ tags: id });
  if (isTagUsed) {
    return next(new ErrorResponse('Tag cannot be deleted while assigned to rewards', 400));
  }

  await tag.deleteOne();

  res.json({
    success: true,
    message: 'Tag deleted successfully'
  });
});

// @desc    Award reward for current month to qualifying devs/PMs (task completion ratio >= criteria)
// @route   POST /api/admin/rewards/:id/award-month
// @access  Private (Admin)
exports.awardRewardForMonth = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const adminId = req.admin?._id || req.admin?.id;

  if (!adminId) {
    return next(new ErrorResponse('Admin context required', 401));
  }

  const reward = await Reward.findById(id);
  if (!reward) {
    return next(new ErrorResponse('Reward not found', 404));
  }

  if (!reward.isActive) {
    return next(new ErrorResponse('Reward is inactive. Activate it before awarding.', 400));
  }

  if (!['dev', 'pm'].includes(reward.team)) {
    return next(new ErrorResponse('Only dev and PM rewards can be awarded from this page', 400));
  }

  const criteriaValue = Number(reward.criteria?.value);
  if (Number.isNaN(criteriaValue) || criteriaValue < 0 || criteriaValue > 100) {
    return next(new ErrorResponse('Reward criteria value must be a completion percentage (0–100)', 400));
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const reason = `${reward.name} – ${now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} (task completion ≥ ${criteriaValue}%)`;
  const description = reward.description || reason;
  const category = reward.team === 'dev' ? 'Task Completion' : 'Project Completion';

  let awarded = 0;

  if (reward.team === 'dev') {
    const employees = await Employee.find({ isActive: true }).select('_id name statistics');
    for (const emp of employees) {
      await emp.updateStatistics();
      const rate = emp.statistics?.completionRate ?? 0;
      if (rate < criteriaValue) continue;

      const existing = await EmployeeReward.findOne({
        employeeId: emp._id,
        rewardId: reward._id,
        paidAt: { $gte: monthStart, $lte: monthEnd }
      });
      if (existing) continue;

      await EmployeeReward.create({
        employeeId: emp._id,
        amount: reward.amount,
        reason,
        description,
        category,
        status: 'paid',
        createdBy: adminId,
        paidAt: new Date(),
        rewardId: reward._id
      });
      awarded += 1;
    }
  } else {
    const pms = await PM.find({ isActive: true }).select('_id name projectsManaged');
    for (const pm of pms) {
      const projectIds = pm.projectsManaged && pm.projectsManaged.length > 0 ? pm.projectsManaged : [];
      const tasks = await Task.find({ project: { $in: projectIds }, status: { $ne: 'cancelled' } }).select('status');
      const total = tasks.length;
      const completed = tasks.filter(t => t.status === 'completed').length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
      if (rate < criteriaValue) continue;

      const existing = await PMReward.findOne({
        pmId: pm._id,
        rewardId: reward._id,
        paidAt: { $gte: monthStart, $lte: monthEnd }
      });
      if (existing) continue;

      await PMReward.create({
        pmId: pm._id,
        amount: reward.amount,
        reason,
        description,
        category,
        status: 'paid',
        createdBy: adminId,
        paidAt: new Date(),
        rewardId: reward._id
      });
      awarded += 1;
    }
  }

  res.json({
    success: true,
    message: `Reward awarded to ${awarded} ${reward.team === 'dev' ? 'developer(s)' : 'PM(s)'} for this month. They will see it in their wallet.`,
    data: { awarded }
  });
});

// @desc    Get reward system logs/history
// @route   GET /api/admin/rewards/history
// @access  Private (Admin)
exports.getRewardHistory = asyncHandler(async (req, res, next) => {
  const { month, team } = req.query;
  const filter = {};

  if (month) filter.month = month;
  if (team && team !== 'all') filter.team = team;

  const logs = await RewardSystemLog.find(filter)
    .sort({ processedAt: -1 })
    .limit(50);

  res.status(200).json({
    success: true,
    data: logs
  });
});

// @desc    Manually trigger monthly rewards processing
// @route   POST /api/admin/rewards/trigger-process
// @access  Private (Admin)
exports.triggerMonthlyProcess = asyncHandler(async (req, res, next) => {
  const { month } = req.body; // YYYY-MM

  if (!month) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a month in YYYY-MM format'
    });
  }

  const result = await rewardService.processMonthlyRewards(month, req.admin.id);

  if (result.success) {
    res.status(200).json({
      success: true,
      message: `Successfully processed rewards for ${month}`,
      data: result
    });
  } else {
    res.status(500).json({
      success: false,
      message: 'Failed to process rewards',
      error: result.error
    });
  }
});
