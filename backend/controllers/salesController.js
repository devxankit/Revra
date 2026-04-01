const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const mongoose = require('mongoose');
const Sales = require('../models/Sales');
const emailService = require('../services/emailService');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const Lead = require('../models/Lead');
const LeadCategory = require('../models/LeadCategory');
const Account = require('../models/Account');
const PaymentReceipt = require('../models/PaymentReceipt');
const SalesTask = require('../models/SalesTask');
const SalesMeeting = require('../models/SalesMeeting');
const Project = require('../models/Project');
const Client = require('../models/Client');
const Request = require('../models/Request');
const Admin = require('../models/Admin');
const CPLead = require('../models/CPLead');
const ChannelPartner = require('../models/ChannelPartner');
// Ensure LeadProfile model is registered before any populate calls
require('../models/LeadProfile');

// Helper: calculate total reward from achieved personal sales targets for the current month
// Given an array of salesTargets [{ targetNumber, amount, reward, targetDate, ... }]
// and the current month's project data [{ amount, date }], return the sum of rewards for
// all targets where sales achieved on or before targetDate >= target amount.
const calculateRewardFromSalesTargets = (salesTargets, projects) => {
  if (!Array.isArray(salesTargets) || salesTargets.length === 0) {
    return 0;
  }

  if (!Array.isArray(projects) || projects.length === 0) return 0;

  let totalReward = 0;

  salesTargets.forEach(target => {
    const targetAmount = Number(target?.amount || 0);
    const targetReward = Number(target?.reward || 0);
    const targetDate = new Date(target?.targetDate);

    if (targetAmount > 0 && targetReward > 0) {
      // Calculate cumulative sales achieved on or before this target's deadline
      const salesAtDeadline = projects
        .filter(p => new Date(p.date) <= targetDate)
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      if (salesAtDeadline >= targetAmount) {
        totalReward += targetReward;
      }
    }
  });

  return totalReward;
};

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id, role: 'sales' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// @desc    List active accounts for payments (sales read-only)
// @route   GET /api/sales/accounts
// @access  Private (Sales)
const getAccounts = async (req, res) => {
  try {
    // Include accountName so sales UIs can show the human-friendly account label
    const accounts = await Account.find({ isActive: true }).select('accountName name bankName accountNumber ifsc upiId');
    res.json({ success: true, data: accounts, message: 'Accounts fetched' });
  } catch (error) {
    console.error('getAccounts error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch accounts' });
  }
};

// Helper to safely cast id
const safeObjectId = (value) => {
  try { return new mongoose.Types.ObjectId(value); } catch { return value; }
};

// Helper to parse amount strings (handles comma-separated numbers e.g. "10,000")
const parseAmount = (val) => {
  const n = Number(String(val || '').replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
};

// Helper: build last N months labels (ending current month)
const getLastNMonths = (n) => {
  const months = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${d.getMonth() + 1}`, label: d.toLocaleString('en-US', { month: 'short' }), year: d.getFullYear(), monthIndex: d.getMonth() + 1 });
  }
  return months;
};

// @desc    List receivables (projects for my converted clients) with filters
// @route   GET /api/sales/payment-recovery
// @access  Private (Sales)
const getPaymentRecovery = async (req, res) => {
  try {
    const salesId = safeObjectId(req.sales.id);
    const { search = '', overdue, band } = req.query;

    // Base condition: clients converted by me OR admin-linked to me
    const baseClientCondition = { $or: [{ convertedBy: salesId }, { linkedSalesEmployee: salesId }] };

    // Apply search without losing ownership constraint
    const clientMatch = search
      ? {
          $and: [
            baseClientCondition,
            {
              $or: [
                { name: new RegExp(search, 'i') },
                { phoneNumber: new RegExp(search, 'i') }
              ]
            }
          ]
        }
      : baseClientCondition;

    const myClients = await Client.find(clientMatch).select('_id name phoneNumber');
    const clientIds = myClients.map(c => c._id);

    // Only show projects for clients converted by me (not projects I submitted for other people's clients)
    if (clientIds.length === 0) {
      return res.json({ success: true, data: [], message: 'No receivables found' });
    }

    // Separate linked clients from converted clients to handle zero-recovery business rules
    const linkedClients = await Client.find({ linkedSalesEmployee: salesId }).select('_id');
    const linkedClientIds = linkedClients.map(c => c._id.toString());

    const projectFilter = {
      client: { $in: clientIds },
      $or: [
        { 'financialDetails.advanceReceived': { $gt: 0 } },
        { client: { $in: linkedClientIds.map(id => safeObjectId(id)) } }
      ]
    };
    if (overdue === 'true') {
      projectFilter.dueDate = { $lt: new Date() };
    }

    // Fetch projects and compute remaining based on financialDetails
    const projects = await Project.find(projectFilter)
      .select('client dueDate financialDetails name')
      .populate({
        path: 'client',
        select: 'name phoneNumber email companyName',
        match: { isActive: true } // Only include active clients
      });

    const bandFilter = (amount) => {
      if (!band) return true;
      if (band === 'high') return amount >= 10000;
      if (band === 'medium') return amount >= 3000 && amount < 10000;
      if (band === 'low') return amount < 3000;
      return true;
    };

    const list = projects
      .map(p => {
        // Skip if client is not populated (null or inactive)
        if (!p.client || !p.client._id) {
          return null;
        }

        const rem = (p.financialDetails?.remainingAmount || 0);
        const isLinkedClient = linkedClientIds.includes(p.client._id.toString());

        // Preserve existing rule for self-converted clients:
        // they only appear once there is some recovery amount.
        // For admin-linked clients, always show them on the recovery page,
        // even when remainingAmount is 0.
        if (rem <= 0 && !isLinkedClient) {
          return null;
        }

        const totalCost = Number(p.financialDetails?.totalCost || p.budget || 0);
        const includeGST = !!p.financialDetails?.includeGST;

        let baseCost = totalCost;
        let gstAmount = 0;

        if (includeGST && totalCost > 0) {
          // Assuming 18% GST: total = base * 1.18 → base = total / 1.18
          baseCost = Math.round(totalCost / 1.18);
          gstAmount = Math.max(0, totalCost - baseCost);
        }

        return {
          projectId: p._id.toString(),
          projectName: p.name || 'Unnamed Project',
          clientId: p.client._id.toString(),
          clientName: p.client.name || 'Unknown Client',
          phone: p.client.phoneNumber || 'N/A',
          email: p.client.email || null,
          companyName: p.client.companyName || null,
          dueDate: p.dueDate || null,
          remainingAmount: rem,
          totalCost,
          baseCost,
          gstAmount,
          includeGST
        };
      })
      .filter(Boolean)
      .filter(r => bandFilter(r.remainingAmount));

    res.json({ success: true, data: list, message: 'Receivables fetched' });
  } catch (error) {
    console.error('getPaymentRecovery error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch receivables' });
  }
};

// @desc    Summary stats for receivables
// @route   GET /api/sales/payment-recovery/stats
const getPaymentRecoveryStats = async (req, res) => {
  try {
    const salesId = safeObjectId(req.sales.id);
    const myClients = await Client.find({ $or: [{ convertedBy: salesId }, { linkedSalesEmployee: salesId }] }).select('_id');
    const clientIds = myClients.map(c => c._id);
    const linkedClients = await Client.find({ linkedSalesEmployee: salesId }).select('_id');
    const linkedClientIds = linkedClients.map(c => c._id.toString());

    const projectQuery = { $or: [{ client: { $in: clientIds } }, { submittedBy: salesId }] };
    const projects = await Project.find({
      ...projectQuery,
      $or: [
        { 'financialDetails.advanceReceived': { $gt: 0 } },
        { client: { $in: linkedClientIds.map(id => safeObjectId(id)) } }
      ]
    }).select('dueDate financialDetails');
    let totalDue = 0, overdueCount = 0, overdueAmount = 0;
    const now = new Date();
    projects.forEach(p => {
      const rem = p.financialDetails?.remainingAmount || 0;
      totalDue += rem;
      if (p.dueDate && p.dueDate < now && rem > 0) {
        overdueCount += 1;
        overdueAmount += rem;
      }
    });
    res.json({ success: true, data: { totalDue, overdueCount, overdueAmount }, message: 'Stats fetched' });
  } catch (error) {
    console.error('getPaymentRecoveryStats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
};

// @desc    Get payment receipts for a project
// @route   GET /api/sales/payment-recovery/:projectId/receipts
// @access  Private (Sales)
const getPaymentReceipts = async (req, res) => {
  try {
    const salesId = safeObjectId(req.sales.id);
    const { projectId } = req.params;

    const project = await Project.findById(projectId).populate('client');
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Verify access - client must be converted by this sales person or linked to them
    const client = await Client.findById(project.client);
    if (!client || (String(client.convertedBy) !== String(salesId) && String(client.linkedSalesEmployee) !== String(salesId))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this project' });
    }

    // Fetch all payment receipts for this project (sales-created, admin-approved)
    const receipts = await PaymentReceipt.find({ project: projectId })
      .populate('account', 'name bankName accountNumber ifsc upiId')
      .populate('createdBy', 'name email')
      .populate('verifiedBy', 'name email')
      .sort({ createdAt: -1 });

    // Fetch admin finance transactions recorded directly for this project
    // so payment history shows admin-side recoveries as well.
    const AdminFinance = require('../models/AdminFinance');
    const adminFinanceTransactions = await AdminFinance.find({
      recordType: 'transaction',
      transactionType: 'incoming',
      status: { $ne: 'cancelled' },
      project: projectId,
      // Exclude transactions that already originate from PaymentReceipt to avoid duplicates
      'metadata.sourceType': { $ne: 'paymentReceipt' }
    })
      .populate('account', 'name bankName accountNumber ifsc upiId')
      .populate('createdBy', 'name email')
      .sort({ transactionDate: -1 });

    // Normalize admin finance transactions to match the shape expected by the frontend
    const mappedAdminFinance = adminFinanceTransactions.map(t => ({
      _id: t._id,
      amount: t.amount,
      // Treat admin-recorded incoming payments as approved recoveries
      status: t.status === 'cancelled' ? 'rejected' : 'approved',
      createdAt: t.transactionDate,
      method: t.paymentMethod ? t.paymentMethod.toLowerCase().replace(/\s+/g, '_') : 'other',
      referenceId: t.metadata?.referenceId || null,
      notes: t.description || t.category || '',
      account: t.account || null,
      verifiedBy: t.createdBy || null,
      verifiedAt: t.transactionDate,
      source: 'adminFinance'
    }));

    // Tag receipt transactions with a source field and convert to plain objects
    const mappedReceipts = receipts.map(r => {
      const obj = r.toObject ? r.toObject() : r;
      return { ...obj, source: 'paymentReceipt' };
    });

    const allPayments = [...mappedReceipts, ...mappedAdminFinance].sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateB - dateA;
    });

    res.json({
      success: true,
      data: allPayments,
      message: 'Payment receipts fetched successfully'
    });
  } catch (error) {
    console.error('getPaymentReceipts error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payment receipts' });
  }
};

// @desc    Create payment receipt (pending verification)
// @route   POST /api/sales/payment-recovery/:projectId/receipts
const createPaymentReceipt = async (req, res) => {
  try {
    const salesId = safeObjectId(req.sales.id);
    const { projectId } = req.params;
    const { amount, accountId, method = 'upi', referenceId, notes } = req.body;

    if (!amount || !accountId) {
      return res.status(400).json({ success: false, message: 'Amount and account are required' });
    }

    const amountValue = Math.round(parseAmount(amount));
    if (amountValue <= 0) {
      return res.status(400).json({ success: false, message: 'Amount must be a positive number' });
    }

    const project = await Project.findById(projectId).populate('client');
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    // ensure client is converted by this sales user or linked to them
    const client = await Client.findById(project.client);
    if (!client || (String(client.convertedBy) !== String(salesId) && String(client.linkedSalesEmployee) !== String(salesId))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this client' });
    }

    // Initialize financialDetails if not present
    if (!project.financialDetails) {
      project.financialDetails = {
        totalCost: project.budget || 0,
        advanceReceived: 0,
        includeGST: false,
        remainingAmount: project.budget || 0
      };
    }

    // Get current remaining amount (including pending receipts)
    const currentRemaining = Number(project.financialDetails.remainingAmount || 0);

    // Calculate sum of pending receipts for this project
    const pendingReceipts = await PaymentReceipt.find({
      project: projectId,
      status: 'pending'
    }).select('amount');
    const totalPendingAmount = pendingReceipts.reduce((sum, receipt) => sum + Number(receipt.amount || 0), 0);

    // Available amount = remainingAmount - pending receipts
    const availableAmount = currentRemaining - totalPendingAmount;

    // Validate amount doesn't exceed available
    if (amountValue > availableAmount) {
      return res.status(400).json({
        success: false,
        message: `Amount exceeds available balance. Available: ₹${availableAmount.toLocaleString()}`
      });
    }

    // Verify account exists and is active
    const account = await Account.findById(accountId);
    if (!account || !account.isActive) {
      return res.status(404).json({ success: false, message: 'Account not found or inactive' });
    }

    // Create receipt (pending approval)
    const receipt = await PaymentReceipt.create({
      client: client._id,
      project: project._id,
      amount: amountValue,
      account: accountId,
      method,
      referenceId,
      notes,
      createdBy: salesId,
      status: 'pending'
    });

    // Create approval request for admin
    try {
      const Admin = require('../models/Admin');
      const admin = await Admin.findOne({ isActive: true }).select('_id');
      if (admin) {
        // Get sales person name for description
        const salesPerson = await Sales.findById(salesId).select('name');
        const salesName = salesPerson?.name || 'Sales Employee';

        const Request = require('../models/Request');
        await Request.create({
          module: 'sales',
          type: 'payment-recovery',
          title: `Payment Recovery - ₹${amountValue.toLocaleString()}`,
          description: `Sales person ${salesName} requests approval for payment receipt of ₹${amountValue.toLocaleString()} for project "${project.name || 'Project'}".${notes ? ` Notes: ${notes}` : ''}${referenceId ? ` Reference ID: ${referenceId}` : ''}`,
          priority: 'normal',
          requestedBy: salesId,
          requestedByModel: 'Sales',
          recipient: admin._id,
          recipientModel: 'Admin',
          project: project._id,
          client: client._id,
          amount: amountValue,
          metadata: {
            paymentReceiptId: receipt._id.toString(),
            projectId: projectId,
            accountId: accountId,
            method: method,
            referenceId: referenceId || null,
            notes: notes || null
          }
        });
      }
    } catch (requestError) {
      // Log error but don't fail the receipt creation
      console.error('Error creating approval request for payment receipt:', requestError);
    }

    res.status(201).json({
      success: true,
      data: receipt,
      message: 'Receipt created and pending verification'
    });
  } catch (error) {
    console.error('createPaymentReceipt error:', error);
    res.status(500).json({ success: false, message: 'Failed to create receipt' });
  }
};

// @desc    Get installments for a project
// @route   GET /api/sales/payment-recovery/:projectId/installments
// @access  Private (Sales)
const getProjectInstallments = async (req, res) => {
  try {
    const salesId = safeObjectId(req.sales.id);
    const { projectId } = req.params;

    const project = await Project.findById(projectId).populate('client');
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Verify access - client must be converted by this sales person or linked to them
    const client = await Client.findById(project.client);
    if (!client || (String(client.convertedBy) !== String(salesId) && String(client.linkedSalesEmployee) !== String(salesId))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this project' });
    }

    // Get installments and check for pending approval requests
    const installments = project.installmentPlan || [];

    // Fetch pending approval requests for these installments
    const installmentIds = installments.map(inst => inst._id.toString());
    const pendingRequests = await Request.find({
      module: 'sales',
      type: 'approval',
      project: projectId,
      status: 'pending',
      'metadata.installmentId': { $in: installmentIds }
    }).select('metadata response');

    // Create a map of installmentId -> request status
    const requestMap = {};
    pendingRequests.forEach(req => {
      const instId = req.metadata?.installmentId;
      if (instId) {
        requestMap[instId] = {
          requestId: req._id,
          status: req.status,
          hasPendingRequest: true
        };
      }
    });

    // Format installments with request status
    const formattedInstallments = installments.map((inst, index) => ({
      _id: inst._id,
      id: inst._id,
      amount: inst.amount,
      dueDate: inst.dueDate,
      status: inst.status,
      paidDate: inst.paidDate,
      notes: inst.notes,
      index: index + 1,
      pendingApproval: requestMap[inst._id.toString()] || null
    }));

    res.json({
      success: true,
      data: formattedInstallments,
      message: 'Installments fetched successfully'
    });
  } catch (error) {
    console.error('getProjectInstallments error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch installments' });
  }
};

// @desc    Request approval to mark installment as paid
// @route   POST /api/sales/payment-recovery/:projectId/installments/:installmentId/request-payment
// @access  Private (Sales)
const requestInstallmentPayment = async (req, res) => {
  try {
    const salesId = safeObjectId(req.sales.id);
    const { projectId, installmentId } = req.params;
    const { paidDate, notes } = req.body;

    const project = await Project.findById(projectId).populate('client');
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Verify access
    const client = await Client.findById(project.client);
    if (!client || (String(client.convertedBy) !== String(salesId) && String(client.linkedSalesEmployee) !== String(salesId))) {
      return res.status(403).json({ success: false, message: 'Not authorized for this project' });
    }

    // Find the installment
    const installment = project.installmentPlan?.id(installmentId);
    if (!installment) {
      return res.status(404).json({ success: false, message: 'Installment not found' });
    }

    // Check if already paid
    if (installment.status === 'paid') {
      return res.status(400).json({ success: false, message: 'Installment is already marked as paid' });
    }

    // Check if there's already a pending request for this installment
    const existingRequest = await Request.findOne({
      module: 'sales',
      type: 'approval',
      project: projectId,
      status: 'pending',
      'metadata.installmentId': installmentId
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'A pending approval request already exists for this installment'
      });
    }

    // Get first admin as recipient
    const Admin = require('../models/Admin');
    const admin = await Admin.findOne({ isActive: true }).select('_id');
    if (!admin) {
      return res.status(500).json({ success: false, message: 'No admin found to approve the request' });
    }

    // Find installment index
    const installmentIndex = project.installmentPlan.findIndex(inst => String(inst._id) === String(installmentId)) + 1;

    // Create approval request
    const request = await Request.create({
      module: 'sales',
      type: 'approval',
      title: `Mark Installment as Paid - ₹${installment.amount}`,
      description: `Sales person requests to mark installment #${installmentIndex} (₹${installment.amount}) as paid for project "${project.name}".${notes ? ` Notes: ${notes}` : ''}`,
      priority: 'normal',
      requestedBy: salesId,
      requestedByModel: 'Sales',
      recipient: admin._id,
      recipientModel: 'Admin',
      project: projectId,
      client: client._id,
      amount: installment.amount,
      metadata: {
        installmentId: installmentId,
        projectId: projectId,
        paidDate: paidDate || new Date(),
        notes: notes || ''
      }
    });

    res.status(201).json({
      success: true,
      data: request,
      message: 'Payment approval request created successfully. Waiting for admin approval.'
    });
  } catch (error) {
    console.error('requestInstallmentPayment error:', error);
    res.status(500).json({ success: false, message: 'Failed to create payment request' });
  }
};

// Demo Requests
// @desc    List my demo requests stored on leads.demoRequest
// @route   GET /api/sales/demo-requests
const getDemoRequests = async (req, res) => {
  try {
    const salesId = safeObjectId(req.sales.id);
    const { search = '', status, category } = req.query;
    // Include leads marked via legacy status 'demo_requested' or with demoRequest subdoc
    const filter = {
      assignedTo: salesId,
      $or: [
        { 'demoRequest.status': { $exists: true } },
        { status: 'demo_requested' }
      ]
    };
    if (status && status !== 'all') filter['demoRequest.status'] = status;
    if (category && category !== 'all') filter.category = safeObjectId(category);
    if (search) filter.$or = [
      { name: new RegExp(search, 'i') },
      { company: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') }
    ];
    let leads = await Lead.find(filter)
      .populate('category', 'name color icon')
      .populate('leadProfile', 'name businessName');
    // Normalize: if demoRequest missing but status is demo_requested, treat as pending
    leads = leads.map(l => {
      if (!l.demoRequest || !l.demoRequest.status) {
        if (l.status === 'demo_requested') {
          l = l.toObject();
          l.demoRequest = { status: 'pending' };
          return l;
        }
      }
      return l.toObject ? l.toObject() : l;
    });
    const stats = {
      total: leads.length,
      pending: leads.filter(l => l.demoRequest && l.demoRequest.status === 'pending').length,
      scheduled: leads.filter(l => l.demoRequest && l.demoRequest.status === 'scheduled').length,
      completed: leads.filter(l => l.demoRequest && l.demoRequest.status === 'completed').length
    };
    res.json({ success: true, data: { items: leads, stats }, message: 'Demo requests fetched' });
  } catch (error) {
    console.error('getDemoRequests error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch demo requests' });
  }
};

// @desc    Update demo request status on a lead
// @route   PATCH /api/sales/demo-requests/:leadId/status
const updateDemoRequestStatus = async (req, res) => {
  try {
    const salesId = safeObjectId(req.sales.id);
    const { leadId } = req.params;
    const { status } = req.body; // 'pending' | 'scheduled' | 'completed' | 'cancelled'
    if (!['pending', 'scheduled', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const lead = await Lead.findOne({ _id: leadId, assignedTo: salesId });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });
    lead.demoRequest = { ...(lead.demoRequest || {}), status, updatedAt: new Date() };
    await lead.save();
    res.json({ success: true, data: lead, message: 'Demo status updated' });
  } catch (error) {
    console.error('updateDemoRequestStatus error:', error);
    res.status(500).json({ success: false, message: 'Failed to update demo status' });
  }
};

// Sales Tasks CRUD
const listSalesTasks = async (req, res) => {
  try {
    const owner = safeObjectId(req.sales.id);
    const { search = '', filter = 'all' } = req.query;
    const q = { owner };
    if (search) {
      q.$or = [{ title: new RegExp(search, 'i') }, { description: new RegExp(search, 'i') }];
    }
    if (['pending', 'completed'].includes(filter)) q.completed = filter === 'completed';
    if (['high', 'medium', 'low'].includes(filter)) q.priority = filter;
    const items = await SalesTask.find(q).sort({ createdAt: -1 });
    const stats = {
      total: await SalesTask.countDocuments({ owner }),
      pending: await SalesTask.countDocuments({ owner, completed: false }),
      completed: await SalesTask.countDocuments({ owner, completed: true }),
      high: await SalesTask.countDocuments({ owner, completed: false, priority: 'high' })
    };
    res.json({ success: true, data: { items, stats }, message: 'Tasks fetched' });
  } catch (error) {
    console.error('listSalesTasks error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tasks' });
  }
};

const createSalesTask = async (req, res) => {
  try {
    const owner = safeObjectId(req.sales.id);
    const task = await SalesTask.create({ owner, ...req.body });
    res.status(201).json({ success: true, data: task, message: 'Task created' });
  } catch (error) {
    console.error('createSalesTask error:', error);
    res.status(500).json({ success: false, message: 'Failed to create task' });
  }
};

const updateSalesTask = async (req, res) => {
  try {
    const owner = safeObjectId(req.sales.id);
    const task = await SalesTask.findOneAndUpdate({ _id: req.params.id, owner }, req.body, { new: true });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, data: task, message: 'Task updated' });
  } catch (error) {
    console.error('updateSalesTask error:', error);
    res.status(500).json({ success: false, message: 'Failed to update task' });
  }
};

const toggleSalesTask = async (req, res) => {
  try {
    const owner = safeObjectId(req.sales.id);
    const task = await SalesTask.findOne({ _id: req.params.id, owner });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    task.completed = !task.completed;
    await task.save();
    res.json({ success: true, data: task, message: 'Task toggled' });
  } catch (error) {
    console.error('toggleSalesTask error:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle task' });
  }
};

const deleteSalesTask = async (req, res) => {
  try {
    const owner = safeObjectId(req.sales.id);
    const task = await SalesTask.findOneAndDelete({ _id: req.params.id, owner });
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    res.json({ success: true, data: task, message: 'Task deleted' });
  } catch (error) {
    console.error('deleteSalesTask error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete task' });
  }
};

// Meetings
const listSalesMeetings = async (req, res) => {
  try {
    const salesId = safeObjectId(req.sales.id);
    const { search = '', filter = 'all' } = req.query;
    const q = { $or: [{ assignee: salesId }, { createdBy: salesId }] };
    if (search) {
      q.$and = (q.$and || []).concat([{ location: new RegExp(search, 'i') }]);
    }
    const items = await SalesMeeting.find(q)
      .populate('client', 'name phoneNumber')
      .populate('lead', 'name phone')
      .populate('assignee', 'name')
      .sort({ meetingDate: 1, meetingTime: 1 });
    const todayStr = new Date().toISOString().split('T')[0];
    const classify = (m) => {
      const d = new Date(m.meetingDate).toISOString().split('T')[0];
      if (d === todayStr) return 'today';
      return (new Date(m.meetingDate) >= new Date()) ? 'upcoming' : 'completed';
    };
    const filtered = items.filter(m => {
      if (filter === 'all') return true;
      if (filter === 'scheduled') return m.status === 'scheduled';
      return classify(m) === filter;
    });
    const stats = {
      total: items.length,
      today: items.filter(m => classify(m) === 'today').length,
      upcoming: items.filter(m => classify(m) === 'upcoming').length
    };
    res.json({ success: true, data: { items: filtered, stats }, message: 'Meetings fetched' });
  } catch (error) {
    console.error('listSalesMeetings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch meetings' });
  }
};

