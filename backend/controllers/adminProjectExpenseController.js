const Project = require('../models/Project');
const AdminFinance = require('../models/AdminFinance');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { recalculateProjectFinancials } = require('../utils/projectFinancialHelper');
const {
  createIncomingTransaction,
  findExistingTransaction,
  cancelTransactionForSource,
  FINANCE_SOURCE_TYPES
} = require('../utils/financeTransactionHelper');

// Note: The 'vendor' field in project expenses stores the client name, not a vendor/provider name.
// This field is auto-populated from the project's client information if not provided.

// @desc    Get all project expenses across all projects
// @route   GET /api/admin/project-expenses
// @access  Admin only
const getAllProjectExpenses = asyncHandler(async (req, res, next) => {
  const {
    projectId,
    category,
    startDate,
    endDate,
    page = 1,
    limit = 20,
    search
  } = req.query;

  // Build filter for projects
  const projectFilter = {};
  if (projectId) {
    projectFilter._id = projectId;
  }

  // Build expense filter
  const expenseFilter = {};
  if (category) {
    expenseFilter['expenses.category'] = category;
  }
  if (startDate || endDate) {
    expenseFilter['expenses.expenseDate'] = {};
    if (startDate) expenseFilter['expenses.expenseDate'].$gte = new Date(startDate);
    if (endDate) expenseFilter['expenses.expenseDate'].$lte = new Date(endDate);
  }
  if (search) {
    expenseFilter.$or = [
      { 'expenses.category': { $regex: search, $options: 'i' } },
      { 'expenses.description': { $regex: search, $options: 'i' } },
      { 'expenses.vendor': { $regex: search, $options: 'i' } }, // vendor field stores client name
      { 'name': { $regex: search, $options: 'i' } }, // Search by project name
      { 'client.name': { $regex: search, $options: 'i' } },
      { 'client.companyName': { $regex: search, $options: 'i' } }
    ];
  }

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  try {
    // First, get all projects that match the filter
    const projects = await Project.find(projectFilter)
      .populate('client', 'name companyName email')
      .populate('projectManager', 'name email')
      .select('name client projectManager expenses expenseConfig.included');

    // Flatten expenses with project information
    let allExpenses = [];
    projects.forEach(project => {
      if (project.expenses && project.expenses.length > 0) {
        project.expenses.forEach(expense => {
          // Apply filters
          let includeExpense = true;
          
          if (category && expense.category !== category) {
            includeExpense = false;
          }
          
          if (startDate && new Date(expense.expenseDate) < new Date(startDate)) {
            includeExpense = false;
          }
          
          if (endDate && new Date(expense.expenseDate) > new Date(endDate)) {
            includeExpense = false;
          }
          
          if (search) {
            const searchLower = search.toLowerCase();
            const projectClientName = project.client 
              ? (typeof project.client === 'object' 
                  ? (project.client.companyName || project.client.name || '').toLowerCase()
                  : '')
              : '';
            const projectName = (project.name || '').toLowerCase();
            const matchesSearch = 
              expense.category?.toLowerCase().includes(searchLower) ||
              expense.description?.toLowerCase().includes(searchLower) ||
              expense.vendor?.toLowerCase().includes(searchLower) || // vendor field stores client name
              projectName.includes(searchLower) ||
              projectClientName.includes(searchLower);
            if (!matchesSearch) {
              includeExpense = false;
            }
          }
          
          if (includeExpense) {
            // Ensure project name is included
            const projectName = project.name || project._id?.toString() || 'Unknown Project';
            const expensesIncluded = project.expenseConfig && project.expenseConfig.included === true;
            allExpenses.push({
              _id: expense._id,
              name: expense.name,
              category: expense.category,
              amount: expense.amount,
              paidBy: expense.paidBy,
              vendor: expense.vendor,
              paymentMethod: expense.paymentMethod,
              expenseDate: expense.expenseDate,
              description: expense.description,
              createdBy: expense.createdBy,
              updatedBy: expense.updatedBy,
              createdAt: expense.createdAt,
              updatedAt: expense.updatedAt,
              project: {
                _id: project._id,
                name: projectName,
                client: project.client,
                projectManager: project.projectManager
              },
              projectName: projectName, // Also include as direct field for easier access
              expensesIncluded // true = included project, false = excluded/not specified
            });
          }
        });
      }
    });

    // Sort by createdAt descending (newest first), then expenseDate
    allExpenses.sort((a, b) => {
      const byCreated = new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      if (byCreated !== 0) return byCreated;
      return new Date(b.expenseDate || 0) - new Date(a.expenseDate || 0);
    });

    // Apply pagination
    const total = allExpenses.length;
    const paginatedExpenses = allExpenses.slice(skip, skip + parseInt(limit));

    // Populate createdBy and updatedBy
    const Admin = require('../models/Admin');
    const populatedExpenses = await Promise.all(
      paginatedExpenses.map(async (expense) => {
        const populated = { ...expense };
        if (expense.createdBy) {
          const creator = await Admin.findById(expense.createdBy).select('name email');
          populated.createdBy = creator;
        }
        if (expense.updatedBy) {
          const updater = await Admin.findById(expense.updatedBy).select('name email');
          populated.updatedBy = updater;
        }
        return populated;
      })
    );

    res.status(200).json({
      success: true,
      count: populatedExpenses.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: populatedExpenses
    });
  } catch (error) {
    console.error('Error in getAllProjectExpenses:', error);
    return next(new ErrorResponse(error.message || 'Failed to fetch project expenses', 500));
  }
});

