const Request = require('../models/Request');
const Project = require('../models/Project');
const Admin = require('../models/Admin');
const Client = require('../models/Client');
const Employee = require('../models/Employee');
const PM = require('../models/PM');
const Sales = require('../models/Sales');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// Map req.userType (set by protect) to model name for DB
const USER_TYPE_TO_MODEL = {
  admin: 'Admin',
  hr: 'Admin',
  accountant: 'Admin',
  pem: 'Admin',
  'project-manager': 'PM',
  sales: 'Sales',
  employee: 'Employee',
  client: 'Client'
};

// Helper to get user info from request (works for all user types)
// Priority order: Admin > PM > Sales > Employee > Client
// Fallback: if req.user exists (set by protect) use req.user + req.userType
const getUserInfo = (req) => {
  if (req.admin) {
    const id = req.admin._id || req.admin.id;
    return id ? { id: String(id), model: 'Admin', module: 'admin' } : null;
  } else if (req.pm) {
    const id = req.pm._id || req.pm.id;
    return id ? { id: String(id), model: 'PM', module: 'pm' } : null;
  } else if (req.sales) {
    const id = req.sales._id || req.sales.id;
    return id ? { id: String(id), model: 'Sales', module: 'sales' } : null;
  } else if (req.employee) {
    const id = req.employee._id || req.employee.id;
    return id ? { id: String(id), model: 'Employee', module: 'employee' } : null;
  } else if (req.client) {
    const id = req.client._id || req.client.id;
    return id ? { id: String(id), model: 'Client', module: 'client' } : null;
  }
  // Fallback: protect set req.user/req.userType but role-specific ref may be missing in edge cases
  if (req.user && req.userType && USER_TYPE_TO_MODEL[req.userType]) {
    const id = req.user._id || req.user.id;
    const model = USER_TYPE_TO_MODEL[req.userType];
    const module = req.userType;
    return id ? { id: String(id), model, module } : null;
  }
  return null;
};

// Helper to populate request with user details
const populateRequest = async (request) => {
  await request.populate([
    { path: 'requestedBy', select: 'name email phoneNumber' },
    { path: 'recipient', select: 'name email phoneNumber' },
    { path: 'project', select: 'name status' },
    { path: 'client', select: 'name email phoneNumber' }
  ]);
  
  if (request.response && request.response.respondedBy) {
    // Populate respondedBy based on model
    const modelMap = {
      'Admin': Admin,
      'Client': Client,
      'Employee': Employee,
      'PM': PM,
      'Sales': Sales,
      'Sales': Sales
    };
    const Model = modelMap[request.response.respondedByModel];
    if (Model && request.response.respondedBy) {
      const responder = await Model.findById(request.response.respondedBy).select('name email');
      if (responder) {
        request.response.respondedBy = responder;
      }
    }
  }
  
  return request;
};