const createSalesMeeting = async (req, res) => {
  try {
    const salesId = safeObjectId(req.sales.id);
    const payload = { ...req.body, createdBy: salesId };
    if (!payload.assignee) payload.assignee = salesId;
    const meeting = await SalesMeeting.create(payload);
    res.status(201).json({ success: true, data: meeting, message: 'Meeting created' });
  } catch (error) {
    console.error('createSalesMeeting error:', error);
    res.status(500).json({ success: false, message: 'Failed to create meeting' });
  }
};

const updateSalesMeeting = async (req, res) => {
  try {
    const salesId = safeObjectId(req.sales.id);
    const updateData = { ...req.body };

    // If status is being set to completed, add completedAt timestamp
    if (updateData.status === 'completed' && !updateData.completedAt) {
      updateData.completedAt = new Date();
    }

    const meeting = await SalesMeeting.findOneAndUpdate(
      { _id: req.params.id, createdBy: salesId },
      updateData,
      { new: true }
    ).populate('client', 'name phoneNumber').populate('assignee', 'name');

    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });
    res.json({ success: true, data: meeting, message: 'Meeting updated' });
  } catch (error) {
    console.error('updateSalesMeeting error:', error);
    res.status(500).json({ success: false, message: 'Failed to update meeting' });
  }
};

const deleteSalesMeeting = async (req, res) => {
  try {
    const salesId = safeObjectId(req.sales.id);
    const meeting = await SalesMeeting.findOneAndDelete({ _id: req.params.id, createdBy: salesId });
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });
    res.json({ success: true, data: meeting, message: 'Meeting deleted' });
  } catch (error) {
    console.error('deleteSalesMeeting error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete meeting' });
  }
};

// Clients converted by me (for meetings dropdown)
const getMyConvertedClients = async (req, res) => {
  try {
    const salesId = safeObjectId(req.sales.id);
    const Project = require('../models/Project');

    // First, get clients directly converted by this sales employee or linked to them
    let clientIds = new Set();
    const directClients = await Client.find({ $or: [{ convertedBy: salesId }, { linkedSalesEmployee: salesId }] }).select('_id');
    directClients.forEach(c => clientIds.add(c._id.toString()));

    // ... (keep backward compatibility logic) ...
    // Note: The prompt asks for "only show it if cliecnt must have the porject"

    // Fetch all unique clients and verify project existence
    const clientIdArray = Array.from(clientIds).map(id => safeObjectId(id));

    // Find clients that have at least one project
    const clientsWithProjects = await Project.distinct('client', {
      client: { $in: clientIdArray }
    });

    const validClientIds = clientsWithProjects.map(id => id.toString());

    const clients = await Client.find({ _id: { $in: validClientIds.map(id => safeObjectId(id)) } })
      .select('name phoneNumber companyName email')
      .sort({ name: 1 });

    res.json({ success: true, data: clients, message: 'Clients fetched' });
  } catch (error) {
    console.error('getMyConvertedClients error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch clients' });
  }
};

// @desc    Login Sales
// @route   POST /api/sales/login
// @access  Public
const loginSales = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check if Sales exists and include password for comparison
    const sales = await Sales.findOne({ email }).select('+password');

    if (!sales) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (sales.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account temporarily locked due to too many failed login attempts. Please try again later.'
      });
    }

    // Check if Sales is active
    if (!sales.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact system administrator.'
      });
    }

    // Check password
    const isPasswordValid = await sales.comparePassword(password);

    if (!isPasswordValid) {
      // Increment login attempts
      await sales.incLoginAttempts();

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Reset login attempts and update last login
    await sales.resetLoginAttempts();

    // Generate JWT token
    const token = generateToken(sales._id);

    // Set cookie options
    const cookieOptions = {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    };

    // Send response with token
    res.status(200)
      .cookie('salesToken', token, cookieOptions)
      .json({
        success: true,
        message: 'Login successful',
        data: {
          sales: {
            id: sales._id,
            name: sales.name,
            email: sales.email,
            role: sales.role,
            department: sales.department,
            employeeId: sales.employeeId,
            phone: sales.phone,
            lastLogin: sales.lastLogin,
            joiningDate: sales.joiningDate,
            salesTarget: sales.salesTarget,
            currentSales: sales.currentSales,
            commissionRate: sales.commissionRate,
            experience: sales.experience,
            skills: sales.skills,
            isTeamLead: sales.isTeamLead || false,
            teamMembers: sales.teamMembers || [],
            createdAt: sales.createdAt
          },
          token
        }
      });

  } catch (error) {
    console.error('Sales Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// @desc    Get current Sales profile
// @route   GET /api/sales/profile
// @access  Private
const getSalesProfile = async (req, res) => {
  try {
    const sales = await Sales.findById(req.sales.id);

    if (!sales) {
      return res.status(404).json({
        success: false,
        message: 'Sales not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        sales: {
          id: sales._id,
          name: sales.name,
          email: sales.email,
          role: sales.role,
          department: sales.department,
          employeeId: sales.employeeId,
          phone: sales.phone,
          isActive: sales.isActive,
          lastLogin: sales.lastLogin,
          joiningDate: sales.joiningDate,
          salesTarget: sales.salesTarget,
          currentSales: sales.currentSales,
          commissionRate: sales.commissionRate,
          experience: sales.experience,
          skills: sales.skills,
          leadsManaged: sales.leadsManaged,
          clientsManaged: sales.clientsManaged,
          isTeamLead: sales.isTeamLead || false,
          teamMembers: sales.teamMembers || [],
          createdAt: sales.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Get Sales profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile'
    });
  }
};

// @desc    Logout Sales
// @route   POST /api/sales/logout
// @access  Private
const logoutSales = async (req, res) => {
  try {
    res.cookie('salesToken', '', {
      expires: new Date(0),
      httpOnly: true
    });

    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Sales Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
};

// @desc    Create demo Sales (for development only)
// @route   POST /api/sales/create-demo
// @access  Public (remove in production)
const createDemoSales = async (req, res) => {
  try {
    // Check if demo Sales already exists
    const existingSales = await Sales.findOne({ email: 'sales@demo.com' });

    if (existingSales) {
      return res.status(400).json({
        success: false,
        message: 'Demo Sales already exists'
      });
    }

    // Create demo Sales
    const demoSales = await Sales.create({
      name: 'Demo Sales Representative',
      email: 'sales@demo.com',
      password: 'password123',
      role: 'sales',
      department: 'Sales',
      employeeId: 'SL001',
      phone: '+1234567890',
      salesTarget: 100000,
      currentSales: 25000,
      commissionRate: 5,
      skills: ['Sales', 'Lead Generation', 'Customer Relations'],
      experience: 2
    });

    res.status(201).json({
      success: true,
      message: 'Demo Sales created successfully',
      data: {
        sales: {
          id: demoSales._id,
          name: demoSales.name,
          email: demoSales.email,
          role: demoSales.role,
          department: demoSales.department,
          employeeId: demoSales.employeeId
        }
      }
    });

  } catch (error) {
    console.error('Create demo Sales error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating demo Sales'
    });
  }
};

// @desc    Create lead by sales employee
// @route   POST /api/sales/leads
// @access  Private (Sales only)
const createLeadBySales = async (req, res) => {
  try {
    const { phone, name, company, email, category, priority, value, notes } = req.body;

    // Validate required fields
    if (!phone || !category) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and category are required'
      });
    }

    // Check if lead with phone number already exists
    const existingLead = await Lead.findOne({ phone });
    if (existingLead) {
      return res.status(400).json({
        success: false,
        message: 'Lead with this phone number already exists'
      });
    }

    // Verify category exists
    const categoryExists = await LeadCategory.findById(category);
    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category'
      });
    }

    // Create lead with sales employee as creator AND assignee
    const lead = await Lead.create({
      phone,
      name,
      company,
      email,
      category,
      priority: priority || 'medium',
      value: value || 0,
      notes,
      createdBy: req.sales.id,
      creatorModel: 'Sales',
      assignedTo: req.sales.id, // Auto-assign to self
      status: 'new',
      source: 'manual'
    });

    // Update sales employee's leadsManaged array
    await Sales.findByIdAndUpdate(req.sales.id, {
      $push: { leadsManaged: lead._id }
    });

    // Update sales employee's lead statistics
    const sales = await Sales.findById(req.sales.id);
    await sales.updateLeadStats();

    // Populate for response
    await lead.populate('category', 'name color icon');
    await lead.populate('assignedTo', 'name email');

    res.status(201).json({
      success: true,
      message: 'Lead created successfully',
      data: lead
    });

  } catch (error) {
    console.error('Create lead by sales error:', error);

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Lead with this phone number already exists'
      });
    }

    // Handle other errors
    res.status(500).json({
      success: false,
      message: 'Server error while creating lead'
    });
  }
};

// @desc    Get all lead categories for sales
// @route   GET /api/sales/lead-categories
// @access  Private (Sales only)
const getLeadCategories = async (req, res) => {
  try {
    const categories = await LeadCategory.find()
      .select('name description color icon')
      .sort('name');

    res.status(200).json({
      success: true,
      data: categories
    });

  } catch (error) {
    console.error('Get lead categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching categories'
    });
  }
};

// @desc    Debug endpoint to check leads in database
// @route   GET /api/sales/debug/leads
// @access  Private (Sales only)
const debugLeads = async (req, res) => {
  try {
    const salesId = req.sales.id;

    // Get all leads for this sales employee
    const leads = await Lead.find({ assignedTo: salesId }).select('phone status assignedTo createdAt');

    // Get all leads in the database (for debugging)
    const allLeads = await Lead.find({}).select('phone status assignedTo createdAt').limit(10);

    res.status(200).json({
      success: true,
      data: {
        salesId,
        leadsForSales: leads,
        allLeadsInDB: allLeads,
        totalLeadsForSales: leads.length,
        totalLeadsInDB: await Lead.countDocuments({})
      }
    });
  } catch (error) {
    console.error('Debug leads error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while debugging leads'
    });
  }
};

// @desc    Get tile card statistics for dashboard
// @route   GET /api/sales/dashboard/tile-stats
// @access  Private (Sales only)
const getTileCardStats = async (req, res) => {
  try {
    const salesId = safeObjectId(req.sales.id);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0);
    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
    const yesterdayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);

    // 1. Payment Recovery Stats
    const myClients = await Client.find({ $or: [{ convertedBy: salesId }, { linkedSalesEmployee: salesId }] }).select('_id');
    const clientIds = myClients.map(c => c._id);
    const projects = await Project.find({
      client: { $in: clientIds },
      // Only consider projects where an advance/payment has been approved
      'financialDetails.advanceReceived': { $gt: 0 }
    }).select('dueDate financialDetails updatedAt createdAt');

    // Count pending payments (projects with remainingAmount > 0)
    let pendingPayments = 0;
    let paymentsThisWeek = 0;
    const allPendingProjects = [];

    projects.forEach(p => {
      const rem = p.financialDetails?.remainingAmount || 0;
      if (rem > 0) {
        pendingPayments += 1;
        allPendingProjects.push(p);
      }
    });

    // Count payments added this week (new projects with pending payments created this week)
    paymentsThisWeek = allPendingProjects.filter(p => {
      const createdDate = p.createdAt || p.updatedAt;
      return createdDate && createdDate >= weekStart;
    }).length;

    // 2. Demo Requests Stats
    const demoRequests = await Lead.find({
      assignedTo: salesId,
      status: { $ne: 'converted' },
      $or: [
        { 'demoRequest.status': { $exists: true } },
        { status: 'demo_requested' }
      ]
    });

    let newDemoRequests = 0;
    let demosToday = 0;
    demoRequests.forEach(lead => {
      const demoStatus = lead.demoRequest?.status || (lead.status === 'demo_requested' ? 'pending' : null);
      if (demoStatus === 'pending' || demoStatus === 'new') {
        newDemoRequests += 1;
      }
      // Check if created today
      if (lead.createdAt && lead.createdAt >= todayStart && lead.createdAt <= todayEnd) {
        demosToday += 1;
      }
    });

    // 3. Tasks Stats
    const allTasks = await SalesTask.find({ owner: salesId });
    const pendingTasks = allTasks.filter(t => !t.completed).length;

    // Count completed tasks today
    const tasksCompletedToday = allTasks.filter(t =>
      t.completed &&
      t.updatedAt &&
      t.updatedAt >= todayStart &&
      t.updatedAt <= todayEnd
    ).length;

    // Count completed tasks yesterday
    const tasksCompletedYesterday = allTasks.filter(t =>
      t.completed &&
      t.updatedAt &&
      t.updatedAt >= yesterdayStart &&
      t.updatedAt <= yesterdayEnd
    ).length;

    const tasksChange = tasksCompletedToday - tasksCompletedYesterday;

    // 4. Meetings Stats
    const allMeetings = await SalesMeeting.find({
      $or: [
        { assignee: salesId },
        { createdBy: salesId }
      ]
    });

    const todayMeetings = allMeetings.filter(m => {
      const meetingDate = new Date(m.meetingDate);
      return meetingDate >= todayStart && meetingDate <= todayEnd && m.status !== 'cancelled';
    }).length;

    const upcomingMeetings = allMeetings.filter(m => {
      const meetingDate = new Date(m.meetingDate);
      return meetingDate > todayEnd && m.status === 'scheduled';
    }).length;

    res.json({
      success: true,
      data: {
        paymentRecovery: {
          pending: pendingPayments,
          changeThisWeek: paymentsThisWeek
        },
        demoRequests: {
          new: newDemoRequests,
          today: demosToday
        },
        tasks: {
          pending: pendingTasks,
          change: tasksChange
        },
        meetings: {
          today: todayMeetings,
          upcoming: upcomingMeetings
        }
      }
    });
  } catch (error) {
    console.error('getTileCardStats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch tile card stats' });
  }
};

// @desc    Get dashboard hero card statistics (monthly sales, target, reward, incentives, etc.)
// @route   GET /api/sales/dashboard/hero-stats
// @access  Private (Sales only)
const getDashboardHeroStats = async (req, res) => {
  try {
    const salesId = safeObjectId(req.sales.id);
    const Sales = require('../models/Sales');
    const Client = require('../models/Client');
    const Project = require('../models/Project');
    const Lead = require('../models/Lead');

    // Get sales employee data (including multiple targets and team lead info)
    const sales = await Sales.findById(salesId).select('name salesTarget salesTargets reward incentivePerClient isTeamLead teamMembers teamLeadTarget teamLeadTargetReward');
    if (!sales) {
      return res.status(404).json({ success: false, message: 'Sales employee not found' });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Use configurable sales-month window for monthly metrics (targets & incentives)
    const { getCurrentSalesMonthRange } = require('../utils/salesMonthRange');
    const { start: monthStart, end: monthEnd } = await getCurrentSalesMonthRange(now);

    // Get clients converted by this sales employee or linked to them
    const convertedClients = await Client.find({ $or: [{ convertedBy: salesId }, { linkedSalesEmployee: salesId }] })
      .select('_id conversionDate')
      .sort({ conversionDate: -1 }); // Sort by conversion date descending

    // Get last conversion date (most recent conversion)
    let lastConversionDate = null;
    if (convertedClients.length > 0 && convertedClients[0].conversionDate) {
      lastConversionDate = convertedClients[0].conversionDate;
    }

    // Filter clients converted this month and today
    const monthlyClientIds = convertedClients
      .filter(c => c.conversionDate && c.conversionDate >= monthStart && c.conversionDate <= monthEnd)
      .map(c => c._id.toString());

    const todayClientIds = convertedClients
      .filter(c => c.conversionDate && c.conversionDate >= todayStart && c.conversionDate <= todayEnd)
      .map(c => c._id.toString());

    // Get only projects where advance has been approved (first payment approved)
    const allClientIds = convertedClients.map(c => c._id);
    const projects = await Project.find({
      client: { $in: allClientIds },
      'financialDetails.advanceReceived': { $gt: 0 }
    }).select('client financialDetails.totalCost financialDetails.includeGST budget createdAt');

    // Helper: calculate project cost for targets/sales excluding GST if included
    const getProjectBaseCost = (project) => {
      const rawCost = Number(project.financialDetails?.totalCost || project.budget || 0);
      const includeGST = !!project.financialDetails?.includeGST;
      if (!includeGST || rawCost <= 0) return rawCost;
      // Assuming 18% GST: total = base * 1.18 → base = total / 1.18
      const base = Math.round(rawCost / 1.18);
      return base > 0 ? base : rawCost;
    };

    // Calculate monthly sales (sum of project base costs for clients converted this month, approved only)
    let monthlySales = 0;
    const monthlyProjectsData = []; // To track date and amount for deadline enforcement

    projects.forEach(p => {
      const clientIdStr = p.client.toString();
      if (monthlyClientIds.includes(clientIdStr)) {
        const costForTarget = getProjectBaseCost(p);
        monthlySales += costForTarget;

        // Find the conversion date for this client to associate with the project
        const client = convertedClients.find(c => c._id.toString() === clientIdStr);
        if (client && client.conversionDate) {
          monthlyProjectsData.push({
            amount: costForTarget,
            date: client.conversionDate
          });
        }
      }
    });

    // Calculate today's sales (sum of project base costs for clients converted today, approved only)
    let todaysSales = 0;
    projects.forEach(p => {
      const clientIdStr = p.client.toString();
      if (todayClientIds.includes(clientIdStr)) {
        const costForTarget = getProjectBaseCost(p);
        todaysSales += costForTarget;
      }
    });

    // Count clients converted this month (with at least one approved project)
    const monthlyConvertedCount = monthlyClientIds.length;

    // Count clients converted today (with at least one approved project)
    const todayConvertedCount = todayClientIds.length;

    // Calculate incentives from actual conversion-based incentives
    const Incentive = require('../models/Incentive');

    // Get all conversion-based incentives for this sales employee
    const conversionIncentives = await Incentive.find({
      salesEmployee: salesId,
      isConversionBased: true
    }).select('amount dateAwarded');

    // Calculate monthly incentive (sum of amounts from incentives created this month)
    const monthlyIncentives = conversionIncentives.filter(inc => {
      const dateAwarded = new Date(inc.dateAwarded);
      return dateAwarded >= monthStart && dateAwarded <= monthEnd;
    });
    const monthlyIncentive = monthlyIncentives.reduce((sum, inc) => sum + (inc.amount || 0), 0);

    // Calculate today's incentive (sum of amounts from incentives created today)
    const todaysIncentives = conversionIncentives.filter(inc => {
      const dateAwarded = new Date(inc.dateAwarded);
      return dateAwarded >= todayStart && dateAwarded <= todayEnd;
    });
    const todaysIncentive = todaysIncentives.reduce((sum, inc) => sum + (inc.amount || 0), 0);

    // Handle multiple targets - find current active target (not achieved yet)
    let activeTarget = null;
    let activeTargetNumber = null;
    let progressToTarget = 0;
    let allTargets = [];

    if (sales.salesTargets && sales.salesTargets.length > 0) {
      // Sort targets by targetNumber (1, 2, 3)
      const sortedTargets = [...sales.salesTargets].sort((a, b) => a.targetNumber - b.targetNumber);

      // Calculate cumulative progress: each target's progress is relative to previous achieved targets
      let previousAchievedAmount = 0;

      // Find first unachieved target (where monthlySales < target amount)
      for (let i = 0; i < sortedTargets.length; i++) {
        const target = sortedTargets[i];
        const targetAmount = Number(target.amount || 0);
        const targetDate = new Date(target.targetDate);
        const now = new Date();

        // Check if target deadline has passed
        const isDeadlinePassed = targetDate < now;

        // Calculate progress for this target relative to previous targets
        // If this is not the first target, calculate relative to previous target's amount
        const targetRange = i === 0 ? targetAmount : (targetAmount - previousAchievedAmount);
        const salesInThisTarget = i === 0 ? monthlySales : Math.max(0, monthlySales - previousAchievedAmount);
        const targetProgress = targetRange > 0 ? Math.min((salesInThisTarget / targetRange) * 100, 100) : 0;
        const isAchieved = monthlySales >= targetAmount;

        // For display in allTargets, show cumulative progress
        const cumulativeProgress = targetAmount > 0 ? Math.min((monthlySales / targetAmount) * 100, 100) : 0;

        allTargets.push({
          targetNumber: target.targetNumber,
          amount: targetAmount,
          reward: Number(target.reward || 0),
          targetDate: target.targetDate,
          deadline: target.targetDate,
          progress: Math.round(cumulativeProgress),
          isAchieved: isAchieved,
          isDeadlinePassed: isDeadlinePassed
        });

        // Set as active if not achieved yet and not passed
        if (!activeTarget && !isAchieved && !isDeadlinePassed) {
          activeTarget = targetAmount;
          activeTargetNumber = target.targetNumber;
          // Progress synced with target card: use same cumulative progress as the card (monthlySales / target amount)
          progressToTarget = Math.round(cumulativeProgress);
        }

        // Update previous achieved amount for next iteration
        if (isAchieved) {
          previousAchievedAmount = targetAmount;
        }
      }

      // If all targets achieved, use the last one with 100% progress
      if (!activeTarget && sortedTargets.length > 0) {
        const lastTarget = sortedTargets[sortedTargets.length - 1];
        activeTarget = Number(lastTarget.amount || 0);
        activeTargetNumber = lastTarget.targetNumber;
        progressToTarget = 100;
      }

      // Fallback to first target if no active target found
      if (!activeTarget && sortedTargets.length > 0) {
        const firstTarget = sortedTargets[0];
        activeTarget = Number(firstTarget.amount || 0);
        activeTargetNumber = firstTarget.targetNumber;
        const firstProgress = activeTarget > 0 ? Math.min((monthlySales / activeTarget) * 100, 100) : 0;
        progressToTarget = Math.round(firstProgress);
      }
    } else {
      // Legacy: single target
      activeTarget = sales.salesTarget || 0;
      progressToTarget = activeTarget > 0 ? Math.round((monthlySales / activeTarget) * 100) : 0;
    }

    // Cap progress at 100%
    progressToTarget = Math.min(progressToTarget, 100);

    // Get total leads count
    const totalLeads = await Lead.countDocuments({ assignedTo: salesId });

    // Total clients = only those with at least one project where advance is approved
    const approvedClientIds = [...new Set(projects.map(p => p.client.toString()))];
    const totalClients = approvedClientIds.length;

    // Calculate reward from achieved personal sales targets for this month (enforcing deadlines)
    const reward = calculateRewardFromSalesTargets(sales.salesTargets || [], monthlyProjectsData);

    // Calculate team lead target progress if user is a team lead (optimized with aggregation)
    let teamLeadTarget = 0;
    let teamLeadTargetReward = 0;
    let teamMonthlySales = 0;
    let teamLeadProgress = 0;

    if (sales.isTeamLead && sales.teamMembers && sales.teamMembers.length > 0) {
      teamLeadTarget = sales.teamLeadTarget || 0;
      teamLeadTargetReward = sales.teamLeadTargetReward || 0;

      try {
        // Optimized: Use aggregation pipeline for faster calculation
        const teamMemberIds = sales.teamMembers.map(id => {
          try {
            return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id;
          } catch {
            return id;
          }
        });

        // Filter valid ObjectIds
        const validTeamMemberIds = teamMemberIds.filter(id => mongoose.Types.ObjectId.isValid(id));

        if (validTeamMemberIds.length > 0) {
          // Optimized single aggregation query: Join projects with clients and filter
          const teamSalesAggregation = await Project.aggregate([
            {
              $match: {
                'financialDetails.advanceReceived': { $gt: 0 }
              }
            },
            {
              $lookup: {
                from: 'clients',
                localField: 'client',
                foreignField: '_id',
                as: 'clientData'
              }
            },
            {
              $unwind: {
                path: '$clientData',
                preserveNullAndEmptyArrays: false
              }
            },
            {
              $match: {
                'clientData.convertedBy': { $in: validTeamMemberIds },
                'clientData.conversionDate': {
                  $gte: monthStart,
                  $lte: monthEnd
                }
              }
            },
            {
              // Compute base cost for targets: if includeGST=true, divide totalCost by 1.18 and round
              $addFields: {
                rawCost: {
                  $ifNull: ['$financialDetails.totalCost', { $ifNull: ['$budget', 0] }]
                },
                includeGST: {
                  $ifNull: ['$financialDetails.includeGST', false]
                }
              }
            },
            {
              $addFields: {
                baseCostForTarget: {
                  $cond: [
                    { $and: [{ $eq: ['$includeGST', true] }, { $gt: ['$rawCost', 0] }] },
                    {
                      $round: [
                        { $divide: ['$rawCost', 1.18] },
                        0
                      ]
                    },
                    '$rawCost'
                  ]
                }
              }
            },
            {
              $group: {
                _id: null,
                totalSales: {
                  $sum: '$baseCostForTarget'
                }
              }
            }
          ]);

          teamMonthlySales = teamSalesAggregation.length > 0 ? (Number(teamSalesAggregation[0].totalSales) || 0) : 0;
        }
      } catch (error) {
        console.error('Error calculating team monthly sales:', error);
        // Fallback to 0 if calculation fails
        teamMonthlySales = 0;
      }

      // Calculate progress to team target
      if (teamLeadTarget > 0) {
        teamLeadProgress = Math.min((teamMonthlySales / teamLeadTarget) * 100, 100);
      }
    }

    // Extract first name from full name
    const getFirstName = (fullName) => {
      if (!fullName) return 'Employee';
      const nameParts = fullName.trim().split(/\s+/);
      return nameParts[0] || 'Employee';
    };

    res.json({
      success: true,
      data: {
        employeeName: getFirstName(sales.name),
        monthlySales: Math.round(monthlySales),
        target: activeTarget, // Current active target amount
        targetNumber: activeTargetNumber, // Current active target number (1, 2, or 3)
        progressToTarget: progressToTarget,
        allTargets: allTargets, // All targets with their details
        reward: reward,
        todaysSales: Math.round(todaysSales),
        todaysIncentive: Math.round(todaysIncentive),
        monthlyIncentive: Math.round(monthlyIncentive),
        totalLeads: totalLeads,
        totalClients: totalClients,
        // Team lead specific data
        isTeamLead: sales.isTeamLead || false,
        teamLeadTarget: teamLeadTarget,
        teamLeadTargetReward: teamLeadTargetReward,
        teamMonthlySales: Math.round(teamMonthlySales),
        teamLeadProgress: Math.round(teamLeadProgress),
        lastConversionDate: lastConversionDate
      }
    });
  } catch (error) {
    console.error('getDashboardHeroStats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard hero stats' });
  }
};

