const Lead = require('../models/Lead');
const LeadCategory = require('../models/LeadCategory');
const Incentive = require('../models/Incentive');
const Sales = require('../models/Sales');
const Admin = require('../models/Admin');
const Client = require('../models/Client');
const Project = require('../models/Project');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Create single lead
// @route   POST /api/admin/sales/leads
// @access  Private (Admin/HR only)
const createLead = asyncHandler(async (req, res, next) => {
  const { phone, name, company, email, category, priority, value, notes } = req.body;

  // Validate required fields
  if (!phone || !category) {
    return next(new ErrorResponse('Phone number and category are required', 400));
  }

  // Check if lead with phone number already exists
  const existingLead = await Lead.findOne({ phone });
  if (existingLead) {
    return next(new ErrorResponse('Lead with this phone number already exists', 400));
  }

  // Verify category exists
  const categoryExists = await LeadCategory.findById(category);
  if (!categoryExists) {
    return next(new ErrorResponse('Invalid category', 400));
  }

  const lead = await Lead.create({
    phone,
    name,
    company,
    email,
    category,
    priority: priority || 'medium',
    notes,
    createdBy: req.admin.id,
    creatorModel: 'Admin'
  });

  await lead.populate('category', 'name color icon');
  await lead.populate('createdBy', 'name');

  res.status(201).json({
    success: true,
    message: 'Lead created successfully',
    data: lead
  });
});

// @desc    Create bulk leads
// @route   POST /api/admin/sales/leads/bulk
// @access  Private (Admin/HR only)
const createBulkLeads = asyncHandler(async (req, res, next) => {
  const { phoneNumbers, category, priority } = req.body;

  if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
    return next(new ErrorResponse('Phone numbers array is required', 400));
  }

  if (phoneNumbers.length > 1000) {
    return next(new ErrorResponse('Cannot process more than 1000 leads at once', 400));
  }

  if (!category) {
    return next(new ErrorResponse('Category is required for bulk upload', 400));
  }

  // Verify category exists
  const categoryExists = await LeadCategory.findById(category);
  if (!categoryExists) {
    return next(new ErrorResponse('Invalid category', 400));
  }

  const results = {
    created: 0,
    skipped: 0,
    errors: []
  };

  for (const phone of phoneNumbers) {
    try {
      // Validate phone number format
      if (!/^[0-9]{10}$/.test(phone)) {
        results.errors.push({ phone, error: 'Invalid phone number format' });
        results.skipped++;
        continue;
      }

      // Check if lead already exists
      const existingLead = await Lead.findOne({ phone });
      if (existingLead) {
        results.errors.push({ phone, error: 'Lead already exists' });
        results.skipped++;
        continue;
      }

      await Lead.create({
        phone,
        category,
        priority: priority || 'medium',
        source: 'bulk_upload',
        createdBy: req.admin.id,
        creatorModel: 'Admin'
      });

      results.created++;
    } catch (error) {
      results.errors.push({ phone, error: error.message });
      results.skipped++;
    }
  }

  res.status(201).json({
    success: true,
    message: `Bulk upload completed. Created: ${results.created}, Skipped: ${results.skipped}`,
    data: results
  });
});