// @desc    Create a new request
// @route   POST /api/requests
// @access  Private (All authenticated users)
const createRequest = asyncHandler(async (req, res, next) => {
  const user = getUserInfo(req);
  
  // Debug logging
  if (!user || !user.id) {
    console.error('createRequest - getUserInfo failed:', {
      hasAdmin: !!req.admin,
      hasClient: !!req.client,
      hasEmployee: !!req.employee,
      hasPM: !!req.pm,
      hasSales: !!req.sales,
      salesId: req.sales ? (req.sales._id || req.sales.id) : null,
      userInfo: user
    });
    return next(new ErrorResponse('Authentication required', 401));
  }

  let { title, description, type, priority, recipient, recipientModel, project, client, category, amount } = req.body;


  // Validation (skip recipient checks for CP withdrawal - already set above)
  if (!title || !description || !type) {
    return next(new ErrorResponse('Title, description, and type are required', 400));
  }
  if (!recipient || !recipientModel) {
    return next(new ErrorResponse('Recipient and recipientModel are required', 400));
  }

  // Validate recipient model
  if (!['Admin', 'Client', 'Employee', 'PM', 'Sales'].includes(recipientModel)) {
    return next(new ErrorResponse('Invalid recipient model', 400));
  }

  // Validate recipient exists
  const modelMap = {
    'Admin': Admin,
    'Client': Client,
    'Employee': Employee,
    'PM': PM,
    'Sales': Sales,
    'Sales': Sales
  };
  const RecipientModel = modelMap[recipientModel];
  if (!RecipientModel) {
    return next(new ErrorResponse('Invalid recipient model', 400));
  }

  const recipientExists = await RecipientModel.findById(recipient);
  if (!recipientExists) {
    return next(new ErrorResponse('Recipient not found', 404));
  }

  // Validate project if provided
  if (project) {
    const projectExists = await Project.findById(project);
    if (!projectExists) {
      return next(new ErrorResponse('Project not found', 404));
    }
  }

  // Validate client if provided
  if (client) {
    const clientExists = await Client.findById(client);
    if (!clientExists) {
      return next(new ErrorResponse('Client not found', 404));
    }
  }

  // Validate amount for payment-recovery type
  if (type === 'payment-recovery' && (!amount || amount <= 0)) {
    return next(new ErrorResponse('Amount is required for payment-recovery requests', 400));
  }

  const requestData = {
    module: user.module,
    type,
    title,
    description,
    category: category || '',
    priority: priority || 'normal',
    requestedBy: user.id.toString(),
    requestedByModel: user.model,
    recipient: recipient.toString(),
    recipientModel,
    project: project ? project.toString() : undefined,
    client: client ? client.toString() : undefined,
    amount: type === 'payment-recovery' || type === 'withdrawal-request' ? parseFloat(amount) : undefined,
    status: 'pending'
  };
  const request = await Request.create(requestData);

  await populateRequest(request);

  res.status(201).json({
    success: true,
    message: 'Request created successfully',
    data: request
  });
});

