const CPLead = require('../models/CPLead');
const CPLeadProfile = require('../models/CPLeadProfile');
const CPNotification = require('../models/CPNotification');
const LeadCategory = require('../models/LeadCategory');
const ChannelPartner = require('../models/ChannelPartner');
const Client = require('../models/Client');
const Lead = require('../models/Lead');
const Sales = require('../models/Sales');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const {
  calculateCommission,
  distributeCommission,
  determineCPCommissionScenario
} = require('../services/cpCommissionService');

// Helper function to create notification
const createNotification = async (channelPartnerId, type, title, message, reference = null, actionUrl = null) => {
  try {
    await CPNotification.create({
      channelPartner: channelPartnerId,
      type,
      title,
      message,
      reference: reference ? { type: reference.type, id: reference.id } : undefined,
      actionUrl
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

// @desc    Create lead by Channel Partner
// @route   POST /api/cp/leads
// @access  Private (Channel Partner only)
exports.createLead = asyncHandler(async (req, res, next) => {
  const { phone, name, company, email, category, priority, value, notes } = req.body;
  const cpId = req.channelPartner.id;

  // Validate required fields
  if (!phone || !category) {
    return next(new ErrorResponse('Phone number and category are required', 400));
  }

  // Check if this CP already has a lead with this phone (unique per channel partner)
  const existingLead = await CPLead.findOne({ assignedTo: cpId, phone });
  if (existingLead) {
    return next(new ErrorResponse('You already have a lead with this phone number', 400));
  }

  // Verify category exists
  const categoryExists = await LeadCategory.findById(category);
  if (!categoryExists) {
    return next(new ErrorResponse('Invalid category', 400));
  }

  // Create lead
  const lead = await CPLead.create({
    phone,
    name,
    company,
    email,
    category,
    priority: priority || 'medium',
    value: value || 0,
    notes,
    createdBy: cpId,
    creatorModel: 'ChannelPartner',
    assignedTo: cpId,
    status: 'new',
    source: 'manual'
  });

  // Add activity
  await lead.addActivity({
    type: 'note',
    description: 'Lead created',
    performedBy: cpId,
    activityCreatorModel: 'ChannelPartner'
  });

  // Populate for response
  await lead.populate('category', 'name color icon');
  await lead.populate('assignedTo', 'name email phoneNumber');

  res.status(201).json({
    success: true,
    message: 'Lead created successfully',
    data: lead
  });
});

// @desc    Get all leads for Channel Partner
// @route   GET /api/cp/leads
// @access  Private (Channel Partner only)
exports.getLeads = asyncHandler(async (req, res, next) => {
  const cpId = req.channelPartner.id;
  const { status, priority, category, search, excludeStatus, page = 1, limit = 20 } = req.query;

  // Build query - exclude shared leads (they should only appear in shared leads page)
  const query = { 
    assignedTo: cpId,
    $or: [
      { 'sharedWithSales.0': { $exists: false } }, // No sharedWithSales array
      { sharedWithSales: { $size: 0 } } // Empty sharedWithSales array
    ]
  };

  if (status && status !== 'undefined' && status !== 'all') {
    query.status = status;
  }
  
  // Support excluding statuses (e.g. excludeStatus=converted,lost)
  // Only apply when explicit status is not provided.
  if (!query.status && excludeStatus && excludeStatus !== 'undefined') {
    const excluded = String(excludeStatus)
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    if (excluded.length) {
      query.status = { $nin: excluded };
    }
  }

  if (priority && priority !== 'undefined' && priority !== 'all') {
    query.priority = priority;
  }

  if (category && category !== 'undefined' && category !== 'all') {
    // Validate category is a valid ObjectId
    if (category.match(/^[0-9a-fA-F]{24}$/)) {
      query.category = category;
    }
  }

  if (search && search !== 'undefined' && search.trim() !== '') {
    // Combine search with existing $or conditions
    const searchConditions = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { company: { $regex: search, $options: 'i' } }
    ];
    
    // If query already has $or, we need to combine them properly
    if (query.$or) {
      const existingOr = query.$or;
      query.$and = [
        { $or: existingOr },
        { $or: searchConditions }
      ];
      delete query.$or;
    } else {
      query.$or = searchConditions;
    }
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const leads = await CPLead.find(query)
    .populate('category', 'name color icon')
    .populate('assignedTo', 'name email phoneNumber')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const total = await CPLead.countDocuments(query);

  res.status(200).json({
    success: true,
    count: leads.length,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
    data: leads
  });
});

// @desc    Get single lead by ID
// @route   GET /api/cp/leads/:id
// @access  Private (Channel Partner only)
exports.getLeadById = asyncHandler(async (req, res, next) => {
  const cpId = req.channelPartner.id;
  const leadId = req.params.id;

  const lead = await CPLead.findOne({
    _id: leadId,
    assignedTo: cpId
  })
    .populate('category', 'name color icon')
    .populate('assignedTo', 'name email phoneNumber')
    .populate('leadProfile')
    .populate('sharedWithSales.salesId', 'name email phoneNumber')
    .populate('activities.performedBy', 'name email');

  if (!lead) {
    return next(new ErrorResponse('Lead not found', 404));
  }

  res.status(200).json({
    success: true,
    data: lead
  });
});

// @desc    Update lead
// @route   PUT /api/cp/leads/:id
// @access  Private (Channel Partner only)
exports.updateLead = asyncHandler(async (req, res, next) => {
  const cpId = req.channelPartner.id;
  const leadId = req.params.id;
  const { name, company, email, priority, value, notes, category } = req.body;

  const lead = await CPLead.findOne({
    _id: leadId,
    assignedTo: cpId
  });

  if (!lead) {
    return next(new ErrorResponse('Lead not found', 404));
  }

  // Prevent updates if lead is shared (read-only mode)
  if (lead.sharedWithSales && lead.sharedWithSales.length > 0) {
    return next(new ErrorResponse('Cannot update: Lead is shared with sales team and is read-only', 403));
  }

  // Update fields
  if (name !== undefined) lead.name = name;
  if (company !== undefined) lead.company = company;
  if (email !== undefined) lead.email = email;
  if (priority !== undefined) lead.priority = priority;
  if (value !== undefined) lead.value = value;
  if (notes !== undefined) lead.notes = notes;
  if (category !== undefined) {
    const categoryExists = await LeadCategory.findById(category);
    if (!categoryExists) {
      return next(new ErrorResponse('Invalid category', 400));
    }
    lead.category = category;
  }

  await lead.save();

  // Add activity
  await lead.addActivity({
    type: 'note',
    description: 'Lead updated',
    performedBy: cpId,
    activityCreatorModel: 'ChannelPartner'
  });

  await lead.populate('category', 'name color icon');
  await lead.populate('assignedTo', 'name email phoneNumber');

  res.status(200).json({
    success: true,
    message: 'Lead updated successfully',
    data: lead
  });
});

// @desc    Update lead status
// @route   PATCH /api/cp/leads/:id/status
// @access  Private (Channel Partner only)
exports.updateLeadStatus = asyncHandler(async (req, res, next) => {
  const cpId = req.channelPartner.id;
  const leadId = req.params.id;
  const { status, lostReason } = req.body;

  if (!status) {
    return next(new ErrorResponse('Status is required', 400));
  }

  const lead = await CPLead.findOne({
    _id: leadId,
    assignedTo: cpId
  });

  if (!lead) {
    return next(new ErrorResponse('Lead not found', 404));
  }

  // Prevent status updates if lead is shared (read-only mode)
  if (lead.sharedWithSales && lead.sharedWithSales.length > 0) {
    return next(new ErrorResponse('Cannot update status: Lead is shared with sales team and is read-only', 403));
  }

  try {
    await lead.updateStatus(status);
    
    if (status === 'lost' && lostReason) {
      lead.lostReason = lostReason;
      await lead.save();
    }

    // Add activity
    await lead.addActivity({
      type: 'status_change',
      description: `Status changed to ${status}`,
      performedBy: cpId,
      activityCreatorModel: 'ChannelPartner'
    });

    // Create notification if converted
    if (status === 'converted') {
      await createNotification(
        cpId,
        'lead_converted',
        'Lead Converted',
        `Lead ${lead.name || lead.phone} has been converted to client`,
        { type: 'lead', id: lead._id },
        `/cp-converted`
      );
    }

    await lead.populate('category', 'name color icon');
    await lead.populate('assignedTo', 'name email phoneNumber');

    res.status(200).json({
      success: true,
      message: 'Lead status updated successfully',
      data: lead
    });
  } catch (error) {
    return next(new ErrorResponse(error.message, 400));
  }
});

// @desc    Delete lead
// @route   DELETE /api/cp/leads/:id
// @access  Private (Channel Partner only)
exports.deleteLead = asyncHandler(async (req, res, next) => {
  const cpId = req.channelPartner.id;
  const leadId = req.params.id;

  const lead = await CPLead.findOne({
    _id: leadId,
    assignedTo: cpId
  });

  if (!lead) {
    return next(new ErrorResponse('Lead not found', 404));
  }

  // Delete lead profile if exists
  if (lead.leadProfile) {
    await CPLeadProfile.findByIdAndDelete(lead.leadProfile);
  }

  await CPLead.findByIdAndDelete(leadId);

  res.status(200).json({
    success: true,
    message: 'Lead deleted successfully'
  });
});

// @desc    Share lead with Sales Team Lead
// @route   POST /api/cp/leads/:id/share
// @access  Private (Channel Partner only)
exports.shareLeadWithSales = asyncHandler(async (req, res, next) => {
  const cpId = req.channelPartner.id;
  const leadId = req.params.id;
  const { salesId } = req.body;

  if (!salesId) {
    return next(new ErrorResponse('Sales ID is required', 400));
  }

  const lead = await CPLead.findOne({
    _id: leadId,
    assignedTo: cpId
  });

  if (!lead) {
    return next(new ErrorResponse('Lead not found', 404));
  }

  // Verify Sales exists
  const sales = await Sales.findById(salesId);
  if (!sales) {
    return next(new ErrorResponse('Sales Team Lead not found', 404));
  }

  // Share lead
  await lead.shareWithSales(salesId, cpId);

  // Create notification for Sales (if they have notification system)
  // TODO: Implement Sales notification if needed

  await lead.populate('sharedWithSales.salesId', 'name email phoneNumber');

  res.status(200).json({
    success: true,
    message: 'Lead shared with Sales Team Lead successfully',
    data: lead
  });
});

// @desc    Unshare lead with Sales Team Lead
// @route   POST /api/cp/leads/:id/unshare
// @access  Private (Channel Partner only)
exports.unshareLeadWithSales = asyncHandler(async (req, res, next) => {
  const cpId = req.channelPartner.id;
  const leadId = req.params.id;
  const { salesId } = req.body;

  if (!salesId) {
    return next(new ErrorResponse('Sales ID is required', 400));
  }

  const lead = await CPLead.findOne({
    _id: leadId,
    assignedTo: cpId
  });

  if (!lead) {
    return next(new ErrorResponse('Lead not found', 404));
  }

  await lead.unshareWithSales(salesId, cpId);

  await lead.populate('sharedWithSales.salesId', 'name email phoneNumber');

  res.status(200).json({
    success: true,
    message: 'Lead unshared with Sales Team Lead successfully',
    data: lead
  });
});

// @desc    Get leads shared from Sales
// @route   GET /api/cp/leads/shared/from-sales
// @access  Private (Channel Partner only)
exports.getSharedLeadsFromSales = asyncHandler(async (req, res, next) => {
  const cpId = req.channelPartner.id;
  const { page = 1, limit = 20 } = req.query;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  // Find CP leads that have sharedFromSales
  const leads = await CPLead.find({
    assignedTo: cpId,
    'sharedFromSales.0': { $exists: true }
  })
    .populate('category', 'name color icon')
    .populate('sharedFromSales.leadId')
    .populate('sharedFromSales.sharedBy', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const total = await CPLead.countDocuments({
    assignedTo: cpId,
    'sharedFromSales.0': { $exists: true }
  });

  res.status(200).json({
    success: true,
    count: leads.length,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
    data: leads
  });
});

// @desc    Get leads shared with Sales
// @route   GET /api/cp/leads/shared/with-sales
// @access  Private (Channel Partner only)
exports.getSharedLeadsWithSales = asyncHandler(async (req, res, next) => {
  const cpId = req.channelPartner.id;
  const { page = 1, limit = 20 } = req.query;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const leads = await CPLead.find({
    assignedTo: cpId,
    'sharedWithSales.0': { $exists: true }
  })
    .populate('category', 'name color icon')
    .populate('sharedWithSales.salesId', 'name email phoneNumber')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const total = await CPLead.countDocuments({
    assignedTo: cpId,
    'sharedWithSales.0': { $exists: true }
  });

  res.status(200).json({
    success: true,
    count: leads.length,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
    data: leads
  });
});

// @desc    Create lead profile
// @route   POST /api/cp/leads/:id/profile
// @access  Private (Channel Partner only)
exports.createLeadProfile = asyncHandler(async (req, res, next) => {
  const cpId = req.channelPartner.id;
  const leadId = req.params.id;
  const {
    name,
    businessName,
    email,
    categoryId,
    category,
    projectType, // Legacy support
    estimatedCost,
    description,
    location,
    businessType,
    quotationSent,
    demoSent,
    proposalSent
  } = req.body;

  const lead = await CPLead.findOne({
    _id: leadId,
    assignedTo: cpId
  }).populate('category');

  if (!lead) {
    return next(new ErrorResponse('Lead not found or not assigned to you', 404));
  }

  if (lead.leadProfile) {
    return next(new ErrorResponse('Lead profile already exists', 400));
  }

  // Use categoryId from request, or lead's category, or fall back to legacy projectType
  const categoryIdToUse = categoryId || category || lead.category?._id || lead.category || null;
  
  const leadProfile = await CPLeadProfile.create({
    lead: leadId,
    name: name || lead.name,
    businessName,
    email: email || lead.email,
    category: categoryIdToUse, // Use category (preferred)
    projectType: projectType || { web: false, app: false, taxi: false, other: false }, // Legacy support
    estimatedCost: estimatedCost || 0,
    description,
    location,
    businessType,
    quotationSent: quotationSent || false,
    demoSent: demoSent || false,
    proposalSent: proposalSent || false,
    createdBy: cpId
  });

  lead.leadProfile = leadProfile._id;
  await lead.save();

  // Add activity
  await lead.addActivity({
    type: 'note',
    description: 'Lead profile created',
    performedBy: cpId,
    activityCreatorModel: 'ChannelPartner'
  });

  res.status(201).json({
    success: true,
    message: 'Lead profile created successfully',
    data: leadProfile
  });
});

// Allowed fields for lead profile update (prevents overwriting lead, createdBy, etc.)
const LEAD_PROFILE_UPDATE_FIELDS = [
  'name', 'businessName', 'email', 'category', 'projectType', 'estimatedCost',
  'description', 'location', 'businessType', 'quotationSent', 'demoSent', 'proposalSent',
  'documents', 'notes', 'conversionData'
];

// @desc    Update lead profile
// @route   PUT /api/cp/leads/:id/profile
// @access  Private (Channel Partner only)
exports.updateLeadProfile = asyncHandler(async (req, res, next) => {
  const cpId = req.channelPartner.id;
  const leadId = req.params.id;
  const body = req.body;

  const updateData = {};
  LEAD_PROFILE_UPDATE_FIELDS.forEach(field => {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  });

  const lead = await CPLead.findOne({
    _id: leadId,
    assignedTo: cpId
  }).populate('leadProfile');

  if (!lead) {
    return next(new ErrorResponse('Lead not found or not assigned to you', 404));
  }

  if (!lead.leadProfile) {
    return next(new ErrorResponse('Lead profile not found', 404));
  }

  const leadProfile = await CPLeadProfile.findByIdAndUpdate(
    lead.leadProfile._id,
    updateData,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    message: 'Lead profile updated successfully',
    data: leadProfile
  });
});

// @desc    Convert lead to client
// @route   POST /api/cp/leads/:id/convert
// @access  Private (Channel Partner only)
exports.convertLeadToClient = asyncHandler(async (req, res, next) => {
  const cpId = req.channelPartner.id;
  const leadId = req.params.id;
  const {
    projectName,
    finishedDays,
    totalCost,
    advanceReceived,
    includeGST,
    paymentScreenshot
  } = req.body;

  // Parse and validate totalCost - this is the actual project cost from conversion form
  const actualProjectCost = totalCost ? parseFloat(totalCost) : 0;
  
  if (!actualProjectCost || actualProjectCost <= 0) {
    return next(new ErrorResponse('Project total cost is required and must be greater than 0', 400));
  }

  const lead = await CPLead.findOne({
    _id: leadId,
    assignedTo: cpId
  }).populate('leadProfile');

  if (!lead) {
    return next(new ErrorResponse('Lead not found or not assigned to you', 404));
  }

  if (lead.status === 'converted') {
    return next(new ErrorResponse('Lead is already converted', 400));
  }

  // Prevent conversion if lead is shared (read-only mode)
  if (lead.sharedWithSales && lead.sharedWithSales.length > 0) {
    return next(new ErrorResponse('Cannot convert: Lead is shared with sales team and is read-only', 403));
  }

  // Create client
  const client = await Client.create({
    name: lead.name || 'Client',
    email: lead.email,
    phoneNumber: lead.phone,
    companyName: lead.company,
    createdBy: cpId,
    creatorModel: 'ChannelPartner',
    source: 'channel_partner'
  });

  // Update lead
  lead.status = 'converted';
  lead.convertedToClient = client._id;
  lead.convertedAt = new Date();
  await lead.save();

  // Update lead profile conversion data if exists
  // Use actualProjectCost (from conversion form) as the source of truth
  if (lead.leadProfile) {
    await CPLeadProfile.findByIdAndUpdate(lead.leadProfile._id, {
      conversionData: {
        projectName,
        finishedDays,
        totalCost: actualProjectCost, // Use parsed actual project cost
        advanceReceived: advanceReceived ? parseFloat(advanceReceived) : 0,
        includeGST,
        paymentScreenshot
      }
    });
  }

  // Add activity
  await lead.addActivity({
    type: 'note',
    description: 'Lead converted to client',
    performedBy: cpId,
    activityCreatorModel: 'ChannelPartner'
  });

  // Create notification
  await createNotification(
    cpId,
    'lead_converted',
    'Lead Converted',
    `Lead ${lead.name || lead.phone} has been converted to client`,
    { type: 'client', id: client._id },
    `/cp-converted`
  );

  // Update Channel Partner revenue - use actualProjectCost from conversion form
  await ChannelPartner.findByIdAndUpdate(cpId, {
    $inc: { totalRevenue: actualProjectCost }
  });

  // Calculate and distribute commission
  // IMPORTANT: Use actualProjectCost (from conversion form), NOT lead.value
  // The actual project cost entered during conversion is the source of truth
  let commissionData = null;
  if (actualProjectCost && actualProjectCost > 0) {
    try {
      // Determine commission scenario
      const scenario = determineCPCommissionScenario(lead);
      
      // Calculate commission using actualProjectCost from conversion form
      const commissionResult = await calculateCommission(scenario, actualProjectCost);
      
      if (commissionResult.amount > 0) {
        // Distribute commission to wallet
        const description = scenario === 'own' 
          ? `Commission for converting own lead: ${lead.name || lead.phone} (${commissionResult.percentage}% of ₹${actualProjectCost})`
          : `Commission for converting shared lead: ${lead.name || lead.phone} (${commissionResult.percentage}% of ₹${actualProjectCost})`;
        
        await distributeCommission(
          cpId,
          commissionResult.amount,
          description,
          {
            type: 'lead_conversion',
            id: lead._id
          },
          commissionResult.percentage
        );
        
        commissionData = {
          amount: commissionResult.amount,
          percentage: commissionResult.percentage,
          scenario: scenario
        };
      }
    } catch (commissionError) {
      // Log error but don't fail the conversion
      console.error('Error processing commission for CP lead conversion:', commissionError);
    }
  }

  res.status(200).json({
    success: true,
    message: 'Lead converted to client successfully',
    data: {
      lead,
      client,
      commission: commissionData
    }
  });
});

// @desc    Add follow-up
// @route   POST /api/cp/leads/:id/followup
// @access  Private (Channel Partner only)
exports.addFollowUp = asyncHandler(async (req, res, next) => {
  const cpId = req.channelPartner.id;
  const leadId = req.params.id;
  const { scheduledDate, scheduledTime, type, notes, priority } = req.body;

  if (!scheduledDate) {
    return next(new ErrorResponse('Scheduled date is required', 400));
  }

  const lead = await CPLead.findOne({
    _id: leadId,
    assignedTo: cpId
  });

  if (!lead) {
    return next(new ErrorResponse('Lead not found', 404));
  }

  await lead.addFollowUp({
    scheduledDate,
    scheduledTime,
    type: type || 'call',
    notes,
    priority: priority || 'medium',
    status: 'pending'
  });

  // Update next follow-up date
  lead.nextFollowUpDate = scheduledDate;
  await lead.save();

  // Add activity
  await lead.addActivity({
    type: 'followup_added',
    description: `Follow-up scheduled for ${new Date(scheduledDate).toLocaleDateString()}`,
    performedBy: cpId,
    activityCreatorModel: 'ChannelPartner'
  });

  await lead.populate('category', 'name color icon');

  res.status(200).json({
    success: true,
    message: 'Follow-up added successfully',
    data: lead
  });
});

// @desc    Update follow-up
// @route   PUT /api/cp/leads/:id/followup/:followupId
// @access  Private (Channel Partner only)
exports.updateFollowUp = asyncHandler(async (req, res, next) => {
  const cpId = req.channelPartner.id;
  const leadId = req.params.id;
  const followupId = req.params.followupId;
  const { scheduledDate, scheduledTime, type, notes, priority, status } = req.body;

  const lead = await CPLead.findOne({
    _id: leadId,
    assignedTo: cpId
  });

  if (!lead) {
    return next(new ErrorResponse('Lead not found', 404));
  }

  const followUp = lead.followUps.id(followupId);
  if (!followUp) {
    return next(new ErrorResponse('Follow-up not found', 404));
  }

  if (scheduledDate !== undefined) followUp.scheduledDate = scheduledDate;
  if (scheduledTime !== undefined) followUp.scheduledTime = scheduledTime;
  if (type !== undefined) followUp.type = type;
  if (notes !== undefined) followUp.notes = notes;
  if (priority !== undefined) followUp.priority = priority;
  if (status !== undefined) {
    followUp.status = status;
    if (status === 'completed') {
      followUp.completedAt = new Date();
    }
  }

  await lead.save();

  // Add activity
  await lead.addActivity({
    type: status === 'completed' ? 'followup_completed' : 'followup_rescheduled',
    description: `Follow-up ${status === 'completed' ? 'completed' : 'updated'}`,
    performedBy: cpId,
    activityCreatorModel: 'ChannelPartner'
  });

  res.status(200).json({
    success: true,
    message: 'Follow-up updated successfully',
    data: lead
  });
});

// @desc    Get lead categories
// @route   GET /api/cp/lead-categories
// @access  Private (Channel Partner only)
exports.getLeadCategories = asyncHandler(async (req, res, next) => {
  const categories = await LeadCategory.find().sort({ name: 1 });

  res.status(200).json({
    success: true,
    count: categories.length,
    data: categories
  });
});

// @desc    Get sales team leads for sharing
// @route   GET /api/cp/sales-team-leads
// @access  Private (Channel Partner only)
exports.getSalesTeamLeads = asyncHandler(async (req, res, next) => {
  // Get all sales team members who are team leads
  const salesTeamLeads = await Sales.find({ isTeamLead: true, isActive: true })
    .select('name email phoneNumber')
    .sort({ name: 1 });

  res.status(200).json({
    success: true,
    count: salesTeamLeads.length,
    data: salesTeamLeads
  });
});

// @desc    Get assigned sales team lead details
// @route   GET /api/cp/sales-manager
// @access  Private (Channel Partner only)
exports.getSalesManagerDetails = asyncHandler(async (req, res, next) => {
  const cpId = req.channelPartner.id;

  // Get channel partner with sales team lead
  const channelPartner = await ChannelPartner.findById(cpId)
    .populate('salesTeamLeadId', 'name email phone role isTeamLead employeeId department experience skills salesTarget currentSales lastLogin');

  if (!channelPartner) {
    return next(new ErrorResponse('Channel partner not found', 404));
  }

  if (!channelPartner.salesTeamLeadId) {
    return res.status(200).json({
      success: true,
      message: 'No sales manager assigned',
      data: null
    });
  }

  const salesManager = channelPartner.salesTeamLeadId;

  // Determine status based on lastLogin (within last 30 minutes = online)
  const isOnline = salesManager.lastLogin && 
    (Date.now() - new Date(salesManager.lastLogin).getTime()) < 30 * 60 * 1000;

  res.status(200).json({
    success: true,
    data: {
      id: salesManager._id,
      name: salesManager.name,
      email: salesManager.email,
      phoneNumber: salesManager.phone,
      role: salesManager.role,
      employeeId: salesManager.employeeId,
      department: salesManager.department,
      isTeamLead: salesManager.isTeamLead,
      experience: salesManager.experience,
      skills: salesManager.skills || [],
      salesTarget: salesManager.salesTarget || 0,
      currentSales: salesManager.currentSales || 0,
      assignedDate: channelPartner.teamLeadAssignedDate,
      lastLogin: salesManager.lastLogin,
      isOnline: isOnline
    }
  });
});

// @desc    Get all converted clients for Channel Partner
// @route   GET /api/cp/clients
// @access  Private (Channel Partner only)
exports.getConvertedClients = asyncHandler(async (req, res, next) => {
  const cpId = req.channelPartner.id;
  const { page = 1, limit = 20, search, status } = req.query;

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  // Build query for converted CPLeads (since Client model doesn't have createdBy/creatorModel)
  const leadQuery = {
    assignedTo: cpId,
    status: 'converted',
    convertedToClient: { $exists: true, $ne: null }
  };

  // Search filter on leads
  if (search) {
    leadQuery.$or = [
      { name: { $regex: search, $options: 'i' } },
      { company: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];
  }

  // Get total count of converted leads
  const total = await CPLead.countDocuments(leadQuery);

  // Get converted leads with populated client and lead profile
  const convertedLeads = await CPLead.find(leadQuery)
    .populate('leadProfile')
    .populate({
      path: 'convertedToClient',
      select: 'name companyName email phoneNumber projects createdAt',
      populate: {
        path: 'projects',
        select: 'name status progress budget financialDetails startDate',
        match: { status: { $ne: 'cancelled' } }
      }
    })
    .sort({ convertedAt: -1, createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  // Format response with project and commission data
  const formattedClients = convertedLeads
    .filter(lead => lead.convertedToClient) // Filter out any null clients
    .map(lead => {
      const client = lead.convertedToClient;
      // IMPORTANT: Use conversionData.totalCost as the source of truth (actual project cost from conversion form)
      // lead.value is just an initial estimate, conversionData.totalCost is the actual project cost
      const leadData = {
        convertedAt: lead.convertedAt || lead.createdAt,
        totalCost: lead.leadProfile?.conversionData?.totalCost || lead.value || 0, // Prioritize conversion data
        advanceReceived: lead.leadProfile?.conversionData?.advanceReceived || 0,
        projectName: lead.leadProfile?.conversionData?.projectName || 'Project'
      };
      const project = client.projects && client.projects.length > 0 ? client.projects[0] : null;
      
      return {
        id: client._id,
        name: client.name,
        companyName: client.companyName,
        email: client.email,
        phoneNumber: client.phoneNumber,
        convertedAt: leadData.convertedAt,
        project: project ? {
          name: project.name || leadData.projectName,
          status: project.status,
          progress: project.progress || 0,
          totalValue: project.financialDetails?.totalCost || leadData.totalCost || 0,
          paidAmount: project.financialDetails?.advanceReceived || leadData.advanceReceived || 0,
          pendingAmount: (project.financialDetails?.totalCost || leadData.totalCost || 0) - 
                        (project.financialDetails?.advanceReceived || leadData.advanceReceived || 0)
        } : {
          name: leadData.projectName || 'Project',
          status: 'pending-assignment',
          progress: 0,
          totalValue: leadData.totalCost || 0,
          paidAmount: leadData.advanceReceived || 0,
          pendingAmount: (leadData.totalCost || 0) - (leadData.advanceReceived || 0)
        }
      };
    });

  res.status(200).json({
    success: true,
    count: formattedClients.length,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
    data: formattedClients
  });
});

// @desc    Get client details (for converted leads) with project progress
// @route   GET /api/cp/clients/:id
// @access  Private (Channel Partner only)
exports.getClientDetails = asyncHandler(async (req, res, next) => {
  const cpId = req.channelPartner.id;
  const clientId = req.params.id;

  // Find the converted lead that created this client
  const convertedLead = await CPLead.findOne({
    assignedTo: cpId,
    convertedToClient: clientId,
    status: 'converted'
  })
    .populate('leadProfile')
    .populate('category', 'name');

  if (!convertedLead) {
    return next(new ErrorResponse('Client not found or not authorized', 404));
  }

  // Get client with projects
  const client = await Client.findById(clientId)
    .populate({
      path: 'projects',
      populate: {
        path: 'projectManager',
        select: 'name email'
      }
    });

  if (!client) {
    return next(new ErrorResponse('Client not found', 404));
  }

  // Get project details (use first project or create default)
  const Project = require('../models/Project');
  const Milestone = require('../models/Milestone');
  const Payment = require('../models/Payment');
  const Activity = require('../models/Activity');
  
  const projects = await Project.find({ client: clientId })
    .populate('projectManager', 'name email')
    .populate('milestones')
    .sort({ createdAt: -1 });

  const project = projects.length > 0 ? projects[0] : null;
  
  // Get milestones if project exists
  let milestones = [];
  if (project && project.milestones && project.milestones.length > 0) {
    const Milestone = require('../models/Milestone');
    milestones = await Milestone.find({ _id: { $in: project.milestones } })
      .sort({ dueDate: 1 });
  }

  // Get payments for projects
  const projectIds = projects.map(p => p._id);
  const payments = await Payment.find({ project: { $in: projectIds } })
    .populate('project', 'name')
    .sort({ createdAt: -1 });

  // Get project activities
  let activities = [];
  if (project) {
    const Activity = require('../models/Activity');
    activities = await Activity.find({ project: project._id })
      .populate('performedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);
  }

  // Get conversion data from lead profile
  // IMPORTANT: Use conversionData.totalCost as the source of truth (actual project cost from conversion form)
  // convertedLead.value is just an initial estimate, conversionData.totalCost is the actual project cost
  const conversionData = convertedLead.leadProfile?.conversionData || {};
  const leadData = {
    totalCost: conversionData.totalCost || convertedLead.value || 0, // Prioritize conversion data
    advanceReceived: conversionData.advanceReceived || 0,
    projectName: conversionData.projectName || project?.name || 'Project',
    finishedDays: conversionData.finishedDays
  };

  // Format response
  const responseData = {
    client: {
      id: client._id,
      name: client.name,
      companyName: client.companyName,
      email: client.email,
      phoneNumber: client.phoneNumber
    },
    project: project ? {
      id: project._id,
      name: project.name || leadData.projectName,
      description: project.description,
      type: project.category ? (typeof project.category === 'object' ? project.category.name : 'N/A') : (project.projectType ? Object.keys(project.projectType).filter(k => project.projectType[k]).join(', ') : 'N/A'),
      status: project.status,
      progress: project.progress || 0,
      startDate: project.startDate,
      dueDate: project.dueDate,
      projectManager: project.projectManager ? {
        name: project.projectManager.name,
        email: project.projectManager.email
      } : null,
      totalCost: project.financialDetails?.totalCost || leadData.totalCost,
      advanceReceived: project.financialDetails?.advanceReceived || leadData.advanceReceived,
      milestones: milestones.map(m => ({
        id: m._id,
        name: m.name,
        status: m.status,
        dueDate: m.dueDate,
        completedDate: m.completedDate
      })),
      activities: activities.map(a => ({
        id: a._id,
        text: a.description || a.type,
        user: a.performedBy ? `${a.performedBy.name}${a.performedBy.email ? ` (${a.performedBy.email})` : ''}` : 'System',
        time: a.createdAt
      })),
      attachments: project.attachments || []
    } : {
      name: leadData.projectName,
      status: 'pending-assignment',
      progress: 0,
      totalCost: leadData.totalCost,
      advanceReceived: leadData.advanceReceived,
      milestones: [],
      activities: [],
      attachments: []
    },
    payments: payments.map(p => ({
      id: p._id,
      amount: p.amount,
      date: p.paymentDate || p.createdAt,
      invoice: p.invoiceNumber || `INV-${p._id.toString().slice(-6)}`,
      status: p.status || 'Received',
      method: p.paymentMethod || 'Bank Transfer',
      project: p.project?.name || 'Project'
    })),
    convertedAt: convertedLead.convertedAt || convertedLead.createdAt
  };

  res.status(200).json({
    success: true,
    data: responseData
  });
});