// @desc    Get all leads with filtering and pagination
// @route   GET /api/admin/sales/leads
// @access  Private (Admin/HR only)
const getAllLeads = asyncHandler(async (req, res, next) => {
  const {
    status,
    category,
    assignedTo,
    priority,
    search,
    page = 1,
    limit = 12,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Build filter object
  let filter = {};

  if (status && status !== 'all') {
    filter.status = status;
  }

  if (category && category !== 'all') {
    filter.category = category;
  }

  if (assignedTo && assignedTo !== 'all') {
    if (assignedTo === 'unassigned') {
      filter.assignedTo = null;
    } else if (assignedTo === 'assigned') {
      filter.assignedTo = { $ne: null }; // Not null = assigned
    } else {
      filter.assignedTo = assignedTo;
    }
  }

  if (priority && priority !== 'all') {
    filter.priority = priority;
  }

  if (search) {
    filter.$or = [
      { phone: { $regex: search, $options: 'i' } },
      { name: { $regex: search, $options: 'i' } },
      { company: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  // Calculate pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Sort options
  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const leads = await Lead.find(filter)
    .populate('category', 'name color icon')
    .populate('assignedTo', 'name email')
    .populate('createdBy', 'name')
    .populate('leadProfile', 'name businessName email conversionData estimatedCost')
    .sort(sortOptions)
    .skip(skip)
    .limit(limitNum);

  const totalLeads = await Lead.countDocuments(filter);

  res.status(200).json({
    success: true,
    count: leads.length,
    total: totalLeads,
    page: pageNum,
    pages: Math.ceil(totalLeads / limitNum),
    data: leads
  });
});

// @desc    Get single lead
// @route   GET /api/admin/sales/leads/:id
// @access  Private (Admin/HR only)
const getLeadById = asyncHandler(async (req, res, next) => {
  const lead = await Lead.findById(req.params.id)
    .populate('category', 'name color icon')
    .populate('assignedTo', 'name email phone')
    .populate('createdBy', 'name');

  if (!lead) {
    return next(new ErrorResponse('Lead not found', 404));
  }

  res.status(200).json({
    success: true,
    data: lead
  });
});

// @desc    Update lead
// @route   PUT /api/admin/sales/leads/:id
// @access  Private (Admin/HR only)
const updateLead = asyncHandler(async (req, res, next) => {
  const { name, company, email, status, priority, category, value, notes, assignedTo } = req.body;

  let lead = await Lead.findById(req.params.id);

  if (!lead) {
    return next(new ErrorResponse('Lead not found', 404));
  }

  // Update fields
  if (name !== undefined) lead.name = name;
  if (company !== undefined) lead.company = company;
  if (email !== undefined) lead.email = email;
  if (status !== undefined) lead.status = status;
  if (priority !== undefined) lead.priority = priority;
  if (category !== undefined) lead.category = category;
  if (value !== undefined) lead.value = value;
  if (notes !== undefined) lead.notes = notes;
  if (assignedTo !== undefined) lead.assignedTo = assignedTo;

  // Update last contact date if status changed
  if (status && ['connected', 'hot', 'converted'].includes(status)) {
    lead.lastContactDate = new Date();
  }

  await lead.save();

  await lead.populate('category', 'name color icon');
  await lead.populate('assignedTo', 'name email');
  await lead.populate('createdBy', 'name');

  res.status(200).json({
    success: true,
    message: 'Lead updated successfully',
    data: lead
  });
});

// @desc    Delete lead
// @route   DELETE /api/admin/sales/leads/:id
// @access  Private (Admin/HR only)
const deleteLead = asyncHandler(async (req, res, next) => {
  const lead = await Lead.findById(req.params.id);

  if (!lead) {
    return next(new ErrorResponse('Lead not found', 404));
  }

  await Lead.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Lead deleted successfully'
  });
});

// @desc    Get lead statistics
// @route   GET /api/admin/sales/leads/statistics
// @access  Private (Admin/HR only)
const getLeadStatistics = asyncHandler(async (req, res, next) => {
  const { period = 'all' } = req.query;

  let dateFilter = {};
  if (period !== 'all') {
    const now = new Date();
    let startDate;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }

    if (startDate) {
      dateFilter.createdAt = { $gte: startDate };
    }
  }

  const stats = await Lead.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: null,
        totalLeads: { $sum: 1 },
        newLeads: {
          $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] }
        },
        connectedLeads: {
          $sum: { $cond: [{ $eq: ['$status', 'connected'] }, 1, 0] }
        },
        hotLeads: {
          $sum: { $cond: [{ $eq: ['$status', 'hot'] }, 1, 0] }
        },
        convertedLeads: {
          $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] }
        },
        lostLeads: {
          $sum: { $cond: [{ $eq: ['$status', 'lost'] }, 1, 0] }
        },
        totalValue: { $sum: '$value' },
        convertedValue: {
          $sum: { $cond: [{ $eq: ['$status', 'converted'] }, '$value', 0] }
        },
        assignedLeads: {
          $sum: { $cond: [{ $ne: ['$assignedTo', null] }, 1, 0] }
        },
        unassignedLeads: {
          $sum: { $cond: [{ $eq: ['$assignedTo', null] }, 1, 0] }
        }
      }
    }
  ]);

  const result = stats[0] || {
    totalLeads: 0,
    newLeads: 0,
    connectedLeads: 0,
    hotLeads: 0,
    convertedLeads: 0,
    lostLeads: 0,
    totalValue: 0,
    convertedValue: 0,
    assignedLeads: 0,
    unassignedLeads: 0
  };

  // Override converted counts: only count leads that still have an existing client (deleted clients excluded)
  const validOriginLeadIds = await Client.distinct('originLead', { originLead: { $ne: null } });
  if (validOriginLeadIds.length > 0) {
    const convertedAgg = await Lead.aggregate([
      { $match: { ...dateFilter, status: 'converted', _id: { $in: validOriginLeadIds } } },
      { $group: { _id: null, convertedLeads: { $sum: 1 }, convertedValue: { $sum: '$value' } } }
    ]);
    const corrected = convertedAgg[0];
    if (corrected) {
      result.convertedLeads = corrected.convertedLeads;
      result.convertedValue = corrected.convertedValue;
    } else {
      result.convertedLeads = 0;
      result.convertedValue = 0;
    }
  } else {
    result.convertedLeads = 0;
    result.convertedValue = 0;
  }

  // Calculate conversion rate
  result.conversionRate = result.totalLeads > 0 ?
    (result.convertedLeads / result.totalLeads) * 100 : 0;

  // Calculate average deal value
  result.averageDealValue = result.convertedLeads > 0 ?
    result.convertedValue / result.convertedLeads : 0;

  res.status(200).json({
    success: true,
    data: result
  });
});

// @desc    Create lead category
// @route   POST /api/admin/sales/categories
// @access  Private (Admin/HR only)
const createLeadCategory = asyncHandler(async (req, res, next) => {
  const { name, description, color, icon } = req.body;

  if (!name || !color) {
    return next(new ErrorResponse('Name and color are required', 400));
  }

  // Check if category with same name already exists
  const existingCategory = await LeadCategory.findOne({ name });
  if (existingCategory) {
    return next(new ErrorResponse('Category with this name already exists', 400));
  }

  const category = await LeadCategory.create({
    name,
    description,
    color,
    icon,
    createdBy: req.admin.id
  });

  await category.populate('createdBy', 'name');

  res.status(201).json({
    success: true,
    message: 'Category created successfully',
    data: category
  });
});

// @desc    Get all lead categories
// @route   GET /api/admin/sales/categories
// @access  Private (Admin/HR only)
const getAllLeadCategories = asyncHandler(async (req, res, next) => {
  const categories = await LeadCategory.find()
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 });

  // Only count converted leads that still have an existing client
  const validOriginLeadIds = await Client.distinct('originLead', { originLead: { $ne: null } });
  const convertedCategoryMatch = validOriginLeadIds.length
    ? { _id: { $in: validOriginLeadIds } }
    : { _id: { $in: [null] } }; // match nothing when no valid clients

  // Get lead counts for each category
  const categoriesWithCounts = await Promise.all(
    categories.map(async (category) => {
      const leadCount = await Lead.countDocuments({ category: category._id });
      const activeLeadCount = await Lead.countDocuments({
        category: category._id,
        status: { $in: ['new', 'connected', 'hot'] }
      });
      const convertedLeadCount = await Lead.countDocuments({
        category: category._id,
        status: 'converted',
        ...convertedCategoryMatch
      });

      return {
        ...category.toObject(),
        leadCount,
        activeLeadCount,
        convertedLeadCount,
        conversionRate: leadCount > 0 ? (convertedLeadCount / leadCount) * 100 : 0
      };
    })
  );

  res.status(200).json({
    success: true,
    count: categoriesWithCounts.length,
    data: categoriesWithCounts
  });
});

// @desc    Get single lead category
// @route   GET /api/admin/sales/categories/:id
// @access  Private (Admin/HR only)
const getLeadCategoryById = asyncHandler(async (req, res, next) => {
  const category = await LeadCategory.findById(req.params.id)
    .populate('createdBy', 'name');

  if (!category) {
    return next(new ErrorResponse('Category not found', 404));
  }

  // Get performance data
  const performance = await category.getPerformance();

  res.status(200).json({
    success: true,
    data: {
      ...category.toObject(),
      performance
    }
  });
});