// @desc    Get all requests (incoming/outgoing with filters)
// @route   GET /api/requests
// @access  Private (All authenticated users)
const getRequests = asyncHandler(async (req, res, next) => {
  const user = getUserInfo(req);
  if (!user) {
    return next(new ErrorResponse('Authentication required', 401));
  }

  const {
    direction = 'all', // 'incoming', 'outgoing', or 'all'
    module,
    type,
    status,
    priority,
    search,
    startDate,
    endDate,
    page = 1,
    limit = 20,
    paymentApprovalOnly, // 'true' = only payment-related approval requests (from sales / channel flow)
    excludePaymentApproval // 'true' = exclude payment-related approval requests (for Requests page)
  } = req.query;

  // Build filter
  const filter = {};

  // Date range filter (by request createdAt)
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  // Filter by direction - admins see all platform data (no isolation per admin)
  const isAdmin = user.model === 'Admin';
  if (isAdmin) {
    // All admins see all requests; optional direction filter by role only
    if (direction === 'incoming') {
      filter.recipientModel = 'Admin';
    } else if (direction === 'outgoing') {
      filter.requestedByModel = 'Admin';
    }
    // direction === 'all': no recipient/requestedBy filter - show all requests
  } else {
    if (direction === 'incoming') {
      filter.recipient = user.id;
      filter.recipientModel = user.model;
    } else if (direction === 'outgoing') {
      filter.requestedBy = user.id;
      filter.requestedByModel = user.model;
    } else {
      filter.$or = [
        { requestedBy: user.id, requestedByModel: user.model },
        { recipient: user.id, recipientModel: user.model }
      ];
    }
  }

  // Additional filters
  if (module) filter.module = module;
  if (type) filter.type = type;
  if (status) filter.status = status;
  if (priority) filter.priority = priority;

  // Payment-approval: requests from sales related to payment (payment-recovery or approval with amount/installment/receipt)
  const paymentApprovalCondition = {
    module: 'sales',
    $or: [
      { type: 'payment-recovery' },
      {
        type: 'approval',
        $or: [
          { amount: { $exists: true, $gt: 0 } },
          { 'metadata.paymentReceiptId': { $exists: true, $ne: null } },
          { 'metadata.installmentId': { $exists: true, $ne: null } }
        ]
      }
    ]
  };
  if (paymentApprovalOnly === 'true' || paymentApprovalOnly === true) {
    filter.$and = filter.$and || [];
    filter.$and.push(paymentApprovalCondition);
  }
  if (excludePaymentApproval === 'true' || excludePaymentApproval === true) {
    filter.$and = filter.$and || [];
    filter.$and.push({ $nor: [paymentApprovalCondition] });
  }

  // Search filter
  if (search) {
    filter.$or = [
      ...(filter.$or || []),
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const requests = await Request.find(filter)
    .populate('requestedBy', 'name email phoneNumber')
    .populate('recipient', 'name email phoneNumber')
    .populate('project', 'name status')
    .populate('client', 'name email phoneNumber')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  // Enrich payment-approval requests with account information and response.respondedBy
  const PaymentReceipt = require('../models/PaymentReceipt');
  const Account = require('../models/Account');

  for (let request of requests) {
    // Populate response.respondedBy
    if (request.response && request.response.respondedBy && request.response.respondedByModel) {
      const modelMap = {
        'Admin': Admin,
        'Client': Client,
        'Employee': Employee,
        'PM': PM,
        'Sales': Sales,
        'Sales': Sales
      };
      const Model = modelMap[request.response.respondedByModel];
      if (Model) {
        const responder = await Model.findById(request.response.respondedBy).select('name email');
        if (responder) {
          request.response.respondedBy = responder;
        }
      }
    }

    // For sales payment-recovery approvals, attach account info (for admin payment-approvals table)
    if (request.type === 'payment-recovery' && request.module === 'sales') {
      try {
        // Prefer account from PaymentReceipt if present
        let accountId = request.metadata?.accountId || null;

        if (request.metadata?.paymentReceiptId) {
          const receipt = await PaymentReceipt.findById(request.metadata.paymentReceiptId).select('account').populate('account', 'name accountName bankName');
          if (receipt && receipt.account) {
            accountId = receipt.account._id || receipt.account.id || receipt.account;
            const accountName = receipt.account.accountName || receipt.account.name || '';
            const bankName = receipt.account.bankName || '';
            request.metadata = request.metadata || {};
            request.metadata.accountId = accountId;
            request.metadata.accountName = bankName ? `${accountName} - ${bankName}` : accountName;
            continue;
          }
        }

        // Fallback: look up Account by accountId in metadata
        if (accountId) {
          const account = await Account.findById(accountId).select('name accountName bankName');
          if (account) {
            const accountName = account.accountName || account.name || '';
            const bankName = account.bankName || '';
            request.metadata = request.metadata || {};
            request.metadata.accountName = bankName ? `${accountName} - ${bankName}` : accountName;
          }
        }
      } catch (err) {
        console.error('Error enriching request with account info:', err);
      }
    }
  }

  const total = await Request.countDocuments(filter);

  res.json({
    success: true,
    message: 'Requests fetched successfully',
    data: requests,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  });
});

// @desc    Get request by ID
// @route   GET /api/requests/:id
// @access  Private (All authenticated users - must be sender or recipient)
const getRequestById = asyncHandler(async (req, res, next) => {
  const user = getUserInfo(req);
  if (!user) {
    return next(new ErrorResponse('Authentication required', 401));
  }

  const request = await Request.findById(req.params.id);

  if (!request) {
    return next(new ErrorResponse('Request not found', 404));
  }

  // Check if user is sender or recipient; any admin can view any request (no data isolation)
  const isSender = String(request.requestedBy) === String(user.id) && request.requestedByModel === user.model;
  const isRecipient = String(request.recipient) === String(user.id) && request.recipientModel === user.model;
  const isAdminViewingAny = user.model === 'Admin';

  if (!isSender && !isRecipient && !isAdminViewingAny) {
    return next(new ErrorResponse('Not authorized to access this request', 403));
  }

  await populateRequest(request);

  res.json({
    success: true,
    message: 'Request fetched successfully',
    data: request
  });
});

// @desc    Respond to request
// @route   POST /api/requests/:id/respond
// @access  Private (Recipient only)
const respondToRequest = asyncHandler(async (req, res, next) => {
  const user = getUserInfo(req);
  if (!user) {
    return next(new ErrorResponse('Authentication required', 401));
  }

  const { responseType, message } = req.body;

  if (!responseType || !['approve', 'reject', 'request_changes'].includes(responseType)) {
    return next(new ErrorResponse('Valid response type (approve/reject/request_changes) is required', 400));
  }

  // For approve, message is optional; for reject/request_changes, message is required
  if (responseType !== 'approve' && !message) {
    return next(new ErrorResponse('Message is required for reject and request_changes responses', 400));
  }

  const request = await Request.findById(req.params.id);

  if (!request) {
    return next(new ErrorResponse('Request not found', 404));
  }

  // Check if user is the recipient; any admin can respond to requests addressed to Admin (no isolation)
  const isRecipient = String(request.recipient) === String(user.id) && request.recipientModel === user.model;
  const isAdminRespondingToAdminRequest = user.model === 'Admin' && request.recipientModel === 'Admin';

  if (!isRecipient && !isAdminRespondingToAdminRequest) {
    return next(new ErrorResponse('Only the recipient can respond to this request', 403));
  }

  // Check if request is already responded
  if (request.status !== 'pending') {
    return next(new ErrorResponse('Request has already been responded to', 400));
  }

  // Handle payment receipt approval/rejection - update PaymentReceipt status
  if (request.type === 'payment-recovery' && request.module === 'sales' && request.metadata?.paymentReceiptId) {
    const PaymentReceipt = require('../models/PaymentReceipt');
    const receipt = await PaymentReceipt.findById(request.metadata.paymentReceiptId);
    
    if (!receipt) {
      return next(new ErrorResponse('Payment receipt not found', 404));
    }

    if (responseType === 'approve') {
      // Update receipt status to approved
      if (receipt.status === 'approved') {
        return next(new ErrorResponse('Payment receipt is already approved', 400));
      }
      
      receipt.status = 'approved';
      receipt.verifiedBy = user.id;
      receipt.verifiedAt = new Date();
      await receipt.save();
      // The PaymentReceipt post-save hook will handle project financials update and finance transaction creation
    } else if (responseType === 'reject') {
      // Update receipt status to rejected
      if (receipt.status === 'rejected') {
        return next(new ErrorResponse('Payment receipt is already rejected', 400));
      }
      
      receipt.status = 'rejected';
      receipt.verifiedBy = user.id;
      receipt.verifiedAt = new Date();
      await receipt.save();
      // The PaymentReceipt post-save hook will handle restoring remainingAmount
    }
  }


  // Handle installment payment approval - update installment status if approved
  if (request.type === 'approval' && request.module === 'sales' && request.metadata?.installmentId) {
    if (responseType === 'approve') {
      // Update installment status to paid
      const project = await Project.findById(request.metadata.projectId);
      if (!project) {
        return next(new ErrorResponse('Project not found', 404));
      }

      const installment = project.installmentPlan?.id(request.metadata.installmentId);
      if (!installment) {
        return next(new ErrorResponse('Installment not found', 404));
      }

      // Check if already paid
      if (installment.status === 'paid') {
        return next(new ErrorResponse('Installment is already marked as paid', 400));
      }

      // Mark installment as paid
      const previousStatus = installment.status;
      installment.status = 'paid';
      installment.paidDate = request.metadata.paidDate ? new Date(request.metadata.paidDate) : new Date();
      if (request.metadata.notes) {
        installment.notes = request.metadata.notes;
      }

      // Create incoming transaction when installment is marked as paid
      if (previousStatus !== 'paid') {
        try {
          const { createIncomingTransaction } = require('../utils/financeTransactionHelper');
          const Admin = require('../models/Admin');
          
          let adminId = user.id;
          if (!adminId) {
            const admin = await Admin.findOne({ isActive: true }).select('_id');
            adminId = admin ? admin._id : null;
          }

          if (adminId) {
            await createIncomingTransaction({
              amount: installment.amount,
              category: 'Project Installment Payment',
              transactionDate: installment.paidDate,
              createdBy: adminId,
              client: project.client,
              project: project._id,
              description: `Installment payment for project "${project.name}" - ₹${installment.amount}`,
              metadata: {
                sourceType: 'projectInstallment',
                sourceId: installment._id.toString(),
                projectId: project._id.toString(),
                installmentId: installment._id.toString()
              },
              checkDuplicate: true
            });
          }
        } catch (error) {
          console.error('Error creating finance transaction for installment:', error);
          // Don't fail the request approval if transaction creation fails
        }
      }

      // Recalculate project financials
      try {
        const { calculateInstallmentTotals, recalculateProjectFinancials, refreshInstallmentStatuses } = require('../utils/projectFinancialHelper');
        project.markModified('installmentPlan');
        refreshInstallmentStatuses(project);
        const totals = calculateInstallmentTotals(project.installmentPlan);
        await recalculateProjectFinancials(project, totals);
        await project.save();
      } catch (error) {
        console.error('Error recalculating project financials:', error);
        // Don't fail the request approval if recalculation fails
      }
    }
  }

  // Handle increase-cost request approval - update project cost if approved
  if (request.type === 'increase-cost' && request.module === 'sales' && request.project) {
    const project = await Project.findById(request.project);
    
    if (!project) {
      return next(new ErrorResponse('Project not found', 404));
    }

    if (responseType === 'approve') {
      // Check if cost was already increased (prevent duplicate increases)
      const currentCost = project.financialDetails?.totalCost || project.budget || 0;
      const expectedNewCost = request.metadata?.newCost;
      
      if (expectedNewCost && currentCost >= expectedNewCost) {
        // Cost already increased, might be duplicate approval
        console.warn('Project cost may have already been increased');
      }

      // Get the increase amount from request
      const increaseAmount = request.amount || (request.metadata?.newCost - request.metadata?.previousCost);
      
      if (!increaseAmount || increaseAmount <= 0) {
        return next(new ErrorResponse('Invalid increase amount in request', 400));
      }

      // Store previous cost for history
      const previousCost = project.financialDetails?.totalCost || project.budget || 0;
      const newCost = previousCost + increaseAmount;

      // Update financial details
      const currentAdvanceReceived = project.financialDetails?.advanceReceived || 0;
      project.financialDetails = {
        totalCost: newCost,
        advanceReceived: currentAdvanceReceived,
        includeGST: project.financialDetails?.includeGST || false,
        remainingAmount: newCost - currentAdvanceReceived
      };

      // Update budget
      project.budget = newCost;

      // Add to cost history
      if (!project.costHistory) {
        project.costHistory = [];
      }
      project.costHistory.push({
        previousCost,
        newCost,
        reason: request.metadata?.reason || request.description || 'Cost increase approved by admin',
        changedBy: request.requestedBy,
        changedByModel: request.requestedByModel,
        changedAt: new Date(),
        approvedBy: user.id,
        approvedByModel: user.model
      });

      await project.save();
    }
    // If rejected, we don't need to do anything - cost stays the same
  }

  // Respond to request
  await request.respond(user.id, user.model, responseType, message || '');

  await populateRequest(request);

  res.json({
    success: true,
    message: 'Response submitted successfully',
    data: request
  });
});

// @desc    Update request
// @route   PUT /api/requests/:id
// @access  Private (Sender only, only pending requests)
const updateRequest = asyncHandler(async (req, res, next) => {
  const user = getUserInfo(req);
  if (!user) {
    return next(new ErrorResponse('Authentication required', 401));
  }

  const request = await Request.findById(req.params.id);

  if (!request) {
    return next(new ErrorResponse('Request not found', 404));
  }

  // Check if user is the sender
  const isSender = String(request.requestedBy) === String(user.id) && request.requestedByModel === user.model;

  if (!isSender) {
    return next(new ErrorResponse('Only the sender can update this request', 403));
  }

  // Only allow updates to pending requests
  if (request.status !== 'pending') {
    return next(new ErrorResponse('Only pending requests can be updated', 400));
  }

  // Allowed fields to update
  const { title, description, priority, category, amount } = req.body;

  if (title) request.title = title;
  if (description) request.description = description;
  if (priority) request.priority = priority;
  if (category !== undefined) request.category = category;
  if (amount !== undefined && (request.type === 'payment-recovery' || request.type === 'withdrawal-request')) {
    request.amount = amount;
  }

  await request.save();
  await populateRequest(request);

  res.json({
    success: true,
    message: 'Request updated successfully',
    data: request
  });
});

// @desc    Delete request
// @route   DELETE /api/requests/:id
// @access  Private (Sender only, only pending requests)
const deleteRequest = asyncHandler(async (req, res, next) => {
  const user = getUserInfo(req);
  if (!user) {
    return next(new ErrorResponse('Authentication required', 401));
  }

  const request = await Request.findById(req.params.id);

  if (!request) {
    return next(new ErrorResponse('Request not found', 404));
  }

  // Check if user is the sender
  const isSender = String(request.requestedBy) === String(user.id) && request.requestedByModel === user.model;

  if (!isSender) {
    return next(new ErrorResponse('Only the sender can delete this request', 403));
  }

  // Only allow deletion of pending requests
  if (request.status !== 'pending') {
    return next(new ErrorResponse('Only pending requests can be deleted', 400));
  }

  await request.deleteOne();

  res.json({
    success: true,
    message: 'Request deleted successfully'
  });
});

// @desc    Get request statistics
// @route   GET /api/requests/statistics
// @access  Private (All authenticated users)
const getRequestStatistics = asyncHandler(async (req, res, next) => {
  const user = getUserInfo(req);
  if (!user) {
    return next(new ErrorResponse('Authentication required', 401));
  }

  const { direction = 'all' } = req.query;

  // Build filter - admins see stats for all platform requests (no isolation)
  const filter = {};
  const isAdmin = user.model === 'Admin';

  if (isAdmin) {
    if (direction === 'incoming') {
      filter.recipientModel = 'Admin';
    } else if (direction === 'outgoing') {
      filter.requestedByModel = 'Admin';
    }
    // direction === 'all': no filter - all requests
  } else {
    if (direction === 'incoming') {
      filter.recipient = user.id;
      filter.recipientModel = user.model;
    } else if (direction === 'outgoing') {
      filter.requestedBy = user.id;
      filter.requestedByModel = user.model;
    } else {
      filter.$or = [
        { requestedBy: user.id, requestedByModel: user.model },
        { recipient: user.id, recipientModel: user.model }
      ];
    }
  }

  // Get statistics
  const [
    totalRequests,
    pendingRequests,
    respondedRequests,
    approvedRequests,
    rejectedRequests,
    urgentRequests,
    clientRequests,
    employeeRequests,
    pmRequests,
    salesRequests,
    adminRequests
  ] = await Promise.all([
    Request.countDocuments(filter),
    Request.countDocuments({ ...filter, status: 'pending' }),
    Request.countDocuments({ ...filter, status: 'responded' }),
    Request.countDocuments({ ...filter, status: 'approved' }),
    Request.countDocuments({ ...filter, status: 'rejected' }),
    Request.countDocuments({ ...filter, priority: 'urgent', status: 'pending' }),
    Request.countDocuments({ ...filter, module: 'client' }),
    Request.countDocuments({ ...filter, module: 'employee' }),
    Request.countDocuments({ ...filter, module: 'pm' }),
    Request.countDocuments({ ...filter, module: 'sales' }),
    Request.countDocuments({ ...filter, module: 'admin' }),
  ]);

  res.json({
    success: true,
    message: 'Statistics fetched successfully',
    data: {
      totalRequests,
      pendingRequests,
      respondedRequests,
      approvedRequests,
      rejectedRequests,
      urgentRequests,
      clientRequests,
      employeeRequests,
      pmRequests,
      salesRequests,
      adminRequests
    }
  });
});

// @desc    Get available recipients by type
// @route   GET /api/requests/recipients
// @access  Private (All authenticated users)
const getRecipients = asyncHandler(async (req, res, next) => {
  const user = getUserInfo(req);
  if (!user) {
    return next(new ErrorResponse('Authentication required', 401));
  }

  const { type } = req.query; // 'client', 'employee', 'pm', 'sales', 'admin'

  if (!type || !['client', 'employee', 'pm', 'sales', 'admin'].includes(type)) {
    return next(new ErrorResponse('Valid recipient type is required', 400));
  }

  const modelMap = {
    'admin': Admin,
    'client': Client,
    'employee': Employee,
    'pm': PM,
    'sales': Sales
  };

  const Model = modelMap[type];
  if (!Model) {
    return next(new ErrorResponse('Invalid recipient type', 400));
  }

  const recipients = await Model.find({}).select('name email phoneNumber').limit(100);

  res.json({
    success: true,
    message: 'Recipients fetched successfully',
    data: recipients.map(r => ({
      id: r._id,
      name: r.name,
      email: r.email,
      phoneNumber: r.phoneNumber
    }))
  });
});

module.exports = {
  createRequest,
  getRequests,
  getRequestById,
  respondToRequest,
  updateRequest,
  deleteRequest,
  getRequestStatistics,
  getRecipients
};