// @desc    Get sales dashboard statistics
// @route   GET /api/sales/dashboard/statistics
// @access  Private (Sales only)
const getSalesDashboardStats = async (req, res) => {
  try {
    const salesId = req.sales.id;

    // Get total leads count for this sales employee
    const totalLeadsCount = await Lead.countDocuments({ assignedTo: new mongoose.Types.ObjectId(salesId) });

    // Aggregate leads by status for the logged-in sales employee
    const stats = await Lead.aggregate([
      { $match: { assignedTo: new mongoose.Types.ObjectId(salesId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Initialize all possible status counts
    const statusCounts = {
      new: 0,
      connected: 0,
      not_picked: 0,
      followup: 0, // Changed from today_followup to followup to match Lead model
      quotation_sent: 0,
      dq_sent: 0,
      app_client: 0,
      web: 0,
      converted: 0,
      lost: 0,
      hot: 0,
      demo_requested: 0,
      demo_sent: 0,
      not_interested: 0
    };

    // Count demo_sent leads (leads with leadProfile.demoSent = true)
    const demoSentCount = await Lead.countDocuments({
      assignedTo: new mongoose.Types.ObjectId(salesId),
      status: { $ne: 'converted' },
      leadProfile: { $exists: true, $ne: null }
    });

    // Get all leads with profiles and count those with flags
    const leadsWithProfiles = await Lead.find({
      assignedTo: new mongoose.Types.ObjectId(salesId),
      status: { $ne: 'converted' },
      leadProfile: { $exists: true, $ne: null }
    }).populate('leadProfile', 'demoSent quotationSent projectType').lean();

    const actualDemoSentCount = leadsWithProfiles.filter(lead =>
      lead.leadProfile && lead.leadProfile.demoSent === true
    ).length;

    statusCounts.demo_sent = actualDemoSentCount;

    // Count quotation_sent leads: status='quotation_sent' OR leadProfile.quotationSent=true
    const actualQuotationSentCount = leadsWithProfiles.filter(lead =>
      lead.status === 'quotation_sent' ||
      (lead.leadProfile && lead.leadProfile.quotationSent === true)
    ).length;

    statusCounts.quotation_sent = actualQuotationSentCount;

    // Count app_client leads: status='app_client' OR leadProfile.category='App' OR leadProfile.projectType.app=true (legacy)
    const LeadCategory = require('../models/LeadCategory');
    let appCategoryId = null;
    try {
      const appCategory = await LeadCategory.findOne({ name: 'App' });
      if (appCategory) appCategoryId = appCategory._id.toString();
    } catch (err) {
      console.error('Error finding App category:', err);
    }

    const actualAppClientCount = leadsWithProfiles.filter(lead => {
      if (lead.status === 'app_client') return true;
      if (lead.leadProfile) {
        // Check category first (preferred)
        if (appCategoryId && lead.leadProfile.category && lead.leadProfile.category.toString() === appCategoryId) return true;
        // Legacy: fall back to projectType flag
        if (lead.leadProfile.projectType && lead.leadProfile.projectType.app === true) return true;
      }
      return false;
    }).length;

    statusCounts.app_client = actualAppClientCount;

    // Count web leads: status='web' OR leadProfile.category='Web' OR leadProfile.projectType.web=true (legacy)
    let webCategoryId = null;
    try {
      const webCategory = await LeadCategory.findOne({ name: 'Web' });
      if (webCategory) webCategoryId = webCategory._id.toString();
    } catch (err) {
      console.error('Error finding Web category:', err);
    }

    const actualWebCount = leadsWithProfiles.filter(lead => {
      if (lead.status === 'web') return true;
      if (lead.leadProfile) {
        // Check category first (preferred)
        if (webCategoryId && lead.leadProfile.category && lead.leadProfile.category.toString() === webCategoryId) return true;
        // Legacy: fall back to projectType flag
        if (lead.leadProfile.projectType && lead.leadProfile.projectType.web === true) return true;
      }
      return false;
    }).length;

    statusCounts.web = actualWebCount;

    // Count followup leads: leads with pending follow-ups (today onwards, regardless of status)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    const followupLeads = await Lead.find({
      assignedTo: new mongoose.Types.ObjectId(salesId),
      status: { $ne: 'converted' },
      followUps: {
        $elemMatch: {
          scheduledDate: { $gte: todayStart },
          status: 'pending'
        }
      }
    }).lean();

    statusCounts.followup = followupLeads.length;

    // Map aggregation results to status counts (but don't override calculated ones above)
    stats.forEach(stat => {
      if (statusCounts.hasOwnProperty(stat._id) &&
        stat._id !== 'quotation_sent' &&
        stat._id !== 'demo_sent' &&
        stat._id !== 'app_client' &&
        stat._id !== 'web' &&
        stat._id !== 'followup') {
        statusCounts[stat._id] = stat.count;
      }
    });

    // Override "new" count to match New Leads page: exclude leads shared with CP
    const newLeadsFilter = {
      assignedTo: new mongoose.Types.ObjectId(salesId),
      status: 'new',
      $or: [{ sharedWithCP: { $exists: false } }, { sharedWithCP: { $size: 0 } }]
    };
    const sharedLeadIds = await CPLead.distinct('sharedFromSales.leadId', {
      'sharedFromSales.sharedBy': new mongoose.Types.ObjectId(salesId)
    });
    if (sharedLeadIds && sharedLeadIds.length > 0) {
      newLeadsFilter._id = { $nin: sharedLeadIds };
    }
    statusCounts.new = await Lead.countDocuments(newLeadsFilter);

    // Calculate connected count: all leads with leadProfile that are not converted/lost/not_interested/not_picked
    const connectedCount = await Lead.countDocuments({
      assignedTo: new mongoose.Types.ObjectId(salesId),
      leadProfile: { $exists: true, $ne: null },
      status: { $nin: ['converted', 'lost', 'not_interested', 'not_picked'] }
    });
    statusCounts.connected = connectedCount;

    // Use actual lead count (sum of statusCounts can double-count when connected is broad)
    const totalLeads = await Lead.countDocuments({ assignedTo: new mongoose.Types.ObjectId(salesId) });

    res.status(200).json({
      success: true,
      data: {
        statusCounts,
        totalLeads,
        salesEmployee: {
          id: req.sales.id,
          name: req.sales.name
        }
      }
    });

  } catch (error) {
    console.error('Get sales dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching dashboard statistics'
    });
  }
};

// @desc    Monthly conversions for bar chart (last N months)
// @route   GET /api/sales/analytics/conversions/monthly
// @access  Private (Sales only)
const getMonthlyConversions = async (req, res) => {
  try {
    const salesId = req.sales.id;
    const months = Math.min(parseInt(req.query.months || '12', 10) || 12, 24);
    const salesObjectId = new mongoose.Types.ObjectId(salesId);

    // Use convertedAt if present else updatedAt
    const dateField = '$convertedAt';

    const since = new Date();
    since.setMonth(since.getMonth() - (months - 1));
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    const agg = await Lead.aggregate([
      { $match: { assignedTo: salesObjectId, status: 'converted', $or: [{ convertedAt: { $exists: true } }, { updatedAt: { $exists: true } }] } },
      { $addFields: { metricDate: { $ifNull: ['$convertedAt', '$updatedAt'] } } },
      { $match: { metricDate: { $gte: since } } },
      {
        $group: {
          _id: {
            y: { $year: '$metricDate' },
            m: { $month: '$metricDate' }
          },
          converted: { $sum: 1 }
        }
      }
    ]);

    // Build 12-month series with zeros filled
    const frames = getLastNMonths(months);
    const map = new Map();
    agg.forEach(r => {
      map.set(`${r._id.y}-${r._id.m}`, r.converted);
    });

    const items = frames.map(f => ({
      month: f.label,
      year: f.year,
      converted: map.get(`${f.year}-${f.monthIndex}`) || 0
    }));

    const totalConverted = items.reduce((s, x) => s + x.converted, 0);
    const best = items.reduce((b, x) => (x.converted > (b?.converted || 0) ? { label: x.month, converted: x.converted } : b), { label: items[0]?.month || '', converted: items[0]?.converted || 0 });
    const avgRate = items.length ? Number((totalConverted / items.length).toFixed(1)) : 0;

    res.status(200).json({ success: true, data: { items, best, avgRate, totalConverted } });
  } catch (error) {
    console.error('Get monthly conversions error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching monthly conversions' });
  }
};

// @desc    Monthly sales history for sales employee (last N calendar months)
// @route   GET /api/sales/analytics/monthly-sales-history
// @access  Private (Sales only)
const getMonthlySalesHistory = async (req, res) => {
  try {
    const salesId = safeObjectId(req.sales.id);
    const rawMonths = parseInt(req.query.months || '12', 10) || 12;
    const months = rawMonths <= 0 ? 120 : Math.min(rawMonths, 120);

    const convertedClients = await Client.find({ $or: [{ convertedBy: salesId }, { linkedSalesEmployee: salesId }] })
      .select('_id conversionDate')
      .lean();

    const allClientIds = convertedClients.map(c => c._id);
    const projects = await Project.find({
      client: { $in: allClientIds },
      'financialDetails.advanceReceived': { $gt: 0 }
    }).select('client financialDetails.totalCost financialDetails.includeGST budget').lean();

    const getProjectBaseCost = (project) => {
      const rawCost = Number(project.financialDetails?.totalCost || project.budget || 0);
      const includeGST = !!project.financialDetails?.includeGST;
      if (!includeGST || rawCost <= 0) return rawCost;
      const base = Math.round(rawCost / 1.18);
      return base > 0 ? base : rawCost;
    };

    const frames = getLastNMonths(months);
    const items = [];

    for (const f of frames) {
      const monthStart = new Date(f.year, f.monthIndex - 1, 1, 0, 0, 0, 0);
      const monthEnd = new Date(f.year, f.monthIndex, 0, 23, 59, 59, 999);

      const monthlyClientIds = convertedClients
        .filter(c => c.conversionDate && c.conversionDate >= monthStart && c.conversionDate <= monthEnd)
        .map(c => c._id.toString());

      let sales = 0;
      projects.forEach(p => {
        const clientIdStr = p.client.toString();
        if (monthlyClientIds.includes(clientIdStr)) {
          sales += getProjectBaseCost(p);
        }
      });

      items.push({
        month: f.label,
        year: f.year,
        monthIndex: f.monthIndex,
        key: `${f.year}-${f.monthIndex}`,
        sales,
        monthLabel: `${f.label} ${f.year}`
      });
    }

    // Determine when this sales employee "exists" in the system:
    // earliest of (Sales.createdAt, first client conversion date)
    let earliestActiveDate = null;
    try {
      const Sales = require('../models/Sales');
      const salesDoc = await Sales.findById(salesId).select('createdAt');
      if (salesDoc?.createdAt) {
        earliestActiveDate = salesDoc.createdAt;
      }
    } catch (e) {
      // If Sales model lookup fails, fall back to conversion dates only
    }

    if (convertedClients.length > 0) {
      const earliestConversion = convertedClients
        .filter(c => c.conversionDate)
        .reduce(
          (min, c) => (!min || c.conversionDate < min ? c.conversionDate : min),
          null
        );
      if (earliestConversion) {
        earliestActiveDate = earliestActiveDate
          ? new Date(Math.min(earliestActiveDate, earliestConversion))
          : earliestConversion;
      }
    }

    let filteredItems = items;
    if (earliestActiveDate) {
      const earliestYear = earliestActiveDate.getFullYear();
      const earliestMonthIndex = earliestActiveDate.getMonth() + 1; // 1-12
      const earliestKey = earliestYear * 12 + (earliestMonthIndex - 1);

      filteredItems = items.filter((x) => {
        const key = x.year * 12 + (x.monthIndex - 1);
        return key >= earliestKey;
      });
    }

    const totalSales = filteredItems.reduce((sum, x) => sum + x.sales, 0);
    const bestMonth = filteredItems.reduce(
      (b, x) => (x.sales > (b?.sales || 0) ? x : b),
      filteredItems[0] || { monthLabel: '-', sales: 0 }
    );

    res.status(200).json({
      success: true,
      data: {
        items: filteredItems,
        totalSales,
        bestMonth: { monthLabel: bestMonth.monthLabel, sales: bestMonth.sales }
      }
    });
  } catch (error) {
    console.error('Get monthly sales history error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching monthly sales history' });
  }
};

// @desc    Monthly incentive history for sales employee (grouped by custom sales-month windows)
// @route   GET /api/sales/analytics/incentives/history
// @access  Private (Sales only)
const getMonthlyIncentiveHistory = async (req, res) => {
  try {
    const salesId = safeObjectId(req.sales.id);
    const rawPeriods = parseInt(req.query.periods || '12', 10) || 12;
    const periodsToShow = Math.min(Math.max(rawPeriods, 1), 36);

    const Sales = require('../models/Sales');
    const Incentive = require('../models/Incentive');
    const { getCurrentSalesMonthRange } = require('../utils/salesMonthRange');

    // Load conversion-based incentives for this sales employee (own incentives only)
    const incentives = await Incentive.find({
      salesEmployee: salesId,
      isConversionBased: true
    })
      .populate('clientId', 'name')
      .populate('projectId', 'name')
      .sort({ dateAwarded: 1 }) // ascending for earliest date calculation
      .lean();

    // Determine when this sales employee "exists" (earliest of Sales.createdAt and first incentive)
    let earliestActiveDate = null;
    const salesDoc = await Sales.findById(salesId).select('createdAt').lean();
    if (salesDoc?.createdAt) {
      earliestActiveDate = salesDoc.createdAt;
    }
    if (incentives.length > 0) {
      const earliestIncentiveDate = incentives[0].dateAwarded ? new Date(incentives[0].dateAwarded) : null;
      if (earliestIncentiveDate) {
        earliestActiveDate = earliestActiveDate
          ? new Date(Math.min(earliestActiveDate, earliestIncentiveDate))
          : earliestIncentiveDate;
      }
    }

    // Build custom sales-month windows going backwards from "now" using the same helper as hero stats
    const frames = [];
    const frameKeys = new Set();
    let cursor = new Date();

    while (frames.length < periodsToShow) {
      // eslint-disable-next-line no-await-in-loop
      const { start, end } = await getCurrentSalesMonthRange(cursor);
      const key = `${start.toISOString()}_${end.toISOString()}`;
      if (!frameKeys.has(key)) {
        frameKeys.add(key);
        frames.push({ start, end });
      }
      // Move cursor to the day before this window to get the previous window in next iteration
      cursor = new Date(start.getTime() - 24 * 60 * 60 * 1000);
    }

    // Sort frames chronologically and filter out any that end before the employee became active
    frames.sort((a, b) => a.start - b.start);
    let usableFrames = frames;
    if (earliestActiveDate) {
      usableFrames = frames.filter((f) => f.end >= earliestActiveDate);
    }

    // Helper for date formatting
    const fmt = (d) =>
      d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });

    // Group incentives into these windows
    const periods = usableFrames.map((frame) => {
      const { start, end } = frame;
      const incentivesInPeriod = incentives.filter((inc) => {
        if (!inc.dateAwarded) return false;
        const d = new Date(inc.dateAwarded);
        return d >= start && d <= end;
      });

      const totalAmount = incentivesInPeriod.reduce((sum, inc) => sum + (Number(inc.amount) || 0), 0);

      const incentivesMapped = incentivesInPeriod.map((inc) => ({
        id: inc._id,
        amount: inc.amount,
        status: inc.status,
        dateAwarded: inc.dateAwarded,
        paidAt: inc.paidAt || null,
        reason: inc.reason,
        clientName: inc.clientId?.name || null,
        projectName: inc.projectId?.name || null
      }));

      return {
        key: `${start.toISOString()}_${end.toISOString()}`,
        start,
        end,
        label: `${fmt(start)} – ${fmt(end)}`,
        totalAmount,
        incentives: incentivesMapped
      };
    });

    const totalAmountAllPeriods = periods.reduce((sum, p) => sum + p.totalAmount, 0);

    res.status(200).json({
      success: true,
      data: {
        periods,
        totalAmount: totalAmountAllPeriods
      }
    });
  } catch (error) {
    console.error('Get monthly incentive history error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching monthly incentive history' });
  }
};

// @desc    Get sales leaderboard for sales module
// @route   GET /api/sales/analytics/leaderboard
// @access  Private (Sales only)
const getSalesLeaderboard = async (req, res) => {
  try {
    // Get all active sales team members
    const salesTeam = await Sales.find({ isActive: true })
      .select('name email salesTarget currentSales currentIncentive updatedAt createdAt');

    // Only count converted leads that still have a client (same logic as admin leaderboard)
    const validOriginLeadIds = await Client.distinct('originLead', { originLead: { $ne: null } });

    const convertedBySales = validOriginLeadIds.length > 0
      ? await Lead.aggregate([
        { $match: { status: 'converted', _id: { $in: validOriginLeadIds } } },
        {
          $group: {
            _id: '$assignedTo',
            convertedLeads: { $sum: 1 },
            convertedValue: { $sum: '$value' }
          }
        }
      ])
      : [];

    const convertedMap = new Map(
      convertedBySales.map((r) => [
        r._id?.toString(),
        { convertedLeads: r.convertedLeads, convertedValue: r.convertedValue }
      ])
    );

    // Build leaderboard entries for each sales member
    const salesLeaderboard = await Promise.all(
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
        const corrected = convertedMap.get(member._id.toString()) || {
          convertedLeads: 0,
          convertedValue: 0
        };

        const convertedLeads = corrected.convertedLeads;
        const totalRevenue = corrected.convertedValue;
        const conversionRate =
          totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

        return {
          _id: member._id,
          name: member.name,
          email: member.email,
          avatar: (member.name || '?')
            .toString()
            .trim()
            .split(/\s+/)
            .map((n) => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase(),
          score: totalRevenue, // primary score = revenue generated from converting clients
          rank: 0, // will be set after sorting
          completed: convertedLeads,
          overdue: 0,
          missed: 0,
          onTime: convertedLeads,
          rate: conversionRate,
          trend: 'stable',
          trendValue: '0%',
          department: 'Sales',
          avgTime: '1.5 days',
          lastActive: member.updatedAt || member.createdAt,
          projects: convertedLeads, // treat converted leads as deals
          role: 'Sales Executive',
          module: 'sales',
          earnings: member.currentSales || 0,
          achievements:
            totalRevenue >= 1000000
              ? ['Sales Champion', 'Revenue Master']
              : totalRevenue >= 500000
                ? ['Sales Champion']
                : [],
          salesMetrics: {
            leads: totalLeads,
            conversions: convertedLeads,
            revenue: totalRevenue,
            deals: convertedLeads
          },
          conversionRate
        };
      })
    );

    // Sort by revenue first, then by conversions (same as admin leaderboard)
    salesLeaderboard.sort((a, b) => {
      if (b.salesMetrics.revenue !== a.salesMetrics.revenue) {
        return b.salesMetrics.revenue - a.salesMetrics.revenue;
      }
      return b.salesMetrics.conversions - a.salesMetrics.conversions;
    });

    // Assign ranks
    salesLeaderboard.forEach((member, index) => {
      member.rank = index + 1;
    });

    // Overall statistics for sales-only view
    const totalMembers = salesLeaderboard.length;
    const overallStats = {
      totalMembers,
      avgScore:
        totalMembers > 0
          ? Math.round(
            salesLeaderboard.reduce((sum, m) => sum + (m.score || 0), 0) / totalMembers
          )
          : 0,
      totalCompleted: salesLeaderboard.reduce((sum, m) => sum + (m.completed || 0), 0),
      totalProjects: salesLeaderboard.reduce(
        (sum, m) => sum + (m.salesMetrics?.deals || 0),
        0
      ),
      avgCompletionRate:
        totalMembers > 0
          ? Math.round(
            salesLeaderboard.reduce((sum, m) => sum + (m.rate || 0), 0) / totalMembers
          )
          : 0,
      topPerformer:
        totalMembers > 0
          ? salesLeaderboard.reduce(
            (top, m) => ((m.score || 0) > (top.score || 0) ? m : top),
            salesLeaderboard[0]
          )
          : null,
      totalRevenue: salesLeaderboard.reduce(
        (sum, m) => sum + (m.salesMetrics?.revenue || 0),
        0
      )
    };

    res.status(200).json({
      success: true,
      data: {
        sales: salesLeaderboard,
        overallStats
      }
    });
  } catch (error) {
    console.error('Get sales leaderboard error:', error);
    res
      .status(500)
      .json({ success: false, message: 'Server error while fetching sales leaderboard' });
  }
};