// @desc    Update lead category
// @route   PUT /api/admin/sales/categories/:id
// @access  Private (Admin/HR only)
const updateLeadCategory = asyncHandler(async (req, res, next) => {
  const { name, description, color, icon } = req.body;

  let category = await LeadCategory.findById(req.params.id);

  if (!category) {
    return next(new ErrorResponse('Category not found', 404));
  }

  // Check if new name conflicts with existing category
  if (name && name !== category.name) {
    const existingCategory = await LeadCategory.findOne({ name });
    if (existingCategory) {
      return next(new ErrorResponse('Category with this name already exists', 400));
    }
  }

  // Update fields
  if (name !== undefined) category.name = name;
  if (description !== undefined) category.description = description;
  if (color !== undefined) category.color = color;
  if (icon !== undefined) category.icon = icon;

  await category.save();

  await category.populate('createdBy', 'name');

  res.status(200).json({
    success: true,
    message: 'Category updated successfully',
    data: category
  });
});

// @desc    Delete lead category
// @route   DELETE /api/admin/sales/categories/:id
// @access  Private (Admin/HR only)
const deleteLeadCategory = asyncHandler(async (req, res, next) => {
  const category = await LeadCategory.findById(req.params.id);

  if (!category) {
    return next(new ErrorResponse('Category not found', 404));
  }

  // Check if category has leads
  const leadCount = await Lead.countDocuments({ category: category._id });
  if (leadCount > 0) {
    return next(new ErrorResponse(`Cannot delete category "${category.name}" because it has ${leadCount} associated leads. Please reassign or delete the leads first.`, 400));
  }

  await LeadCategory.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Category deleted successfully'
  });
});

// @desc    Get category performance
// @route   GET /api/admin/sales/categories/performance
// @access  Private (Admin/HR only)
const getCategoryPerformance = asyncHandler(async (req, res, next) => {
  // Build date filter from query parameters
  const dateFilter = {};
  if (req.query.startDate || req.query.endDate) {
    dateFilter.createdAt = {};
    if (req.query.startDate) {
      dateFilter.createdAt.$gte = new Date(req.query.startDate);
    }
    if (req.query.endDate) {
      dateFilter.createdAt.$lte = new Date(req.query.endDate);
    }
  }

  const stats = await LeadCategory.getCategoryStatistics(dateFilter);

  res.status(200).json({
    success: true,
    count: stats.length,
    data: stats
  });
});

// @desc    Get all sales team members
// @route   GET /api/admin/sales/team
// @access  Private (Admin/HR only)
const getAllSalesTeam = asyncHandler(async (req, res, next) => {
  const salesTeam = await Sales.find({ isActive: true })
    .select('-password -loginAttempts -lockUntil')
    .populate('teamMembers', 'name email')
    .sort({ name: 1 });

  // Only count converted leads that still have an existing client
  const validOriginLeadIds = await Client.distinct('originLead', { originLead: { $ne: null } });
  const convertedBySales = validOriginLeadIds.length > 0
    ? await Lead.aggregate([
      { $match: { status: 'converted', _id: { $in: validOriginLeadIds } } },
      { $group: { _id: '$assignedTo', convertedLeads: { $sum: 1 }, convertedValue: { $sum: '$value' } } }
    ])
    : [];
  const convertedMap = new Map(convertedBySales.map((r) => [r._id?.toString(), { convertedLeads: r.convertedLeads, convertedValue: r.convertedValue }]));

  // Get performance metrics for each team member
  const teamWithPerformance = await Promise.all(
    salesTeam.map(async (member) => {
      const leadStats = await Lead.aggregate([
        { $match: { assignedTo: member._id } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalValue: { $sum: '$value' }
          }
        }
      ]);

      const totalLeads = leadStats.reduce((sum, stat) => sum + stat.count, 0);
      const totalValue = leadStats.reduce((sum, stat) => sum + stat.totalValue, 0);
      const corrected = convertedMap.get(member._id.toString()) || { convertedLeads: 0, convertedValue: 0 };
      const convertedLeads = corrected.convertedLeads;
      const convertedValue = corrected.convertedValue;

      return {
        ...member.toObject(),
        performance: {
          totalLeads,
          convertedLeads,
          conversionRate: totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0,
          totalValue,
          convertedValue,
          targetAchievement: member.salesTarget > 0 ?
            (member.currentSales / member.salesTarget) * 100 : 0,
          // Performance score is now based on revenue generated from converting clients
          performanceScore: calculatePerformanceScore(convertedValue)
        }
      };
    })
  );

  res.status(200).json({
    success: true,
    count: teamWithPerformance.length,
    data: teamWithPerformance
  });
});

