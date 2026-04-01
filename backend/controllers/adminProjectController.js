const Project = require('../models/Project');
const Milestone = require('../models/Milestone');
const Task = require('../models/Task');
const Employee = require('../models/Employee');
const Client = require('../models/Client');
const PM = require('../models/PM');
const Payment = require('../models/Payment');
const Account = require('../models/Account');
const Admin = require('../models/Admin');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const socketService = require('../services/socketService');
const { createIncomingTransaction, findExistingTransaction } = require('../utils/financeTransactionHelper');
const { mapPaymentMethodToFinance } = require('../utils/paymentMethodMapper');

const populateProjectForAdmin = async (projectId) => {
  if (!projectId) return null;
  return Project.findById(projectId)
    .populate('client', 'name email company')
    .populate('projectManager', 'name email')
    .populate('assignedTeam', 'name email department position')
    .populate('costHistory.changedBy', 'name email')
    .populate('installmentPlan.createdBy', 'name email')
    .populate('installmentPlan.updatedBy', 'name email');
};

// Helper function to ensure all paid installments have finance transactions
// This syncs missing transactions to ensure Finance Management shows all paid installments
const syncFinanceTransactionsForPaidInstallments = async (project, adminId = null) => {
  if (!project || !project.installmentPlan || project.installmentPlan.length === 0) {
    return;
  }

  try {
    // Get Admin ID if not provided
    let adminIdForTransaction = adminId;
    if (!adminIdForTransaction) {
      const admin = await Admin.findOne({ isActive: true }).select('_id');
      adminIdForTransaction = admin ? admin._id : null;
    }

    if (!adminIdForTransaction) {
      console.warn('No admin ID available for syncing finance transactions');
      return;
    }


    // Check all paid installments and create missing transactions
    for (let i = 0; i < project.installmentPlan.length; i += 1) {
      const installment = project.installmentPlan[i];
      
      if (installment.status === 'paid' && installment._id && installment.amount > 0) {
        try {
          // Check if transaction already exists
          const existingTransaction = await findExistingTransaction({
            sourceType: 'projectInstallment',
            sourceId: installment._id.toString()
          });

          // If transaction doesn't exist, create it
          if (!existingTransaction) {
            await createIncomingTransaction({
              amount: installment.amount,
              category: 'Project Installment Payment',
              transactionDate: installment.paidDate || installment.dueDate || new Date(),
              createdBy: adminIdForTransaction,
              client: project.client,
              project: project._id,
              account: installment.account || undefined,
              description: `Installment payment for project "${project.name}" - ₹${installment.amount}`,
              metadata: {
                sourceType: 'projectInstallment',
                sourceId: installment._id.toString(),
                projectId: project._id.toString(),
                installmentId: installment._id.toString()
              },
              checkDuplicate: false // Already checked above
            });
            console.log(`Created missing finance transaction for installment ${installment._id.toString()} - Amount: ₹${installment.amount}`);
          }
        } catch (error) {
          console.error(`Error syncing finance transaction for installment ${installment._id?.toString() || 'unknown'}:`, error.message || error);
        }
      }
    }
  } catch (error) {
    console.error('Error syncing finance transactions for paid installments:', error);
  }
};

const calculateInstallmentTotals = (installments = []) => {
  return installments.reduce(
    (acc, installment) => {
      if (!installment) return acc;
      const amount = Number(installment.amount) || 0;
      acc.total += amount;
      if (installment.status === 'paid') {
        acc.paid += amount;
      } else {
        acc.pending += amount;
      }
      return acc;
    },
    { total: 0, paid: 0, pending: 0 }
  );
};