// @desc    Get expenses for a specific project
// @route   GET /api/admin/project-expenses/project/:projectId
// @access  Admin only
const getProjectExpenses = asyncHandler(async (req, res, next) => {
  const { projectId } = req.params;
  const {
    category,
    startDate,
    endDate,
    page = 1,
    limit = 20,
    search
  } = req.query;

  const project = await Project.findById(projectId)
    .populate('client', 'name companyName email')
    .populate('projectManager', 'name email')
    .populate('expenses.createdBy', 'name email')
    .populate('expenses.updatedBy', 'name email');

  if (!project) {
    return next(new ErrorResponse('Project not found', 404));
  }

  // Filter expenses
  let expenses = project.expenses || [];
  
  if (category) {
    expenses = expenses.filter(e => e.category === category);
  }
  
  if (startDate) {
    expenses = expenses.filter(e => new Date(e.expenseDate) >= new Date(startDate));
  }
  
  if (endDate) {
    expenses = expenses.filter(e => new Date(e.expenseDate) <= new Date(endDate));
  }
  
  if (search) {
    const searchLower = search.toLowerCase();
    const clientName = project.client 
      ? (typeof project.client === 'object' 
          ? (project.client.companyName || project.client.name || '').toLowerCase()
          : '')
      : '';
    const projectName = (project.name || '').toLowerCase();
    expenses = expenses.filter(e => 
      e.category?.toLowerCase().includes(searchLower) ||
      e.description?.toLowerCase().includes(searchLower) ||
      e.vendor?.toLowerCase().includes(searchLower) || // vendor field stores client name
      projectName.includes(searchLower) ||
      clientName.includes(searchLower)
    );
  }

  // Sort by createdAt descending (newest first), then expenseDate
  expenses.sort((a, b) => {
    const byCreated = new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    if (byCreated !== 0) return byCreated;
    return new Date(b.expenseDate || 0) - new Date(a.expenseDate || 0);
  });

  // Apply pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = expenses.length;
  const paginatedExpenses = expenses.slice(skip, skip + parseInt(limit));

  // Add project info to each expense
  const expensesWithProject = paginatedExpenses.map(expense => ({
    ...expense.toObject(),
    project: {
      _id: project._id,
      name: project.name,
      client: project.client,
      projectManager: project.projectManager
    }
  }));

  res.status(200).json({
    success: true,
    count: expensesWithProject.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: expensesWithProject
  });
});

// Helper to determine if project expenses are excluded from contract
const isProjectExpensesExcluded = (project) => {
  if (!project) return false;
  // When included is false or not set, we treat it as excluded for financial flows
  return project.expenseConfig && project.expenseConfig.included === false;
};