// @desc    Get sales team member details
// @route   GET /api/admin/sales/team/:id
// @access  Private (Admin/HR only)
const getSalesTeamMember = asyncHandler(async (req, res, next) => {
  const member = await Sales.findById(req.params.id)
    .select('-password -loginAttempts -lockUntil')
    .populate('teamMembers', 'name email');

  if (!member) {
    return next(new ErrorResponse('Sales team member not found', 404));
  }

  // Recalculate currentIncentive from conversion-based incentives
  try {
    await member.updateCurrentIncentive();
    // Reload member to get updated currentIncentive
    await member.save();
  } catch (error) {
    console.error('Error updating currentIncentive:', error);
    // Continue even if update fails
  }

  // Get detailed lead breakdown
  const leadBreakdown = await Lead.aggregate([
    { $match: { assignedTo: member._id } },
    {
      $group: {
        _id: {
          status: '$status',
          category: '$category'
        },
        count: { $sum: 1 },
        totalValue: { $sum: '$value' }
      }
    },
    {
      $lookup: {
        from: 'leadcategories',
        localField: '_id.category',
        foreignField: '_id',
        as: 'category'
      }
    },
    {
      $unwind: '$category'
    },
    {
      $group: {
        _id: '$_id.status',
        count: { $sum: '$count' },
        totalValue: { $sum: '$totalValue' },
        categories: {
          $push: {
            categoryName: '$category.name',
            categoryColor: '$category.color',
            count: '$count',
            value: '$totalValue'
          }
        }
      }
    }
  ]);

  // Get conversion-based incentive history only (both individual and team lead incentives)
  const incentiveHistory = await Incentive.find({
    salesEmployee: member._id,
    isConversionBased: true
  })
    .populate('clientId', 'name')
    .populate('projectId', 'name status financialDetails')
    .populate('leadId', 'phone')
    .populate('teamLeadId', 'name')
    .populate('teamMemberId', 'name')
    .sort({ dateAwarded: -1 })
    .limit(10);

  // Get team member incentives if this is a team lead
  let teamMemberIncentives = [];
  if (member.isTeamLead && member.teamMembers && member.teamMembers.length > 0) {
    teamMemberIncentives = await Incentive.find({
      teamLeadId: member._id,
      isTeamLeadIncentive: true,
      isConversionBased: true
    })
      .populate('clientId', 'name')
      .populate('projectId', 'name status financialDetails')
      .populate('teamMemberId', 'name email')
      .sort({ dateAwarded: -1 })
      .limit(20);
  }

  // Calculate team lead incentive totals
  let teamLeadIncentiveTotal = 0;
  let teamLeadIncentiveCurrent = 0;
  let teamLeadIncentivePending = 0;

  if (teamMemberIncentives.length > 0) {
    teamMemberIncentives.forEach(inc => {
      teamLeadIncentiveTotal += inc.amount || 0;
      teamLeadIncentiveCurrent += inc.currentBalance || 0;
      teamLeadIncentivePending += inc.pendingBalance || 0;
    });
  }

  res.status(200).json({
    success: true,
    data: {
      ...member.toObject(),
      leadBreakdown,
      incentiveHistory,
      teamMemberIncentives: teamMemberIncentives,
      teamLeadIncentiveSummary: {
        total: teamLeadIncentiveTotal,
        current: teamLeadIncentiveCurrent,
        pending: teamLeadIncentivePending
      }
    }
  });
});

// @desc    Set sales target
// @route   PUT /api/admin/sales/team/:id/target
// @access  Private (Admin/HR only)
const setSalesTarget = asyncHandler(async (req, res, next) => {
  const { target, targets } = req.body;

  const member = await Sales.findById(req.params.id);

  if (!member) {
    return next(new ErrorResponse('Sales team member not found', 404));
  }

  // Support both old single target and new multiple targets
  if (target !== undefined) {
    // Legacy: single target
    if (target < 0) {
      return next(new ErrorResponse('Valid target amount is required', 400));
    }
    member.salesTarget = target;
    await member.save();

    return res.status(200).json({
      success: true,
      message: 'Sales target updated successfully',
      data: {
        id: member._id,
        name: member.name,
        salesTarget: member.salesTarget
      }
    });
  }

  // New: Multiple targets with dates
  if (targets && Array.isArray(targets)) {
    // Validate targets
    for (const t of targets) {
      if (t.targetNumber === undefined || t.targetNumber === null || !t.amount || !t.targetDate) {
        return next(new ErrorResponse('Each target must have targetNumber, amount, and targetDate', 400));
      }
      if (t.targetNumber <= 0) {
        return next(new ErrorResponse('Target number must be a positive number', 400));
      }
      if (t.amount < 0) {
        return next(new ErrorResponse('Target amount cannot be negative', 400));
      }
      if (new Date(t.targetDate) < new Date()) {
        return next(new ErrorResponse('Target date cannot be in the past', 400));
      }
    }

    // Synchronize targets: Replace existing targets with the new set
    const syncedTargets = targets.map(newTarget => {
      const existingTarget = member.salesTargets.find(
        t => t.targetNumber === newTarget.targetNumber
      );

      const rewardAmount = newTarget.reward !== undefined && newTarget.reward !== null
        ? Math.max(0, Number(newTarget.reward))
        : 0;

      return {
        targetNumber: newTarget.targetNumber,
        amount: newTarget.amount,
        reward: rewardAmount,
        targetDate: new Date(newTarget.targetDate),
        createdAt: existingTarget ? existingTarget.createdAt : new Date(),
        updatedAt: new Date()
      };
    });

    member.salesTargets = syncedTargets;

    // Sort by target number
    member.salesTargets.sort((a, b) => a.targetNumber - b.targetNumber);

    // Update legacy salesTarget to highest target amount
    const maxTarget = member.salesTargets.length > 0
      ? Math.max(...member.salesTargets.map(t => t.amount), 0)
      : 0;
    member.salesTarget = maxTarget;

    await member.save();

    return res.status(200).json({
      success: true,
      message: 'Sales targets updated successfully',
      data: {
        id: member._id,
        name: member.name,
        salesTargets: member.salesTargets,
        salesTarget: member.salesTarget
      }
    });
  }

  return next(new ErrorResponse('Either target or targets array is required', 400));
});

// @desc    Update sales team member team assignment
// @route   PUT /api/admin/sales/team/:id/team-members
// @access  Private (Admin/HR only)
const updateTeamMembers = asyncHandler(async (req, res, next) => {
  const { teamMembers, isTeamLead } = req.body;

  const member = await Sales.findById(req.params.id);

  if (!member) {
    return next(new ErrorResponse('Sales team member not found', 404));
  }

  // Update team members if provided
  if (teamMembers !== undefined) {
    // Validate team members are valid ObjectIds
    if (Array.isArray(teamMembers)) {
      const mongoose = require('mongoose');
      const validTeamMembers = teamMembers.filter(id => {
        try {
          return mongoose.Types.ObjectId.isValid(id);
        } catch {
          return false;
        }
      });
      member.teamMembers = validTeamMembers;
    } else {
      member.teamMembers = [];
    }
  }

  // Update isTeamLead if provided
  if (isTeamLead !== undefined) {
    member.isTeamLead = Boolean(isTeamLead);
  }

  await member.save();

  res.status(200).json({
    success: true,
    message: 'Team members updated successfully',
    data: {
      id: member._id,
      name: member.name,
      isTeamLead: member.isTeamLead,
      teamMembers: member.teamMembers
    }
  });
});