const recalculateProjectFinancials = async (project, totals) => {
  if (!project) return;

  if (!project.financialDetails) {
    project.financialDetails = {
      totalCost: 0,
      advanceReceived: 0,
      includeGST: false,
      remainingAmount: 0
    };
  }

  const totalCost = Number(project.financialDetails.totalCost || project.budget || 0);

  // Calculate paid installments
  const installmentTotals = totals || calculateInstallmentTotals(project.installmentPlan);
  const collectedFromInstallments = Number(installmentTotals.paid || 0);

  // Calculate approved PaymentReceipts
  const PaymentReceipt = require('../models/PaymentReceipt');
  const approvedReceipts = await PaymentReceipt.find({
    project: project._id,
    status: 'approved'
  }).select('amount');
  const totalApprovedPayments = approvedReceipts.reduce(
    (sum, receipt) => sum + Number(receipt.amount || 0),
    0
  );

  // Include admin-recorded manual recoveries from AdminFinance
  const AdminFinance = require('../models/AdminFinance');
  const manualRecoveries = await AdminFinance.aggregate([
    {
      $match: {
        recordType: 'transaction',
        transactionType: 'incoming',
        status: { $ne: 'cancelled' },
        project: project._id,
        'metadata.sourceType': 'adminManualRecovery'
      }
    },
    {
      $group: {
        _id: null,
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);
  const totalManualRecoveries = manualRecoveries[0]?.totalAmount || 0;

  // Calculate total received from all sources purely from data:
  // 1. Approved PaymentReceipts (created by sales team or admin)
  // 2. Paid installments (from installmentPlan)
  // 3. Admin manual recoveries (from AdminFinance with metadata.sourceType = 'adminManualRecovery')
  //
  // This avoids double-counting when recalculations run multiple times.

  const totalReceived =
    totalApprovedPayments + collectedFromInstallments + totalManualRecoveries;

  // Update advanceReceived and remainingAmount based on recomputed totals
  project.financialDetails.advanceReceived = totalReceived;

  // Calculate remaining amount
  const remainingRaw = totalCost - totalReceived;
  const remainingAmount = Number.isFinite(remainingRaw) ? Math.max(remainingRaw, 0) : 0;

  project.financialDetails.remainingAmount = remainingAmount;
};

const refreshInstallmentStatuses = (project) => {
  if (!project?.installmentPlan?.length) return;
  const now = new Date();
  project.installmentPlan.forEach((installment) => {
    if (!installment) return;
    const dueDate = installment.dueDate ? new Date(installment.dueDate) : null;

    if (installment.status === 'paid') {
      if (!installment.paidDate) {
        installment.paidDate = new Date();
      }
      return;
    }

    if (dueDate) {
      if (dueDate < now) {
        if (installment.status !== 'overdue') {
          installment.status = 'overdue';
          installment.updatedAt = new Date();
        }
      } else if (installment.status === 'overdue') {
        installment.status = 'pending';
        installment.updatedAt = new Date();
      } else if (installment.status !== 'pending') {
        installment.status = 'pending';
        installment.updatedAt = new Date();
      }
    }
  });
};

// @desc    Get all projects (Admin view - all projects)
// @route   GET /api/admin/projects
// @access  Admin only
const getAllProjects = asyncHandler(async (req, res, next) => {
  const { status, priority, client, pm, page = 1, limit = 20, search, hasPM } = req.query;
  
  // Build filter object
  const filter = {};
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (client) filter.client = client;
  if (pm) {
    filter.projectManager = pm;
  } else if (hasPM === 'true') {
    // Filter for projects with PM assigned (for active projects tab)
    // Only apply if pm is not already specified
    filter.projectManager = { $exists: true, $ne: null };
  }
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const projects = await Project.find(filter)
    .populate('client', 'name email phoneNumber companyName')
    .populate('projectManager', 'name email')
    .populate('assignedTeam', 'name email department position')
    .populate('submittedBy', 'name email')
    .populate('costHistory.changedBy', 'name email')
    .populate('installmentPlan.createdBy', 'name email')
    .populate('installmentPlan.updatedBy', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Project.countDocuments(filter);

  // Calculate additional project metrics
  const projectsWithMetrics = await Promise.all(
    projects.map(async (project) => {
      // Get milestone count and progress
      const milestones = await Milestone.find({ project: project._id });
      const completedMilestones = milestones.filter(m => m.status === 'completed').length;
      
      // Milestone status breakdown
      const milestoneStats = milestones.reduce((acc, m) => {
        acc[m.status] = (acc[m.status] || 0) + 1;
        return acc;
      }, {});

      // For completed projects, always set progress to 100%
      let progress;
      if (project.status === 'completed') {
        progress = 100;
      } else {
        progress = milestones.length > 0 ? 
          Math.round((completedMilestones / milestones.length) * 100) : (project.progress || 0);
      }

      // Get task count and status breakdown
      const tasks = await Task.find({ project: project._id });
      const taskCount = tasks.length;
      const taskStats = tasks.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      }, {});

      // Calculate team size from assignedTeam
      const teamSize = project.assignedTeam?.length || 0;

      // Calculate duration (from creation to completion, or current date if not completed)
      let duration = null;
      if (project.status === 'completed') {
        // For completed projects, calculate from createdAt to updatedAt (when marked as completed)
        const createdAt = new Date(project.createdAt);
        const completedAt = project.updatedAt || new Date(); // Use updatedAt as completion time
        const diffTime = completedAt - createdAt;
        duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      // Calculate days remaining
      let daysRemaining = null;
      if (project.dueDate) {
        const now = new Date();
        const dueDate = new Date(project.dueDate);
        const diffTime = dueDate - now;
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }

      // Map projectManager to pm for easier frontend access
      const projectObj = project.toObject();
      if (projectObj.projectManager && typeof projectObj.projectManager === 'object') {
        projectObj.pm = projectObj.projectManager.name || projectObj.projectManager;
      } else if (projectObj.projectManager) {
        projectObj.pm = projectObj.projectManager;
      }

      return {
        ...projectObj,
        progress,
        milestoneCount: milestones.length,
        milestoneStats,
        taskCount,
        taskStats,
        teamSize,
        duration,
        daysRemaining,
        isOverdue: daysRemaining !== null && daysRemaining < 0 && !['completed', 'cancelled'].includes(project.status)
      };
    })
  );

  res.json({
    success: true,
    count: projectsWithMetrics.length,
    total,
    data: projectsWithMetrics,
    pagination: {
      current: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      total
    }
  });
});

// @desc    Get project by ID (Admin view)
// @route   GET /api/admin/projects/:id
// @access  Admin only
const getProjectById = asyncHandler(async (req, res, next) => {
  const project = await Project.findById(req.params.id)
    .populate('client', 'name email company phoneNumber')
    .populate('projectManager', 'name email phone')
    .populate('assignedTeam', 'name email department position')
    .populate('milestones')
    .populate('costHistory.changedBy', 'name email')
    .populate('installmentPlan.createdBy', 'name email')
    .populate('installmentPlan.updatedBy', 'name email');

  if (!project) {
    return next(new ErrorResponse('Project not found', 404));
  }

  // Sync missing finance transactions for paid installments
  // This ensures all paid installments show up in Finance Management
  try {
    let adminId = null;
    if (req.admin && req.admin.id) {
      adminId = req.admin.id;
    } else if (req.user && req.user.role === 'admin') {
      adminId = req.user.id;
    }
    await syncFinanceTransactionsForPaidInstallments(project, adminId);
  } catch (error) {
    // Log error but don't fail the request
    console.error('Error syncing finance transactions in getProjectById:', error);
  }

  res.json({
    success: true,
    data: project
  });
});

// @desc    Get project milestones with task counts (Admin view)
// @route   GET /api/admin/projects/:id/milestones
// @access  Admin only
const getProjectMilestones = asyncHandler(async (req, res, next) => {
  const project = await Project.findById(req.params.id);
  if (!project) {
    return next(new ErrorResponse('Project not found', 404));
  }

  const milestones = await Milestone.find({ project: project._id })
    .sort({ sequence: 1 })
    .select('title description sequence dueDate status priority progress');

  const milestonesWithTaskCount = await Promise.all(
    milestones.map(async (m) => {
      const taskCount = await Task.countDocuments({ milestone: m._id });
      const mObj = m.toObject();
      mObj.taskCount = taskCount;
      return mObj;
    })
  );

  res.json({
    success: true,
    data: milestonesWithTaskCount
  });
});

// @desc    Get milestone tasks (Admin view)
// @route   GET /api/admin/projects/:id/milestones/:milestoneId/tasks
// @access  Admin only
const getMilestoneTasks = asyncHandler(async (req, res, next) => {
  const { id: projectId, milestoneId } = req.params;

  const milestone = await Milestone.findOne({
    _id: milestoneId,
    project: projectId
  })
    .populate('tasks', 'title status priority dueDate assignedTo')
    .lean();

  if (!milestone) {
    return next(new ErrorResponse('Milestone not found', 404));
  }

  const tasks = await Task.find({ milestone: milestoneId })
    .populate('assignedTo', 'name email position')
    .sort({ createdAt: 1 })
    .lean();

  res.json({
    success: true,
    data: tasks
  });
});

// @desc    Create project (Admin can create for any PM)
// @route   POST /api/admin/projects
// @access  Admin only
const createProject = asyncHandler(async (req, res, next) => {
  const project = await Project.create(req.body);

  const populatedProject = await populateProjectForAdmin(project._id);

  // Emit WebSocket event
  socketService.emitToProject(project._id, 'project_created', {
    project: populatedProject,
    createdBy: req.user.name
  });

  res.status(201).json({
    success: true,
    data: populatedProject
  });
});

// @desc    Record manual recovery payment for a project (Admin)
// @route   POST /api/admin/projects/:id/recoveries
// @access  Admin only
const addProjectRecovery = asyncHandler(async (req, res, next) => {
  const adminId = req.user?.id;

  if (!adminId) {
    return next(new ErrorResponse('Admin authentication required', 401));
  }

  const { amount, accountId, paymentMethod = 'bank_transfer', paymentDate, referenceId, notes } = req.body;

  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return next(new ErrorResponse('Please provide a valid recovery amount greater than 0', 400));
  }

  if (!accountId) {
    return next(new ErrorResponse('Please select an account for the recovery amount', 400));
  }

  if (!paymentDate) {
    return next(new ErrorResponse('Payment date is required', 400));
  }

  const parsedDate = new Date(paymentDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return next(new ErrorResponse('Invalid payment date', 400));
  }

  // Disallow future dates (allow same-day and any past date)
  const today = new Date();
  const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
  if (parsedDate > endOfToday) {
    return next(new ErrorResponse('Payment date cannot be in the future', 400));
  }

  const [project, account] = await Promise.all([
    Project.findById(req.params.id),
    Account.findById(accountId)
  ]);

  if (!project) {
    return next(new ErrorResponse('Project not found', 404));
  }

  if (!account) {
    return next(new ErrorResponse('Account not found', 404));
  }

  const clientId = project.client;
  if (!clientId) {
    return next(new ErrorResponse('Project is not linked to a client', 400));
  }

  const financeMethod = mapPaymentMethodToFinance(paymentMethod);

  // Create finance transaction representing this manual recovery
  const financeTransaction = await createIncomingTransaction({
    amount: numericAmount,
    category: 'Project Recovery',
    transactionDate: parsedDate,
    createdBy: adminId,
    client: clientId,
    project: project._id,
    account: account._id,
    paymentMethod: financeMethod,
    description: `Manual recovery for project "${project.name || 'Project'}" - ₹${numericAmount}`,
    metadata: {
      sourceType: 'adminManualRecovery',
      sourceId: project._id.toString(),
      projectId: project._id.toString(),
      clientId: clientId.toString(),
      referenceId: referenceId || null,
      notes: notes || null
    },
    checkDuplicate: false
  });

  // Recalculate project financials so manual recoveries are included consistently
  await recalculateProjectFinancials(project);
  await project.save();

  const populatedProject = await populateProjectForAdmin(project._id);

  res.status(201).json({
    success: true,
    data: {
      project: populatedProject,
      recovery: {
        amount: numericAmount,
        account: {
          id: account._id,
          name: account.name,
          bankName: account.bankName,
          accountNumber: account.accountNumber,
          ifsc: account.ifsc,
          upiId: account.upiId
        },
        paymentMethod: financeMethod,
        paymentDate: parsedDate,
        referenceId: referenceId || null,
        notes: notes || null,
        financeTransactionId: financeTransaction._id
      }
    },
    message: 'Recovery payment recorded successfully'
  });
});

// @desc    Update project (Admin can update any project)
// @route   PUT /api/admin/projects/:id
// @access  Admin only
const updateProject = asyncHandler(async (req, res, next) => {
  const project = await Project.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!project) {
    return next(new ErrorResponse('Project not found', 404));
  }

  const populatedProject = await populateProjectForAdmin(project._id);

  // Emit WebSocket event
  socketService.emitToProject(project._id, 'project_updated', {
    project: populatedProject,
    updatedBy: req.user.name
  });

  res.json({
    success: true,
    data: populatedProject
  });
});

// @desc    Delete project (Admin can delete any project)
// @route   DELETE /api/admin/projects/:id
// @access  Admin only
const deleteProject = asyncHandler(async (req, res, next) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return next(new ErrorResponse('Project not found', 404));
  }

  // Delete related milestones and tasks
  await Milestone.deleteMany({ project: project._id });
  await Task.deleteMany({ project: project._id });

  await Project.findByIdAndDelete(req.params.id);

  // Emit WebSocket event
  socketService.emitToProject(project._id, 'project_deleted', {
    projectId: project._id,
    projectName: project.name,
    deletedBy: req.user.name
  });

  res.json({
    success: true,
    message: 'Project deleted successfully'
  });
});