// @desc    Create new project expense
// @route   POST /api/admin/project-expenses
// @access  Admin only
const createProjectExpense = asyncHandler(async (req, res, next) => {
  // Check if admin is authenticated
  if (!req.admin || !req.admin._id) {
    return next(new ErrorResponse('Admin authentication required', 401));
  }

  const {
    projectId,
    name,
    category,
    amount,
    vendor,
    paymentMethod,
    expenseDate,
    description,
    paidBy
  } = req.body;

  // Validate required fields
  if (!projectId || !category || !amount || !expenseDate) {
    return next(new ErrorResponse('Project ID, category, amount, and expense date are required', 400));
  }

  // Validate category exists (check against ProjectExpenseCategory model)
  // Category validation is now optional - any category name can be used
  // But we can optionally check if it exists in the category list
  if (!category || !category.trim()) {
    return next(new ErrorResponse('Category is required', 400));
  }

  // Validate payment method
  const validPaymentMethods = ['Bank Transfer', 'UPI', 'Credit Card', 'Debit Card', 'Cash', 'Cheque', 'Other'];
  if (paymentMethod && !validPaymentMethods.includes(paymentMethod)) {
    return next(new ErrorResponse(`Invalid payment method. Must be one of: ${validPaymentMethods.join(', ')}`, 400));
  }

  // Validate paidBy
  const normalizedPaidBy = (paidBy || 'appzeto').toLowerCase();
  if (!['appzeto', 'client'].includes(normalizedPaidBy)) {
    return next(new ErrorResponse('Invalid paidBy value. Must be either \"appzeto\" or \"client\"', 400));
  }

  try {
    const project = await Project.findById(projectId)
      .populate('client', 'name companyName');
    
    if (!project) {
      return next(new ErrorResponse('Project not found', 404));
    }

    // Auto-populate vendor (client name) if not provided
    let clientName = vendor ? vendor.trim() : '';
    if (!clientName && project.client) {
      // Use companyName if available, otherwise use name
      if (typeof project.client === 'object') {
        clientName = project.client.companyName || project.client.name || '';
      }
    }

    // Auto-generate name from category if not provided
    // Use category name with "Expense" suffix, capitalizing first letter
    const expenseName = name ? name.trim() : (category ? `${category.charAt(0).toUpperCase() + category.slice(1)} Expense` : 'Project Expense');

    // Create expense object
    const expenseAmount = parseFloat(amount);

    const newExpense = {
      name: expenseName,
      category,
      amount: expenseAmount,
      vendor: clientName, // vendor field stores client name
      paymentMethod: paymentMethod || 'Bank Transfer',
      expenseDate: new Date(expenseDate),
      description: description ? description.trim() : '',
      paidBy: normalizedPaidBy,
      createdBy: req.admin._id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Add expense to project
    project.expenses.push(newExpense);
    await project.save();

    const savedExpense = project.expenses[project.expenses.length - 1];

    // If project expenses are excluded, this expense is for PEM tracking only:
    // do not create any AdminFinance transactions and do not recalculate project financials.
    if (!isProjectExpensesExcluded(project)) {
      // Create AdminFinance record so expense appears in Transactions and Expenses tabs
      // (Cards already count project expenses from Project.expenses - we exclude this via metadata.sourceType)
      try {
        await AdminFinance.create({
          recordType: 'transaction',
          transactionType: 'outgoing',
          category: category,
          amount: parseFloat(amount),
          transactionDate: new Date(expenseDate),
          createdBy: req.admin._id,
          status: 'completed',
          description: description ? description.trim() : `Project expense: ${expenseName}`,
          vendor: clientName,
          paymentMethod: paymentMethod || 'Bank Transfer',
          project: projectId,
          client: project.client?._id || project.client,
          metadata: {
            sourceType: 'projectExpense',
            sourceId: savedExpense._id.toString(),
            projectId: projectId.toString(),
            createdAt: new Date()
          }
        });
      } catch (financeErr) {
        console.error('Error creating AdminFinance for project expense:', financeErr);
        // Don't fail the request - project expense was saved; finance record is for visibility
      }

      // If client paid this expense, treat it as recovered money.
      // Create an incoming AdminFinance transaction linked to this expense and recalculate project financials.
      if (normalizedPaidBy === 'client') {
        try {
          await createIncomingTransaction({
            amount: expenseAmount,
            category: 'Client-paid Project Expense',
            transactionDate: new Date(expenseDate),
            createdBy: req.admin._id,
            client: project.client?._id || project.client,
            project: project._id,
            paymentMethod: paymentMethod || 'Bank Transfer',
            description: description ? description.trim() : `Client-paid project expense: ${expenseName}`,
            metadata: {
              sourceType: FINANCE_SOURCE_TYPES.PROJECT_EXPENSE_CLIENT_PAID,
              sourceId: savedExpense._id.toString(),
              projectId: project._id.toString()
            }
          });

          await recalculateProjectFinancials(project);
          await project.save();
        } catch (clientPaidErr) {
          console.error('Error creating recovery for client-paid project expense:', clientPaidErr);

          // Best-effort rollback: remove the expense and linked finance records so totals don't drift.
          try {
            project.expenses = project.expenses.filter((e) => e._id.toString() !== savedExpense._id.toString());
            project.markModified('expenses');
            await project.save();
          } catch (rollbackErr) {
            console.error('Rollback failed after client-paid project expense error:', rollbackErr);
          }

          try {
            await AdminFinance.deleteOne({
              recordType: 'transaction',
              'metadata.sourceType': 'projectExpense',
              'metadata.sourceId': savedExpense._id.toString()
            });
          } catch (rollbackFinanceErr) {
            console.error('Rollback failed removing outgoing AdminFinance:', rollbackFinanceErr);
          }

          await cancelTransactionForSource(
            {
              sourceType: FINANCE_SOURCE_TYPES.PROJECT_EXPENSE_CLIENT_PAID,
              sourceId: savedExpense._id.toString()
            },
            'delete'
          );

          return next(new ErrorResponse('Failed to record client-paid recovery for this expense', 500));
        }
      }
    }

    // Populate the expense with admin info
    const Admin = require('../models/Admin');
    const createdByAdmin = await Admin.findById(req.admin._id).select('name email');
    const expenseWithProject = {
      ...savedExpense.toObject(),
      createdBy: createdByAdmin,
      project: {
        _id: project._id,
        name: project.name
      }
    };

    res.status(201).json({
      success: true,
      message: 'Project expense created successfully',
      data: expenseWithProject
    });
  } catch (error) {
    console.error('Error creating project expense:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((errItem) => errItem.message).join(', ');
      return next(new ErrorResponse(messages, 400));
    }
    return next(new ErrorResponse(error.message || 'Failed to create project expense', 500));
  }
});

// @desc    Update project expense
// @route   PUT /api/admin/project-expenses/:id
// @access  Admin only
const updateProjectExpense = asyncHandler(async (req, res, next) => {
  // Check if admin is authenticated
  if (!req.admin || !req.admin._id) {
    return next(new ErrorResponse('Admin authentication required', 401));
  }

  const { id } = req.params;
  const {
    name,
    category,
    amount,
    vendor,
    paymentMethod,
    expenseDate,
    description,
    paidBy
  } = req.body;

  try {
    // Find project containing this expense
    const project = await Project.findOne({ 'expenses._id': id })
      .populate('client', 'name companyName email')
      .populate('projectManager', 'name email');

    if (!project) {
      return next(new ErrorResponse('Project expense not found', 404));
    }

    // Find the expense
    const expense = project.expenses.id(id);
    if (!expense) {
      return next(new ErrorResponse('Project expense not found', 404));
    }

    // Update fields
    if (name !== undefined) {
      expense.name = name.trim();
    } else if (category !== undefined) {
      // Auto-generate name from category if category changed but name not provided
    // Use category name with "Expense" suffix
    expense.name = category ? `${category.charAt(0).toUpperCase() + category.slice(1)} Expense` : 'Project Expense';
    }
    if (category !== undefined) {
      if (!category || !category.trim()) {
        return next(new ErrorResponse('Category is required', 400));
      }
      expense.category = category.trim();
    }
    if (amount !== undefined) expense.amount = parseFloat(amount);
    if (vendor !== undefined) {
      // Auto-populate vendor (client name) if not provided
      let clientName = vendor.trim();
      if (!clientName && project.client) {
        if (typeof project.client === 'object') {
          clientName = project.client.companyName || project.client.name || '';
        }
      }
      expense.vendor = clientName; // vendor field stores client name
    }
    if (paymentMethod !== undefined) {
      const validPaymentMethods = ['Bank Transfer', 'UPI', 'Credit Card', 'Debit Card', 'Cash', 'Cheque', 'Other'];
      if (!validPaymentMethods.includes(paymentMethod)) {
        return next(new ErrorResponse(`Invalid payment method. Must be one of: ${validPaymentMethods.join(', ')}`, 400));
      }
      expense.paymentMethod = paymentMethod;
    }
    if (expenseDate !== undefined) expense.expenseDate = new Date(expenseDate);
    if (description !== undefined) expense.description = description.trim();
    if (paidBy !== undefined) {
      const normalizedPaidBy = String(paidBy).toLowerCase();
      if (!['appzeto', 'client'].includes(normalizedPaidBy)) {
        return next(new ErrorResponse('Invalid paidBy value. Must be either \"appzeto\" or \"client\"', 400));
      }
      expense.paidBy = normalizedPaidBy;
    }

    expense.updatedBy = req.admin._id;
    expense.updatedAt = new Date();

    // Mark expenses array as modified
    project.markModified('expenses');
    await project.save();

    // For projects where expenses are excluded from contract, skip all AdminFinance updates
    // and financial recalculation – these expenses are PEM-only.
    if (!isProjectExpensesExcluded(project)) {
      // Sync AdminFinance record if it exists
      try {
        const financeRecord = await AdminFinance.findOne({
          recordType: 'transaction',
          'metadata.sourceType': 'projectExpense',
          'metadata.sourceId': id
        });
        if (financeRecord) {
          financeRecord.amount = expense.amount;
          financeRecord.category = expense.category;
          financeRecord.transactionDate = expense.expenseDate;
          financeRecord.vendor = expense.vendor;
          financeRecord.paymentMethod = expense.paymentMethod;
          financeRecord.description = expense.description || `Project expense: ${expense.name}`;
          await financeRecord.save();
        }
      } catch (financeErr) {
        console.error('Error syncing AdminFinance for project expense update:', financeErr);
      }

      // Sync client-paid recovery transaction and recalculate project financials
      try {
        const sourceType = FINANCE_SOURCE_TYPES.PROJECT_EXPENSE_CLIENT_PAID;
        const sourceId = id.toString();
        const normalizedExpensePaidBy = (expense.paidBy || 'appzeto').toLowerCase();

        if (normalizedExpensePaidBy === 'client') {
          const existing = await findExistingTransaction({ sourceType, sourceId });
          if (!existing) {
            await createIncomingTransaction({
              amount: Number(expense.amount || 0),
              category: 'Client-paid Project Expense',
              transactionDate: expense.expenseDate || new Date(),
              createdBy: req.admin._id,
              client: project.client?._id || project.client,
              project: project._id,
              paymentMethod: expense.paymentMethod || 'Bank Transfer',
              description: expense.description || `Client-paid project expense: ${expense.name}`,
              metadata: {
                sourceType,
                sourceId,
                projectId: project._id.toString()
              }
            });
          } else {
            existing.amount = Number(expense.amount || 0);
            existing.category = 'Client-paid Project Expense';
            existing.transactionDate = expense.expenseDate || existing.transactionDate || new Date();
            existing.paymentMethod = expense.paymentMethod || existing.paymentMethod;
            existing.description = expense.description || `Client-paid project expense: ${expense.name}`;
            existing.client = project.client?._id || project.client;
            existing.project = project._id;
            existing.status = 'completed';
            existing.transactionType = 'incoming';
            existing.recordType = 'transaction';
            existing.metadata = {
              ...(existing.metadata || {}),
              sourceType,
              sourceId,
              projectId: project._id.toString()
            };
            await existing.save();
          }
        } else {
          await cancelTransactionForSource({ sourceType, sourceId }, 'delete');
        }

        await recalculateProjectFinancials(project);
        await project.save();
      } catch (recalcErr) {
        console.error('Error syncing client-paid recovery or recalculating project financials:', recalcErr);
        // Don't fail: expense update is saved; next recalculation trigger will correct totals.
      }
    }

    // Populate updatedBy
    const Admin = require('../models/Admin');
    const updatedByAdmin = await Admin.findById(req.admin._id).select('name email');
    const createdByAdmin = await Admin.findById(expense.createdBy).select('name email');

    const updatedExpense = {
      ...expense.toObject(),
      createdBy: createdByAdmin,
      updatedBy: updatedByAdmin,
      project: {
        _id: project._id,
        name: project.name,
        client: project.client,
        projectManager: project.projectManager
      }
    };

    res.status(200).json({
      success: true,
      message: 'Project expense updated successfully',
      data: updatedExpense
    });
  } catch (error) {
    console.error('Error updating project expense:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((errItem) => errItem.message).join(', ');
      return next(new ErrorResponse(messages, 400));
    }
    return next(new ErrorResponse(error.message || 'Failed to update project expense', 500));
  }
});

// @desc    Delete project expense
// @route   DELETE /api/admin/project-expenses/:id
// @access  Admin only
const deleteProjectExpense = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  try {
    // Find project containing this expense
    const project = await Project.findOne({ 'expenses._id': id });

    if (!project) {
      return next(new ErrorResponse('Project expense not found', 404));
    }

    // Find the expense being deleted
    const expense = project.expenses.id(id);

    // For projects where expenses are excluded, there are no linked AdminFinance
    // transactions to clean up and no financial recalculation needed.
    if (!isProjectExpensesExcluded(project)) {
      // Remove linked incoming recovery (if any) for client-paid expenses
      await cancelTransactionForSource(
        {
          sourceType: FINANCE_SOURCE_TYPES.PROJECT_EXPENSE_CLIENT_PAID,
          sourceId: id
        },
        'delete'
      );

      // Remove linked AdminFinance record so it doesn't appear in Transactions/Expenses
      try {
        await AdminFinance.deleteOne({
          recordType: 'transaction',
          'metadata.sourceType': 'projectExpense',
          'metadata.sourceId': id
        });
      } catch (financeErr) {
        console.error('Error removing AdminFinance for deleted project expense:', financeErr);
      }
    }

    // Filter out the expense to delete
    project.expenses = project.expenses.filter(expense => {
      return expense._id.toString() !== id;
    });
    project.markModified('expenses');
    await project.save();

    // Recalculate project financials after removing recovery source
    if (!isProjectExpensesExcluded(project)) {
      try {
        await recalculateProjectFinancials(project);
        await project.save();
      } catch (recalcErr) {
        console.error('Error recalculating project financials after deleting project expense:', recalcErr);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Project expense deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting project expense:', error);
    return next(new ErrorResponse(error.message || 'Failed to delete project expense', 500));
  }
});

// @desc    Get project expense statistics
// @route   GET /api/admin/project-expenses/stats
// @access  Admin only
const getProjectExpenseStats = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;

  try {
    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter['expenses.expenseDate'] = {};
      if (startDate) dateFilter['expenses.expenseDate'].$gte = new Date(startDate);
      if (endDate) dateFilter['expenses.expenseDate'].$lte = new Date(endDate);
    }

    // Get all projects with expenses (include expenseConfig.included for included/excluded split)
    const projects = await Project.find(dateFilter).select('expenses expenseConfig.included');

    // Calculate totals (overall + split by included/excluded)
    let totalExpenses = 0;
    let totalExpensesIncluded = 0;
    let totalExpensesExcluded = 0;
    let totalProjects = new Set();
    let monthlyExpenses = 0;
    let monthlyExpensesIncluded = 0;
    let monthlyExpensesExcluded = 0;
    let todayExpenses = 0;
    let todayExpensesIncluded = 0;
    let todayExpensesExcluded = 0;
    const categoryBreakdown = {};
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    projects.forEach(project => {
      if (project.expenses && project.expenses.length > 0) {
        const isIncluded = project.expenseConfig && project.expenseConfig.included === true;
        let projectHasExpenses = false;
        project.expenses.forEach(expense => {
          // Apply date filter if provided
          if (startDate && new Date(expense.expenseDate) < new Date(startDate)) {
            return;
          }
          if (endDate && new Date(expense.expenseDate) > new Date(endDate)) {
            return;
          }

          const expenseDate = new Date(expense.expenseDate);
          const expenseAmount = expense.amount || 0;

          totalExpenses += expenseAmount;
          if (isIncluded) {
            totalExpensesIncluded += expenseAmount;
          } else {
            totalExpensesExcluded += expenseAmount;
          }
          projectHasExpenses = true;

          // Monthly expenses (current month)
          if (expenseDate >= startOfMonth) {
            monthlyExpenses += expenseAmount;
            if (isIncluded) {
              monthlyExpensesIncluded += expenseAmount;
            } else {
              monthlyExpensesExcluded += expenseAmount;
            }
          }

          // Today's expenses
          if (expenseDate >= startOfToday) {
            todayExpenses += expenseAmount;
            if (isIncluded) {
              todayExpensesIncluded += expenseAmount;
            } else {
              todayExpensesExcluded += expenseAmount;
            }
          }

          // Category breakdown
          const cat = expense.category || 'other';
          categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + expenseAmount;
        });

        if (projectHasExpenses) {
          totalProjects.add(project._id.toString());
        }
      }
    });

    res.status(200).json({
      success: true,
      data: {
        totalExpenses,
        totalExpensesIncluded,
        totalExpensesExcluded,
        totalProjects: totalProjects.size,
        monthlyExpenses,
        monthlyExpensesIncluded,
        monthlyExpensesExcluded,
        todayExpenses,
        todayExpensesIncluded,
        todayExpensesExcluded,
        categoryBreakdown
      }
    });
  } catch (error) {
    console.error('Error getting project expense stats:', error);
    return next(new ErrorResponse(error.message || 'Failed to get project expense statistics', 500));
  }
});

module.exports = {
  getAllProjectExpenses,
  getProjectExpenses,
  createProjectExpense,
  updateProjectExpense,
  deleteProjectExpense,
  getProjectExpenseStats
};