// @desc    Distribute leads to sales member
// @route   POST /api/admin/sales/team/:id/distribute-leads
// @access  Private (Admin/HR only)
const distributeLeads = asyncHandler(async (req, res, next) => {
  const { count, categoryId } = req.body;

  if (!count || count <= 0) {
    return next(new ErrorResponse('Valid lead count is required', 400));
  }

  const member = await Sales.findById(req.params.id);

  if (!member) {
    return next(new ErrorResponse('Sales team member not found', 404));
  }

  // Build filter for unassigned leads
  let filter = { assignedTo: null };
  if (categoryId && categoryId !== 'all') {
    filter.category = categoryId;
  }

  // Get unassigned leads
  const unassignedLeads = await Lead.find(filter)
    .sort({ createdAt: 1 })
    .limit(count);

  if (unassignedLeads.length === 0) {
    return next(new ErrorResponse('No unassigned leads available for distribution', 400));
  }

  // Assign leads to member
  const leadIds = unassignedLeads.map(lead => lead._id);

  await Lead.updateMany(
    { _id: { $in: leadIds } },
    {
      assignedTo: member._id,
      lastContactDate: new Date()
    }
  );

  // Update member's leadsManaged array
  member.leadsManaged.push(...leadIds);
  await member.save();

  res.status(200).json({
    success: true,
    message: `${unassignedLeads.length} leads distributed successfully`,
    data: {
      memberId: member._id,
      memberName: member.name,
      leadsDistributed: unassignedLeads.length,
      leadIds
    }
  });
});

// @desc    Get leads for member
// @route   GET /api/admin/sales/team/:id/leads
// @access  Private (Admin/HR only)
const getLeadsForMember = asyncHandler(async (req, res, next) => {
  const { status, priority, page = 1, limit = 12 } = req.query;

  let filter = { assignedTo: req.params.id };

  if (status && status !== 'all') {
    filter.status = status;
  }

  if (priority && priority !== 'all') {
    filter.priority = priority;
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const leads = await Lead.find(filter)
    .populate('category', 'name color icon')
    .populate('leadProfile', 'name businessName email conversionData estimatedCost')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const totalLeads = await Lead.countDocuments(filter);

  res.status(200).json({
    success: true,
    count: leads.length,
    total: totalLeads,
    page: pageNum,
    pages: Math.ceil(totalLeads / limitNum),
    data: leads
  });
});

// @desc    Get leads by category for member
// @route   GET /api/admin/sales/team/:id/leads/category/:categoryId
// @access  Private (Admin/HR only)
const getLeadsByCategory = asyncHandler(async (req, res, next) => {
  const { status, priority, page = 1, limit = 12 } = req.query;

  let filter = {
    assignedTo: req.params.id,
    category: req.params.categoryId
  };

  if (status && status !== 'all') {
    filter.status = status;
  }

  if (priority && priority !== 'all') {
    filter.priority = priority;
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const leads = await Lead.find(filter)
    .populate('category', 'name color icon')
    .populate('leadProfile', 'name businessName email conversionData estimatedCost')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const totalLeads = await Lead.countDocuments(filter);

  res.status(200).json({
    success: true,
    count: leads.length,
    total: totalLeads,
    page: pageNum,
    pages: Math.ceil(totalLeads / limitNum),
    data: leads
  });
});

// @desc    Set per-conversion incentive amount for sales member
// @route   POST /api/admin/sales/team/:id/incentive
// @access  Private (Admin/HR only)
const setIncentive = asyncHandler(async (req, res, next) => {
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return next(new ErrorResponse('Valid incentive amount is required', 400));
  }

  const member = await Sales.findById(req.params.id);

  if (!member) {
    return next(new ErrorResponse('Sales team member not found', 404));
  }

  // Update the per-conversion incentive amount (applies to future conversions only)
  const updatedMember = await Sales.findByIdAndUpdate(
    req.params.id,
    { incentivePerClient: amount },
    { new: true, runValidators: true }
  ).select('name email incentivePerClient');

  res.status(200).json({
    success: true,
    message: 'Per-conversion incentive amount set successfully',
    data: {
      member: updatedMember,
      incentivePerClient: amount,
      note: 'This amount will be applied to future lead conversions only'
    }
  });
});

// @desc    Set per-conversion incentive amount for team lead
// @route   POST /api/admin/sales/team-leads/:id/incentive
// @access  Private (Admin/HR only)
const setTeamLeadIncentive = asyncHandler(async (req, res, next) => {
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return next(new ErrorResponse('Valid incentive amount is required', 400));
  }

  const teamLead = await Sales.findById(req.params.id);

  if (!teamLead) {
    return next(new ErrorResponse('Team lead not found', 404));
  }

  if (!teamLead.isTeamLead) {
    return next(new ErrorResponse('Selected member is not a team lead', 400));
  }

  // Update the per-conversion incentive amount for team lead (applies to future conversions only)
  const updatedTeamLead = await Sales.findByIdAndUpdate(
    req.params.id,
    { teamLeadIncentivePerClient: amount },
    { new: true, runValidators: true }
  ).select('name email teamLeadIncentivePerClient isTeamLead');

  res.status(200).json({
    success: true,
    message: 'Per-conversion incentive amount for team lead set successfully',
    data: {
      teamLead: updatedTeamLead,
      teamLeadIncentivePerClient: amount,
      note: 'This amount will be applied to future team member lead conversions only'
    }
  });
});

// @desc    Set team lead target and reward
// @route   PUT /api/admin/sales/team-leads/:id/team-target
// @access  Private (Admin/HR only)
const setTeamLeadTarget = asyncHandler(async (req, res, next) => {
  const { target, reward } = req.body;

  const teamLead = await Sales.findById(req.params.id);

  if (!teamLead) {
    return next(new ErrorResponse('Team lead not found', 404));
  }

  if (!teamLead.isTeamLead) {
    return next(new ErrorResponse('Selected member is not a team lead', 400));
  }

  // Update team lead target if provided
  if (target !== undefined) {
    if (target < 0) {
      return next(new ErrorResponse('Valid target amount is required', 400));
    }
    teamLead.teamLeadTarget = target;
  }

  // Update team lead reward if provided
  if (reward !== undefined) {
    if (reward < 0) {
      return next(new ErrorResponse('Valid reward amount is required', 400));
    }
    teamLead.teamLeadTargetReward = reward;
  }

  await teamLead.save();

  res.status(200).json({
    success: true,
    message: 'Team lead target and reward updated successfully',
    data: {
      id: teamLead._id,
      name: teamLead.name,
      teamLeadTarget: teamLead.teamLeadTarget,
      teamLeadTargetReward: teamLead.teamLeadTargetReward
    }
  });
});