// @desc    Get project statistics (Admin view - all projects)
// @route   GET /api/admin/projects/statistics
// @access  Admin only
const getProjectStatistics = asyncHandler(async (req, res, next) => {
  const stats = await Project.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalBudget: { $sum: '$budget' },
        totalEstimatedHours: { $sum: '$estimatedHours' },
        totalActualHours: { $sum: '$actualHours' }
      }
    }
  ]);

  const priorityStats = await Project.aggregate([
    {
      $group: {
        _id: '$priority',
        count: { $sum: 1 }
      }
    }
  ]);

  const totalProjects = await Project.countDocuments();
  const overdueProjects = await Project.countDocuments({
    dueDate: { $lt: new Date() },
    status: { $not: { $in: ['completed', 'cancelled'] } }
  });

  res.json({
    success: true,
    data: {
      totalProjects,
      overdueProjects,
      statusBreakdown: stats,
      priorityBreakdown: priorityStats
    }
  });
});

// @desc    Get comprehensive project management statistics
// @route   GET /api/admin/projects/management-statistics
// @access  Admin only
const getProjectManagementStatistics = asyncHandler(async (req, res, next) => {
  const currentDate = new Date();
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const startOfLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
  const endOfLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);

  try {
    // Projects Statistics with aggregation for better performance
    const projectStats = await Project.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          onHold: { $sum: { $cond: [{ $eq: ['$status', 'on-hold'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending-assignment'] }, 1, 0] } },
          thisMonth: { 
            $sum: { 
              $cond: [
                { $gte: ['$createdAt', startOfMonth] }, 
                1, 
                0
              ] 
            } 
          },
          overdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $lt: ['$dueDate', currentDate] },
                    { $not: { $in: ['$status', ['completed', 'cancelled']] } }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // Milestones Statistics
    const milestoneStats = await Milestone.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          overdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $lt: ['$dueDate', currentDate] },
                    { $not: { $in: ['$status', ['completed', 'cancelled']] } }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // Tasks Statistics
    const taskStats = await Task.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          overdue: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $lt: ['$dueDate', currentDate] },
                    { $not: { $in: ['$status', ['completed', 'cancelled']] } }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // Employees Statistics
    const employeeStats = await Employee.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
          onLeave: { $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] } },
          newThisMonth: {
            $sum: {
              $cond: [
                { $gte: ['$joiningDate', startOfMonth] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // Clients Statistics
    const clientStats = await Client.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
          inactive: { $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] } },
          newThisMonth: {
            $sum: {
              $cond: [
                { $gte: ['$joiningDate', startOfMonth] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // PMs Statistics
    const pmStats = await PM.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
          onLeave: { $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] } }
        }
      }
    ]);

    // Calculate average projects per PM
    const avgProjects = pmStats[0]?.total > 0 ? 
      (projectStats[0]?.total / pmStats[0].total).toFixed(1) : 0;

    const statistics = {
      projects: {
        total: projectStats[0]?.total || 0,
        active: projectStats[0]?.active || 0,
        completed: projectStats[0]?.completed || 0,
        onHold: projectStats[0]?.onHold || 0,
        overdue: projectStats[0]?.overdue || 0,
        thisMonth: projectStats[0]?.thisMonth || 0,
        pending: projectStats[0]?.pending || 0
      },
      milestones: {
        total: milestoneStats[0]?.total || 0,
        completed: milestoneStats[0]?.completed || 0,
        inProgress: milestoneStats[0]?.inProgress || 0,
        pending: milestoneStats[0]?.pending || 0,
        overdue: milestoneStats[0]?.overdue || 0
      },
      tasks: {
        total: taskStats[0]?.total || 0,
        completed: taskStats[0]?.completed || 0,
        inProgress: taskStats[0]?.inProgress || 0,
        pending: taskStats[0]?.pending || 0,
        overdue: taskStats[0]?.overdue || 0
      },
      employees: {
        total: employeeStats[0]?.total || 0,
        active: employeeStats[0]?.active || 0,
        onLeave: employeeStats[0]?.onLeave || 0,
        newThisMonth: employeeStats[0]?.newThisMonth || 0
      },
      clients: {
        total: clientStats[0]?.total || 0,
        active: clientStats[0]?.active || 0,
        inactive: clientStats[0]?.inactive || 0,
        newThisMonth: clientStats[0]?.newThisMonth || 0
      },
      projectManagers: {
        total: pmStats[0]?.total || 0,
        active: pmStats[0]?.active || 0,
        onLeave: pmStats[0]?.onLeave || 0,
        avgProjects: parseFloat(avgProjects)
      }
    };

    res.json({
      success: true,
      data: statistics
    });

  } catch (error) {
    console.error('Error fetching statistics:', error);
    return next(new ErrorResponse('Failed to fetch statistics', 500));
  }
});