// @desc    Get all leads assigned to sales employee
// @route   GET /api/sales/leads
// @access  Private (Sales only)
const getMyLeads = async (req, res) => {
  try {
    const salesId = req.sales.id;
    const {
      status,
      category,
      priority,
      search,
      page = 1,
      limit = 12,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    // Ensure proper ObjectId for assignedTo in "get my leads" too
    let myAssignedTo = salesId;
    try { myAssignedTo = new mongoose.Types.ObjectId(salesId); } catch (_) { myAssignedTo = salesId; }
    let filter = { assignedTo: myAssignedTo };

    if (status && status !== 'all') {
      filter.status = status;
    }
    // Exclude leads shared with CP from "new" list – they appear under Channel Partner Leads > Shared with CP
    if (filter.status === 'new') {
      filter.$and = (filter.$and || []).concat([
        { $or: [{ sharedWithCP: { $exists: false } }, { sharedWithCP: { $size: 0 } }] }
      ]);
      const sharedLeadIds = await CPLead.distinct('sharedFromSales.leadId', {
        'sharedFromSales.sharedBy': new mongoose.Types.ObjectId(salesId)
      });
      if (sharedLeadIds && sharedLeadIds.length > 0) {
        filter._id = { $nin: sharedLeadIds };
      }
    }

    if (category && category !== 'all') {
      filter.category = category;
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
      .populate('leadProfile', 'name businessName projectType estimatedCost quotationSent demoSent')
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

  } catch (error) {
    console.error('Get my leads error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching leads'
    });
  }
};

// @desc    Get leads by specific status
// @route   GET /api/sales/leads/status/:status
// @access  Private (Sales only)
const getLeadsByStatus = async (req, res) => {
  try {
    // Check if sales user is authenticated
    if (!req.sales || !req.sales.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const salesId = req.sales.id;
    const { status } = req.params;
    const {
      category,
      priority,
      search,
      timeFrame,
      page = 1,
      limit = 12
    } = req.query;

    // Validate status (with backward compatibility for today_followup)
    const validStatuses = ['new', 'connected', 'not_picked', 'followup', 'today_followup', 'quotation_sent', 'converted', 'lost', 'hot', 'demo_requested', 'demo_sent', 'not_interested'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    // Handle backward compatibility: treat today_followup as followup
    let actualStatus = status;
    if (status === 'today_followup') {
      actualStatus = 'followup';
    }

    // Build filter object
    // Ensure proper ObjectId matching for assignedTo (with safe fallback)
    let assignedToValue = salesId;
    try {
      assignedToValue = new mongoose.Types.ObjectId(salesId);
    } catch (e) {
      // Fallback to string matching if casting fails (should not happen in normal flow)
      assignedToValue = salesId;
    }

    // Special handling for status-specific queries:
    // - 'connected': all leads with leadProfile that are not converted/lost/not_interested/not_picked
    // - 'quotation_sent': leads with status='quotation_sent' OR leadProfile.quotationSent=true
    // - 'hot': leads with status='hot'
    // - 'demo_sent': leads with leadProfile.demoSent=true
    // - 'app_client': leads with status='app_client' OR leadProfile.projectType.app=true
    // - 'web': leads with status='web' OR leadProfile.projectType.web=true
    let filter;
    if (status === 'connected') {
      filter = {
        assignedTo: assignedToValue,
        leadProfile: { $exists: true, $ne: null },
        status: { $nin: ['converted', 'lost', 'not_interested', 'not_picked'] }
      };
    } else if (status === 'quotation_sent') {
      // Show leads with status='quotation_sent' OR leadProfile.quotationSent=true (excluding converted)
      filter = {
        assignedTo: assignedToValue,
        status: { $ne: 'converted' },
        $or: [
          { status: 'quotation_sent' },
          { leadProfile: { $exists: true, $ne: null } }
        ]
      };
    } else if (status === 'demo_sent') {
      // Filter leads where leadProfile.demoSent is true (excluding converted)
      filter = {
        assignedTo: assignedToValue,
        status: { $ne: 'converted' },
        leadProfile: { $exists: true, $ne: null }
      };
    } else if (status === 'app_client') {
      // Show leads with status='app_client' OR leadProfile.category='App' OR leadProfile.projectType.app=true (legacy)
      // Note: Category filtering will be done in post-query filter since MongoDB doesn't support nested field filtering easily
      filter = {
        assignedTo: assignedToValue,
        status: { $ne: 'converted' },
        $or: [
          { status: 'app_client' },
          { leadProfile: { $exists: true, $ne: null } }
        ]
      };
    } else if (status === 'web') {
      // Show leads with status='web' OR leadProfile.category='Web' OR leadProfile.projectType.web=true (legacy)
      // Note: Category filtering will be done in post-query filter since MongoDB doesn't support nested field filtering easily
      filter = {
        assignedTo: assignedToValue,
        status: { $ne: 'converted' },
        $or: [
          { status: 'web' },
          { leadProfile: { $exists: true, $ne: null } }
        ]
      };
    } else if (actualStatus === 'followup') {
      // For followup status, don't filter by status - show leads with pending follow-ups regardless of status (excluding converted)
      filter = {
        assignedTo: assignedToValue,
        status: { $ne: 'converted' }
        // Status filter is NOT applied here - we want leads with pending follow-ups from any status
      };
    } else {
      // For other statuses, use exact status match (allows leads to appear in both connected page and status-specific page)
      filter = {
        assignedTo: assignedToValue,
        status: actualStatus
      };
    }

    // Exclude leads shared with CP from "new" list – they appear under Channel Partner Leads > Shared with CP
    if (actualStatus === 'new') {
      filter.$and = (filter.$and || []).concat([
        { $or: [{ sharedWithCP: { $exists: false } }, { sharedWithCP: { $size: 0 } }] }
      ]);
      // Also exclude leads that appear in CPLead.sharedFromSales (covers leads shared before sharedWithCP was added to Lead)
      const sharedLeadIds = await CPLead.distinct('sharedFromSales.leadId', {
        'sharedFromSales.sharedBy': new mongoose.Types.ObjectId(salesId)
      });
      if (sharedLeadIds && sharedLeadIds.length > 0) {
        filter._id = { $nin: sharedLeadIds };
      }
    }

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (priority && priority !== 'all') {
      filter.priority = priority;
    }

    if (search) {
      // For search, combine with existing filters using $and if there's already a $or or complex filter
      // Otherwise, just add $or directly
      const searchConditions = {
        $or: [
          { phone: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } },
          { company: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      };

      // If filter already has $or (from quotation_sent, web, app_client), use $and
      if (filter.$or) {
        const existingOr = filter.$or;
        delete filter.$or;
        filter.$and = filter.$and || [];
        filter.$and.push({ $or: existingOr });
        filter.$and.push(searchConditions);
      } else {
        filter.$or = searchConditions.$or;
      }
    }

    // Add time frame filtering for followup status
    if (actualStatus === 'followup') {
      const now = new Date();
      let startDate, endDate;

      if (timeFrame && timeFrame !== 'all') {
        switch (timeFrame) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            break;
          case 'week':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7, 23, 59, 59, 999);
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate(), 23, 59, 59, 999);
            break;
        }
      } else if (timeFrame === 'all' || !timeFrame) {
        // For 'all' filter or no filter, show all upcoming follow-ups (from today onwards)
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        endDate = null; // No end date limit
      } else {
        // Default: show today's follow-ups
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      }

      // Filter for both pending and completed follow-ups (from today onwards)
      const followUpFilter = {
        scheduledDate: { $gte: startDate },
        status: { $in: ['pending', 'completed'] }
      };

      if (endDate) {
        followUpFilter.scheduledDate.$lte = endDate;
      }

      filter.followUps = {
        $elemMatch: followUpFilter
      };
    } else if (timeFrame && timeFrame !== 'all') {
      // For status-specific queries, determine which date field to use for filtering
      // - 'new' status: Use createdAt (leads are created as new, not updated to new)
      // - 'converted' status: Use convertedAt (accurate conversion date)
      // - Other statuses: Use updatedAt (when status was changed to this status)
      const dateField = actualStatus === 'new' ? 'createdAt' : (actualStatus === 'converted' ? 'convertedAt' : 'updatedAt');
      const now = new Date();
      let startDate, endDate;

      switch (timeFrame) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
          break;
        case 'week':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0);
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30, 0, 0, 0, 0);
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
          break;
      }

      if (startDate) {
        filter[dateField] = { $gte: startDate };
        if (endDate) {
          filter[dateField].$lte = endDate;
        }
      }
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let query = Lead.find(filter)
      .populate('category', 'name color icon')
      .populate('leadProfile', 'name businessName projectType estimatedCost quotationSent demoSent')
      .sort({ createdAt: -1 });

    // For status-specific queries that check leadProfile flags, filter after population
    let leads;
    if (status === 'demo_sent') {
      // Get all leads with leadProfile, then filter by demoSent
      const allLeads = await query;
      const filteredLeads = allLeads.filter(lead => lead.leadProfile && lead.leadProfile.demoSent === true);
      // Apply pagination after filtering
      leads = filteredLeads.slice(skip, skip + limitNum);
    } else if (status === 'quotation_sent') {
      // Get all leads matching the filter, then filter by quotationSent flag
      const allLeads = await query;
      const filteredLeads = allLeads.filter(lead =>
        lead.status === 'quotation_sent' ||
        (lead.leadProfile && lead.leadProfile.quotationSent === true)
      );
      // Apply pagination after filtering
      leads = filteredLeads.slice(skip, skip + limitNum);
    } else if (status === 'app_client') {
      // Get all leads matching the filter, then filter by category='App' or projectType.app flag (legacy)
      const LeadCategory = require('../models/LeadCategory');
      let appCategoryId = null;
      try {
        const appCategory = await LeadCategory.findOne({ name: 'App' });
        if (appCategory) appCategoryId = appCategory._id.toString();
      } catch (err) {
        console.error('Error finding App category:', err);
      }

      const allLeads = await query;
      const filteredLeads = allLeads.filter(lead => {
        if (lead.status === 'app_client') return true;
        if (lead.leadProfile) {
          // Check category first (preferred)
          if (appCategoryId && lead.leadProfile.category && lead.leadProfile.category.toString() === appCategoryId) return true;
          // Legacy: fall back to projectType flag
          if (lead.leadProfile.projectType && lead.leadProfile.projectType.app === true) return true;
        }
        return false;
      });
      // Apply pagination after filtering
      leads = filteredLeads.slice(skip, skip + limitNum);
    } else if (status === 'web') {
      // Get all leads matching the filter, then filter by category='Web' or projectType.web flag (legacy)
      const LeadCategory = require('../models/LeadCategory');
      let webCategoryId = null;
      try {
        const webCategory = await LeadCategory.findOne({ name: 'Web' });
        if (webCategory) webCategoryId = webCategory._id.toString();
      } catch (err) {
        console.error('Error finding Web category:', err);
      }

      const allLeads = await query;
      const filteredLeads = allLeads.filter(lead => {
        if (lead.status === 'web') return true;
        if (lead.leadProfile) {
          // Check category first (preferred)
          if (webCategoryId && lead.leadProfile.category && lead.leadProfile.category.toString() === webCategoryId) return true;
          // Legacy: fall back to projectType flag
          if (lead.leadProfile.projectType && lead.leadProfile.projectType.web === true) return true;
        }
        return false;
      });
      // Apply pagination after filtering
      leads = filteredLeads.slice(skip, skip + limitNum);
    } else if (status === 'followup') {
      // For followup status, get all leads matching the filter (which includes followUps filter)
      // The followUps are already in the lead document, no need for post-filtering
      leads = await query.skip(skip).limit(limitNum);
    } else {
      leads = await query.skip(skip).limit(limitNum);
    }

    // For converted leads, populate associated project with financial details
    if (status === 'converted') {
      const salesObjectId = safeObjectId(salesId);

      // Get clients that belong to this sales employee (converted by them OR admin-linked to them)
      const clientFilter = {
        $or: [
          { convertedBy: salesObjectId },
          { linkedSalesEmployee: salesObjectId }
        ]
      };
      if (search) {
        clientFilter.$and = [{
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { phoneNumber: { $regex: search, $options: 'i' } },
            { companyName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
          ]
        }];
      }

      // Get clients that belong to this sales employee with search filter
      const clientDocs = await Client.find(clientFilter)
        .select('_id originLead phoneNumber name companyName convertedBy linkedSalesEmployee transferHistory')
        .populate({
          path: 'transferHistory.fromSales',
          select: 'name'
        })
        .populate({
          path: 'transferHistory.transferredBy',
          select: 'name'
        });
      const clients = clientDocs.map(doc => doc.toObject());
      const clientIds = clients.map(c => c._id);

      // Get leads IDs
      const leadIds = leads.map(lead => lead._id);

      // Build project filter
      const projectFilter = {
        $or: [
          { originLead: { $in: leadIds } },
          { client: { $in: clientIds } }
        ]
      };
      // Apply category filter to projects if provided
      if (category && category !== 'all') {
        const catObjectId = safeObjectId(category);
        projectFilter.category = catObjectId;
      }

      // Get projects matching filter
      const projects = await Project.find(projectFilter)
        .select('originLead client financialDetails budget projectType category status progress updatedAt createdAt name')
        .populate('category', 'name')
        .lean();

      // Create maps: leadId -> project and clientId -> project
      const projectMapByLead = {};
      const projectMapByClient = {};
      projects.forEach(project => {
        if (project.originLead) {
          projectMapByLead[project.originLead.toString()] = project;
        }
        if (project.client) {
          projectMapByClient[String(project.client)] = project;
        }
      });

      const clientMapByLead = new Map();
      const clientMapByPhone = new Map();
      clients.forEach((client) => {
        if (client.originLead) {
          clientMapByLead.set(client.originLead.toString(), client);
        }
        if (client.phoneNumber) {
          clientMapByPhone.set(client.phoneNumber, client);
        }
      });

      // Attach project data to each lead and filter out leads whose clients were transferred
      // For converted status, only show leads that have a client AND that client belongs to this sales employee
      let mergedLeads = leads
        .map(lead => {
          const leadObj = lead.toObject();
          const project = projectMapByLead[lead._id.toString()];
          if (project) {
            leadObj.project = project;
          }
          const clientDoc =
            clientMapByLead.get(lead._id.toString()) ||
            (lead.phone ? clientMapByPhone.get(lead.phone) : null);

          if (clientDoc) {
            const clientConvertedBy = clientDoc.convertedBy
              ? String(clientDoc.convertedBy._id || clientDoc.convertedBy)
              : null;
            const clientLinkedSales = clientDoc.linkedSalesEmployee
              ? String(clientDoc.linkedSalesEmployee._id || clientDoc.linkedSalesEmployee)
              : null;
            const currentSalesIdStr = String(salesId);

            // Allow the client if convertedBy matches OR linkedSalesEmployee matches
            const isOwned = clientConvertedBy === currentSalesIdStr;
            const isLinked = clientLinkedSales === currentSalesIdStr;
            if (!isOwned && !isLinked) {
              return null;
            }

            const clientIdStr =
              typeof clientDoc._id === 'object' && clientDoc._id !== null && clientDoc._id.toString
                ? clientDoc._id.toString()
                : clientDoc._id;

            const transferHistory = clientDoc.transferHistory || [];
            const latestTransfer = transferHistory.length > 0
              ? transferHistory[transferHistory.length - 1]
              : null;

            const isTransferredClient = isOwned && !!latestTransfer && (() => {
              const toSalesId = latestTransfer.toSales?._id
                ? String(latestTransfer.toSales._id)
                : String(latestTransfer.toSales || '');
              const fromSalesId = latestTransfer.fromSales?._id
                ? String(latestTransfer.fromSales._id)
                : String(latestTransfer.fromSales || '');
              return toSalesId === currentSalesIdStr && fromSalesId !== currentSalesIdStr && fromSalesId !== '';
            })();

            let isTransferred = false;
            let transferredByName = 'Unknown';
            let fromSalesName = 'Unknown';

            if (isTransferredClient) {
              isTransferred = true;
              transferredByName = latestTransfer.transferredBy?.name || 'Unknown';
              fromSalesName = latestTransfer.fromSales?.name || 'Unknown';
            }

            leadObj.convertedClient = {
              id: clientIdStr,
              name: clientDoc.name,
              phoneNumber: clientDoc.phoneNumber,
              companyName: clientDoc.companyName,
              isTransferred: isTransferred,
              transferInfo: isTransferred ? {
                transferredBy: transferredByName,
                transferredAt: latestTransfer.transferredAt,
                fromSales: fromSalesName
              } : null
            };
            leadObj.convertedClientId = clientIdStr;
            return leadObj;
          } else {
            return null;
          }
        })
        .filter(lead => lead !== null && lead.convertedClientId !== null);

      // Also include clients that belong to this sales employee but don't have matching leads
      const clientIdsInLeads = new Set(mergedLeads.map(l => l.convertedClientId).filter(Boolean));
      const clientsWithoutLeads = clients.filter(client => {
        const clientIdStr = String(client._id);
        return !clientIdsInLeads.has(clientIdStr);
      });

      for (const clientDoc of clientsWithoutLeads) {
        const clientIdStr = String(clientDoc._id);
        const transferHistory = clientDoc.transferHistory || [];
        const latestTransfer = transferHistory.length > 0
          ? transferHistory[transferHistory.length - 1]
          : null;

        let isTransferred = false;
        let transferredByName = 'Unknown';
        let fromSalesName = 'Unknown';

        if (latestTransfer) {
          const toSalesId = latestTransfer.toSales?._id
            ? String(latestTransfer.toSales._id)
            : String(latestTransfer.toSales || '');
          const fromSalesId = latestTransfer.fromSales?._id
            ? String(latestTransfer.fromSales._id)
            : String(latestTransfer.fromSales || '');
          const currentSalesIdStr = String(salesId);
          isTransferred = toSalesId === currentSalesIdStr && fromSalesId !== currentSalesIdStr && fromSalesId !== '';
          transferredByName = latestTransfer.transferredBy?.name || 'Unknown';
          fromSalesName = latestTransfer.fromSales?.name || 'Unknown';
        }

        const clientProject = projectMapByClient[clientIdStr];

        const clientLeadObj = {
          _id: clientDoc.originLead || clientDoc._id,
          phone: clientDoc.phoneNumber,
          name: clientDoc.name,
          company: clientDoc.companyName,
          convertedClient: {
            id: clientIdStr,
            name: clientDoc.name,
            phoneNumber: clientDoc.phoneNumber,
            companyName: clientDoc.companyName,
            isTransferred: isTransferred,
            transferInfo: isTransferred ? {
              transferredBy: transferredByName,
              transferredAt: latestTransfer.transferredAt,
              fromSales: fromSalesName
            } : null
          },
          convertedClientId: clientIdStr,
          project: clientProject || null,
          updatedAt: latestTransfer?.transferredAt || clientDoc.updatedAt || new Date()
        };

        mergedLeads.push(clientLeadObj);
      }

      // If category filter is active, only show leads/clients that have at least one project in that category
      if (category && category !== 'all') {
        mergedLeads = mergedLeads.filter(lead =>
          lead.project &&
          String(lead.project.category?._id || lead.project.category || '') === String(category)
        );
      }

      // Sort by conversion date or updated at
      mergedLeads.sort((a, b) => {
        const dateA = new Date(a.convertedAt || a.updatedAt || 0);
        const dateB = new Date(b.convertedAt || b.updatedAt || 0);
        return dateB - dateA;
      });

      // Update output variables for the final response
      totalLeads = mergedLeads.length;
      leads = mergedLeads.slice(skip, skip + limitNum);
    } else {
      // For status-specific queries that check leadProfile flags, count needs special handling
      if (status === 'demo_sent') {
        const allLeads = await Lead.find(filter)
          .populate('leadProfile', 'demoSent');
        totalLeads = allLeads.filter(lead => lead.leadProfile && lead.leadProfile.demoSent === true).length;
      } else if (status === 'quotation_sent') {
        const allLeads = await Lead.find(filter)
          .populate('leadProfile', 'quotationSent');
        totalLeads = allLeads.filter(lead =>
          lead.status === 'quotation_sent' ||
          (lead.leadProfile && lead.leadProfile.quotationSent === true)
        ).length;
      } else if (status === 'app_client') {
        const LeadCategory = require('../models/LeadCategory');
        let appCategoryId = null;
        try {
          const appCategory = await LeadCategory.findOne({ name: 'App' });
          if (appCategory) appCategoryId = appCategory._id.toString();
        } catch (err) {
          console.error('Error finding App category:', err);
        }

        const allLeads = await Lead.find(filter)
          .populate('leadProfile', 'projectType category');
        totalLeads = allLeads.filter(lead => {
          if (lead.status === 'app_client') return true;
          if (lead.leadProfile) {
            if (appCategoryId && lead.leadProfile.category && lead.leadProfile.category.toString() === appCategoryId) return true;
            if (lead.leadProfile.projectType && lead.leadProfile.projectType.app === true) return true;
          }
          return false;
        }).length;
      } else if (status === 'web') {
        const LeadCategory = require('../models/LeadCategory');
        let webCategoryId = null;
        try {
          const webCategory = await LeadCategory.findOne({ name: 'Web' });
          if (webCategory) webCategoryId = webCategory._id.toString();
        } catch (err) {
          console.error('Error finding Web category:', err);
        }

        const allLeads = await Lead.find(filter)
          .populate('leadProfile', 'projectType category');
        totalLeads = allLeads.filter(lead => {
          if (lead.status === 'web') return true;
          if (lead.leadProfile) {
            if (webCategoryId && lead.leadProfile.category && lead.leadProfile.category.toString() === webCategoryId) return true;
            if (lead.leadProfile.projectType && lead.leadProfile.projectType.web === true) return true;
          }
          return false;
        }).length;
      } else {
        totalLeads = await Lead.countDocuments(filter);
      }
    }

    res.status(200).json({
      success: true,
      count: leads.length,
      total: totalLeads,
      page: pageNum,
      pages: Math.ceil(totalLeads / limitNum),
      status: status,
      data: leads
    });

  } catch (error) {
    const errMsg = error && error.message ? error.message : String(error);
    console.error('Get leads by status error:', errMsg);
    if (error && error.stack) console.error(error.stack);
    const isDev = process.env.NODE_ENV !== 'production';
    res.status(500).json({
      success: false,
      message: isDev ? `Server error while fetching leads by status: ${errMsg}` : 'Server error while fetching leads by status',
      error: isDev ? errMsg : undefined
    });
  }
};

// @desc    Get channel partner leads (received from CP or shared with CP)
// @route   GET /api/sales/channel-partner-leads?type=received|shared
// @access  Private (Sales only)
const getChannelPartnerLeads = async (req, res) => {
  try {
    const salesId = req.sales.id;
    const {
      type = 'received', // 'received' = leads CPs shared with me, 'shared' = leads I shared with CPs
      category,
      priority,
      search,
      timeFrame,
      page = 1,
      limit = 12
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    if (type === 'shared') {
      // Leads this sales person shared WITH channel partners (sharedFromSales.sharedBy = me)
      const filter = {
        'sharedFromSales.sharedBy': new mongoose.Types.ObjectId(salesId)
      };
      if (category && category !== 'all') {
        try { filter.category = new mongoose.Types.ObjectId(category); } catch (e) { /* ignore */ }
      }
      if (priority && priority !== 'all') filter.priority = priority;
      if (search && search.trim() !== '') {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { company: { $regex: search, $options: 'i' } }
        ];
      }
      if (timeFrame && timeFrame !== 'all') {
        const now = new Date();
        let startDate, endDate;
        switch (timeFrame) {
          case 'today':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            break;
          case 'yesterday':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
            break;
          case 'week':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30, 0, 0, 0, 0);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            break;
          default: startDate = null; endDate = null;
        }
        if (startDate) {
          filter['sharedFromSales.sharedAt'] = { $gte: startDate };
          if (endDate) filter['sharedFromSales.sharedAt'].$lte = endDate;
        }
      }
      const leads = await CPLead.find(filter)
        .populate('category', 'name color icon')
        .populate('assignedTo', 'name email phoneNumber companyName')
        .populate('sharedFromSales.leadId', 'name phone email company')
        .populate('sharedFromSales.sharedBy', 'name email phoneNumber')
        .populate('leadProfile', 'name businessName projectType estimatedCost quotationSent demoSent')
        .sort({ 'sharedFromSales.sharedAt': -1 })
        .skip(skip)
        .limit(limitNum);
      const total = await CPLead.countDocuments(filter);
      const formattedLeads = leads.map(lead => {
        const leadObj = lead.toObject();
        const shareEntry = leadObj.sharedFromSales?.find(
          s => String(s.sharedBy?._id || s.sharedBy) === String(salesId)
        );
        leadObj.sharedAt = shareEntry?.sharedAt || leadObj.createdAt;
        leadObj.channelPartner = leadObj.assignedTo;
        return leadObj;
      });
      return res.status(200).json({
        success: true,
        data: formattedLeads,
        count: formattedLeads.length,
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum)
      });
    }

    // Default: received from CP (CPLeads shared WITH this sales employee)
    const filter = {
      'sharedWithSales.salesId': new mongoose.Types.ObjectId(salesId)
    };

    // Add category filter if provided
    if (category && category !== 'all') {
      try {
        filter.category = new mongoose.Types.ObjectId(category);
      } catch (error) {
        // Invalid category ID, ignore
      }
    }

    // Add priority filter if provided
    if (priority && priority !== 'all') {
      filter.priority = priority;
    }

    // Add search filter if provided
    if (search && search.trim() !== '') {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } }
      ];
    }

    // Add time frame filter if provided
    if (timeFrame && timeFrame !== 'all') {
      const now = new Date();
      let startDate, endDate;

      switch (timeFrame) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
          break;
        case 'yesterday':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
          break;
        case 'week':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0);
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30, 0, 0, 0, 0);
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
          break;
      }

      if (startDate) {
        filter['sharedWithSales.sharedAt'] = { $gte: startDate };
        if (endDate) {
          filter['sharedWithSales.sharedAt'].$lte = endDate;
        }
      }
    }

    // Query CPLeads shared with this sales employee
    const leads = await CPLead.find(filter)
      .populate('category', 'name color icon')
      .populate('assignedTo', 'name email phoneNumber companyName')
      .populate('sharedWithSales.salesId', 'name email phoneNumber')
      .populate('leadProfile', 'name businessName projectType estimatedCost quotationSent demoSent')
      .sort({ 'sharedWithSales.sharedAt': -1 })
      .skip(skip)
      .limit(limitNum);

    // Get total count
    const total = await CPLead.countDocuments(filter);

    // Format response similar to regular leads
    const formattedLeads = leads.map(lead => {
      const leadObj = lead.toObject();
      // Find the specific share entry for this sales employee
      const shareEntry = leadObj.sharedWithSales.find(
        share => String(share.salesId._id) === String(salesId)
      );
      leadObj.sharedAt = shareEntry?.sharedAt || leadObj.createdAt;
      leadObj.channelPartner = leadObj.assignedTo;
      return leadObj;
    });

    res.status(200).json({
      success: true,
      data: formattedLeads,
      count: formattedLeads.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    console.error('Get channel partner leads error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching channel partner leads'
    });
  }
};

// @desc    Get single channel partner lead detail (CPLead) for Sales
// @route   GET /api/sales/channel-partner-leads/:id
// @access  Private (Sales only)
const getChannelPartnerLeadDetail = async (req, res) => {
  try {
    const salesId = req.sales.id;
    const cpLeadId = req.params.id;

    const cpLead = await CPLead.findById(cpLeadId)
      .populate('category', 'name color icon description')
      .populate('assignedTo', 'name email phoneNumber companyName partnerId')
      .populate('sharedWithSales.salesId', 'name email phoneNumber')
      .populate('sharedWithSales.sharedBy', 'name email phoneNumber companyName')
      .populate('sharedFromSales.leadId', 'name phone email company category')
      .populate('sharedFromSales.sharedBy', 'name email phoneNumber')
      .populate('leadProfile', 'name businessName email projectType estimatedCost description quotationSent demoSent notes documents');

    if (!cpLead) {
      return res.status(404).json({
        success: false,
        message: 'Channel partner lead not found'
      });
    }

    const leadObj = cpLead.toObject();
    const allowed =
      (Array.isArray(leadObj.sharedWithSales) &&
        leadObj.sharedWithSales.some(s => String(s.salesId?._id || s.salesId) === String(salesId))) ||
      (Array.isArray(leadObj.sharedFromSales) &&
        leadObj.sharedFromSales.some(s => String(s.sharedBy?._id || s.sharedBy) === String(salesId)));

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this channel partner lead'
      });
    }

    return res.status(200).json({
      success: true,
      data: leadObj
    });
  } catch (error) {
    console.error('Get channel partner lead detail error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching channel partner lead detail'
    });
  }
};