// @desc    Get incentive history for member
// @route   GET /api/admin/sales/team/:id/incentives
// @access  Private (Admin/HR only)
const getIncentiveHistory = asyncHandler(async (req, res, next) => {
  const { status, page = 1, limit = 10 } = req.query;

  let filter = { salesEmployee: req.params.id };

  if (status && status !== 'all') {
    filter.status = status;
  }

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  const incentives = await Incentive.find(filter)
    .populate('createdBy', 'name')
    .populate('approvedBy', 'name')
    .sort({ dateAwarded: -1 })
    .skip(skip)
    .limit(limitNum);

  const totalIncentives = await Incentive.countDocuments(filter);

  res.status(200).json({
    success: true,
    count: incentives.length,
    total: totalIncentives,
    page: pageNum,
    pages: Math.ceil(totalIncentives / limitNum),
    data: incentives
  });
});

// @desc    Update incentive record
// @route   PUT /api/admin/sales/team/:id/incentive/:incentiveId
// @access  Private (Admin/HR only)
const updateIncentiveRecord = asyncHandler(async (req, res, next) => {
  const { status, reason, description } = req.body;

  const incentive = await Incentive.findById(req.params.incentiveId);

  if (!incentive) {
    return next(new ErrorResponse('Incentive record not found', 404));
  }

  if (incentive.salesEmployee.toString() !== req.params.id) {
    return next(new ErrorResponse('Incentive does not belong to this sales member', 400));
  }

  // Store previous status for transaction creation
  const previousStatus = incentive.status;

  // Update fields
  if (status !== undefined) {
    if (status === 'approved' && incentive.status === 'pending') {
      await incentive.approve(req.admin.id);
    } else if (status === 'paid' && incentive.status === 'approved') {
      await incentive.markAsPaid();

      // Create finance transaction when incentive is marked as paid
      try {
        const { createOutgoingTransaction } = require('../utils/financeTransactionHelper');

        if (previousStatus !== 'paid') {
          await createOutgoingTransaction({
            amount: incentive.amount,
            category: 'Sales Incentive',
            transactionDate: incentive.paidAt || new Date(),
            createdBy: req.admin.id,
            employee: incentive.salesEmployee, // Sales model reference
            description: `Sales incentive: ${incentive.reason}`,
            metadata: {
              sourceType: 'incentive',
              sourceId: incentive._id.toString()
            },
            checkDuplicate: true
          });
        }
      } catch (error) {
        // Log error but don't fail the incentive update
        console.error('Error creating finance transaction for incentive:', error);
      }
    } else {
      incentive.status = status;
    }
  }

  if (reason !== undefined) incentive.reason = reason;
  if (description !== undefined) incentive.description = description;

  await incentive.save();

  await incentive.populate('createdBy', 'name');
  await incentive.populate('approvedBy', 'name');

  res.status(200).json({
    success: true,
    message: 'Incentive record updated successfully',
    data: incentive
  });
});