// @desc    Get pending projects (from sales team)
// @route   GET /api/admin/projects/pending
// @access  Admin only
const getPendingProjects = asyncHandler(async (req, res, next) => {
  const { priority, search, page = 1, limit = 20 } = req.query;
  
  // Build filter object
  const filter = { 
    status: 'pending-assignment',
    submittedBy: { $exists: true, $ne: null } // Only show projects submitted by sales
  };
  
  if (priority && priority !== 'all') {
    filter.priority = priority;
  }
  
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { 'client.name': { $regex: search, $options: 'i' } },
      { 'client.companyName': { $regex: search, $options: 'i' } }
    ];
  }

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const projects = await Project.find(filter)
    .populate('client', 'name email phoneNumber companyName')
    .populate('submittedBy', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Project.countDocuments(filter);

  res.json({
    success: true,
    count: projects.length,
    total,
    data: projects,
    pagination: {
      current: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      total
    }
  });
});

// @desc    Assign PM to pending project
// @route   POST /api/admin/projects/pending/:id/assign-pm
// @access  Admin only
const assignPMToPendingProject = asyncHandler(async (req, res, next) => {
  const { pmId } = req.body;
  const projectId = req.params.id;

  if (!pmId) {
    return next(new ErrorResponse('PM ID is required', 400));
  }

  // Find the project
  const project = await Project.findById(projectId);
  if (!project) {
    return next(new ErrorResponse('Project not found', 404));
  }

  if (project.status !== 'pending-assignment') {
    return next(new ErrorResponse('Project is not in pending assignment status', 400));
  }

  // Find the PM
  const pm = await PM.findById(pmId);
  if (!pm) {
    return next(new ErrorResponse('Project Manager not found', 404));
  }

  if (!pm.isActive) {
    return next(new ErrorResponse('Project Manager is not active', 400));
  }

  // Update project
  project.projectManager = pmId;
  project.status = 'untouched';
  project.meetingStatus = 'pending';
  
  // Set a default dueDate if not already set (required for non-pending-assignment status)
  if (!project.dueDate) {
    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 30); // 30 days from now
    project.dueDate = defaultDueDate;
  }
  
  await project.save();

  // Update PM's projectsManaged array
  if (!pm.projectsManaged.includes(projectId)) {
    pm.projectsManaged.push(projectId);
    await pm.save();
  }

  // Populate the updated project
  const populatedProject = await Project.findById(projectId)
    .populate('client', 'name email phoneNumber companyName')
    .populate('projectManager', 'name email')
    .populate('submittedBy', 'name email');

  // Emit WebSocket event to PM
  socketService.emitToUser(pmId, 'project_assigned', {
    project: populatedProject,
    message: `New project "${project.name}" has been assigned to you`,
    assignedBy: req.user.name
  });

  res.json({
    success: true,
    data: populatedProject,
    message: 'Project assigned to PM successfully'
  });
});