// @desc    Update a channel partner lead (CPLead) for Sales
// @route   PUT /api/sales/channel-partner-leads/:id
// @access  Private (Sales only)
const updateChannelPartnerLead = async (req, res) => {
  try {
    const salesId = req.sales.id;
    const cpLeadId = req.params.id;
    const { status, category, categoryId, notes, priority } = req.body || {};

    const cpLead = await CPLead.findById(cpLeadId);
    if (!cpLead) {
      return res.status(404).json({ success: false, message: 'Channel partner lead not found' });
    }

    const leadObj = cpLead.toObject();
    const allowed =
      (Array.isArray(leadObj.sharedWithSales) &&
        leadObj.sharedWithSales.some(s => String(s.salesId?._id || s.salesId) === String(salesId))) ||
      (Array.isArray(leadObj.sharedFromSales) &&
        leadObj.sharedFromSales.some(s => String(s.sharedBy?._id || s.sharedBy) === String(salesId)));

    if (!allowed) {
      return res.status(403).json({ success: false, message: 'You do not have access to this channel partner lead' });
    }

    if (status) cpLead.status = status;
    const categoryToUse = categoryId || category;
    if (categoryToUse) cpLead.category = categoryToUse;
    if (notes !== undefined) cpLead.notes = notes || '';
    if (priority) cpLead.priority = priority;

    await cpLead.save();

    await cpLead.populate('category', 'name color icon description');
    await cpLead.populate('assignedTo', 'name email phoneNumber companyName partnerId');
    await cpLead.populate('leadProfile', 'name businessName email projectType estimatedCost description quotationSent demoSent notes documents category');

    return res.status(200).json({
      success: true,
      message: 'Channel partner lead updated successfully',
      data: cpLead
    });
  } catch (error) {
    console.error('Update channel partner lead error:', error);
    return res.status(500).json({ success: false, message: 'Server error while updating channel partner lead' });
  }
};

// @desc    Upsert channel partner lead profile (CPLeadProfile) for Sales
// @route   PUT /api/sales/channel-partner-leads/:id/profile
// @access  Private (Sales only)
const upsertChannelPartnerLeadProfile = async (req, res) => {
  try {
    const salesId = req.sales.id;
    const cpLeadId = req.params.id;
    const updateData = req.body || {};

    const cpLead = await CPLead.findById(cpLeadId).populate('leadProfile');
    if (!cpLead) {
      return res.status(404).json({ success: false, message: 'Channel partner lead not found' });
    }

    const leadObj = cpLead.toObject();
    const allowed =
      (Array.isArray(leadObj.sharedWithSales) &&
        leadObj.sharedWithSales.some(s => String(s.salesId?._id || s.salesId) === String(salesId))) ||
      (Array.isArray(leadObj.sharedFromSales) &&
        leadObj.sharedFromSales.some(s => String(s.sharedBy?._id || s.sharedBy) === String(salesId)));

    if (!allowed) {
      return res.status(403).json({ success: false, message: 'You do not have access to this channel partner lead' });
    }

    const CPLeadProfile = require('../models/CPLeadProfile');

    let profile = null;
    if (cpLead.leadProfile && cpLead.leadProfile._id) {
      profile = await CPLeadProfile.findByIdAndUpdate(cpLead.leadProfile._id, updateData, { new: true, runValidators: true });
    } else {
      // Minimal required fields: lead + name + createdBy
      const nameToUse = updateData.name || cpLead.name || 'Client';
      profile = await CPLeadProfile.create({
        lead: cpLead._id,
        name: nameToUse,
        businessName: updateData.businessName || cpLead.company || '',
        email: updateData.email || cpLead.email || '',
        category: updateData.categoryId || updateData.category || cpLead.category || null,
        projectType: updateData.projectType || { web: false, app: false, taxi: false, other: false },
        estimatedCost: updateData.estimatedCost || 0,
        description: updateData.description || '',
        quotationSent: !!updateData.quotationSent,
        demoSent: !!updateData.demoSent,
        createdBy: cpLead.assignedTo // channel partner
      });
      cpLead.leadProfile = profile._id;
      await cpLead.save();
    }

    // Sync CPLead.category when profile category changes (preferred "project type")
    const categoryToSync = updateData.categoryId || updateData.category;
    if (categoryToSync) {
      try {
        cpLead.category = categoryToSync;
        await cpLead.save();
      } catch (e) {
        // ignore
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Channel partner lead profile updated successfully',
      data: profile
    });
  } catch (error) {
    console.error('Upsert channel partner lead profile error:', error);
    return res.status(500).json({ success: false, message: 'Server error while updating channel partner lead profile' });
  }
};

// @desc    Add follow-up to a channel partner lead (CPLead) for Sales
// @route   POST /api/sales/channel-partner-leads/:id/followups
// @access  Private (Sales only)
const addChannelPartnerLeadFollowUp = async (req, res) => {
  try {
    const salesId = req.sales.id;
    const cpLeadId = req.params.id;
    const { date, time, notes, priority = 'medium', type = 'call' } = req.body || {};

    if (!date || !time) {
      return res.status(400).json({ success: false, message: 'date and time are required' });
    }

    const cpLead = await CPLead.findById(cpLeadId);
    if (!cpLead) {
      return res.status(404).json({ success: false, message: 'Channel partner lead not found' });
    }

    const leadObj = cpLead.toObject();
    const allowed =
      (Array.isArray(leadObj.sharedWithSales) &&
        leadObj.sharedWithSales.some(s => String(s.salesId?._id || s.salesId) === String(salesId))) ||
      (Array.isArray(leadObj.sharedFromSales) &&
        leadObj.sharedFromSales.some(s => String(s.sharedBy?._id || s.sharedBy) === String(salesId)));

    if (!allowed) {
      return res.status(403).json({ success: false, message: 'You do not have access to this channel partner lead' });
    }

    cpLead.followUps = cpLead.followUps || [];
    cpLead.followUps.push({
      scheduledDate: new Date(date),
      scheduledTime: time,
      type,
      notes: notes || '',
      priority,
      status: 'pending',
      createdAt: new Date()
    });

    // Set status to followup for visibility
    if (cpLead.status !== 'converted' && cpLead.status !== 'lost') {
      cpLead.status = 'followup';
    }

    await cpLead.save();

    return res.status(201).json({
      success: true,
      message: 'Follow-up scheduled successfully',
      data: cpLead
    });
  } catch (error) {
    console.error('Add channel partner lead followup error:', error);
    return res.status(500).json({ success: false, message: 'Server error while scheduling follow-up' });
  }
};

// @desc    Get channel partners assigned to this sales (for sharing leads)
// @route   GET /api/sales/assigned-channel-partners
// @access  Private (Sales only)
const getAssignedChannelPartners = async (req, res) => {
  try {
    const salesId = req.sales.id;
    const partners = await ChannelPartner.find({
      salesTeamLeadId: new mongoose.Types.ObjectId(salesId),
      isActive: true
    })
      .select('name email phoneNumber companyName partnerId')
      .sort({ name: 1 })
      .lean();
    res.status(200).json({
      success: true,
      data: partners,
      count: partners.length
    });
  } catch (error) {
    console.error('Get assigned channel partners error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching assigned channel partners'
    });
  }
};

// @desc    Share sales lead with a channel partner
// @route   POST /api/sales/leads/:id/share-with-cp
// @access  Private (Sales only)
const shareLeadWithCP = async (req, res) => {
  try {
    const salesId = req.sales.id;
    const leadId = req.params.id;
    const { cpId } = req.body;
    if (!cpId) {
      return res.status(400).json({
        success: false,
        message: 'Channel partner ID (cpId) is required'
      });
    }
    const lead = await Lead.findOne({ _id: leadId, assignedTo: salesId })
      .populate('category', 'name color icon');
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found or not assigned to you'
      });
    }
    const cp = await ChannelPartner.findById(cpId).select('name companyName');
    if (!cp || !cp._id) {
      return res.status(404).json({
        success: false,
        message: 'Channel partner not found'
      });
    }
    const cpObjectId = new mongoose.Types.ObjectId(cpId);
    const salesObjectId = new mongoose.Types.ObjectId(salesId);
    const leadPhone = (lead.phone || '').replace(/\D/g, '').slice(-10);
    if (!leadPhone || leadPhone.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Lead must have a valid 10-digit phone number to share'
      });
    }
    let cpLead = await CPLead.findOne({ phone: leadPhone });
    if (cpLead) {
      if (String(cpLead.assignedTo) !== String(cpId)) {
        return res.status(400).json({
          success: false,
          message: 'This lead (phone) is already assigned to another channel partner'
        });
      }
      const alreadyShared = (cpLead.sharedFromSales || []).some(
        s => String(s.leadId) === String(leadId)
      );
      if (alreadyShared) {
        return res.status(200).json({
          success: true,
          message: 'Lead already shared with this channel partner',
          data: cpLead
        });
      }
      cpLead.sharedFromSales = cpLead.sharedFromSales || [];
      cpLead.sharedFromSales.push({
        leadId: lead._id,
        sharedBy: salesObjectId,
        sharedAt: new Date()
      });
      await cpLead.save();
      // Mark lead as shared so it is excluded from New Leads list and appears under Channel Partner Leads > Shared with CP
      lead.sharedWithCP = lead.sharedWithCP || [];
      lead.sharedWithCP.push({ cpId: cpObjectId, sharedAt: new Date() });
      await lead.save();
      await cpLead.populate('assignedTo', 'name email phoneNumber companyName');
      await cpLead.populate('sharedFromSales.leadId', 'name phone email company');
      await cpLead.populate('sharedFromSales.sharedBy', 'name email phoneNumber');
      await cpLead.populate('category', 'name color icon');
      return res.status(200).json({
        success: true,
        message: 'Lead shared with channel partner',
        data: cpLead
      });
    }
    const LeadCategory = require('../models/LeadCategory');
    const defaultCategory = await LeadCategory.findOne().sort({ name: 1 });
    if (!defaultCategory) {
      return res.status(500).json({
        success: false,
        message: 'No lead category found. Please create a category first.'
      });
    }
    cpLead = await CPLead.create({
      phone: leadPhone,
      name: lead.name || '',
      company: lead.company || '',
      email: lead.email || '',
      status: lead.status === 'converted' ? 'new' : (lead.status === 'lost' ? 'lost' : (lead.status === 'connected' ? 'connected' : 'new')),
      priority: lead.priority || 'medium',
      source: 'manual',
      value: lead.value || 0,
      assignedTo: cpObjectId,
      notes: lead.notes || '',
      category: lead.category?._id || defaultCategory._id,
      createdBy: cpObjectId,
      creatorModel: 'ChannelPartner',
      sharedFromSales: [{
        leadId: lead._id,
        sharedBy: salesObjectId,
        sharedAt: new Date()
      }]
    });
    // Mark lead as shared so it is excluded from New Leads list and appears under Channel Partner Leads > Shared with CP
    lead.sharedWithCP = lead.sharedWithCP || [];
    lead.sharedWithCP.push({ cpId: cpObjectId, sharedAt: new Date() });
    await lead.save();
    await cpLead.populate('assignedTo', 'name email phoneNumber companyName');
    await cpLead.populate('sharedFromSales.leadId', 'name phone email company');
    await cpLead.populate('sharedFromSales.sharedBy', 'name email phoneNumber');
    await cpLead.populate('category', 'name color icon');
    res.status(201).json({
      success: true,
      message: 'Lead shared with channel partner',
      data: cpLead
    });
  } catch (error) {
    console.error('Share lead with CP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sharing lead with channel partner'
    });
  }
};

// @desc    Get single lead detail
// @route   GET /api/sales/leads/:id
// @access  Private (Sales only)
const getLeadDetail = async (req, res) => {
  try {
    const salesId = req.sales.id;
    const leadId = req.params.id;

    const lead = await Lead.findOne({
      _id: leadId,
      assignedTo: salesId
    })
      .populate('category', 'name color icon description')
      .populate('assignedTo', 'name email phone')
      .populate('createdBy', 'name email')
      .populate('leadProfile', 'name businessName email projectType estimatedCost description quotationSent demoSent notes documents');

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found or not assigned to you'
      });
    }

    res.status(200).json({
      success: true,
      data: lead
    });

  } catch (error) {
    console.error('Get lead detail error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching lead detail'
    });
  }
};