// @desc    Get sales overview
// @route   GET /api/admin/sales/overview
// @access  Private (Admin/HR only)
const getSalesOverview = asyncHandler(async (req, res, next) => {
  const { period = 'all' } = req.query;

  let dateFilter = {};
  if (period !== 'all') {
    const now = new Date();
    let startDate;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }

    if (startDate) {
      dateFilter.createdAt = { $gte: startDate };
    }
  }

  // Get lead statistics (converted counts corrected below to only include leads with existing client)
  const leadStats = await Lead.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: null,
        totalLeads: { $sum: 1 },
        unassignedLeads: { $sum: { $cond: [{ $eq: ['$assignedTo', null] }, 1, 0] } },
        assignedLeads: { $sum: { $cond: [{ $ne: ['$assignedTo', null] }, 1, 0] } },
        newLeads: { $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] } },
        connectedLeads: { $sum: { $cond: [{ $eq: ['$status', 'connected'] }, 1, 0] } },
        hotLeads: { $sum: { $cond: [{ $eq: ['$status', 'hot'] }, 1, 0] } },
        convertedLeads: { $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] } },
        lostLeads: { $sum: { $cond: [{ $eq: ['$status', 'lost'] }, 1, 0] } },
        totalValue: { $sum: '$value' },
        convertedValue: {
          $sum: { $cond: [{ $eq: ['$status', 'converted'] }, '$value', 0] }
        }
      }
    }
  ]);

  // Override converted counts: only count leads that still have an existing client
  const validOriginLeadIds = await Client.distinct('originLead', { originLead: { $ne: null } });
  if (validOriginLeadIds.length > 0) {
    const convertedOverviewAgg = await Lead.aggregate([
      { $match: { ...dateFilter, status: 'converted', _id: { $in: validOriginLeadIds } } },
      { $group: { _id: null, convertedLeads: { $sum: 1 }, convertedValue: { $sum: '$value' } } }
    ]);
    const correctedOverview = convertedOverviewAgg[0];
    if (leadStats[0]) {
      leadStats[0].convertedLeads = correctedOverview ? correctedOverview.convertedLeads : 0;
      leadStats[0].convertedValue = correctedOverview ? correctedOverview.convertedValue : 0;
    }
  } else if (leadStats[0]) {
    leadStats[0].convertedLeads = 0;
    leadStats[0].convertedValue = 0;
  }

  // Get today's new leads specifically
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const todayLeadsStats = await Lead.aggregate([
    {
      $match: {
        createdAt: { $gte: todayStart, $lte: todayEnd },
        status: 'new'
      }
    },
    {
      $group: {
        _id: null,
        todayNewLeads: { $sum: 1 }
      }
    }
  ]);

  // Get sales team statistics
  const teamStats = await Sales.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: null,
        totalTeamMembers: { $sum: 1 },
        totalTarget: { $sum: '$salesTarget' },
        totalCurrentSales: { $sum: '$currentSales' },
        totalIncentive: { $sum: '$currentIncentive' }
      }
    }
  ]);

  // Alternative simple count for debugging
  const salesCount = await Sales.countDocuments({ isActive: true });

  // Get client statistics
  const clientStats = await Client.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: null,
        totalClients: { $sum: 1 },
        totalSpent: { $sum: '$totalSpent' },
        activeClients: {
          $sum: {
            $cond: [
              { $gte: ['$lastActivity', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)] },
              1,
              0
            ]
          }
        }
      }
    }
  ]);

  // Get incentive statistics
  const incentiveStats = await Incentive.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);

  // Get confirmed sales total based on projects where an advance has been received.
  // This aligns the "Total Sales" figure in Sales Management with Finance statistics.
  let projectSalesMatch = {
    'financialDetails.advanceReceived': { $gt: 0 }
  };

  // Apply the same period filter (createdAt) used for leads, when available
  if (dateFilter.createdAt) {
    projectSalesMatch.createdAt = dateFilter.createdAt;
  }

  const projectSalesAgg = await Project.aggregate([
    { $match: projectSalesMatch },
    {
      $group: {
        _id: null,
        // Use totalCost when available, fall back to budget for legacy data
        totalAmount: {
          $sum: {
            $ifNull: [
              '$financialDetails.totalCost',
              { $ifNull: ['$budget', 0] }
            ]
          }
        }
      }
    }
  ]);

  const confirmedSalesTotal = projectSalesAgg[0]?.totalAmount || 0;

  const leadData = leadStats[0] || {
    totalLeads: 0,
    unassignedLeads: 0,
    assignedLeads: 0,
    newLeads: 0,
    connectedLeads: 0,
    hotLeads: 0,
    convertedLeads: 0,
    lostLeads: 0,
    totalValue: 0,
    convertedValue: 0
  };

  const todayLeadsData = todayLeadsStats[0] || {
    todayNewLeads: 0
  };

  const teamData = teamStats[0] || {
    totalTeamMembers: salesCount, // Use simple count as fallback
    totalTarget: 0,
    totalCurrentSales: 0,
    totalIncentive: 0
  };

  const clientData = clientStats[0] || {
    totalClients: 0,
    totalSpent: 0,
    activeClients: 0
  };

  const overview = {
    leads: {
      total: leadData.totalLeads,
      unassigned: leadData.unassignedLeads,
      assigned: leadData.assignedLeads,
      new: todayLeadsData.todayNewLeads, // Today's new leads
      connected: leadData.connectedLeads,
      hot: leadData.hotLeads,
      converted: leadData.convertedLeads,
      lost: leadData.lostLeads,
      conversionRate: leadData.totalLeads > 0 ?
        (leadData.convertedLeads / leadData.totalLeads) * 100 : 0,
      totalValue: leadData.totalValue,
      convertedValue: leadData.convertedValue,
      averageDealValue: leadData.convertedLeads > 0 ?
        leadData.convertedValue / leadData.convertedLeads : 0
    },
    sales: {
      // Total sales = confirmed project sales where an advance has been received.
      // This uses the same business rule as finance statistics, so if no projects
      // have any advance payments, total sales will be 0.
      total: confirmedSalesTotal,
      conversion: leadData.totalLeads > 0 ?
        Math.round((leadData.convertedLeads / leadData.totalLeads) * 100 * 100) / 100 : 0
    },
    team: {
      total: teamData.totalTeamMembers,
      totalTarget: teamData.totalTarget,
      totalCurrentSales: teamData.totalCurrentSales,
      targetAchievement: teamData.totalTarget > 0 ?
        (teamData.totalCurrentSales / teamData.totalTarget) * 100 : 0,
      totalIncentive: teamData.totalIncentive,
      performance: teamData.totalTarget > 0 ?
        (teamData.totalCurrentSales / teamData.totalTarget) * 100 : 0
    },
    clients: {
      total: clientData.totalClients,
      totalSpent: clientData.totalSpent,
      retention: clientData.totalClients > 0 ?
        (clientData.activeClients / clientData.totalClients) * 100 : 0
    },
    incentives: {
      pending: incentiveStats.find(s => s._id === 'pending')?.count || 0,
      approved: incentiveStats.find(s => s._id === 'approved')?.count || 0,
      paid: incentiveStats.find(s => s._id === 'paid')?.count || 0,
      totalAmount: incentiveStats.reduce((sum, s) => sum + s.totalAmount, 0)
    }
  };

  res.status(200).json({
    success: true,
    data: overview
  });
});

// @desc    Get category analytics
// @route   GET /api/admin/sales/analytics/categories
// @access  Private (Admin/HR only)
const getCategoryAnalytics = asyncHandler(async (req, res, next) => {
  // Build date filter from query parameters
  const dateFilter = {};
  if (req.query.startDate || req.query.endDate) {
    dateFilter.createdAt = {};
    if (req.query.startDate) {
      const startDate = new Date(req.query.startDate);
      startDate.setHours(0, 0, 0, 0); // Start of day
      dateFilter.createdAt.$gte = startDate;
    }
    if (req.query.endDate) {
      const endDate = new Date(req.query.endDate);
      endDate.setHours(23, 59, 59, 999); // End of day
      dateFilter.createdAt.$lte = endDate;
    }
  }

  const stats = await LeadCategory.getCategoryStatistics(dateFilter);

  res.status(200).json({
    success: true,
    count: stats.length,
    data: stats
  });
});

// @desc    Get category financial details
// @route   GET /api/admin/sales/analytics/categories/financial
// @access  Private (Admin/HR only)
const getCategoryFinancialDetails = asyncHandler(async (req, res, next) => {
  const details = await LeadCategory.getCategoryFinancialDetails();

  res.status(200).json({
    success: true,
    count: details.length,
    data: details
  });
});