// @desc    Get PMs for assignment dropdown
// @route   GET /api/admin/projects/pms-for-assignment
// @access  Admin only
const getPMsForAssignment = asyncHandler(async (req, res, next) => {
  try {
    const pms = await PM.find({ isActive: true })
      .select('name email projectsManaged')
      .populate('projectsManaged', 'name status dueDate');

    const now = new Date();
    
    const pmOptions = pms.map(pm => {
      // Filter projects by status
      const activeProjectsList = pm.projectsManaged.filter(p => 
        ['untouched', 'started', 'active', 'on-hold', 'testing'].includes(p.status)
      );
      const activeProjects = activeProjectsList.length;
      
      const completedProjects = pm.projectsManaged.filter(p => 
        p.status === 'completed'
      );
      
      const totalProjects = pm.projectsManaged.length;
      
      // Calculate completion rate
      const completionRate = totalProjects > 0 ? 
        Math.round((completedProjects.length / totalProjects) * 100) : 0;
      
      // Calculate overdue projects (not completed/cancelled and past due date)
      const overdueProjects = activeProjectsList.filter(p => {
        if (!p.dueDate) return false; // No due date means not overdue
        const dueDate = new Date(p.dueDate);
        return dueDate < now && !['completed', 'cancelled'].includes(p.status);
      }).length;
      
      // Calculate performance based on completion rate and overdue projects
      let performance = 0;
      
      if (totalProjects > 0) {
        performance = completionRate;
        
        // Penalty for overdue projects: -5% per overdue project, max -30%
        const overduePenalty = Math.min(30, overdueProjects * 5);
        performance -= overduePenalty;
        
        // Bonus for zero overdue projects: +10%
        if (overdueProjects === 0) {
          performance += 10;
        }
      }
      
      // Ensure performance is between 0 and 100
      performance = Math.min(100, Math.max(0, Math.round(performance)));

      return {
        value: pm._id.toString(),
        label: `${pm.name} - ${activeProjects} active projects - ${performance}% performance`,
        icon: 'FiUser',
        data: {
          id: pm._id,
          name: pm.name,
          email: pm.email,
          projects: activeProjects,
          performance: performance
        }
      };
    });

    res.json({
      success: true,
      data: pmOptions
    });

  } catch (error) {
    console.error('Error fetching PMs for assignment:', error);
    return next(new ErrorResponse('Failed to fetch PMs for assignment', 500));
  }
});