// @desc    Update lead status
// @route   PATCH /api/sales/leads/:id/status
// @access  Private (Sales only)
const updateLeadStatus = async (req, res) => {
  try {
    const salesId = req.sales.id;
    const leadId = req.params.id;
    const { status, notes, followupDate, followupTime, priority, lostReason } = req.body;

    // Validate status (with backward compatibility for today_followup)
    const validStatuses = ['new', 'connected', 'not_picked', 'followup', 'today_followup', 'quotation_sent', 'converted', 'lost', 'hot', 'demo_requested', 'not_interested'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    // Handle backward compatibility: treat today_followup as followup
    let actualStatus = status;
    if (status === 'today_followup') {
      actualStatus = 'followup';
    }

    // Find lead and verify ownership
    const lead = await Lead.findOne({
      _id: leadId,
      assignedTo: salesId
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found or not assigned to you'
      });
    }

    // Validate status transition
    const validTransitions = {
      'new': ['connected', 'not_picked', 'not_interested', 'lost'],
      'connected': ['hot', 'followup', 'quotation_sent', 'demo_requested', 'not_interested', 'lost'],
      'not_picked': ['connected', 'followup', 'not_interested', 'lost'],
      'followup': ['connected', 'hot', 'quotation_sent', 'demo_requested', 'not_interested', 'lost'],
      'quotation_sent': ['connected', 'hot', 'demo_requested', 'converted', 'not_interested', 'lost'],
      'demo_requested': ['connected', 'hot', 'quotation_sent', 'converted', 'not_interested', 'lost'],
      'hot': ['connected', 'followup', 'quotation_sent', 'demo_requested', 'converted', 'not_interested', 'lost'],
      'converted': [],
      'lost': ['connected'],
      'not_interested': ['connected'],
      // Backward compat: existing leads with removed statuses can still transition out
      'dq_sent': ['connected', 'hot', 'quotation_sent', 'demo_requested', 'converted', 'not_interested', 'lost'],
      'app_client': ['connected', 'hot', 'quotation_sent', 'demo_requested', 'converted', 'not_interested', 'lost'],
      'web': ['connected', 'hot', 'quotation_sent', 'demo_requested', 'converted', 'not_interested', 'lost']
    };

    if (!validTransitions[lead.status].includes(actualStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from ${lead.status} to ${actualStatus}`
      });
    }

    // Update lead status
    const oldStatus = lead.status;
    lead.status = actualStatus;
    lead.lastContactDate = new Date();

    // If converting, stamp convertedAt if missing
    if (actualStatus === 'converted' && !lead.convertedAt) {
      lead.convertedAt = new Date();
    }

    // If marking as lost, update lostReason if provided
    if (actualStatus === 'lost' && lostReason) {
      lead.lostReason = lostReason.trim();
    }

    // Handle follow-up scheduling
    if (actualStatus === 'followup' && followupDate && followupTime) {
      // Validate follow-up data
      if (!followupDate || !followupTime) {
        return res.status(400).json({
          success: false,
          message: 'Follow-up date and time are required for followup status'
        });
      }

      // Add follow-up entry
      // Ensure the date is parsed correctly (handle both ISO strings and date objects)
      let parsedDate;
      if (typeof followupDate === 'string') {
        // If it's a string, parse it as ISO date
        parsedDate = new Date(followupDate);
      } else {
        parsedDate = new Date(followupDate);
      }

      // Validate the parsed date
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid follow-up date format'
        });
      }


      const followUpData = {
        scheduledDate: parsedDate,
        scheduledTime: followupTime,
        notes: notes || '',
        priority: priority || 'medium',
        type: 'call',
        status: 'pending'
      };

      lead.followUps.push(followUpData);

      // Update lead priority if provided
      if (priority) {
        lead.priority = priority;
      }

      // Update nextFollowUpDate to the nearest upcoming follow-up (including today)
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today

      const upcomingFollowUps = lead.followUps
        .filter(fu => fu.status === 'pending' && fu.scheduledDate >= today)
        .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));

      if (upcomingFollowUps.length > 0) {
        lead.nextFollowUpDate = upcomingFollowUps[0].scheduledDate;
      }

      // Add activity log for follow-up scheduling
      lead.activities.push({
        type: 'status_change',
        description: `Status changed from ${oldStatus} to ${actualStatus}. Follow-up scheduled for ${followupDate} at ${followupTime}${notes ? ` - ${notes}` : ''}`,
        performedBy: salesId,
        timestamp: new Date()
      });
    } else {
      // Add activity log for regular status change
      lead.activities.push({
        type: 'status_change',
        description: `Status changed from ${oldStatus} to ${actualStatus}${notes ? ` - ${notes}` : ''}`,
        performedBy: salesId,
        timestamp: new Date()
      });
    }

    // Ensure creatorModel is preserved (required field)
    if (!lead.creatorModel) {
      // If creatorModel is missing, set it based on context (Sales route)
      lead.creatorModel = 'Sales';
    }

    await lead.save();

    // Update sales employee's lead statistics
    const sales = await Sales.findById(salesId);
    await sales.updateLeadStats();

    // Populate for response
    await lead.populate('category', 'name color icon');
    await lead.populate('leadProfile', 'name businessName projectType estimatedCost quotationSent demoSent');

    res.status(200).json({
      success: true,
      message: 'Lead status updated successfully',
      data: lead
    });

  } catch (error) {
    console.error('Update lead status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating lead status'
    });
  }
};

// @desc    Add follow-up to lead (without changing lead status)
// @route   POST /api/sales/leads/:id/followups
// @access  Private (Sales only)
const addFollowUp = async (req, res) => {
  try {
    const salesId = req.sales.id;
    const leadId = req.params.id;
    const { date, time, followupDate, followupTime, notes, type, priority } = req.body;

    // Support both 'date'/'time' and 'followupDate'/'followupTime' for backward compatibility
    const actualDate = date || followupDate;
    const actualTime = time || followupTime;

    // Validate follow-up data
    if (!actualDate || !actualTime) {
      return res.status(400).json({
        success: false,
        message: 'Follow-up date and time are required'
      });
    }

    // Find lead and verify ownership
    const lead = await Lead.findOne({
      _id: leadId,
      assignedTo: salesId
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found or not assigned to you'
      });
    }

    // Parse and validate date
    let parsedDate;
    if (typeof actualDate === 'string') {
      parsedDate = new Date(actualDate);
    } else {
      parsedDate = new Date(actualDate);
    }

    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid follow-up date format'
      });
    }

    // Add follow-up entry
    const followUpData = {
      scheduledDate: parsedDate,
      scheduledTime: actualTime,
      notes: notes || '',
      priority: priority || 'medium',
      type: type || 'call',
      status: 'pending'
    };

    lead.followUps.push(followUpData);

    // Update lead priority if provided
    if (priority) {
      lead.priority = priority;
    }

    // Update nextFollowUpDate to the nearest upcoming follow-up (including today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingFollowUps = lead.followUps
      .filter(fu => fu.status === 'pending' && fu.scheduledDate >= today)
      .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));

    if (upcomingFollowUps.length > 0) {
      lead.nextFollowUpDate = upcomingFollowUps[0].scheduledDate;
    }

    // Add activity log for follow-up scheduling (without status change)
    lead.activities.push({
      type: 'followup_added',
      description: `Follow-up scheduled for ${parsedDate.toLocaleDateString()} at ${actualTime}${notes ? ` - ${notes}` : ''}`,
      performedBy: salesId,
      timestamp: new Date()
    });

    await lead.save();

    // Populate the lead document (no need to reload from DB, Mongoose already has the updated document)
    await lead.populate('category', 'name color icon');
    await lead.populate('leadProfile', 'name businessName projectType estimatedCost quotationSent demoSent');

    res.status(200).json({
      success: true,
      message: 'Follow-up added successfully',
      data: lead
    });

  } catch (error) {
    console.error('Add follow-up error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding follow-up'
    });
  }
};

// @desc    Complete a follow-up
// @route   PATCH /api/sales/leads/:leadId/followups/:followUpId/complete
// @access  Private (Sales only)
const completeFollowUp = async (req, res) => {
  try {
    const salesId = req.sales.id;
    const { leadId, followUpId } = req.params;

    // Find lead and verify ownership
    const lead = await Lead.findOne({
      _id: leadId,
      assignedTo: salesId
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found or not assigned to you'
      });
    }

    // Find the follow-up
    const followUp = lead.followUps.id(followUpId);
    if (!followUp) {
      return res.status(404).json({
        success: false,
        message: 'Follow-up not found'
      });
    }

    // Update follow-up status
    followUp.status = 'completed';
    followUp.completedAt = new Date();

    // Update nextFollowUpDate if this was the next one
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcomingFollowUps = lead.followUps
      .filter(fu => fu.status === 'pending' && fu.scheduledDate >= today)
      .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));

    if (upcomingFollowUps.length > 0) {
      lead.nextFollowUpDate = upcomingFollowUps[0].scheduledDate;
    } else {
      lead.nextFollowUpDate = null;
    }

    // Add activity log
    lead.activities.push({
      type: 'followup_completed',
      description: `Follow-up completed: ${followUp.type} scheduled for ${new Date(followUp.scheduledDate).toLocaleDateString()} at ${followUp.scheduledTime}`,
      performedBy: salesId,
      timestamp: new Date()
    });

    await lead.save();

    // Populate for response
    await lead.populate('category', 'name color icon');
    await lead.populate('leadProfile', 'name businessName projectType estimatedCost quotationSent demoSent');

    res.status(200).json({
      success: true,
      message: 'Follow-up marked as completed',
      data: lead
    });

  } catch (error) {
    console.error('Complete follow-up error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while completing follow-up'
    });
  }
};

// @desc    Cancel a follow-up
// @route   PATCH /api/sales/leads/:leadId/followups/:followUpId/cancel
// @access  Private (Sales only)
const cancelFollowUp = async (req, res) => {
  try {
    const salesId = req.sales.id;
    const { leadId, followUpId } = req.params;

    // Find lead and verify ownership
    const lead = await Lead.findOne({
      _id: leadId,
      assignedTo: salesId
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found or not assigned to you'
      });
    }

    // Find the follow-up
    const followUp = lead.followUps.id(followUpId);
    if (!followUp) {
      return res.status(404).json({
        success: false,
        message: 'Follow-up not found'
      });
    }

    // Update follow-up status
    followUp.status = 'cancelled';

    // Update nextFollowUpDate if this was the next one
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcomingFollowUps = lead.followUps
      .filter(fu => fu.status === 'pending' && fu.scheduledDate >= today)
      .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));

    if (upcomingFollowUps.length > 0) {
      lead.nextFollowUpDate = upcomingFollowUps[0].scheduledDate;
    } else {
      lead.nextFollowUpDate = null;
    }

    // Add activity log
    lead.activities.push({
      type: 'followup_cancelled',
      description: `Follow-up cancelled: ${followUp.type} scheduled for ${new Date(followUp.scheduledDate).toLocaleDateString()} at ${followUp.scheduledTime}`,
      performedBy: salesId,
      timestamp: new Date()
    });

    await lead.save();

    // Populate for response
    await lead.populate('category', 'name color icon');
    await lead.populate('leadProfile', 'name businessName projectType estimatedCost quotationSent demoSent');

    res.status(200).json({
      success: true,
      message: 'Follow-up cancelled',
      data: lead
    });

  } catch (error) {
    console.error('Cancel follow-up error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while cancelling follow-up'
    });
  }
};

// @desc    Reschedule a follow-up
// @route   PATCH /api/sales/leads/:leadId/followups/:followUpId
// @access  Private (Sales only)
const rescheduleFollowUp = async (req, res) => {
  try {
    const salesId = req.sales.id;
    const { leadId, followUpId } = req.params;
    const { scheduledDate, scheduledTime, notes, type, priority } = req.body;

    // Find lead and verify ownership
    const lead = await Lead.findOne({
      _id: leadId,
      assignedTo: salesId
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found or not assigned to you'
      });
    }

    // Find the follow-up
    const followUp = lead.followUps.id(followUpId);
    if (!followUp) {
      return res.status(404).json({
        success: false,
        message: 'Follow-up not found'
      });
    }

    // Validate date and time
    if (!scheduledDate || !scheduledTime) {
      return res.status(400).json({
        success: false,
        message: 'Date and time are required'
      });
    }

    // Parse and validate date
    let parsedDate;
    if (typeof scheduledDate === 'string') {
      parsedDate = new Date(scheduledDate);
    } else {
      parsedDate = new Date(scheduledDate);
    }

    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    // Store old date/time for activity log
    const oldDate = followUp.scheduledDate;
    const oldTime = followUp.scheduledTime;

    // Update follow-up
    followUp.scheduledDate = parsedDate;
    followUp.scheduledTime = scheduledTime;
    if (notes !== undefined) followUp.notes = notes || '';
    if (type) followUp.type = type;
    if (priority) followUp.priority = priority;
    followUp.status = 'pending'; // Reset to pending when rescheduled

    // Update nextFollowUpDate
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcomingFollowUps = lead.followUps
      .filter(fu => fu.status === 'pending' && fu.scheduledDate >= today)
      .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));

    if (upcomingFollowUps.length > 0) {
      lead.nextFollowUpDate = upcomingFollowUps[0].scheduledDate;
    }

    // Add activity log
    lead.activities.push({
      type: 'followup_rescheduled',
      description: `Follow-up rescheduled from ${new Date(oldDate).toLocaleDateString()} at ${oldTime} to ${parsedDate.toLocaleDateString()} at ${scheduledTime}`,
      performedBy: salesId,
      timestamp: new Date()
    });

    await lead.save();

    // Populate for response
    await lead.populate('category', 'name color icon');
    await lead.populate('leadProfile', 'name businessName projectType estimatedCost quotationSent demoSent');

    res.status(200).json({
      success: true,
      message: 'Follow-up rescheduled successfully',
      data: lead
    });

  } catch (error) {
    console.error('Reschedule follow-up error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while rescheduling follow-up'
    });
  }
};

// @desc    Create lead profile
// @route   POST /api/sales/leads/:id/profile
// @access  Private (Sales only)
const createLeadProfile = async (req, res) => {
  try {
    const salesId = req.sales.id;
    const leadId = req.params.id;
    const { name, businessName, email, categoryId, category, projectType, estimatedCost, description, quotationSent, demoSent } = req.body;

    // Find lead and verify ownership
    const lead = await Lead.findOne({
      _id: leadId,
      assignedTo: salesId
    }).populate('category');

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found or not assigned to you'
      });
    }

    // Check if profile already exists
    if (lead.leadProfile) {
      return res.status(400).json({
        success: false,
        message: 'Lead profile already exists'
      });
    }

    // Use categoryId from request, or lead's category, or fall back to legacy projectType
    const categoryIdToUse = categoryId || category || lead.category?._id || lead.category || null;

    // Create lead profile
    const LeadProfile = require('../models/LeadProfile');
    const leadProfile = await LeadProfile.create({
      lead: leadId,
      name,
      businessName,
      email,
      category: categoryIdToUse, // Use category (preferred)
      projectType: projectType || { web: false, app: false, taxi: false }, // Legacy support
      estimatedCost: estimatedCost || 0,
      description,
      quotationSent: quotationSent || false,
      demoSent: demoSent || false,
      createdBy: salesId
    });

    // Update lead with profile reference
    lead.leadProfile = leadProfile._id;
    await lead.save();

    res.status(201).json({
      success: true,
      message: 'Lead profile created successfully',
      data: leadProfile
    });

  } catch (error) {
    console.error('Create lead profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating lead profile'
    });
  }
};

// @desc    Update lead profile
// @route   PUT /api/sales/leads/:id/profile
// @access  Private (Sales only)
const updateLeadProfile = async (req, res) => {
  try {
    const salesId = req.sales.id;
    const leadId = req.params.id;
    const updateData = req.body;

    // Find lead and verify ownership
    const lead = await Lead.findOne({
      _id: leadId,
      assignedTo: salesId
    }).populate('leadProfile');

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found or not assigned to you'
      });
    }

    if (!lead.leadProfile) {
      return res.status(404).json({
        success: false,
        message: 'Lead profile not found'
      });
    }

    // Update lead profile
    const LeadProfile = require('../models/LeadProfile');
    const leadProfile = await LeadProfile.findByIdAndUpdate(
      lead.leadProfile._id,
      updateData,
      { new: true, runValidators: true }
    );

    // Keep Lead.category in sync with LeadProfile.category (preferred "project type")
    const categoryIdToSync = updateData?.categoryId || updateData?.category;
    if (categoryIdToSync) {
      try {
        lead.category = categoryIdToSync;
        await lead.save();
      } catch (e) {
        // Ignore sync failures; profile update is still successful
      }
    }

    res.status(200).json({
      success: true,
      message: 'Lead profile updated successfully',
      data: leadProfile
    });

  } catch (error) {
    console.error('Update lead profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating lead profile'
    });
  }
};

// @desc    Convert lead to client and create project (pending-assignment)
// @route   POST /api/sales/leads/:id/convert
// @access  Private (Sales only)
const convertLeadToClient = async (req, res) => {
  try {
    const { id } = req.params;

    // Handle both FormData and JSON requests
    let projectData;
    if (req.body.projectData) {
      // JSON request
      projectData = req.body.projectData;
    } else {
      // FormData request - parse fields
      projectData = {
        projectName: req.body.projectName,
        categoryId: req.body.categoryId || req.body.category,
        projectType: req.body.projectType
          ? (typeof req.body.projectType === 'string' ? JSON.parse(req.body.projectType) : req.body.projectType)
          : null, // Legacy support
        totalCost: req.body.totalCost
          ? Math.round(Number(String(req.body.totalCost).replace(/,/g, '')) || 0)
          : 0,
        finishedDays: req.body.finishedDays ? parseInt(req.body.finishedDays) : undefined,
        advanceReceived: req.body.advanceReceived
          ? Math.round(Number(String(req.body.advanceReceived).replace(/,/g, '')) || 0)
          : 0,
        advanceAccount: req.body.advanceAccount || undefined,
        includeGST: req.body.includeGST === 'true' || req.body.includeGST === true,
        clientDateOfBirth: req.body.clientDateOfBirth || undefined,
        description: req.body.description || '',
        conversionDate: req.body.conversionDate || undefined,
        includeProjectExpenses: req.body.includeProjectExpenses,
        projectExpenseReservedAmount: req.body.projectExpenseReservedAmount,
        projectExpenseRequirements: req.body.projectExpenseRequirements
      };
    }

    // Normalize projectData: support legacy field names, round amounts for consistency
    const parseAmount = (v) => Math.round(Number(String(v || '').replace(/,/g, '')) || 0);
    const totalCost = parseAmount(projectData?.totalCost ?? projectData?.estimatedBudget);
    const advanceReceived = parseAmount(projectData?.advanceReceived);
    let description = (projectData?.description ?? projectData?.notes ?? '').trim();
    const conversionDateStr = projectData?.conversionDate;

    // Normalize project expense configuration (visibility only)
    const includeProjectExpenses =
      projectData?.includeProjectExpenses === true ||
      projectData?.includeProjectExpenses === 'true';
    const reservedAmountRaw = projectData?.projectExpenseReservedAmount;
    const reservedAmount = reservedAmountRaw !== undefined && reservedAmountRaw !== null && reservedAmountRaw !== ''
      ? parseAmount(reservedAmountRaw)
      : 0;
    const projectExpenseRequirements =
      (projectData?.projectExpenseRequirements || '').toString().trim();

    // Validate required financial fields
    if (totalCost <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Project total cost is required and must be greater than zero. Please enter a valid project cost.'
      });
    }

    // New business rule:
    // - Every sale must have a non-zero advance amount
    // - A payment account must be explicitly selected for that advance
    if (advanceReceived <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Advance amount is required and must be greater than zero before converting this lead to a client.'
      });
    }

    if (!projectData?.advanceAccount) {
      return res.status(400).json({
        success: false,
        message: 'Payment account is required for the advance amount. Please select an account before converting this lead.'
      });
    }

    // Validate reserved amount when expenses are included (softly tied to total cost)
    if (includeProjectExpenses && reservedAmount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Reserved amount for project expenses cannot be negative.'
      });
    }
    if (includeProjectExpenses && reservedAmount > totalCost) {
      return res.status(400).json({
        success: false,
        message: 'Reserved amount for project expenses cannot be greater than total project cost.'
      });
    }

    projectData = {
      ...projectData,
      totalCost,
      advanceReceived,
      description,
      includeProjectExpenses,
      projectExpenseReservedAmount: reservedAmount,
      projectExpenseRequirements
    };

    const { uploadToCloudinary } = require('../services/cloudinaryService');
    const lead = await Lead.findById(id).populate('leadProfile').populate('category');

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    // Verify lead belongs to current sales employee
    if (!lead.assignedTo || lead.assignedTo.toString() !== req.sales.id) {
      return res.status(403).json({ success: false, message: 'Not authorized to convert this lead' });
    }

    // Idempotency: if a project already exists for this lead, return it
    const Project = require('../models/Project');
    const existingProject = await Project.findOne({ originLead: id }).populate('client');
    if (lead.status === 'converted' && existingProject) {
      // Treat as success (idempotent) so frontend doesn't fail on repeat clicks
      return res.status(200).json({
        success: true,
        message: 'Lead already converted',
        data: { client: existingProject.client, project: existingProject, lead }
      });
    }

    // Ensure lead has profile (auto-create minimal profile if missing)
    if (!lead.leadProfile) {
      const LeadProfile = require('../models/LeadProfile');
      const categoryIdToUse =
        projectData?.categoryId ||
        projectData?.category ||
        lead.category?._id ||
        lead.category ||
        null;

      if (!categoryIdToUse) {
        return res.status(400).json({
          success: false,
          message: 'Project category is required before conversion'
        });
      }

      // Keep Lead.category in sync as well (preferred project type)
      try {
        lead.category = categoryIdToUse;
        await lead.save();
      } catch (e) {
        // ignore
      }

      const newProfile = await LeadProfile.create({
        lead: lead._id,
        name: lead.name || 'Client',
        businessName: lead.company || '',
        email: lead.email || '',
        category: categoryIdToUse,
        projectType: projectData?.projectType || { web: false, app: false, taxi: false },
        estimatedCost: projectData?.totalCost ? Number(projectData.totalCost) : 0,
        description: projectData?.description || '',
        quotationSent: false,
        demoSent: false,
        createdBy: req.sales.id
      });

      lead.leadProfile = newProfile._id;
      await lead.save();
      await lead.populate('leadProfile');
    }

    // Upsert Client by phone number
    const Client = require('../models/Client');
    const phoneNumber = lead.phone;
    const clientDateOfBirth = projectData?.clientDateOfBirth
      ? (projectData.clientDateOfBirth instanceof Date ? projectData.clientDateOfBirth : new Date(projectData.clientDateOfBirth))
      : undefined;
    const conversionDateFull = conversionDateStr ? new Date(conversionDateStr) : new Date();

    let client = await Client.findOne({ phoneNumber });
    if (!client) {
      const clientFields = {
        phoneNumber,
        name: lead.leadProfile.name || lead.name || 'Client',
        companyName: lead.leadProfile.businessName || lead.company || '',
        email: lead.email || undefined,
        isActive: true,
        convertedBy: req.sales.id,
        conversionDate: conversionDateFull,
        joiningDate: conversionDateFull,
        originLead: lead._id
      };
      if (clientDateOfBirth) clientFields.dateOfBirth = clientDateOfBirth;
      client = await Client.create(clientFields);
    } else {
      // Update existing client with conversion info if not already set
      let needsSave = false;
      if (!client.convertedBy) {
        client.convertedBy = req.sales.id;
        client.conversionDate = conversionDateFull;
        client.joiningDate = conversionDateFull;
        client.originLead = lead._id;
        needsSave = true;
      }
      if (clientDateOfBirth && !client.dateOfBirth) {
        client.dateOfBirth = clientDateOfBirth;
        needsSave = true;
      }
      if (needsSave) await client.save();
    }

    // Prepare project fields (totalCost and advanceReceived already set in normalize step above)
    const includeGST = projectData?.includeGST || false;
    const remainingAmount = totalCost; // No advance applied until finance approves

    const name = projectData?.projectName || 'Sales Converted Project';
    if (!description) description = lead.leadProfile.description || 'Created from sales conversion';
    // Use category from request, lead's category, or leadProfile's category (in that order)
    const categoryId = projectData?.categoryId || lead.category?._id || lead.category || lead.leadProfile?.category || null;
    // Legacy: Keep projectType for backward compatibility
    const projectType = projectData?.projectType || lead.leadProfile?.projectType || { web: false, app: false, taxi: false };
    const finishedDays = projectData?.finishedDays ? parseInt(projectData.finishedDays) : undefined;

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: 'Project category is required to convert lead'
      });
    }

    // Handle screenshot upload if present
    let screenshotAttachment = null;
    if (req.file) {
      try {
        // Check if Cloudinary is configured
        const cloudinaryConfig = process.env.CLOUDINARY_CLOUD_NAME &&
          process.env.CLOUDINARY_API_KEY &&
          process.env.CLOUDINARY_API_SECRET;

        if (!cloudinaryConfig) {
          console.warn('Cloudinary not configured, skipping screenshot upload');
        } else {
          const uploadResult = await uploadToCloudinary(req.file, 'projects/conversions');

          // Check if upload was successful
          if (uploadResult.success && uploadResult.data) {
            const result = uploadResult.data;
            screenshotAttachment = {
              public_id: result.public_id,
              secure_url: result.secure_url,
              originalName: result.original_filename || req.file.originalname,
              original_filename: result.original_filename || req.file.originalname,
              format: result.format,
              size: result.bytes,
              bytes: result.bytes,
              width: result.width,
              height: result.height,
              resource_type: 'image',
              uploadedAt: new Date()
            };
          } else {
            console.warn('Screenshot upload failed:', uploadResult.error || 'Unknown error');
            // Continue without screenshot if upload fails
          }
        }
      } catch (uploadError) {
        console.error('Error uploading screenshot:', uploadError.message || uploadError);
        // Continue without screenshot if upload fails - conversion should still succeed
      }
    }

    // Create Project with pending-assignment status and submittedBy
    const projectFields = {
      name,
      description,
      client: client._id,
      category: categoryId, // Use category (preferred)
      projectType, // Legacy support for existing projects
      status: 'pending-assignment',
      budget: totalCost,
      startDate: conversionDateFull,
      submittedBy: req.sales.id,
      originLead: lead._id,
      financialDetails: {
        totalCost,
        advanceReceived: 0, // Initial advance is 0; will increase only after finance approval
        includeGST,
        remainingAmount
      },
      expenseConfig: {
        included: includeProjectExpenses,
        reservedAmount,
        requirementsNotes: projectExpenseRequirements
      }
    };

    if (finishedDays) {
      projectFields.finishedDays = finishedDays;
    }

    if (screenshotAttachment) {
      projectFields.attachments = [screenshotAttachment];
    }

    const newProject = await Project.create(projectFields);

    // If there is an advance amount, create a pending PaymentReceipt and a payment-recovery
    // request. Admin approval will approve the receipt and update financials/finance via
    // existing hooks.
    if (advanceReceived > 0) {
      try {
        const Request = require('../models/Request');
        const Admin = require('../models/Admin');
        const PaymentReceipt = require('../models/PaymentReceipt');
        const Account = require('../models/Account');

        // Resolve account: use selected advance account or first active account so receipt can be created
        let accountId = projectData?.advanceAccount;
        if (!accountId) {
          const firstAccount = await Account.findOne({ isActive: true }).select('_id');
          accountId = firstAccount?._id;
        }
        if (!accountId) {
          console.warn('No account available for advance receipt; skipping receipt/request creation');
        } else {
          // Create a pending payment receipt tied to the selected account
          const receipt = await PaymentReceipt.create({
            client: client._id,
            project: newProject._id,
            amount: advanceReceived,
            account: accountId,
            method: 'other',
            notes: `Advance payment from sales conversion for project "${newProject.name}"`,
            status: 'pending',
            createdBy: req.sales.id
          });

          const admin = await Admin.findOne({ isActive: true }).select('_id');
          if (admin && admin._id) {
            await Request.create({
              module: 'sales',
              type: 'payment-recovery',
              title: `Advance payment request for project "${newProject.name}"`,
              description: `Advance payment of ₹${advanceReceived.toLocaleString()} requested from sales conversion.`,
              category: 'Advance Payment',
              priority: 'high',
              requestedBy: req.sales.id,
              requestedByModel: 'Sales',
              recipient: admin._id,
              recipientModel: 'Admin',
              project: newProject._id,
              client: client._id,
              amount: advanceReceived,
              metadata: {
                source: 'sales-conversion',
                leadId: lead._id.toString(),
                projectId: newProject._id.toString(),
                paymentReceiptId: receipt._id.toString(),
                screenshotUrl: screenshotAttachment?.secure_url || null
              }
            });
          } else {
            console.warn('No active admin found to create advance payment request');
          }
        }
      } catch (error) {
        console.error('Error creating advance payment request:', error);
      }
    }

    // Update lead status/value
    lead.status = 'converted';
    lead.value = totalCost;
    lead.lastContactDate = conversionDateFull;
    lead.convertedAt = conversionDateFull; // Set convertedAt directly
    await lead.save();

    // Update sales stats
    const sales = await Sales.findById(req.sales.id);
    if (sales && sales.updateLeadStats) {
      await sales.updateLeadStats();
    }

    /**
     * NOTE: Conversion-based incentives are now created only AFTER
     * the first payment receipt for this project is approved.
     * See PaymentReceipt model post-save hook for incentive creation logic.
     * This ensures incentives do not appear in pending/current lists
     * until advance payment has actually been approved.
     */

    // Check if this lead was shared from a Channel Partner and distribute commission
    let cpCommissionData = null;
    if (totalCost && totalCost > 0) {
      try {
        const { findSharedCPLead, calculateCommission, distributeCommission } = require('../services/cpCommissionService');

        // Find if there's a CPLead that was shared with this Sales employee
        const sharedCPLeadInfo = await findSharedCPLead(phoneNumber, req.sales.id);

        if (sharedCPLeadInfo && sharedCPLeadInfo.cpLead) {
          // Calculate commission for shared conversion scenario
          const commissionResult = await calculateCommission('shared', totalCost);

          if (commissionResult.amount > 0) {
            // Distribute commission to the CP who shared the lead
            const description = `Commission for shared lead conversion by Sales: ${client.name || 'Client'} (${commissionResult.percentage}% of ₹${totalCost})`;

            await distributeCommission(
              sharedCPLeadInfo.channelPartnerId,
              commissionResult.amount,
              description,
              {
                type: 'lead_conversion',
                id: sharedCPLeadInfo.cpLead._id
              },
              commissionResult.percentage
            );

            // Mark the CPLead as converted (since Sales converted it)
            sharedCPLeadInfo.cpLead.status = 'converted';
            sharedCPLeadInfo.cpLead.convertedToClient = client._id;
            sharedCPLeadInfo.cpLead.convertedAt = new Date();
            await sharedCPLeadInfo.cpLead.save();

            cpCommissionData = {
              channelPartnerId: sharedCPLeadInfo.channelPartnerId,
              channelPartnerName: sharedCPLeadInfo.channelPartnerName,
              amount: commissionResult.amount,
              percentage: commissionResult.percentage
            };
          }
        }
      } catch (cpCommissionError) {
        // Log error but don't fail the conversion
        console.error('Error processing CP commission for Sales lead conversion:', cpCommissionError);
      }
    }

    // Respond
    const populatedProject = await Project.findById(newProject._id).populate('client');
    return res.status(201).json({
      success: true,
      message: 'Lead converted successfully',
      data: { client, project: populatedProject, lead, cpCommission: cpCommissionData }
    });
  } catch (error) {
    console.error('Convert lead error:', error);
    return res.status(500).json({ success: false, message: 'Server error while converting lead', error: error.message });
  }
};

// @desc    Create a new project for an existing client (pending-assignment)
// @route   POST /api/sales/clients/:clientId/projects
// @access  Private (Sales only)
const createProjectForExistingClient = async (req, res) => {
  try {
    const { clientId } = req.params;

    // Handle both FormData and JSON requests
    let projectData;
    if (req.body.projectData) {
      // JSON request
      projectData = req.body.projectData;
    } else {
      // FormData request - parse fields
      projectData = {
        projectName: req.body.projectName,
        categoryId: req.body.categoryId || req.body.category,
        projectType: req.body.projectType
          ? (typeof req.body.projectType === 'string'
            ? JSON.parse(req.body.projectType)
            : req.body.projectType)
          : null,
        totalCost: req.body.totalCost
          ? Math.round(Number(String(req.body.totalCost).replace(/,/g, '')) || 0)
          : 0,
        finishedDays: req.body.finishedDays ? parseInt(req.body.finishedDays) : undefined,
        advanceReceived: req.body.advanceReceived
          ? Math.round(Number(String(req.body.advanceReceived).replace(/,/g, '')) || 0)
          : 0,
        advanceAccount: req.body.advanceAccount || undefined,
        includeGST: req.body.includeGST === 'true' || req.body.includeGST === true,
        clientDateOfBirth: req.body.clientDateOfBirth || undefined,
        description: req.body.description || '',
        includeProjectExpenses: req.body.includeProjectExpenses,
        projectExpenseReservedAmount: req.body.projectExpenseReservedAmount,
        projectExpenseRequirements: req.body.projectExpenseRequirements
      };
    }

    const parseAmount = (v) =>
      Math.round(Number(String(v || '').replace(/,/g, '')) || 0);
    const totalCost = parseAmount(projectData?.totalCost ?? projectData?.estimatedBudget);
    const advanceReceived = parseAmount(projectData?.advanceReceived);
    let description = (projectData?.description ?? projectData?.notes ?? '').trim();

    if (totalCost <= 0) {
      return res.status(400).json({
        success: false,
        message:
          'Project total cost is required and must be greater than zero. Please enter a valid project cost.'
      });
    }

    if (advanceReceived <= 0) {
      return res.status(400).json({
        success: false,
        message:
          'Advance amount is required and must be greater than zero before creating this project.'
      });
    }

    if (!projectData?.advanceAccount) {
      return res.status(400).json({
        success: false,
        message:
          'Payment account is required for the advance amount. Please select an account before creating this project.'
      });
    }

    // Normalize project expense configuration (visibility only)
    const includeProjectExpenses =
      projectData?.includeProjectExpenses === true ||
      projectData?.includeProjectExpenses === 'true';
    const reservedAmountRaw = projectData?.projectExpenseReservedAmount;
    const reservedAmount = reservedAmountRaw !== undefined && reservedAmountRaw !== null && reservedAmountRaw !== ''
      ? parseAmount(reservedAmountRaw)
      : 0;
    const projectExpenseRequirements =
      (projectData?.projectExpenseRequirements || '').toString().trim();

    if (includeProjectExpenses && reservedAmount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Reserved amount for project expenses cannot be negative.'
      });
    }
    if (includeProjectExpenses && reservedAmount > totalCost) {
      return res.status(400).json({
        success: false,
        message: 'Reserved amount for project expenses cannot be greater than total project cost.'
      });
    }

    projectData = {
      ...projectData,
      totalCost,
      advanceReceived,
      description,
      includeProjectExpenses,
      projectExpenseReservedAmount: reservedAmount,
      projectExpenseRequirements
    };

    const { uploadToCloudinary } = require('../services/cloudinaryService');
    const Client = require('../models/Client');
    const Project = require('../models/Project');

    const client = await Client.findById(clientId);
    if (!client || client.isActive === false) {
      return res
        .status(404)
        .json({ success: false, message: 'Client not found or inactive' });
    }

    // Prepare project fields
    const includeGST = projectData?.includeGST || false;
    const remainingAmount = totalCost;

    const name = projectData?.projectName || 'Sales Additional Project';
    if (!description) {
      description =
        client.notes ||
        `Additional project created for existing client ${client.name || ''}`.trim();
    }

    const categoryId =
      projectData?.categoryId || client.defaultProjectCategory || null;

    const projectType = projectData?.projectType || {
      web: false,
      app: false,
      taxi: false
    };
    const finishedDays = projectData?.finishedDays
      ? parseInt(projectData.finishedDays)
      : undefined;

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: 'Project category is required to create project'
      });
    }

    // Handle screenshot upload if present
    let screenshotAttachment = null;
    if (req.file) {
      try {
        const cloudinaryConfig =
          process.env.CLOUDINARY_CLOUD_NAME &&
          process.env.CLOUDINARY_API_KEY &&
          process.env.CLOUDINARY_API_SECRET;

        if (!cloudinaryConfig) {
          console.warn('Cloudinary not configured, skipping screenshot upload');
        } else {
          const uploadResult = await uploadToCloudinary(req.file, 'projects/conversions');
          if (uploadResult.success && uploadResult.data) {
            const result = uploadResult.data;
            screenshotAttachment = {
              public_id: result.public_id,
              secure_url: result.secure_url,
              originalName: result.original_filename || req.file.originalname,
              original_filename: result.original_filename || req.file.originalname,
              format: result.format,
              size: result.bytes,
              bytes: result.bytes,
              width: result.width,
              height: result.height,
              resource_type: 'image',
              uploadedAt: new Date()
            };
          } else {
            console.warn(
              'Screenshot upload failed (existing client project):',
              uploadResult.error || 'Unknown error'
            );
          }
        }
      } catch (uploadError) {
        console.error(
          'Error uploading screenshot for existing client project:',
          uploadError.message || uploadError
        );
      }
    }

    const projectFields = {
      name,
      description,
      client: client._id,
      category: categoryId,
      projectType,
      status: 'pending-assignment',
      budget: totalCost,
      startDate: new Date(),
      submittedBy: req.sales.id,
      originLead: client.originLead || null,
      financialDetails: {
        totalCost,
        advanceReceived: 0,
        includeGST,
        remainingAmount
      },
      expenseConfig: {
        included: includeProjectExpenses,
        reservedAmount,
        requirementsNotes: projectExpenseRequirements
      }
    };

    if (finishedDays) {
      projectFields.finishedDays = finishedDays;
    }

    if (screenshotAttachment) {
      projectFields.attachments = [screenshotAttachment];
    }

    const newProject = await Project.create(projectFields);

    // Create advance PaymentReceipt + Request (same pattern as convertLeadToClient)
    if (advanceReceived > 0) {
      try {
        const Request = require('../models/Request');
        const Admin = require('../models/Admin');
        const PaymentReceipt = require('../models/PaymentReceipt');
        const Account = require('../models/Account');

        let accountId = projectData?.advanceAccount;
        if (!accountId) {
          const firstAccount = await Account.findOne({ isActive: true }).select('_id');
          accountId = firstAccount?._id;
        }

        if (!accountId) {
          console.warn(
            'No account available for advance receipt; skipping receipt/request creation for existing client project'
          );
        } else {
          const receipt = await PaymentReceipt.create({
            client: client._id,
            project: newProject._id,
            amount: advanceReceived,
            account: accountId,
            method: 'other',
            notes: `Advance payment for additional project "${newProject.name}"`,
            status: 'pending',
            createdBy: req.sales.id
          });

          const admin = await Admin.findOne({ isActive: true }).select('_id');
          if (admin && admin._id) {
            await Request.create({
              module: 'sales',
              type: 'payment-recovery',
              title: `Advance payment request for additional project "${newProject.name}"`,
              description: `Advance payment of ₹${advanceReceived.toLocaleString()} requested for additional project.`,
              category: 'Advance Payment',
              priority: 'high',
              requestedBy: req.sales.id,
              requestedByModel: 'Sales',
              recipient: admin._id,
              recipientModel: 'Admin',
              project: newProject._id,
              client: client._id,
              amount: advanceReceived,
              metadata: {
                source: 'sales-existing-client-project',
                clientId: client._id.toString(),
                projectId: newProject._id.toString(),
                paymentReceiptId: receipt._id.toString(),
                screenshotUrl: screenshotAttachment?.secure_url || null,
                originLeadId: client.originLead ? client.originLead.toString() : null
              }
            });
          } else {
            console.warn(
              'No active admin found to create advance payment request for existing client project'
            );
          }
        }
      } catch (error) {
        console.error(
          'Error creating advance payment request for existing client project:',
          error
        );
      }
    }

    // Incentive for additional project (treat like conversion)
    const sales = await Sales.findById(req.sales.id);
    const Incentive = require('../models/Incentive');
    const incentivePerClient = Number(sales?.incentivePerClient || 0);

    /**
     * NOTE: Conversion-based incentives for additional projects are now
     * created only AFTER the first payment receipt for this project
     * has been approved (see PaymentReceipt post-save hook).
     *
     * This prevents incentives from appearing anywhere (including
     * "pending" views) before advance payment approval.
     */

    const populatedProject = await Project.findById(newProject._id).populate('client');
    return res.status(201).json({
      success: true,
      message: 'Project created successfully for existing client',
      data: { client: populatedProject.client, project: populatedProject }
    });
  } catch (error) {
    console.error('Create project for existing client error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while creating project for existing client',
      error: error.message
    });
  }
};

// @desc    Get all sales team members
// @route   GET /api/sales/team
// @access  Private (Sales only)
const getSalesTeam = async (req, res) => {
  try {
    const salesTeam = await Sales.find({ isActive: true })
      .select('_id name email employeeId department role')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      data: salesTeam
    });

  } catch (error) {
    console.error('Get sales team error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching sales team'
    });
  }
};

// @desc    Request demo for lead
// @route   POST /api/sales/leads/:id/request-demo
// @access  Private (Sales only)
const requestDemo = async (req, res) => {
  try {
    const salesId = req.sales.id;
    const leadId = req.params.id;
    const { clientName, description, reference, mobileNumber } = req.body;

    // Find lead and verify ownership
    const lead = await Lead.findOne({
      _id: leadId,
      assignedTo: salesId
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found or not assigned to you'
      });
    }

    // Create demo request
    const DemoRequest = require('../models/DemoRequest');
    const demoRequest = await DemoRequest.create({
      lead: leadId,
      clientName,
      mobileNumber,
      description,
      reference,
      requestedBy: salesId,
      priority: lead.priority === 'urgent' ? 'high' : 'medium'
    });

    // Update lead status to demo_requested
    lead.status = 'demo_requested';
    lead.lastContactDate = new Date();
    await lead.save();

    // Add activity log
    lead.activities.push({
      type: 'status_change',
      description: `Demo requested for ${clientName} - ${description || 'No description provided'}`,
      performedBy: salesId,
      timestamp: new Date()
    });
    await lead.save();

    // Update sales employee's lead statistics
    const sales = await Sales.findById(salesId);
    await sales.updateLeadStats();

    res.status(201).json({
      success: true,
      message: 'Demo request submitted successfully',
      data: demoRequest
    });

  } catch (error) {
    console.error('Request demo error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while requesting demo'
    });
  }
};

// @desc    Transfer lead to another sales employee
// @route   POST /api/sales/leads/:id/transfer
// @access  Private (Sales only)
const transferLead = async (req, res) => {
  try {
    const salesId = req.sales.id;
    const leadId = req.params.id;
    const { toSalesId, reason } = req.body;

    // Validate required fields
    if (!toSalesId) {
      return res.status(400).json({
        success: false,
        message: 'Target sales employee ID is required'
      });
    }

    // Find lead and verify ownership
    const lead = await Lead.findOne({
      _id: leadId,
      assignedTo: salesId
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found or not assigned to you'
      });
    }

    // Verify target sales employee exists
    const targetSales = await Sales.findById(toSalesId);
    if (!targetSales) {
      return res.status(404).json({
        success: false,
        message: 'Target sales employee not found'
      });
    }

    // Transfer lead
    await lead.transferToSales(salesId, toSalesId, reason);

    // Update both sales employees' lead statistics
    const fromSales = await Sales.findById(salesId);
    const toSales = await Sales.findById(toSalesId);

    await fromSales.updateLeadStats();
    await toSales.updateLeadStats();

    // Add activity log
    lead.activities.push({
      type: 'status_change',
      description: `Lead transferred to ${targetSales.name}${reason ? ` - ${reason}` : ''}`,
      performedBy: salesId,
      timestamp: new Date()
    });
    await lead.save();

    // Populate for response
    await lead.populate('assignedTo', 'name email');
    await lead.populate('leadProfile', 'name businessName projectType estimatedCost quotationSent demoSent');

    res.status(200).json({
      success: true,
      message: 'Lead transferred successfully',
      data: lead
    });

  } catch (error) {
    console.error('Transfer lead error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while transferring lead'
    });
  }
};

// @desc    Add note to lead profile
// @route   POST /api/sales/leads/:id/notes
// @access  Private (Sales only)
const addNoteToLead = async (req, res) => {
  try {
    const salesId = req.sales.id;
    const leadId = req.params.id;
    const { content } = req.body;

    // Validate required fields
    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Note content is required'
      });
    }

    // Find lead and verify ownership
    const lead = await Lead.findOne({
      _id: leadId,
      assignedTo: salesId
    }).populate('leadProfile');

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found or not assigned to you'
      });
    }

    if (!lead.leadProfile) {
      return res.status(400).json({
        success: false,
        message: 'Lead profile not found. Please create a profile first.'
      });
    }

    // Add note to lead profile
    const LeadProfile = require('../models/LeadProfile');
    const leadProfile = await LeadProfile.findById(lead.leadProfile._id);

    await leadProfile.addNote(content.trim(), salesId);

    // Add activity log
    lead.activities.push({
      type: 'note',
      description: `Note added: ${content.trim().substring(0, 50)}${content.trim().length > 50 ? '...' : ''}`,
      performedBy: salesId,
      timestamp: new Date()
    });
    lead.lastContactDate = new Date();
    await lead.save();

    // Populate for response
    await leadProfile.populate('notes.addedBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Note added successfully',
      data: leadProfile
    });

  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding note'
    });
  }
};

// @desc    Get client profile with project details
// @route   GET /api/sales/clients/:id/profile
// @access  Private (Sales only - only converter can access)
const getClientProfile = async (req, res) => {
  try {
    const salesId = safeObjectId(req.sales.id);
    const clientId = req.params.id;

    // Find client and verify it was converted by this sales employee
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Verify access - allow if this sales employee converted the client OR is admin-linked to them
    const isConvertedBy = client.convertedBy && String(client.convertedBy) === String(salesId);
    const isLinkedTo = client.linkedSalesEmployee && String(client.linkedSalesEmployee) === String(salesId);
    if (!isConvertedBy && !isLinkedTo) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this client'
      });
    }

    // Find associated project(s) for this client
    // Reload project to ensure we have latest financialDetails updated by PaymentReceipt hook
    const projects = await Project.find({ client: clientId })
      .select('name description status progress projectType financialDetails budget startDate dueDate finishedDays installmentPlan category createdAt updatedAt')
      .sort({ createdAt: -1 });

    // Allow frontend to request a specific primary project
    const requestedProjectId = req.query.projectId;

    let primaryProject = null;
    if (requestedProjectId) {
      primaryProject = projects.find(
        p => String(p._id) === String(requestedProjectId)
      ) || null;
    }

    // Fallback to most recent or first one
    if (!primaryProject) {
      primaryProject = projects[0] || null;
    }

    // Reload project with fresh data to ensure financialDetails are up-to-date
    if (primaryProject) {
      primaryProject = await Project.findById(primaryProject._id)
        .select('name description status progress projectType category financialDetails budget startDate dueDate finishedDays installmentPlan')
        .populate('category', 'name');
    }

    // Calculate financial summary from primary project
    let totalCost = 0;
    let advanceReceived = 0;
    let pending = 0;
    let workProgress = 0;
    let status = 'N/A';
    let projectType = 'N/A';
    let startDate = null;
    let expectedCompletion = null;

    // Variables for detailed breakdown
    let totalApprovedPayments = 0;
    let paidInstallmentAmount = 0;
    let totalManualRecoveries = 0;

    if (primaryProject) {
      totalCost = primaryProject.financialDetails?.totalCost || primaryProject.budget || 0;

      // Use shared utility to recalculate financials for consistency
      const { recalculateProjectFinancials, calculateInstallmentTotals } = require('../utils/projectFinancialHelper');

      // Recalculate project financials using shared utility
      await recalculateProjectFinancials(primaryProject);

      // Get calculated values from project (now updated by recalculateProjectFinancials)
      advanceReceived = Number(primaryProject.financialDetails?.advanceReceived || 0);
      pending = Number(primaryProject.financialDetails?.remainingAmount || 0);

      // Calculate breakdown for display (must match projectFinancialHelper sources)
      const PaymentReceipt = require('../models/PaymentReceipt');
      const AdminFinance = require('../models/AdminFinance');
      const approvedReceipts = await PaymentReceipt.find({
        project: primaryProject._id,
        status: 'approved'
      }).select('amount');

      totalApprovedPayments = approvedReceipts.reduce((sum, receipt) => sum + Number(receipt.amount || 0), 0);

      // Calculate paid installments
      const installmentTotals = calculateInstallmentTotals(primaryProject.installmentPlan || []);
      paidInstallmentAmount = Number(installmentTotals.paid || 0);

      // Admin manual recoveries (same source as projectFinancialHelper)
      const manualRecoveries = await AdminFinance.aggregate([
        {
          $match: {
            recordType: 'transaction',
            transactionType: 'incoming',
            status: { $ne: 'cancelled' },
            project: primaryProject._id,
            'metadata.sourceType': 'adminManualRecovery'
          }
        },
        { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
      ]);
      totalManualRecoveries = manualRecoveries[0]?.totalAmount || 0;

      // Persist recalculated financials via direct update (bypasses save validation e.g. projectManager)
      try {
        await Project.findByIdAndUpdate(primaryProject._id, {
          $set: {
            'financialDetails.advanceReceived': primaryProject.financialDetails.advanceReceived,
            'financialDetails.remainingAmount': primaryProject.financialDetails.remainingAmount
          }
        });
      } catch (updateError) {
        console.error('Error saving project financials in getClientProfile:', updateError);
        // Continue with calculated values even if save fails
      }

      // Calculate real progress from milestones (same as clientProjectController)
      const Milestone = require('../models/Milestone');
      const milestones = await Milestone.find({ project: primaryProject._id });
      const totalMilestones = milestones.length;
      const completedMilestones = milestones.filter(m => m.status === 'completed').length;
      if (primaryProject.status === 'completed') {
        workProgress = 100;
      } else {
        workProgress = totalMilestones > 0
          ? Math.round((completedMilestones / totalMilestones) * 100)
          : (primaryProject.progress || 0);
      }
      workProgress = Math.min(100, Math.max(0, Number(workProgress) || 0));
      status = primaryProject.status || 'N/A';

      // Format project type - use category first, then fall back to legacy projectType
      if (primaryProject.category) {
        // If category is populated, use its name
        if (typeof primaryProject.category === 'object' && primaryProject.category.name) {
          projectType = primaryProject.category.name;
        } else {
          // Category is just an ObjectId, need to populate it
          const LeadCategory = require('../models/LeadCategory');
          const categoryDoc = await LeadCategory.findById(primaryProject.category);
          projectType = categoryDoc ? categoryDoc.name : 'N/A';
        }
      } else {
        // Legacy: fall back to projectType flags
        const pt = primaryProject.projectType || {};
        if (pt.web) projectType = 'Web';
        else if (pt.app) projectType = 'App';
        else if (pt.taxi) projectType = 'Taxi';
        else projectType = 'N/A';
      }

      startDate = primaryProject.startDate;
      expectedCompletion = primaryProject.dueDate;
    }

    // Determine sale approval status for client profile
    // Normal rule: "approved" once the advance amount has been received and
    // approved by admin (at least one approved receipt).
    // Special rule: if client is admin-linked to this sales employee, treat as
    // "approved" even if no advance has been received yet.
    let saleApprovalStatus = 'pending';
    if (totalCost <= 0) {
      saleApprovalStatus = 'not_required';
    } else if (totalApprovedPayments > 0) {
      saleApprovalStatus = 'approved';
    } else {
      const isAdminLinkedToSales =
        client.linkedSalesEmployee &&
        String(client.linkedSalesEmployee) === String(salesId);

      saleApprovalStatus = isAdminLinkedToSales ? 'approved' : 'pending';
    }

    // Generate avatar from name
    const avatar = client.name ? client.name.charAt(0).toUpperCase() : 'C';

    res.status(200).json({
      success: true,
      data: {
        client: {
          id: client._id,
          name: client.name,
          phone: client.phoneNumber,
          avatar: avatar,
          company: client.companyName || ''
        },
        financial: {
          totalCost,
          advanceReceived,
          pending,
          // Detailed breakdown (matches projectFinancialHelper sources)
          breakdown: {
            fromReceipts: totalApprovedPayments,
            fromInstallments: paidInstallmentAmount,
            fromAdminRecoveries: totalManualRecoveries,
            totalPaid: advanceReceived
          }
        },
        saleApproval: {
          status: saleApprovalStatus,
          approvedAdvanceAmount: totalApprovedPayments,
          totalCost
        },
        project: {
          workProgress,
          status,
          projectType,
          startDate,
          expectedCompletion,
          projectDetails: primaryProject
        },
        allProjects: projects
      }
    });
  } catch (error) {
    console.error('Get client profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching client profile'
    });
  }
};

// @desc    Create payment receipt for client
// @route   POST /api/sales/clients/:clientId/payments
// @access  Private (Sales only - only converter can access)
const createClientPayment = async (req, res) => {
  try {
    const salesId = safeObjectId(req.sales.id);
    const clientId = req.params.clientId;
    const { amount, accountId, method = 'upi', referenceId, notes } = req.body;

    // Validate required fields
    if (!amount || !accountId) {
      return res.status(400).json({
        success: false,
        message: 'Amount and account are required'
      });
    }

    const amountValue = Math.round(parseAmount(amount));
    if (amountValue <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number'
      });
    }

    // Find client and verify access
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    if (!client.convertedBy || String(client.convertedBy) !== String(salesId)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized for this client'
      });
    }

    // Find primary project for this client
    const project = await Project.findOne({ client: clientId })
      .sort({ createdAt: -1 });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'No project found for this client'
      });
    }

    // Initialize financialDetails if not present
    if (!project.financialDetails) {
      project.financialDetails = {
        totalCost: project.budget || 0,
        advanceReceived: 0,
        includeGST: false,
        remainingAmount: project.budget || 0
      };
    }

    // Get current remaining amount (including pending receipts)
    const currentRemaining = Number(project.financialDetails.remainingAmount || 0);

    // Calculate sum of pending receipts for this project
    const pendingReceipts = await PaymentReceipt.find({
      project: project._id,
      status: 'pending'
    }).select('amount');
    const totalPendingAmount = pendingReceipts.reduce((sum, receipt) => sum + Number(receipt.amount || 0), 0);

    // Available amount = remainingAmount - pending receipts
    const availableAmount = currentRemaining - totalPendingAmount;

    // Validate amount doesn't exceed available
    if (amountValue > availableAmount) {
      return res.status(400).json({
        success: false,
        message: `Amount exceeds available balance. Available: ₹${availableAmount.toLocaleString()}`
      });
    }

    // Verify account exists and is active
    const account = await Account.findById(accountId);
    if (!account || !account.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Account not found or inactive'
      });
    }

    // Create payment receipt
    const receipt = await PaymentReceipt.create({
      client: client._id,
      project: project._id,
      amount: amountValue,
      account: accountId,
      method,
      referenceId: referenceId || undefined,
      notes: notes || undefined,
      createdBy: salesId,
      status: 'pending'
    });

    // Optimistically update remainingAmount immediately
    const newRemainingAmount = Math.max(0, currentRemaining - amountValue);
    project.financialDetails.remainingAmount = newRemainingAmount;
    await project.save();

    // Create approval request for admin
    try {
      const Admin = require('../models/Admin');
      const admin = await Admin.findOne({ isActive: true }).select('_id');
      if (admin) {
        // Get sales person name for description
        const salesPerson = await Sales.findById(salesId).select('name');
        const salesName = salesPerson?.name || 'Sales Employee';

        const Request = require('../models/Request');
        await Request.create({
          module: 'sales',
          type: 'payment-recovery',
          title: `Payment Recovery - ₹${amountValue.toLocaleString()}`,
          description: `Sales person ${salesName} requests approval for payment receipt of ₹${amountValue.toLocaleString()} for project "${project.name || 'Project'}".${notes ? ` Notes: ${notes}` : ''}${referenceId ? ` Reference ID: ${referenceId}` : ''}`,
          priority: 'normal',
          requestedBy: salesId,
          requestedByModel: 'Sales',
          recipient: admin._id,
          recipientModel: 'Admin',
          project: project._id,
          client: client._id,
          amount: amountValue,
          metadata: {
            paymentReceiptId: receipt._id.toString(),
            projectId: project._id.toString(),
            accountId: accountId,
            method: method,
            referenceId: referenceId || null,
            notes: notes || null
          }
        });
      }
    } catch (requestError) {
      // Log error but don't fail the receipt creation
      console.error('Error creating approval request for payment receipt:', requestError);
    }

    res.status(201).json({
      success: true,
      data: receipt,
      message: 'Payment receipt created and pending verification'
    });
  } catch (error) {
    console.error('Create client payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment receipt'
    });
  }
};

// @desc    Create project request (accelerate/hold work)
// @route   POST /api/sales/clients/:clientId/project-requests
// @access  Private (Sales only - only converter can access)
const createProjectRequest = async (req, res) => {
  try {
    const salesId = safeObjectId(req.sales.id);
    const clientId = req.params.clientId;
    const { requestType, reason } = req.body;

    // Validate required fields
    if (!requestType || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Request type and reason are required'
      });
    }

    if (!['accelerate_work', 'hold_work'].includes(requestType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request type. Must be accelerate_work or hold_work'
      });
    }

    // Find client and verify access
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    if (!client.convertedBy || String(client.convertedBy) !== String(salesId)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized for this client'
      });
    }

    // Find primary project for this client
    const project = await Project.findOne({ client: clientId })
      .sort({ createdAt: -1 });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'No project found for this client'
      });
    }

    // Find an active admin to be the recipient
    const admin = await Admin.findOne({ isActive: true }).select('_id');
    if (!admin) {
      return res.status(500).json({
        success: false,
        message: 'No active admin found to receive the request'
      });
    }

    // Map requestType to Request type (convert underscore to hyphen)
    const requestTypeMap = {
      'accelerate_work': 'accelerate-work',
      'hold_work': 'hold-work'
    };
    const requestTypeValue = requestTypeMap[requestType] || requestType;

    // Create title based on request type
    const titleMap = {
      'accelerate-work': 'Accelerate Work Request',
      'hold-work': 'Hold Work Request'
    };
    const title = titleMap[requestTypeValue] || 'Project Request';

    // Get sales person name for description
    const salesPerson = await Sales.findById(salesId).select('name');
    const salesName = salesPerson?.name || 'Sales Employee';

    // Create request with all required fields
    const request = await Request.create({
      module: 'sales',
      type: requestTypeValue,
      title: `${title} - ${client.name || 'Client'}`,
      description: `${salesName} requests to ${requestTypeValue === 'accelerate-work' ? 'accelerate' : 'hold'} work for project "${project.name || 'Project'}". Reason: ${reason.trim()}`,
      priority: 'normal',
      requestedBy: salesId,
      requestedByModel: 'Sales',
      recipient: admin._id,
      recipientModel: 'Admin',
      client: client._id,
      project: project._id,
      status: 'pending',
      metadata: {
        requestType: requestType,
        reason: reason.trim()
      }
    });

    res.status(201).json({
      success: true,
      data: request,
      message: 'Request created successfully'
    });
  } catch (error) {
    console.error('Create project request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create project request'
    });
  }
};

// @desc    Get project requests for client
// @route   GET /api/sales/clients/:clientId/project-requests
// @access  Private (Sales only - only converter can access)
const getProjectRequests = async (req, res) => {
  try {
    const salesId = safeObjectId(req.sales.id);
    const clientId = req.params.clientId;

    // Find client and verify access
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    if (!client.convertedBy || String(client.convertedBy) !== String(salesId)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized for this client'
      });
    }

    // Fetch requests for this client
    const requests = await Request.find({
      client: clientId,
      module: 'sales'
    })
      .populate('project', 'name status')
      .populate('requestedBy', 'name email')
      .populate('handledBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: requests,
      message: 'Requests fetched successfully'
    });
  } catch (error) {
    console.error('Get project requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch project requests'
    });
  }
};

// @desc    Increase project cost
// @route   POST /api/sales/clients/:clientId/increase-cost
// @access  Private (Sales only - only converter can access)
const increaseProjectCost = async (req, res) => {
  try {
    const salesId = safeObjectId(req.sales.id);
    const clientId = req.params.clientId;
    const { amount, reason } = req.body;

    // Validate required fields
    if (!amount || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Amount and reason are required'
      });
    }

    const increaseAmount = Math.round(parseAmount(amount));
    if (increaseAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number'
      });
    }

    // Find client and verify access
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    if (!client.convertedBy || String(client.convertedBy) !== String(salesId)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized for this client'
      });
    }

    // Find primary project for this client
    const project = await Project.findOne({ client: clientId })
      .sort({ createdAt: -1 });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'No project found for this client'
      });
    }

    // Find an active admin to be the recipient
    const admin = await Admin.findOne({ isActive: true }).select('_id');
    if (!admin) {
      return res.status(500).json({
        success: false,
        message: 'No active admin found to receive the request'
      });
    }

    // Get sales person name for description
    const salesPerson = await Sales.findById(salesId).select('name');
    const salesName = salesPerson?.name || 'Sales Employee';

    // Store current cost; for GST projects, treat entered amount as base and add base + 18% to total
    const currentCost = project.financialDetails?.totalCost || project.budget || 0;
    const includeGST = project.financialDetails?.includeGST === true;
    const amountToAdd = includeGST
      ? Math.round(increaseAmount * 1.18)
      : increaseAmount;
    const newCost = currentCost + amountToAdd;

    const descriptionText = includeGST
      ? `${salesName} requests to increase project cost by ₹${increaseAmount.toLocaleString()} (base) + GST: ₹${amountToAdd.toLocaleString()} total for project "${project.name || 'Project'}". Current cost: ₹${currentCost.toLocaleString()}, New cost: ₹${newCost.toLocaleString()}. Reason: ${reason.trim()}`
      : `${salesName} requests to increase project cost by ₹${amountToAdd.toLocaleString()} for project "${project.name || 'Project'}". Current cost: ₹${currentCost.toLocaleString()}, New cost: ₹${newCost.toLocaleString()}. Reason: ${reason.trim()}`;

    // Create request for admin approval (request.amount = amountToAdd so approval adds correct total)
    const request = await Request.create({
      module: 'sales',
      type: 'increase-cost',
      title: `Increase Project Cost - ₹${amountToAdd.toLocaleString()}`,
      description: descriptionText,
      priority: 'normal',
      requestedBy: salesId,
      requestedByModel: 'Sales',
      recipient: admin._id,
      recipientModel: 'Admin',
      client: client._id,
      project: project._id,
      amount: amountToAdd,
      status: 'pending',
      metadata: {
        previousCost: currentCost,
        newCost: newCost,
        reason: reason.trim()
      }
    });

    res.status(201).json({
      success: true,
      data: {
        request: request,
        costIncrease: amountToAdd,
        previousCost: currentCost,
        newCost: newCost
      },
      message: 'Request for cost increase submitted successfully. Pending admin approval.'
    });
  } catch (error) {
    console.error('Increase project cost error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to increase project cost'
    });
  }
};

// @desc    Transfer client to another sales employee
// @route   POST /api/sales/clients/:clientId/transfer
// @access  Private (Sales only - only converter can access)
const transferClient = async (req, res) => {
  try {
    const salesId = safeObjectId(req.sales.id);
    const clientId = req.params.clientId;
    const { toSalesId, reason } = req.body;

    // Validate required fields
    if (!toSalesId) {
      return res.status(400).json({
        success: false,
        message: 'Target sales employee ID is required'
      });
    }

    // Find client and verify access
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    if (!client.convertedBy || String(client.convertedBy) !== String(salesId)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized for this client'
      });
    }

    // Convert toSalesId to ObjectId
    const targetSalesId = safeObjectId(toSalesId);
    if (!targetSalesId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid target sales employee ID'
      });
    }

    // Verify target sales employee exists
    const targetSales = await Sales.findById(targetSalesId);
    if (!targetSales) {
      return res.status(404).json({
        success: false,
        message: 'Target sales employee not found'
      });
    }

    // Prevent transferring to self
    if (String(targetSalesId) === String(salesId)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot transfer client to yourself'
      });
    }

    // Store the previous owner before transfer
    const previousOwner = client.convertedBy;

    // Initialize transferHistory if it doesn't exist
    if (!client.transferHistory) {
      client.transferHistory = [];
    }

    // Add transfer history entry
    client.transferHistory.push({
      fromSales: previousOwner,
      toSales: targetSalesId,
      reason: reason ? reason.trim() : undefined,
      transferredAt: new Date(),
      transferredBy: salesId
    });

    // Update convertedBy to the new sales employee
    client.convertedBy = targetSalesId;
    await client.save();

    res.status(200).json({
      success: true,
      data: {
        client: {
          _id: client._id,
          name: client.name,
          convertedBy: client.convertedBy
        },
        transfer: {
          fromSales: previousOwner,
          toSales: targetSalesId
        }
      },
      message: 'Client transferred successfully'
    });
  } catch (error) {
    console.error('Transfer client error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to transfer client'
    });
  }
};

// @desc    Mark project as completed (No Dues)
// @route   POST /api/sales/clients/:clientId/mark-completed
// @access  Private (Sales only - only converter can access)
const markProjectCompleted = async (req, res) => {
  try {
    const salesId = safeObjectId(req.sales.id);
    const clientId = req.params.clientId;

    // Find client and verify access
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    if (!client.convertedBy || String(client.convertedBy) !== String(salesId)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized for this client'
      });
    }

    // Find primary project for this client
    const project = await Project.findOne({ client: clientId })
      .sort({ createdAt: -1 });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'No project found for this client'
      });
    }

    // Check if all payments are received
    const remainingAmount = project.financialDetails?.remainingAmount || 0;
    if (remainingAmount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot mark as completed. Remaining amount: ₹${remainingAmount.toLocaleString()}`
      });
    }

    // Update project status
    project.status = 'completed';
    await project.save();

    res.status(200).json({
      success: true,
      data: {
        project: {
          _id: project._id,
          name: project.name,
          status: project.status
        }
      },
      message: 'Project marked as completed successfully'
    });
  } catch (error) {
    console.error('Mark project completed error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark project as completed'
    });
  }
};