// @desc    Get team performance analytics
// @route   GET /api/admin/sales/analytics/team
// @access  Private (Admin/HR only)
const getTeamPerformance = asyncHandler(async (req, res, next) => {
  const salesTeam = await Sales.find({ isActive: true })
    .select('name email salesTarget currentSales currentIncentive');

  // Only count converted leads that still have an existing client
  const validOriginLeadIds = await Client.distinct('originLead', { originLead: { $ne: null } });
  const convertedBySales = validOriginLeadIds.length > 0
    ? await Lead.aggregate([
      { $match: { status: 'converted', _id: { $in: validOriginLeadIds } } },
      { $group: { _id: '$assignedTo', convertedLeads: { $sum: 1 }, convertedValue: { $sum: '$value' } } }
    ])
    : [];
  const convertedMap = new Map(convertedBySales.map((r) => [r._id?.toString(), { convertedLeads: r.convertedLeads, convertedValue: r.convertedValue }]));

  const teamPerformance = await Promise.all(
    salesTeam.map(async (member) => {
      const leadStats = await Lead.aggregate([
        { $match: { assignedTo: member._id } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalValue: { $sum: '$value' }
          }
        }
      ]);

      const totalLeads = leadStats.reduce((sum, stat) => sum + stat.count, 0);
      const totalValue = leadStats.reduce((sum, stat) => sum + stat.totalValue, 0);
      const corrected = convertedMap.get(member._id.toString()) || { convertedLeads: 0, convertedValue: 0 };
      const convertedLeads = corrected.convertedLeads;
      const convertedValue = corrected.convertedValue;

      return {
        id: member._id,
        name: member.name,
        email: member.email,
        salesTarget: member.salesTarget,
        currentSales: member.currentSales,
        currentIncentive: member.currentIncentive,
        performance: {
          totalLeads,
          convertedLeads,
          conversionRate: totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0,
          totalValue,
          convertedValue,
          targetAchievement: member.salesTarget > 0 ?
            (member.currentSales / member.salesTarget) * 100 : 0,
          // Performance score is now based on revenue generated from converting clients
          performanceScore: calculatePerformanceScore(convertedValue)
        }
      };
    })
  );

  // Sort by performance score (revenue) - highest revenue first
  teamPerformance.sort((a, b) => b.performance.performanceScore - a.performance.performanceScore);

  res.status(200).json({
    success: true,
    count: teamPerformance.length,
    data: teamPerformance
  });
});

// @desc    Get global sales month configuration for sales targets & incentives
// @route   GET /api/admin/sales/month-range
// @access  Private (Admin/HR only)
const { getSalesMonthConfig, updateSalesMonthConfig } = require('../utils/salesMonthConfig');

const getSalesMonthRangeConfig = asyncHandler(async (req, res) => {
  const config = await getSalesMonthConfig();

  res.status(200).json({
    success: true,
    data: {
      salesMonthStartDay: config.salesMonthStartDay,
      salesMonthEndDay: config.salesMonthEndDay,
      timezone: config.timezone,
    },
  });
});

// @desc    Update global sales month configuration for sales targets & incentives
// @route   PUT /api/admin/sales/month-range
// @access  Private (Admin/HR only)
const updateSalesMonthRangeConfig = asyncHandler(async (req, res, next) => {
  const { salesMonthStartDay, salesMonthEndDay } = req.body || {};

  if (salesMonthStartDay === undefined || salesMonthStartDay === null) {
    return next(new ErrorResponse('salesMonthStartDay is required', 400));
  }

  const start = Number(salesMonthStartDay);
  const end = salesMonthEndDay === undefined || salesMonthEndDay === null ? 0 : Number(salesMonthEndDay);

  if (!Number.isInteger(start) || start < 1 || start > 31) {
    return next(new ErrorResponse('salesMonthStartDay must be an integer between 1 and 31', 400));
  }

  if (!Number.isInteger(end) || end < 0 || end > 31) {
    return next(new ErrorResponse('salesMonthEndDay must be an integer between 0 and 31', 400));
  }

  const updated = await updateSalesMonthConfig({
    salesMonthStartDay: start,
    salesMonthEndDay: end,
  });

  res.status(200).json({
    success: true,
    message: 'Sales month configuration updated successfully',
    data: updated,
  });
});

// Helper function to calculate performance score based on revenue
// Performance is now based on revenue generated from converting clients
const calculatePerformanceScore = (convertedValue) => {
  // Performance score is the total revenue generated from converted clients
  // Return revenue as the performance score (in rupees)
  return convertedValue || 0;
};

// @desc    Delete sales team member
// @route   DELETE /api/admin/sales/team/:id
// @access  Private (Admin/HR only)
const deleteSalesMember = asyncHandler(async (req, res, next) => {
  const member = await Sales.findById(req.params.id);

  if (!member) {
    return next(new ErrorResponse('Sales team member not found', 404));
  }

  // If this is a team lead, unassign all their team members first
  if (member.isTeamLead && member.teamMembers && member.teamMembers.length > 0) {
    const teamMemberIds = member.teamMembers;

    // Clear teamMembers from the team lead before deletion
    member.teamMembers = [];
    await member.save();

    // Also remove these team members from any other team leads' arrays (in case of duplicates)
    // This ensures team members are completely unassigned
    await Sales.updateMany(
      {
        _id: { $ne: member._id },
        teamMembers: { $in: teamMemberIds }
      },
      {
        $pull: { teamMembers: { $in: teamMemberIds } }
      }
    );
  }

  // Allow deletion even if member has assigned leads
  // The leads will remain assigned but the member will be deleted
  // Admin can reassign leads later if needed

  await Sales.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: member.isTeamLead
      ? 'Team lead deleted successfully. Team members have been unassigned.'
      : 'Sales team member deleted successfully'
  });
});

module.exports = {
  updateTeamMembers,
  // Lead Management
  createLead,
  createBulkLeads,
  getAllLeads,
  getLeadById,
  updateLead,
  deleteLead,
  getLeadStatistics,

  // Lead Category Management
  createLeadCategory,
  getAllLeadCategories,
  getLeadCategoryById,
  updateLeadCategory,
  deleteLeadCategory,
  getCategoryPerformance,

  // Sales Team Management
  getAllSalesTeam,
  getSalesTeamMember,
  setSalesTarget,
  distributeLeads,
  getLeadsForMember,
  getLeadsByCategory,
  deleteSalesMember,

  // Incentive Management
  setIncentive,
  setTeamLeadIncentive,
  getIncentiveHistory,
  updateIncentiveRecord,

  // Team Lead Target Management
  setTeamLeadTarget,

  // Analytics
  getSalesOverview,
  getCategoryAnalytics,
  getCategoryFinancialDetails,
  getTeamPerformance,

  // Sales month configuration
  getSalesMonthRangeConfig,
  updateSalesMonthRangeConfig
};