// @desc    Update project cost with history tracking
// @route   PUT /api/admin/projects/:id/cost
// @access  Admin only
const updateProjectCost = asyncHandler(async (req, res, next) => {
  const { newCost, reason } = req.body;
  const projectId = req.params.id;

  if (!newCost || newCost < 0) {
    return next(new ErrorResponse('Valid cost amount is required', 400));
  }

  if (!reason || reason.trim().length === 0) {
    return next(new ErrorResponse('Reason for cost change is required', 400));
  }

  // Find the project
  const project = await Project.findById(projectId);
  if (!project) {
    return next(new ErrorResponse('Project not found', 404));
  }

  // Get current cost (from financialDetails.totalCost or budget)
  const currentCost = project.financialDetails?.totalCost || project.budget || 0;
  const newCostValue = Number(newCost);

  // If cost hasn't changed, return success without creating history
  if (currentCost === newCostValue) {
    const totals = calculateInstallmentTotals(project.installmentPlan);
    if (totals.total > newCostValue) {
      return next(
        new ErrorResponse(
          `Current installments total ${totals.total.toFixed(
            2
          )}, which exceeds the new cost. Adjust installments before lowering cost.`,
          400
        )
      );
    }

    const populatedProject = await populateProjectForAdmin(projectId);
    return res.json({
      success: true,
      data: populatedProject,
      message: 'Cost unchanged'
    });
  }

  // Add cost change to history
  const costHistoryEntry = {
    previousCost: currentCost,
    newCost: newCostValue,
    reason: reason.trim(),
    changedBy: req.user.id,
    changedByModel: 'Admin',
    changedAt: new Date()
  };

  // Initialize costHistory array if it doesn't exist
  if (!project.costHistory) {
    project.costHistory = [];
  }

  // Add history entry
  project.costHistory.push(costHistoryEntry);

  // Update project cost
  if (!project.financialDetails) {
    project.financialDetails = {
      totalCost: newCostValue,
      advanceReceived: 0,
      includeGST: false,
      remainingAmount: newCostValue
    };
  } else {
    const advanceReceived = project.financialDetails.advanceReceived || 0;
    project.financialDetails.totalCost = newCostValue;
    project.financialDetails.remainingAmount = newCostValue - advanceReceived;
  }

  const installmentTotals = calculateInstallmentTotals(project.installmentPlan);
  if (installmentTotals.total > newCostValue) {
    return next(
      new ErrorResponse(
        `Installment total ${installmentTotals.total.toFixed(
          2
        )} exceeds the new project cost ${newCostValue.toFixed(
          2
        )}. Adjust installments before saving.`,
        400
      )
    );
  }

  // Update budget to match total cost
  project.budget = newCostValue;

  await recalculateProjectFinancials(project, installmentTotals);
  await project.save();

  // Populate the updated project
  const populatedProject = await populateProjectForAdmin(projectId);

  // Emit WebSocket event
  socketService.emitToProject(projectId, 'project_cost_updated', {
    project: populatedProject,
    costChange: costHistoryEntry,
    updatedBy: req.user.name
  });

  res.json({
    success: true,
    data: populatedProject,
    message: 'Project cost updated successfully',
    costHistory: costHistoryEntry
  });
});