// @desc    Get transaction history for client
// @route   GET /api/sales/clients/:clientId/transactions
// @access  Private (Sales only - converter or admin-linked sales can access)
const getClientTransactions = async (req, res) => {
  try {
    const salesId = safeObjectId(req.sales.id);
    const clientId = req.params.clientId;

    // Find client and verify access
    const client = await Client.findById(clientId);
    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Allow access if this sales employee either:
    // - originally converted the client, OR
    // - has been linked to the client by admin.
    const isConvertedBy = client.convertedBy && String(client.convertedBy) === String(salesId);
    const isLinkedTo = client.linkedSalesEmployee && String(client.linkedSalesEmployee) === String(salesId);

    if (!isConvertedBy && !isLinkedTo) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized for this client'
      });
    }

    // Find all projects for this client
    const projects = await Project.find({ client: clientId }).select('_id name');
    const projectIds = projects.map(p => p._id);

    // Fetch all payment receipts for these projects (sales-created, admin-approved)
    const receiptTransactions = await PaymentReceipt.find({
      project: { $in: projectIds }
    })
      .populate('project', 'name')
      .populate('account', 'name bankName accountNumber ifsc upiId')
      .populate('createdBy', 'name email')
      .populate('verifiedBy', 'name email')
      .sort({ createdAt: -1 });

    // Fetch admin finance transactions recorded directly for this client/projects
    // so sales can see amounts recovered by admin outside the sales app.
    const AdminFinance = require('../models/AdminFinance');
    const adminFinanceTransactions = await AdminFinance.find({
      recordType: 'transaction',
      transactionType: 'incoming',
      status: { $ne: 'cancelled' },
      $or: [
        { client: clientId },
        { project: { $in: projectIds } }
      ],
      // Exclude transactions that already originate from PaymentReceipt to avoid duplicates
      'metadata.sourceType': { $ne: 'paymentReceipt' }
    })
      .populate('project', 'name')
      .populate('account', 'name bankName accountNumber ifsc upiId')
      .populate('createdBy', 'name email')
      .sort({ transactionDate: -1 });

    // Normalize admin finance transactions to match the shape expected by the frontend
    const mappedAdminFinance = adminFinanceTransactions.map(t => ({
      _id: t._id,
      amount: t.amount,
      status: t.status || 'completed',
      createdAt: t.transactionDate,
      method: t.paymentMethod ? t.paymentMethod.toLowerCase().replace(/\s+/g, '_') : 'other',
      referenceId: t.metadata?.referenceId || null,
      notes: t.description || t.category || '',
      project: t.project || null,
      account: t.account || null,
      verifiedBy: t.createdBy || null,
      verifiedAt: t.transactionDate,
      source: 'adminFinance'
    }));

    // Tag receipt transactions with a source field and convert to plain objects
    const mappedReceipts = receiptTransactions.map(r => {
      const obj = r.toObject ? r.toObject() : r;
      return { ...obj, source: 'paymentReceipt' };
    });

    // Combine and sort all transactions by date (newest first)
    const allTransactions = [...mappedReceipts, ...mappedAdminFinance].sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateB - dateA;
    });

    res.status(200).json({
      success: true,
      data: allTransactions,
      message: 'Transactions fetched successfully'
    });
  } catch (error) {
    console.error('Get client transactions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transactions'
    });
  }
};