// @desc    Add installments to a project
// @route   POST /api/admin/projects/:id/installments
// @access  Admin only
const addProjectInstallments = asyncHandler(async (req, res, next) => {
  const { installments } = req.body;
  const projectId = req.params.id;

  if (!Array.isArray(installments) || installments.length === 0) {
    return next(new ErrorResponse('Provide at least one installment to add', 400));
  }

  const project = await Project.findById(projectId);
  if (!project) {
    return next(new ErrorResponse('Project not found', 404));
  }

  if (!project.installmentPlan) {
    project.installmentPlan = [];
  }

  const adminId = req.user?.id || null;
  const newInstallments = [];
  for (let i = 0; i < installments.length; i += 1) {
    const installment = installments[i];
    const amount = Number(installment.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return next(new ErrorResponse(`Installment #${i + 1} must have a valid amount greater than 0`, 400));
    }

    const dueDate = installment.dueDate ? new Date(installment.dueDate) : null;
    if (!dueDate || Number.isNaN(dueDate.getTime())) {
      return next(new ErrorResponse(`Installment #${i + 1} must have a valid due date`, 400));
    }

    const notes = installment.notes ? String(installment.notes).trim() : undefined;
    const account = installment.account ? String(installment.account).trim() : undefined;
    const status = installment.status && ['pending', 'paid', 'overdue'].includes(installment.status) 
      ? installment.status 
      : 'pending';

    const installmentData = {
      amount,
      dueDate,
      status: status, // ✅ Use provided status (paid for manual, pending for regular)
      notes,
      createdBy: adminId,
      updatedBy: adminId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    if (account) {
      installmentData.account = account;
    }

    // If status is 'paid', set paidDate to current date
    if (status === 'paid') {
      installmentData.paidDate = new Date();
    }

    newInstallments.push(installmentData);
  }

  const existingTotals = calculateInstallmentTotals(project.installmentPlan);
  const newTotalAmount = newInstallments.reduce(
    (sum, inst) => sum + (Number(inst.amount) || 0),
    0
  );

  const totalsAfterAmount = existingTotals.total + newTotalAmount;
  const totalCost = project.financialDetails?.totalCost || 0;
  if (totalCost <= 0) {
    return next(
      new ErrorResponse(
        'Define a total project cost before adding installments.',
        400
      )
    );
  }
  if (totalCost > 0 && totalsAfterAmount > totalCost + 0.0001) {
    return next(
      new ErrorResponse(
        `Installment total ${totalsAfterAmount.toFixed(
          2
        )} exceeds project total cost ${totalCost.toFixed(2)}.`,
        400
      )
    );
  }

  // Store count of existing installments before adding new ones
  const existingInstallmentCount = project.installmentPlan.length;

  newInstallments.forEach((inst) => project.installmentPlan.push(inst));

  project.markModified('installmentPlan');
  refreshInstallmentStatuses(project);
  const totalsAfterAdd = calculateInstallmentTotals(project.installmentPlan);
  await recalculateProjectFinancials(project, totalsAfterAdd);
  await project.save();

  // Reload project to get MongoDB-generated IDs for newly added installments
  const savedProject = await Project.findById(projectId);
  if (!savedProject) {
    return next(new ErrorResponse('Project not found after save', 404));
  }

  // Create finance transactions for installments added with status 'paid' (manual installments)
  // This ensures they show up in Finance Management
  try {
    // Get Admin ID for createdBy
    let adminIdForTransaction = null;
    if (req.admin && req.admin.id) {
      adminIdForTransaction = req.admin.id;
    } else if (req.user && req.user.role === 'admin') {
      adminIdForTransaction = req.user.id;
    } else {
      // Find first active admin as fallback
      const admin = await Admin.findOne({ isActive: true }).select('_id');
      adminIdForTransaction = admin ? admin._id : null;
    }

    if (adminIdForTransaction && savedProject.installmentPlan) {
      // Get the newly added installments (those after the existing count)
      const newlyAddedInstallments = savedProject.installmentPlan.slice(existingInstallmentCount);

      // Create finance transactions for installments with status 'paid'
      // This ensures all paid installments show up in Finance Management
      for (let i = 0; i < newlyAddedInstallments.length; i += 1) {
        const installment = newlyAddedInstallments[i];
        if (installment.status === 'paid' && installment._id) {
          try {
            // Ensure we have valid installment data
            if (!installment.amount || installment.amount <= 0) {
              console.warn(`Skipping transaction creation for installment ${installment._id.toString()} - invalid amount`);
              continue;
            }

            const transactionResult = await createIncomingTransaction({
              amount: installment.amount,
              category: 'Project Installment Payment',
              transactionDate: installment.paidDate || installment.dueDate || new Date(),
              createdBy: adminIdForTransaction,
              client: savedProject.client,
              project: savedProject._id,
              account: installment.account || undefined,
              description: `Installment payment for project "${savedProject.name}" - ₹${installment.amount}`,
              metadata: {
                sourceType: 'projectInstallment',
                sourceId: installment._id.toString(),
                projectId: savedProject._id.toString(),
                installmentId: installment._id.toString()
              },
              checkDuplicate: true
            });
            
            // Verify transaction was created or already exists
            if (transactionResult && transactionResult._id) {
              console.log(`Finance transaction created/verified for installment ${installment._id.toString()} - Amount: ₹${installment.amount}`);
            } else {
              console.warn(`Transaction creation returned unexpected result for installment ${installment._id.toString()}`);
            }
          } catch (error) {
            // Log detailed error but don't fail the installment addition
            console.error(`Error creating finance transaction for manual installment ${installment._id?.toString() || 'unknown'}:`, {
              error: error.message || error,
              installmentId: installment._id?.toString(),
              amount: installment.amount,
              projectId: savedProject._id?.toString()
            });
          }
        }
      }
    }
  } catch (error) {
    // Log error but don't fail the installment addition
    console.error('Error creating finance transactions for manual installments:', error);
  }

  // Sync finance transactions to ensure all paid installments have transactions
  // This ensures all paid installments show up in Finance Management
  try {
    let adminIdForSync = null;
    if (req.admin && req.admin.id) {
      adminIdForSync = req.admin.id;
    } else if (req.user && req.user.role === 'admin') {
      adminIdForSync = req.user.id;
    }
    await syncFinanceTransactionsForPaidInstallments(savedProject, adminIdForSync);
  } catch (error) {
    // Log error but don't fail the installment addition
    console.error('Error syncing finance transactions after adding installments:', error);
  }

  const populatedProject = await populateProjectForAdmin(project._id);

  res.status(201).json({
    success: true,
    data: populatedProject,
    message: 'Installments added successfully'
  });
});

// @desc    Update a specific installment
// @route   PUT /api/admin/projects/:id/installments/:installmentId
// @access  Admin only
const updateProjectInstallment = asyncHandler(async (req, res, next) => {
  const { id: projectId, installmentId } = req.params;
  const { amount, dueDate, notes, status, paidDate } = req.body;

  const project = await Project.findById(projectId);
  if (!project) {
    return next(new ErrorResponse('Project not found', 404));
  }

  const installment = project.installmentPlan?.id(installmentId);
  if (!installment) {
    return next(new ErrorResponse('Installment not found', 404));
  }

  const originalInstallment = {
    amount: installment.amount,
    dueDate: installment.dueDate,
    notes: installment.notes,
    status: installment.status,
    paidDate: installment.paidDate
  };

  if (amount !== undefined) {
    const amountValue = Number(amount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      return next(new ErrorResponse('Installment amount must be greater than 0', 400));
    }
    installment.amount = amountValue;
  }

  if (dueDate !== undefined) {
    const dueDateValue = dueDate ? new Date(dueDate) : null;
    if (!dueDateValue || Number.isNaN(dueDateValue.getTime())) {
      return next(new ErrorResponse('Provide a valid due date', 400));
    }
    installment.dueDate = dueDateValue;
  }

  if (notes !== undefined) {
    installment.notes = notes ? String(notes).trim() : undefined;
  }

  if (status !== undefined) {
    const allowedStatuses = ['pending', 'paid', 'overdue'];
    if (!allowedStatuses.includes(status)) {
      return next(new ErrorResponse('Invalid installment status', 400));
    }
    
    const previousStatus = installment.status;
    installment.status = status;
    
    if (status === 'paid') {
      const paidDateValue = paidDate ? new Date(paidDate) : new Date();
      installment.paidDate = Number.isNaN(paidDateValue.getTime()) ? new Date() : paidDateValue;
      
      // Create incoming transaction when installment is marked as paid
      // Only create transaction if status changed from non-paid to paid
      if (previousStatus !== 'paid') {
        try {
          // Get Admin ID for createdBy
          let adminId = null;
          if (req.admin && req.admin.id) {
            adminId = req.admin.id;
          } else if (req.user && req.user.role === 'admin') {
            adminId = req.user.id;
          } else {
            // Find first active admin as fallback
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
          // Log error but don't fail the installment update
          console.error('Error creating finance transaction for installment:', error);
        }
      }
    } else {
      installment.paidDate = null;
    }
  }

  const totalsAfterUpdate = calculateInstallmentTotals(project.installmentPlan);
  const totalCost = project.financialDetails?.totalCost || 0;
  if (totalCost <= 0) {
    installment.amount = originalInstallment.amount;
    installment.dueDate = originalInstallment.dueDate;
    installment.notes = originalInstallment.notes;
    installment.status = originalInstallment.status;
    installment.paidDate = originalInstallment.paidDate;
    return next(
      new ErrorResponse(
        'Define a total project cost before managing installments.',
        400
      )
    );
  }
  if (totalsAfterUpdate.total > totalCost + 0.0001) {
    installment.amount = originalInstallment.amount;
    installment.dueDate = originalInstallment.dueDate;
    installment.notes = originalInstallment.notes;
    installment.status = originalInstallment.status;
    installment.paidDate = originalInstallment.paidDate;
    return next(
      new ErrorResponse(
        `Installment total ${totalsAfterUpdate.total.toFixed(
          2
        )} exceeds project total cost ${totalCost.toFixed(2)}.`,
        400
      )
    );
  }

  installment.updatedAt = new Date();
  installment.updatedBy = req.user?.id || installment.updatedBy;

  project.markModified('installmentPlan');
  refreshInstallmentStatuses(project);
  const totalsPostUpdate = calculateInstallmentTotals(project.installmentPlan);
  await recalculateProjectFinancials(project, totalsPostUpdate);
  await project.save();

  const populatedProject = await populateProjectForAdmin(project._id);

  res.json({
    success: true,
    data: populatedProject,
    message: 'Installment updated successfully'
  });
});

// @desc    Delete a specific installment
// @route   DELETE /api/admin/projects/:id/installments/:installmentId
// @access  Admin only
const deleteProjectInstallment = asyncHandler(async (req, res, next) => {
  const { id: projectId, installmentId } = req.params;

  const project = await Project.findById(projectId);
  if (!project) {
    return next(new ErrorResponse('Project not found', 404));
  }

  const installment = project.installmentPlan?.id(installmentId);
  if (!installment) {
    return next(new ErrorResponse('Installment not found', 404));
  }

  project.installmentPlan.pull({ _id: installmentId });

  project.markModified('installmentPlan');
  refreshInstallmentStatuses(project);
  const totalsAfterDelete = calculateInstallmentTotals(project.installmentPlan);
  await recalculateProjectFinancials(project, totalsAfterDelete);
  await project.save();

  const populatedProject = await populateProjectForAdmin(project._id);

  res.json({
    success: true,
    data: populatedProject,
    message: 'Installment removed successfully'
  });
});

module.exports = {
  getAllProjects,
  getProjectById,
  getProjectMilestones,
  getMilestoneTasks,
  createProject,
  updateProject,
  updateProjectCost,
  addProjectInstallments,
  updateProjectInstallment,
  deleteProjectInstallment,
  deleteProject,
  getProjectStatistics,
  getProjectManagementStatistics,
  getPendingProjects,
  assignPMToPendingProject,
  getPMsForAssignment,
  addProjectRecovery
};