// @desc    Get sales wallet summary
// @route   GET /api/sales/wallet/summary
// @access  Private (Sales only)
const getWalletSummary = async (req, res) => {
  try {
    const salesId = safeObjectId(req.sales.id);

    // Load sales employee for salary, per-client incentive, targets, reward, and team lead info
    const me = await Sales.findById(salesId).select('fixedSalary incentivePerClient reward salesTargets name isTeamLead teamLeadTarget teamLeadTargetReward teamMembers');
    const perClient = Number(me?.incentivePerClient || 0);
    const fixedSalary = Number(me?.fixedSalary || 0);
    const isTeamLead = me?.isTeamLead || false;
    const teamLeadTarget = Number(me?.teamLeadTarget || 0);
    const teamLeadTargetReward = Number(me?.teamLeadTargetReward || 0);

    // Get conversion-based incentives from Incentive model
    const Incentive = require('../models/Incentive');
    const conversionIncentives = await Incentive.find({
      salesEmployee: salesId,
      isConversionBased: true
    })
      .populate('clientId', 'name')
      .populate('projectId', 'name status financialDetails')
      .populate('leadId', 'phone')
      .sort({ dateAwarded: -1 });

    // Calculate totals from actual incentive records - separate regular and team lead incentives
    let totalIncentive = 0;
    let current = 0;
    let pending = 0;

    // Team lead incentive totals (separate)
    let teamLeadTotalIncentive = 0;
    let teamLeadCurrent = 0;
    let teamLeadPending = 0;

    const breakdown = [];

    // Populate team member and team lead names
    const teamMemberIds = [...new Set(conversionIncentives.filter(inc => inc.teamMemberId).map(inc => inc.teamMemberId.toString()))];
    const teamLeadIds = [...new Set(conversionIncentives.filter(inc => inc.teamLeadId).map(inc => inc.teamLeadId.toString()))];

    const teamMembers = await Sales.find({ _id: { $in: teamMemberIds } }).select('name').lean();
    const teamLeads = await Sales.find({ _id: { $in: teamLeadIds } }).select('name').lean();

    const teamMemberMap = new Map(teamMembers.map(tm => [tm._id.toString(), tm.name]));
    const teamLeadMap = new Map(teamLeads.map(tl => [tl._id.toString(), tl.name]));

    conversionIncentives.forEach(incentive => {
      const isTeamLeadIncentive = incentive.isTeamLeadIncentive || false;

      if (isTeamLeadIncentive) {
        // Team lead incentives - separate totals
        teamLeadTotalIncentive += incentive.amount;
        teamLeadCurrent += incentive.currentBalance || 0;
        teamLeadPending += incentive.pendingBalance || 0;
      } else {
        // Regular incentives (own conversions)
        totalIncentive += incentive.amount;
        current += incentive.currentBalance || 0;
        pending += incentive.pendingBalance || 0;
      }

      breakdown.push({
        incentiveId: incentive._id,
        clientId: incentive.clientId?._id || null,
        clientName: incentive.clientId?.name || 'Unknown Client',
        projectId: incentive.projectId?._id || null,
        projectName: incentive.projectId?.name || null,
        isNoDues: incentive.projectId?.status === 'completed' &&
          Number(incentive.projectId?.financialDetails?.remainingAmount || 0) === 0,
        convertedAt: incentive.dateAwarded || null,
        amount: incentive.amount,
        currentBalance: incentive.currentBalance || 0,
        pendingBalance: incentive.pendingBalance || 0,
        isTeamLeadIncentive: incentive.isTeamLeadIncentive || false,
        isTeamMemberIncentive: incentive.isTeamMemberIncentive || false,
        teamMemberName: incentive.teamMemberId ? teamMemberMap.get(incentive.teamMemberId.toString()) || null : null,
        teamLeadName: incentive.teamLeadId ? teamLeadMap.get(incentive.teamLeadId.toString()) || null : null
      });
    });

    // Calculate monthly incentive (based on incentives created in current month) - regular incentives only
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const monthlyIncentives = conversionIncentives.filter(inc => {
      const dateAwarded = new Date(inc.dateAwarded);
      const isTeamLeadInc = inc.isTeamLeadIncentive || false;
      return dateAwarded >= monthStart && dateAwarded <= monthEnd && !isTeamLeadInc;
    });
    const monthly = monthlyIncentives.reduce((sum, inc) => sum + (inc.amount || 0), 0);

    const allTime = totalIncentive; // Regular incentives only

    // ----- Calculate monthly sales volume for current month (for personal target rewards) -----
    // Get clients converted by this sales employee
    const convertedClients = await Client.find({ convertedBy: salesId })
      .select('_id conversionDate')
      .sort({ conversionDate: -1 });

    // Filter clients converted this month
    const monthlyClientIds = convertedClients
      .filter(c => c.conversionDate && c.conversionDate >= monthStart && c.conversionDate <= monthEnd)
      .map(c => c._id.toString());

    // Only projects where advance has been approved
    const allClientIds = convertedClients.map(c => c._id);
    const projects = await Project.find({
      client: { $in: allClientIds },
      'financialDetails.advanceReceived': { $gt: 0 }
    }).select('client financialDetails.totalCost financialDetails.includeGST budget createdAt');

    // Helper: calculate project base cost excluding GST when included
    const getProjectBaseCost = (project) => {
      const rawCost = Number(project.financialDetails?.totalCost || project.budget || 0);
      const includeGST = !!project.financialDetails?.includeGST;
      if (!includeGST || rawCost <= 0) return rawCost;
      const base = Math.round(rawCost / 1.18);
      return base > 0 ? base : rawCost;
    };

    let monthlySales = 0;
    projects.forEach(p => {
      const clientIdStr = p.client.toString();
      if (monthlyClientIds.includes(clientIdStr)) {
        const costForTarget = getProjectBaseCost(p);
        monthlySales += costForTarget;
      }
    });

    // Transactions view: incentive records + salary (current month)
    const transactions = breakdown
      .map(b => ({
        id: b.incentiveId.toString(),
        type: 'incentive',
        amount: b.amount,
        date: b.convertedAt || me?.createdAt || new Date(),
        clientName: b.clientName,
        currentBalance: b.currentBalance,
        pendingBalance: b.pendingBalance,
        isTeamLeadIncentive: b.isTeamLeadIncentive || false,
        isTeamMemberIncentive: b.isTeamMemberIncentive || false,
        teamMemberName: b.teamMemberName || null,
        teamLeadName: b.teamLeadName || null
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    // Salary credit for this month (computed record)
    const salaryTxDate = new Date(now.getFullYear(), now.getMonth(), 1);
    if (fixedSalary > 0) {
      transactions.unshift({
        id: `salary-${salaryTxDate.toISOString()}`,
        type: 'salary',
        amount: fixedSalary,
        date: salaryTxDate
      });
    }

    // Add incentive payments and reward payments from Salary model (when admin pays)
    const Salary = require('../models/Salary');

    // Reward credit status for current month (Sales target reward)
    // Note: rewardAmount/rewardStatus live on Salary records when admin pays rewards.
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentMonthSalaryRecord = await Salary.findOne({
      employeeId: salesId,
      employeeModel: 'Sales',
      month: currentMonth
    }).select('rewardStatus rewardAmount').lean();

    // Calculate reward earned from personal sales targets for the current month
    const rewardEarned = calculateRewardFromSalesTargets(me?.salesTargets || [], monthlySales);

    const rewardStatus = currentMonthSalaryRecord &&
      currentMonthSalaryRecord.rewardStatus === 'paid' &&
      (currentMonthSalaryRecord.rewardAmount || 0) > 0
      ? 'paid'
      : 'pending';

    const rewardPayload = {
      earned: rewardEarned,
      currentReward: rewardStatus === 'paid' ? 0 : rewardEarned,
      status: rewardStatus
    };

    const paidSalaryRecords = await Salary.find({
      employeeId: salesId,
      employeeModel: 'Sales',
      $or: [
        { incentiveStatus: 'paid', incentiveAmount: { $gt: 0 } },
        { rewardStatus: 'paid', rewardAmount: { $gt: 0 } }
      ]
    }).select('_id month incentiveStatus incentiveAmount incentivePaidDate rewardStatus rewardAmount rewardPaidDate status fixedSalary paidDate').lean();

    paidSalaryRecords.forEach(sal => {
      if (sal.incentiveStatus === 'paid' && sal.incentiveAmount > 0 && sal.incentivePaidDate) {
        transactions.push({
          id: `incentive-payment-${sal._id}`,
          type: 'incentive_payment',
          amount: sal.incentiveAmount,
          date: sal.incentivePaidDate,
          clientName: null
        });
      }
      if (sal.rewardStatus === 'paid' && sal.rewardAmount > 0 && sal.rewardPaidDate) {
        transactions.push({
          id: `reward-payment-${sal._id}`,
          type: 'reward_payment',
          amount: sal.rewardAmount,
          date: sal.rewardPaidDate,
          clientName: null
        });
      }
    });

    // Sort all transactions by date descending
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Team target reward: calculate current month earned amount and paid status
    let teamTargetRewardPayload = null;
    if (isTeamLead && teamLeadTarget > 0 && teamLeadTargetReward > 0) {
      const isPaid = currentMonthSalaryRecord &&
        currentMonthSalaryRecord.rewardStatus === 'paid' &&
        (currentMonthSalaryRecord.rewardAmount || 0) > 0;
      let currentReward = 0;
      let status = 'pending';

      if (isPaid) {
        status = 'paid';
        currentReward = 0; // Reset to zero for next target cycle
      } else {
        // Calculate if team achieved target this month
        const teamMemberIds = (me.teamMembers || [])
          .map(id => (mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null))
          .filter(Boolean);
        const allTeamIds = [new mongoose.Types.ObjectId(salesId), ...teamMemberIds];
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        const teamSalesAgg = await Project.aggregate([
          { $lookup: { from: 'clients', localField: 'client', foreignField: '_id', as: 'clientData' } },
          { $unwind: { path: '$clientData', preserveNullAndEmptyArrays: false } },
          {
            $match: {
              'clientData.convertedBy': { $in: allTeamIds },
              'clientData.conversionDate': { $gte: monthStart, $lte: monthEnd }
            }
          },
          {
            $group: {
              _id: null,
              totalSales: { $sum: { $ifNull: ['$financialDetails.totalCost', { $ifNull: ['$budget', 0] }] } }
            }
          }
        ]);
        const teamMonthlySales = teamSalesAgg.length > 0 ? (Number(teamSalesAgg[0].totalSales) || 0) : 0;
        currentReward = teamMonthlySales >= teamLeadTarget ? teamLeadTargetReward : 0;
      }

      teamTargetRewardPayload = {
        target: teamLeadTarget,
        reward: teamLeadTargetReward,
        currentReward,
        status
      };
    }

    res.status(200).json({
      success: true,
      data: {
        salary: { fixedSalary },
        incentive: {
          perClient, // Keep for backward compatibility
          current, // Regular incentives only
          pending, // Regular incentives only
          monthly, // Regular incentives only
          allTime, // Regular incentives only
          breakdown
        },
        rewardEarned, // Backward compatibility (same as reward.earned)
        reward: rewardPayload,
        isTeamLead: isTeamLead, // Include team lead status
        teamLeadIncentive: {
          total: teamLeadTotalIncentive,
          current: teamLeadCurrent,
          pending: teamLeadPending
        },
        teamTargetReward: teamTargetRewardPayload,
        transactions
      }
    });
  } catch (error) {
    console.error('Get wallet summary error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch wallet summary' });
  }
};

// @desc    Forgot password
// @route   POST /api/sales/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new ErrorResponse('Please provide an email address', 400));
  }

  const sales = await Sales.findOne({ email });

  if (!sales) {
    return res.status(200).json({
      success: true,
      message: 'If that email exists, a password reset link has been sent'
    });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  sales.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  sales.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour

  await sales.save({ validateBeforeSave: false });

  try {
    await emailService.sendPasswordResetEmail(sales.email, resetToken, 'sales');

    res.status(200).json({
      success: true,
      message: 'Password reset email sent successfully'
    });
  } catch (error) {
    console.error('Email sending error:', error);
    sales.resetPasswordToken = undefined;
    sales.resetPasswordExpire = undefined;
    await sales.save({ validateBeforeSave: false });

    return next(new ErrorResponse('Email could not be sent', 500));
  }
});

// @desc    Reset password
// @route   PUT /api/sales/reset-password/:resettoken
// @access  Public
const resetPassword = asyncHandler(async (req, res, next) => {
  const { password } = req.body;
  const resetToken = req.params.resettoken;

  if (!password) {
    return next(new ErrorResponse('Please provide a password', 400));
  }

  if (password.length < 6) {
    return next(new ErrorResponse('Password must be at least 6 characters', 400));
  }

  const resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  const sales = await Sales.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() }
  }).select('+password');

  if (!sales) {
    return next(new ErrorResponse('Invalid or expired reset token', 400));
  }

  sales.password = password;
  sales.resetPasswordToken = undefined;
  sales.resetPasswordExpire = undefined;
  await sales.save();

  const token = generateToken(sales._id);

  res.status(200).json({
    success: true,
    message: 'Password reset successful',
    token
  });
});

// @desc    Get my team data (for team leads only)
// @route   GET /api/sales/my-team
// @access  Private (Sales Team Lead only)
const getMyTeam = async (req, res) => {
  try {
    const salesId = safeObjectId(req.sales.id);

    // Find the sales employee and check if they are a team lead
    const sales = await Sales.findById(salesId);
    if (!sales) {
      return res.status(404).json({
        success: false,
        message: 'Sales employee not found'
      });
    }

    if (!sales.isTeamLead) {
      return res.status(403).json({
        success: false,
        message: 'Only team leads can access this endpoint'
      });
    }

    // Get team members
    const teamMemberIds = sales.teamMembers || [];
    const teamMembers = await Sales.find({ _id: { $in: teamMemberIds } })
      .select('name email phone employeeId salesTarget currentSales isActive createdAt')
      .lean();

    // Get performance metrics for each team member
    const teamWithPerformance = await Promise.all(
      teamMembers.map(async (member) => {
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
        const convertedLeads = leadStats.find(stat => stat._id === 'converted')?.count || 0;
        const totalValue = leadStats.reduce((sum, stat) => sum + stat.totalValue, 0);
        const convertedValue = leadStats.find(stat => stat._id === 'converted')?.totalValue || 0;

        return {
          ...member,
          performance: {
            totalLeads,
            convertedLeads,
            conversionRate: totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(2) : 0,
            totalValue,
            convertedValue,
            targetAchievement: member.salesTarget > 0 ?
              ((member.currentSales / member.salesTarget) * 100).toFixed(2) : 0,
            // Performance score is now based on revenue generated from converting clients
            performanceScore: convertedValue || 0
          }
        };
      })
    );

    // Calculate team totals
    const teamTotals = teamWithPerformance.reduce((totals, member) => {
      totals.totalLeads += member.performance.totalLeads;
      totals.convertedLeads += member.performance.convertedLeads;
      totals.totalValue += member.performance.totalValue;
      totals.convertedValue += member.performance.convertedValue;
      return totals;
    }, { totalLeads: 0, convertedLeads: 0, totalValue: 0, convertedValue: 0 });

    const teamConversionRate = teamTotals.totalLeads > 0
      ? ((teamTotals.convertedLeads / teamTotals.totalLeads) * 100).toFixed(2)
      : 0;

    res.status(200).json({
      success: true,
      data: {
        teamLead: {
          id: sales._id,
          name: sales.name,
          email: sales.email,
          teamMembersCount: teamMembers.length
        },
        teamMembers: teamWithPerformance,
        teamStats: {
          ...teamTotals,
          conversionRate: teamConversionRate,
          memberCount: teamMembers.length
        }
      }
    });

  } catch (error) {
    console.error('Get my team error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching team data'
    });
  }
};

module.exports = {
  loginSales,
  getSalesProfile,
  getMyTeam,
  logoutSales,
  createDemoSales,
  createLeadBySales,
  getLeadCategories,
  debugLeads,
  getTileCardStats,
  getDashboardHeroStats,
  getSalesDashboardStats,
  // alias export for new route path
  getDashboardStats: getSalesDashboardStats,
  getMonthlyConversions,
  getMonthlySalesHistory,
  getMonthlyIncentiveHistory,
  getMyLeads,
  getLeadsByStatus,
  getChannelPartnerLeads,
  getChannelPartnerLeadDetail,
  updateChannelPartnerLead,
  upsertChannelPartnerLeadProfile,
  addChannelPartnerLeadFollowUp,
  getAssignedChannelPartners,
  shareLeadWithCP,
  getLeadDetail,
  updateLeadStatus,
  addFollowUp,
  completeFollowUp,
  cancelFollowUp,
  rescheduleFollowUp,
  createLeadProfile,
  updateLeadProfile,
  convertLeadToClient,
  getSalesTeam,
  requestDemo,
  transferLead,
  addNoteToLead,
  getAccounts,
  getPaymentRecovery,
  getPaymentRecoveryStats,
  getPaymentReceipts,
  createPaymentReceipt,
  getProjectInstallments,
  requestInstallmentPayment,
  getDemoRequests,
  updateDemoRequestStatus,
  listSalesTasks,
  createSalesTask,
  updateSalesTask,
  toggleSalesTask,
  deleteSalesTask,
  listSalesMeetings,
  createSalesMeeting,
  updateSalesMeeting,
  deleteSalesMeeting,
  getMyConvertedClients,
  getWalletSummary,
  getClientProfile,
  createClientPayment,
  createProjectRequest,
  getProjectRequests,
  increaseProjectCost,
  createProjectForExistingClient,
  transferClient,
  markProjectCompleted,
  getClientTransactions,
  forgotPassword,
  resetPassword,
  getSalesLeaderboard
};
