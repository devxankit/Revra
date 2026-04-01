const AdminFinance = require('../models/AdminFinance');
const Account = require('../models/Account');
const Client = require('../models/Client');
const Project = require('../models/Project');
const Employee = require('../models/Employee');
const Payment = require('../models/Payment');
const PaymentReceipt = require('../models/PaymentReceipt');
const Salary = require('../models/Salary');
const ExpenseEntry = require('../models/ExpenseEntry');
const Allowance = require('../models/Allowance');
const Incentive = require('../models/Incentive');
const PMReward = require('../models/PMReward');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Create a new transaction
// @route   POST /api/admin/finance/transactions
// @access  Admin only
const createTransaction = asyncHandler(async (req, res, next) => {
  // Check if admin is authenticated
  if (!req.admin || !req.admin._id) {
    return next(new ErrorResponse('Admin authentication required', 401));
  }

  const {
    type, // 'incoming' or 'outgoing'
    category,
    amount,
    date,
    client, // Can be client ID or client name (string)
    project, // Can be project ID or project name (string)
    employee, // Can be employee ID or employee name (string)
    vendor, // Vendor name for outgoing transactions
    method, // Payment method
    description,
    account // Optional account reference
  } = req.body;

  // Validate required fields
  if (!type || !category || !amount || !date) {
    return next(new ErrorResponse('Transaction type, category, amount, and date are required', 400));
  }

  if (!['incoming', 'outgoing'].includes(type)) {
    return next(new ErrorResponse('Transaction type must be either "incoming" or "outgoing"', 400));
  }

  // Parse client if provided (can be ID or name)
  let clientId = null;
  if (client) {
    // Check if it's an ObjectId format
    if (client.match(/^[0-9a-fA-F]{24}$/)) {
      const clientDoc = await Client.findById(client);
      if (clientDoc) {
        clientId = client;
      }
    } else {
      // It's a name, try to find by name
      const clientDoc = await Client.findOne({ name: { $regex: new RegExp(client, 'i') } });
      if (clientDoc) {
        clientId = clientDoc._id;
      } else {
        // Store as vendor name if client not found
        vendor = vendor || client;
      }
    }
  }

  // Parse project if provided (can be ID or name)
  let projectId = null;
  if (project) {
    if (project.match(/^[0-9a-fA-F]{24}$/)) {
      const projectDoc = await Project.findById(project);
      if (projectDoc) {
        projectId = project;
      }
    } else {
      // It's a name, try to find by name
      const projectDoc = await Project.findOne({ name: { $regex: new RegExp(project, 'i') } });
      if (projectDoc) {
        projectId = projectDoc._id;
      }
    }
  }

  // Parse employee if provided (can be ID or name)
  let employeeId = null;
  if (employee) {
    if (employee.match(/^[0-9a-fA-F]{24}$/)) {
      const employeeDoc = await Employee.findById(employee);
      if (employeeDoc) {
        employeeId = employee;
      }
    } else {
      // It's a name, try to find by name
      const employeeDoc = await Employee.findOne({ name: { $regex: new RegExp(employee, 'i') } });
      if (employeeDoc) {
        employeeId = employeeDoc._id;
      } else {
        // Store as vendor name if employee not found and it's outgoing
        if (type === 'outgoing') {
          vendor = vendor || employee;
        }
      }
    }
  }

  // Create transaction record
  const transactionData = {
    recordType: 'transaction',
    transactionType: type,
    category,
    amount: parseFloat(amount),
    transactionDate: new Date(date),
    paymentMethod: method || 'Bank Transfer',
    description: description || '',
    createdBy: req.admin._id,
    status: 'completed' // Transactions are typically completed when created
  };

  console.log('Creating transaction with data:', transactionData);

  // Add optional references
  if (clientId) transactionData.client = clientId;
  if (projectId) transactionData.project = projectId;
  if (employeeId) transactionData.employee = employeeId;
  if (vendor) transactionData.vendor = vendor;

  // Handle account ID if provided
  if (account) {
    // Check if account is a valid ObjectId
    if (account.match(/^[0-9a-fA-F]{24}$/)) {
      const accountDoc = await Account.findById(account);
      if (!accountDoc) {
        return next(new ErrorResponse('Account not found', 404));
      }
      if (!accountDoc.isActive) {
        return next(new ErrorResponse('Cannot use inactive account', 400));
      }
      transactionData.account = account;
      // Update account last used
      accountDoc.updateLastUsed();
    } else {
      console.warn('Invalid account ID provided:', account);
    }
  }

  try {
    const transaction = await AdminFinance.create(transactionData);

    // Populate references for response
    await transaction.populate([
      { path: 'client', select: 'name email phoneNumber companyName' },
      { path: 'project', select: 'name status' },
      { path: 'employee', select: 'name email department' },
      { path: 'account', select: 'accountName bankName accountNumber' },
      { path: 'createdBy', select: 'name email' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: transaction
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((errItem) => errItem.message).join(', ');
      return next(new ErrorResponse(messages, 400));
    }

    // Return more detailed error message
    const errorMessage = error.message || 'Failed to create transaction';
    return next(new ErrorResponse(errorMessage, 500));
  }
});

// @desc    Get all transactions
// @route   GET /api/admin/finance/transactions
// @access  Admin only
const getTransactions = asyncHandler(async (req, res, next) => {
  const {
    type, // 'incoming' or 'outgoing'
    status,
    category,
    startDate,
    endDate,
    page = 1,
    limit = 20,
    search
  } = req.query;

  // Build filter
  const filter = {
    recordType: 'transaction'
  };

  if (type) filter.transactionType = type;
  if (status) filter.status = status;
  if (category) filter.category = { $regex: category, $options: 'i' };

  // Date range filter
  if (startDate || endDate) {
    filter.transactionDate = {};
    if (startDate) filter.transactionDate.$gte = new Date(startDate);
    if (endDate) filter.transactionDate.$lte = new Date(endDate);
  }

  // Search filter
  if (search) {
    filter.$or = [
      { category: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { vendor: { $regex: search, $options: 'i' } }
    ];
  }

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // For Sales Incentives category, also populate Sales model if employee is a sales employee
  const transactions = await AdminFinance.find(filter)
    .populate('client', 'name email phoneNumber companyName')
    .populate('project', 'name status')
    .populate({
      path: 'employee',
      select: 'name email department',
      // If it's a sales employee, we'll handle it separately
      model: 'Employee'
    })
    .populate('account', 'accountName bankName accountNumber')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1, transactionDate: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  // For Sales Incentives, populate Sales model if employee reference exists
  // Check if we need to populate Sales model for sales incentives
  const Sales = require('../models/Sales');
  const transactionsWithSales = await Promise.all(
    transactions.map(async (transaction) => {
      // If category is Sales Incentives and employee exists, check if it's a sales employee
      if (transaction.category === 'Sales Incentives' && transaction.employee) {
        try {
          // Try to find in Sales model
          const salesEmployee = await Sales.findById(transaction.employee._id || transaction.employee)
            .select('name email employeeId department');
          if (salesEmployee) {
            // Convert to plain object and add sales employee info
            const transactionObj = transaction.toObject ? transaction.toObject() : transaction;
            transactionObj.salesEmployee = {
              id: salesEmployee._id,
              name: salesEmployee.name,
              email: salesEmployee.email,
              employeeId: salesEmployee.employeeId,
              department: salesEmployee.department
            };
            return transactionObj;
          }
        } catch (error) {
          // If not found in Sales, it's a regular employee, keep as is
        }
      }
      return transaction;
    })
  );

  const total = await AdminFinance.countDocuments(filter);

  res.status(200).json({
    success: true,
    count: transactionsWithSales.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: transactionsWithSales
  });
});

// @desc    Get single transaction
// @route   GET /api/admin/finance/transactions/:id
// @access  Admin only
const getTransaction = asyncHandler(async (req, res, next) => {
  const transaction = await AdminFinance.findOne({
    _id: req.params.id,
    recordType: 'transaction'
  })
    .populate('client', 'name email phoneNumber companyName')
    .populate('project', 'name status')
    .populate('employee', 'name email department')
    .populate('account', 'accountName bankName accountNumber')
    .populate('createdBy', 'name email');

  if (!transaction) {
    return next(new ErrorResponse('Transaction not found', 404));
  }

  res.status(200).json({
    success: true,
    data: transaction
  });
});

// @desc    Update transaction
// @route   PUT /api/admin/finance/transactions/:id
// @access  Admin only
const updateTransaction = asyncHandler(async (req, res, next) => {
  const {
    type,
    category,
    amount,
    date,
    client,
    project,
    employee,
    vendor,
    method,
    description,
    status,
    account
  } = req.body;

  let transaction = await AdminFinance.findOne({
    _id: req.params.id,
    recordType: 'transaction'
  });

  if (!transaction) {
    return next(new ErrorResponse('Transaction not found', 404));
  }

  // Update fields
  if (type) transaction.transactionType = type;
  if (category) transaction.category = category;
  if (amount !== undefined) transaction.amount = parseFloat(amount);
  if (date) transaction.transactionDate = new Date(date);
  if (method) transaction.paymentMethod = method;
  if (description !== undefined) transaction.description = description;
  if (status) transaction.status = status;
  if (account) transaction.account = account;

  // Handle client update
  if (client !== undefined) {
    if (client === null || client === '') {
      transaction.client = null;
    } else if (client.match(/^[0-9a-fA-F]{24}$/)) {
      const clientDoc = await Client.findById(client);
      if (clientDoc) {
        transaction.client = client;
      }
    } else {
      const clientDoc = await Client.findOne({ name: { $regex: new RegExp(client, 'i') } });
      if (clientDoc) {
        transaction.client = clientDoc._id;
      } else {
        transaction.vendor = vendor || client;
        transaction.client = null;
      }
    }
  }

  // Handle project update
  if (project !== undefined) {
    if (project === null || project === '') {
      transaction.project = null;
    } else if (project.match(/^[0-9a-fA-F]{24}$/)) {
      const projectDoc = await Project.findById(project);
      if (projectDoc) {
        transaction.project = project;
      }
    } else {
      const projectDoc = await Project.findOne({ name: { $regex: new RegExp(project, 'i') } });
      if (projectDoc) {
        transaction.project = projectDoc._id;
      } else {
        transaction.project = null;
      }
    }
  }

  // Handle employee update
  if (employee !== undefined) {
    if (employee === null || employee === '') {
      transaction.employee = null;
    } else if (employee.match(/^[0-9a-fA-F]{24}$/)) {
      const employeeDoc = await Employee.findById(employee);
      if (employeeDoc) {
        transaction.employee = employee;
      }
    } else {
      const employeeDoc = await Employee.findOne({ name: { $regex: new RegExp(employee, 'i') } });
      if (employeeDoc) {
        transaction.employee = employeeDoc._id;
      } else {
        if (transaction.transactionType === 'outgoing') {
          transaction.vendor = vendor || employee;
        }
        transaction.employee = null;
      }
    }
  }

  if (vendor !== undefined) transaction.vendor = vendor;

  await transaction.save();

  // Populate references for response
  await transaction.populate([
    { path: 'client', select: 'name email phoneNumber companyName' },
    { path: 'project', select: 'name status' },
    { path: 'employee', select: 'name email department' },
    { path: 'account', select: 'accountName bankName accountNumber' },
    { path: 'createdBy', select: 'name email' }
  ]);

  res.status(200).json({
    success: true,
    data: transaction
  });
});

// @desc    Delete transaction
// @route   DELETE /api/admin/finance/transactions/:id
// @access  Admin only
const deleteTransaction = asyncHandler(async (req, res, next) => {
  const transaction = await AdminFinance.findOne({
    _id: req.params.id,
    recordType: 'transaction'
  });

  if (!transaction) {
    return next(new ErrorResponse('Transaction not found', 404));
  }

  await transaction.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get transaction statistics
// @route   GET /api/admin/finance/transactions/stats
// @access  Admin only
const getTransactionStats = asyncHandler(async (req, res, next) => {
  const { timeFilter = 'all' } = req.query;

  const stats = await AdminFinance.getFinanceStatistics(timeFilter);

  // Get additional stats
  const totalTransactions = await AdminFinance.countDocuments({ recordType: 'transaction' });
  const pendingTransactions = await AdminFinance.countDocuments({
    recordType: 'transaction',
    status: 'pending'
  });
  const completedTransactions = await AdminFinance.countDocuments({
    recordType: 'transaction',
    status: 'completed'
  });

  res.status(200).json({
    success: true,
    data: {
      ...stats,
      totalTransactions,
      pendingTransactions,
      completedTransactions
    }
  });
});

// @desc    Get comprehensive finance statistics
// @route   GET /api/admin/finance/statistics
// @access  Admin only
const getFinanceStatistics = asyncHandler(async (req, res, next) => {
  const { timeFilter = 'all', startDate, endDate } = req.query;

  const now = new Date();
  let dateFilter = {};
  let todayStart, todayEnd;
  let currentMonthStart, lastMonthStart, lastMonthEnd;

  // Calculate current year and month once (used in multiple places)
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentMonthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

  // Calculate date ranges (create new Date objects to avoid mutating)
  todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  if (timeFilter === 'custom' && startDate) {
    const sDate = new Date(startDate);
    sDate.setHours(0, 0, 0, 0);
    const eDate = endDate ? new Date(endDate) : new Date();
    eDate.setHours(23, 59, 59, 999);
    dateFilter = { $gte: sDate, $lte: eDate };
  } else {
    switch (timeFilter) {
      case 'day':
      case 'today':
        dateFilter = { $gte: todayStart, $lte: todayEnd };
        break;
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFilter = { $gte: weekAgo, $lte: todayEnd };
        break;
      case 'month':
        dateFilter = { $gte: currentMonthStart, $lte: todayEnd };
        break;
      case 'year':
        const yearStart = new Date(now.getFullYear(), 0, 1);
        dateFilter = { $gte: yearStart, $lte: todayEnd };
        break;
    }
  }

  // ========== REVENUE SOURCES - Query Actual Data ==========

  // 1. Completed Payments
  const paymentDateFilter = timeFilter !== 'all'
    ? { paidAt: dateFilter, status: 'completed' }
    : { status: 'completed' };
  const paymentRevenue = await Payment.aggregate([
    { $match: paymentDateFilter },
    { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
  ]);
  const paymentRevenueAmount = paymentRevenue[0]?.totalAmount || 0;

  // 2. Approved Payment Receipts
  // Note: Project Advances (advanceReceived field) is NOT counted separately because:
  // - advanceReceived is a cumulative field that includes initial advance + approved receipts + paid installments
  // - Counting it separately would cause double/triple counting with receipts and installments
  // - Revenue should only come from actual transaction sources: Payments, Receipts, Installments, and Other Transactions
  const receiptDateFilter = timeFilter !== 'all'
    ? { verifiedAt: dateFilter, status: 'approved' }
    : { status: 'approved' };
  const paymentReceiptRevenue = await PaymentReceipt.aggregate([
    { $match: receiptDateFilter },
    { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
  ]);
  const paymentReceiptRevenueAmount = paymentReceiptRevenue[0]?.totalAmount || 0;

  // 3. Paid Project Installments (all collected installment amounts)
  // Count all installments that have been marked as paid - these are revenue received
  let projectInstallmentFilter = {};
  if (timeFilter !== 'all') {
    projectInstallmentFilter = {
      'installmentPlan.status': 'paid',
      'installmentPlan.paidDate': dateFilter
    };
  } else {
    projectInstallmentFilter = {
      'installmentPlan.status': 'paid'
    };
  }

  const projectInstallmentRevenue = await Project.aggregate([
    { $match: projectInstallmentFilter },
    { $unwind: '$installmentPlan' },
    {
      $match: timeFilter !== 'all'
        ? { 'installmentPlan.status': 'paid', 'installmentPlan.paidDate': dateFilter }
        : { 'installmentPlan.status': 'paid' }
    },
    { $group: { _id: null, totalAmount: { $sum: '$installmentPlan.amount' } } }
  ]);
  const projectInstallmentRevenueAmount = projectInstallmentRevenue[0]?.totalAmount || 0;

  // 4. Other Finance incoming transactions (excluding payments, installments, and payment receipts to avoid double counting)
  // Payments, payment receipts, and installments are counted directly from their source models above
  // Payment receipts create AdminFinance transactions with sourceType 'paymentReceipt' - exclude to avoid double count
  const transactionFilter = timeFilter !== 'all'
    ? {
      transactionDate: dateFilter,
      recordType: 'transaction',
      transactionType: 'incoming',
      status: 'completed',
      'metadata.sourceType': { $nin: ['payment', 'projectInstallment', 'paymentReceipt'] }
    }
    : {
      recordType: 'transaction',
      transactionType: 'incoming',
      status: 'completed',
      'metadata.sourceType': { $nin: ['payment', 'projectInstallment', 'paymentReceipt'] }
    };
  const transactionRevenue = await AdminFinance.aggregate([
    { $match: transactionFilter },
    { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
  ]);
  const transactionRevenueAmount = transactionRevenue[0]?.totalAmount || 0;

  // 5. Total Sales (Project costs in period)
  // Sales represents the value of all projects sold/created within the selected period.
  // Business rule:
  // - A sale is only valid (and counted) once an advance payment has been approved by admin.
  // - This is reflected when financialDetails.advanceReceived > 0
  //   (updated by PaymentReceipt/Payment hooks after approval).
  // - The "sale date" is taken from project.startDate (business creation date chosen by user),
  //   not from the document's createdAt timestamp, so backdated projects are counted in the
  //   month/year they actually belong to.
  const salesDateFilter = timeFilter !== 'all'
    ? { startDate: dateFilter, 'financialDetails.advanceReceived': { $gt: 0 } }
    : { 'financialDetails.advanceReceived': { $gt: 0 } };
  const totalSales = await Project.aggregate([
    { $match: salesDateFilter },
    { $group: { _id: null, totalAmount: { $sum: '$financialDetails.totalCost' } } }
  ]);
  const totalSalesAmount = totalSales[0]?.totalAmount || 0;

  // Total Revenue - ALL incoming amounts are treated as revenue (Earnings)
  // 1. Completed Payments (from Payment model)
  // 2. Approved Payment Receipts
  // 3. Paid Installments (collected installment amounts)
  // 4. Other incoming transactions (manual transactions, etc.)
  // Note: Project Advances (advanceReceived) is NOT included to avoid double counting
  // since it already includes receipts and installments
  const totalRevenue = paymentRevenueAmount + paymentReceiptRevenueAmount +
    projectInstallmentRevenueAmount + transactionRevenueAmount;

  // ========== EXPENSE SOURCES - Query Actual Data ==========

  // 1. Paid Salaries
  // Salary Management uses 'month' (YYYY-MM) as primary key/filter
  let salaryMonthFilter = { status: 'paid' };
  if (timeFilter !== 'all') {
    if (timeFilter === 'custom' && startDate) {
      const sDate = new Date(startDate);
      const eDate = endDate ? new Date(endDate) : new Date();

      const startMonthStr = `${sDate.getFullYear()}-${String(sDate.getMonth() + 1).padStart(2, '0')}`;
      const endMonthStr = `${eDate.getFullYear()}-${String(eDate.getMonth() + 1).padStart(2, '0')}`;

      salaryMonthFilter = {
        month: { $gte: startMonthStr, $lte: endMonthStr },
        status: 'paid'
      };
    } else {
      switch (timeFilter) {
        case 'day':
        case 'today':
        case 'week':
        case 'month':
          // For shorter periods, use current month
          salaryMonthFilter = { month: currentMonthStr, status: 'paid' };
          break;
        case 'year':
          // For year, show all months in current year
          salaryMonthFilter = { month: { $regex: `^${currentYear}-` }, status: 'paid' };
          break;
      }
    }
  }
  // For 'all' time filter, show all paid salaries (no month restriction)
  const salaryExpenses = await Salary.aggregate([
    { $match: salaryMonthFilter },
    { $group: { _id: null, totalAmount: { $sum: '$fixedSalary' } } }
  ]);
  const salaryExpensesAmount = salaryExpenses[0]?.totalAmount || 0;

  // 2. Paid Recurring Expenses
  // Query from ExpenseEntry records (primary source of truth)
  let expenseDateFilter;
  if (timeFilter !== 'all') {
    expenseDateFilter = {
      status: 'paid',
      paidDate: dateFilter
    };
  } else {
    expenseDateFilter = { status: 'paid' };
  }

  const expenseEntries = await ExpenseEntry.aggregate([
    { $match: expenseDateFilter },
    { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
  ]);
  const recurringExpensesAmount = expenseEntries[0]?.totalAmount || 0;

  // Calculate month-wise recurring expenses breakdown
  // Note: This shows the actual cash outflow in each month (when payment was made)
  // For quarterly/yearly expenses, the full amount appears in the month it was paid
  let monthlyRecurringExpensesBreakdown = {};
  if (timeFilter !== 'all') {
    // For filtered periods, get month-wise breakdown
    const monthlyBreakdown = await ExpenseEntry.aggregate([
      {
        $match: {
          ...expenseDateFilter,
          paidDate: { $exists: true, $ne: null } // Only include entries with valid paidDate
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m', date: '$paidDate' }
          },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    monthlyBreakdown.forEach(item => {
      if (item._id) { // Only add if _id exists (paidDate was valid)
        monthlyRecurringExpensesBreakdown[item._id] = item.totalAmount;
      }
    });
  } else {
    // For all time, get month-wise breakdown from all paid entries
    const monthlyBreakdown = await ExpenseEntry.aggregate([
      {
        $match: {
          status: 'paid',
          paidDate: { $exists: true, $ne: null } // Only include entries with valid paidDate
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m', date: '$paidDate' }
          },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 12 } // Show last 12 months
    ]);

    monthlyBreakdown.forEach(item => {
      if (item._id) { // Only add if _id exists (paidDate was valid)
        monthlyRecurringExpensesBreakdown[item._id] = item.totalAmount;
      }
    });
  }

  // Note: Allowances are physical assets/equipment (laptops, monitors, etc.) given to employees,
  // not monetary expenses. They are tracked in HR Management for asset management purposes.
  // The "value" represents asset value, not a recurring expense, so we don't count them as expenses.

  // 3. Paid Incentives
  // Count from finance transactions (created when incentive payments are made through salary management)
  // This ensures all incentive payments are counted, regardless of how they were paid
  let incentiveTransactionFilter;
  if (timeFilter !== 'all') {
    incentiveTransactionFilter = {
      recordType: 'transaction',
      transactionType: 'outgoing',
      status: 'completed',
      $or: [
        { category: 'Incentive Payment' },
        { 'metadata.sourceType': 'incentive' }
      ],
      transactionDate: dateFilter
    };
  } else {
    incentiveTransactionFilter = {
      recordType: 'transaction',
      transactionType: 'outgoing',
      status: 'completed',
      $or: [
        { category: 'Incentive Payment' },
        { 'metadata.sourceType': 'incentive' }
      ]
    };
  }
  const incentiveTransactions = await AdminFinance.aggregate([
    { $match: incentiveTransactionFilter },
    { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
  ]);
  const incentiveExpensesAmount = incentiveTransactions[0]?.totalAmount || 0;

  // 5. Paid Rewards (Sales & Dev team rewards + PM Rewards)
  // Count from finance transactions - includes employee rewards and PM rewards
  // Excludes from otherExpenses to avoid double counting
  let rewardTransactionFilter;
  if (timeFilter !== 'all') {
    rewardTransactionFilter = {
      recordType: 'transaction',
      transactionType: 'outgoing',
      status: 'completed',
      $or: [
        { category: 'Reward Payment' },
        { category: 'PM Reward' },
        { 'metadata.sourceType': 'reward' },
        { 'metadata.sourceType': 'pmReward' }
      ],
      transactionDate: dateFilter
    };
  } else {
    rewardTransactionFilter = {
      recordType: 'transaction',
      transactionType: 'outgoing',
      status: 'completed',
      $or: [
        { category: 'Reward Payment' },
        { category: 'PM Reward' },
        { 'metadata.sourceType': 'reward' },
        { 'metadata.sourceType': 'pmReward' }
      ]
    };
  }
  const rewardTransactions = await AdminFinance.aggregate([
    { $match: rewardTransactionFilter },
    { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
  ]);
  const rewardExpensesAmount = rewardTransactions[0]?.totalAmount || 0;

  // 6. Project Expenses (from Project model expenses array)
  // Aggregate all expenses from all projects' expenses arrays
  let projectExpenseDateFilter = {};
  if (timeFilter !== 'all') {
    projectExpenseDateFilter = {
      'expenses.expenseDate': dateFilter
    };
  }

  // Get all projects with expenses matching the date filter
  // Include expenseConfig.included so we can ignore excluded (PEM-only) project expenses
  const projectsWithExpenses = await Project.find(projectExpenseDateFilter).select('expenses expenseConfig.included');

  // Calculate total project expenses
  // IMPORTANT: Exclude expenses for projects where expenseConfig.included === false.
  // Those are PEM-only tracking and should not affect finance statistics.
  let projectExpensesAmount = 0;
  projectsWithExpenses.forEach(project => {
    const isExcludedProject =
      project.expenseConfig && project.expenseConfig.included === false;

    if (isExcludedProject) {
      return;
    }

    if (project.expenses && project.expenses.length > 0) {
      project.expenses.forEach(expense => {
        // Double check individual expense date if filtered
        if (timeFilter !== 'all') {
          const eDate = new Date(expense.expenseDate);
          if (eDate >= dateFilter.$gte && eDate <= dateFilter.$lte) {
            projectExpensesAmount += expense.amount || 0;
          }
        } else {
          projectExpensesAmount += expense.amount || 0;
        }
      });
    }
  });

  // 7. Other Finance outgoing transactions (not from above sources)
  // Exclude expenseEntry, incentive, reward, projectExpense - they're counted in their own sources
  // (projectExpense is counted in projectExpensesAmount from Project.expenses)
  let otherExpenseFilter;
  if (timeFilter !== 'all') {
    otherExpenseFilter = {
      transactionDate: dateFilter,
      recordType: 'transaction',
      transactionType: 'outgoing',
      status: 'completed',
      'metadata.sourceType': { $nin: ['salary', 'allowance', 'incentive', 'reward', 'pmReward', 'expenseEntry', 'projectExpense'] },
      category: { $nin: ['Salary Payment', 'Employee Allowance', 'Incentive Payment', 'Reward Payment', 'Sales Incentive', 'PM Reward'] }
    };
  } else {
    otherExpenseFilter = {
      recordType: 'transaction',
      transactionType: 'outgoing',
      status: 'completed',
      'metadata.sourceType': { $nin: ['salary', 'allowance', 'incentive', 'reward', 'pmReward', 'expenseEntry', 'projectExpense'] },
      category: { $nin: ['Salary Payment', 'Employee Allowance', 'Incentive Payment', 'Reward Payment', 'Sales Incentive', 'PM Reward'] }
    };
  }
  const otherExpenses = await AdminFinance.aggregate([
    { $match: otherExpenseFilter },
    { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
  ]);
  const otherExpensesAmount = otherExpenses[0]?.totalAmount || 0;

  // Total Expenses
  const totalExpenses = salaryExpensesAmount + recurringExpensesAmount +
    incentiveExpensesAmount + rewardExpensesAmount + projectExpensesAmount + otherExpensesAmount;

  // ========== PENDING AMOUNTS ==========

  // Note: All revenue comes from projects only
  // Sales team creates projects with cost, Admin manages project cost and installments
  // PMs cannot create payments or change project costs
  // Manual transactions can be created by Admin, but those are already completed (not pending)

  // Pending Salaries
  let pendingSalaryFilter = { status: 'pending' };

  // Apply time filter if needed
  if (timeFilter !== 'all') {
    switch (timeFilter) {
      case 'day':
      case 'today':
      case 'week':
      case 'month':
        // For today/week/month, show pending salaries for CURRENT MONTH only
        pendingSalaryFilter.month = currentMonthStr;
        break;
      case 'year':
        // For year, show pending salaries for current year (from Jan to current month, exclude future months)
        const yearStartStr = `${currentYear}-01`;
        pendingSalaryFilter.month = {
          $gte: yearStartStr,  // From start of year
          $lte: currentMonthStr // Up to current month (exclude future months)
        };
        break;
    }
  }
  // For 'all' time filter, show all pending salaries (no month restriction)

  const pendingSalaries = await Salary.aggregate([
    { $match: pendingSalaryFilter },
    { $group: { _id: null, totalAmount: { $sum: '$fixedSalary' } } }
  ]);
  const pendingSalariesAmount = pendingSalaries[0]?.totalAmount || 0;

  // Pending/Due Recurring Expenses (pending + overdue entries)
  const pendingRecurringExpenses = await ExpenseEntry.aggregate([
    { $match: { status: { $in: ['pending', 'overdue'] } } },
    { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
  ]);
  const pendingRecurringExpensesAmount = pendingRecurringExpenses[0]?.totalAmount || 0;

  // Pending Outstanding Amounts from Projects
  // This represents ALL money still owed by clients for projects
  // Only Sales team can create projects with cost, Admin manages project cost and installments
  // Calculation includes:
  // 1. Project remainingAmount (Total Cost - Advance - Paid Installments)
  // 2. Pending installments (scheduled but not paid)

  // Calculate pending outstanding from project remainingAmount
  // remainingAmount = totalCost - advanceReceived (which includes all paid installments and receipts)
  // This is the most accurate source as it reflects the actual remaining balance
  const pendingProjectOutstanding = await Project.aggregate([
    {
      $match: {
        'financialDetails.remainingAmount': { $gt: 0 },
        'financialDetails.totalCost': { $gt: 0 },
        'financialDetails.advanceReceived': { $gt: 0 }
      }
    },
    { $group: { _id: null, totalAmount: { $sum: '$financialDetails.remainingAmount' } } }
  ]);
  const pendingProjectOutstandingFinal = pendingProjectOutstanding[0]?.totalAmount || 0;

  // Total Pending Receivables = Only Project Outstanding (all revenue comes from projects)
  const totalPendingReceivables = pendingProjectOutstandingFinal;
  const totalPendingPayables = pendingSalariesAmount + pendingRecurringExpensesAmount;

  // ========== TODAY'S METRICS ==========

  // Today's Earnings
  // Note: Project Advances (advanceReceived) is NOT counted separately to avoid double counting
  // with Payment Receipts and Installments, which are already included in advanceReceived

  // Today's Payments (completed today)
  const todayPayments = await Payment.aggregate([
    { $match: { paidAt: { $gte: todayStart, $lte: todayEnd }, status: 'completed' } },
    { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
  ]);
  const todayPaymentsAmount = todayPayments[0]?.totalAmount || 0;

  // Today's Payment Receipts (approved today)
  const todayPaymentReceipts = await PaymentReceipt.aggregate([
    { $match: { verifiedAt: { $gte: todayStart, $lte: todayEnd }, status: 'approved' } },
    { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
  ]);
  const todayPaymentReceiptsAmount = todayPaymentReceipts[0]?.totalAmount || 0;

  // Today's Paid Installments
  const todayInstallments = await Project.aggregate([
    { $unwind: '$installmentPlan' },
    {
      $match: {
        'installmentPlan.status': 'paid',
        'installmentPlan.paidDate': { $gte: todayStart, $lte: todayEnd }
      }
    },
    { $group: { _id: null, totalAmount: { $sum: '$installmentPlan.amount' } } }
  ]);
  const todayInstallmentsAmount = todayInstallments[0]?.totalAmount || 0;

  // Today's Other Incoming Transactions (excluding payments and installments to avoid double counting)
  const todayOtherTransactions = await AdminFinance.aggregate([
    {
      $match: {
        transactionDate: { $gte: todayStart, $lte: todayEnd },
        recordType: 'transaction',
        transactionType: 'incoming',
        status: 'completed',
        'metadata.sourceType': { $nin: ['payment', 'projectInstallment', 'paymentReceipt'] }
      }
    },
    { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
  ]);
  const todayOtherTransactionsAmount = todayOtherTransactions[0]?.totalAmount || 0;

  // Today's Earnings - ALL incoming amounts
  const todayEarnings = todayPaymentsAmount + todayPaymentReceiptsAmount +
    todayInstallmentsAmount + todayOtherTransactionsAmount;

  // Today's Expenses
  // Use 'month' field to match HR Management - salaries paid today belong to current month
  const todaySalaries = await Salary.aggregate([
    { $match: { month: currentMonthStr, paidDate: { $gte: todayStart, $lte: todayEnd }, status: 'paid' } },
    { $group: { _id: null, totalAmount: { $sum: '$fixedSalary' } } }
  ]);
  const todaySalariesAmount = todaySalaries[0]?.totalAmount || 0;

  const todayExpenseEntries = await ExpenseEntry.aggregate([
    { $match: { paidDate: { $gte: todayStart, $lte: todayEnd }, status: 'paid' } },
    { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
  ]);
  const todayExpenseEntriesAmount = todayExpenseEntries[0]?.totalAmount || 0;

  // Today's Project Expenses
  const todayProjectsWithExpenses = await Project.find({
    'expenses.expenseDate': { $gte: todayStart, $lte: todayEnd }
  }).select('expenses expenseConfig.included');

  let todayProjectExpensesAmount = 0;
  todayProjectsWithExpenses.forEach(project => {
    const isExcludedProject =
      project.expenseConfig && project.expenseConfig.included === false;

    if (isExcludedProject) {
      return;
    }

    if (project.expenses && project.expenses.length > 0) {
      project.expenses.forEach(expense => {
        const expenseDate = new Date(expense.expenseDate);
        if (expenseDate >= todayStart && expenseDate <= todayEnd) {
          todayProjectExpensesAmount += expense.amount || 0;
        }
      });
    }
  });

  // Today's Incentives (paid today)
  const todayIncentives = await Incentive.aggregate([
    { $match: { paidAt: { $gte: todayStart, $lte: todayEnd }, status: 'paid' } },
    { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
  ]);
  const todayIncentivesAmount = todayIncentives[0]?.totalAmount || 0;

  // Today's Rewards (paid today)
  // Use only paidAt to match Incentives logic and ensure we only count actual payments, not awards
  const todayRewards = await PMReward.aggregate([
    {
      $match: {
        status: 'paid',
        paidAt: { $gte: todayStart, $lte: todayEnd }
      }
    },
    { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
  ]);
  const todayRewardsAmount = todayRewards[0]?.totalAmount || 0;

  // Today's Other Expenses (other outgoing transactions not from above sources)
  // Exclude projectExpense - counted in todayProjectExpensesAmount
  const todayOtherExpenses = await AdminFinance.aggregate([
    {
      $match: {
        transactionDate: { $gte: todayStart, $lte: todayEnd },
        recordType: 'transaction',
        transactionType: 'outgoing',
        status: 'completed',
        'metadata.sourceType': { $nin: ['salary', 'allowance', 'incentive', 'pmReward', 'expenseEntry', 'projectExpense'] },
        category: { $nin: ['Salary Payment', 'Employee Allowance', 'Sales Incentive', 'PM Reward'] }
      }
    },
    { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
  ]);
  const todayOtherExpensesAmount = todayOtherExpenses[0]?.totalAmount || 0;

  // Note: Allowances are ongoing expenses, so for "today" we should only count newly issued ones
  // But for consistency with total expenses (which counts all active), we'll keep the current logic
  // However, to match the total expenses calculation better, we should note that allowances
  // in total expenses are all active ones, not filtered by date. For today's calculation,
  // we're using issueDate which is more accurate for "today's expenses"

  const todayExpenses = todaySalariesAmount + todayExpenseEntriesAmount +
    todayProjectExpensesAmount + todayIncentivesAmount + todayRewardsAmount + todayOtherExpensesAmount;
  const todayProfit = todayEarnings - todayExpenses;

  // ========== OTHER METRICS ==========

  // Total Sales - Sum of all project costs (total value of all projects sold/created)
  // This represents the total sales made where an advance payment has been approved.
  // Includes all projects: sales team created, admin created, all clients,
  // but only those with financialDetails.advanceReceived > 0.
  const totalSalesAggregation = await Project.aggregate([
    {
      $match: {
        'financialDetails.totalCost': { $gt: 0 },
        'financialDetails.advanceReceived': { $gt: 0 }
      }
    },
    { $group: { _id: null, totalAmount: { $sum: '$financialDetails.totalCost' } } }
  ]);
  const totalSalesAllTime = totalSalesAggregation[0]?.totalAmount || 0;

  // Get active projects
  const activeProjects = await Project.countDocuments({
    status: { $in: ['active', 'started', 'in-progress'] }
  });

  // Get total clients
  const totalClients = await Client.countDocuments({ isActive: true });

  // Calculate profit/loss
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  // ========== PERCENTAGE CHANGES ==========
  let revenueChange = 0;
  let expensesChange = 0;
  let profitChange = 0;

  if (timeFilter === 'month') {
    // Compare with last month - query same sources (ALL incoming amounts)
    const lastMonthPayments = await Payment.aggregate([
      { $match: { paidAt: { $gte: lastMonthStart, $lte: lastMonthEnd }, status: 'completed' } },
      { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
    ]);
    // Note: Project Advances not counted to avoid double counting (same as current month)
    const lastMonthReceiptRevenue = await PaymentReceipt.aggregate([
      { $match: { verifiedAt: { $gte: lastMonthStart, $lte: lastMonthEnd }, status: 'approved' } },
      { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
    ]);
    const lastMonthInstallmentRevenue = await Project.aggregate([
      { $unwind: '$installmentPlan' },
      {
        $match: {
          'installmentPlan.status': 'paid',
          'installmentPlan.paidDate': { $gte: lastMonthStart, $lte: lastMonthEnd }
        }
      },
      { $group: { _id: null, totalAmount: { $sum: '$installmentPlan.amount' } } }
    ]);
    const lastMonthTransactionRevenue = await AdminFinance.aggregate([
      { $match: { transactionDate: { $gte: lastMonthStart, $lte: lastMonthEnd }, recordType: 'transaction', transactionType: 'incoming', status: 'completed', 'metadata.sourceType': { $nin: ['payment', 'projectInstallment', 'paymentReceipt'] } } },
      { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
    ]);
    // Last month revenue - ALL incoming amounts (excluding project advances to avoid double counting)
    const lastMonthRevenue = (lastMonthPayments[0]?.totalAmount || 0) +
      (lastMonthReceiptRevenue[0]?.totalAmount || 0) +
      (lastMonthInstallmentRevenue[0]?.totalAmount || 0) +
      (lastMonthTransactionRevenue[0]?.totalAmount || 0);

    // Use 'month' field to match HR Management - calculate last month's month string
    const lastMonthYear = now.getFullYear();
    const lastMonthNum = now.getMonth(); // 0-11, current month - 1
    const lastMonthStr = `${lastMonthYear}-${String(lastMonthNum + 1).padStart(2, '0')}`;
    const lastMonthSalary = await Salary.aggregate([
      { $match: { month: lastMonthStr, status: 'paid' } },
      { $group: { _id: null, totalAmount: { $sum: '$fixedSalary' } } }
    ]);
    const lastMonthExpenseEntries = await ExpenseEntry.aggregate([
      { $match: { paidDate: { $gte: lastMonthStart, $lte: lastMonthEnd }, status: 'paid' } },
      { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
    ]);

    // Last Month Project Expenses
    // Note: Date filtering is already done in MongoDB query, no need for redundant JavaScript filtering
    const lastMonthProjectsWithExpenses = await Project.find({
      'expenses.expenseDate': { $gte: lastMonthStart, $lte: lastMonthEnd }
    }).select('expenses expenseConfig.included');

    let lastMonthProjectExpensesAmount = 0;
    lastMonthProjectsWithExpenses.forEach(project => {
      const isExcludedProject =
        project.expenseConfig && project.expenseConfig.included === false;

      if (isExcludedProject) {
        return;
      }

      if (project.expenses && project.expenses.length > 0) {
        project.expenses.forEach(expense => {
          lastMonthProjectExpensesAmount += expense.amount || 0;
        });
      }
    });

    // Note: Allowances are physical assets, not expenses, so we don't count them
    const lastMonthIncentives = await Incentive.aggregate([
      { $match: { paidAt: { $gte: lastMonthStart, $lte: lastMonthEnd }, status: 'paid' } },
      { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
    ]);
    const lastMonthRewards = await PMReward.aggregate([
      { $match: { paidAt: { $gte: lastMonthStart, $lte: lastMonthEnd }, status: 'paid' } },
      { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
    ]);
    const lastMonthOtherExpenses = await AdminFinance.aggregate([
      {
        $match: {
          transactionDate: { $gte: lastMonthStart, $lte: lastMonthEnd },
          recordType: 'transaction',
          transactionType: 'outgoing',
          status: 'completed',
          'metadata.sourceType': { $nin: ['salary', 'allowance', 'incentive', 'reward', 'pmReward', 'expenseEntry', 'projectExpense'] },
          category: { $nin: ['Salary Payment', 'Employee Allowance', 'Incentive Payment', 'Reward Payment', 'Sales Incentive', 'PM Reward'] }
        }
      },
      { $group: { _id: null, totalAmount: { $sum: '$amount' } } }
    ]);
    const lastMonthExpenses = (lastMonthSalary[0]?.totalAmount || 0) +
      (lastMonthExpenseEntries[0]?.totalAmount || 0) +
      lastMonthProjectExpensesAmount +
      (lastMonthIncentives[0]?.totalAmount || 0) +
      (lastMonthRewards[0]?.totalAmount || 0) +
      (lastMonthOtherExpenses[0]?.totalAmount || 0);

    const lastMonthProfit = lastMonthRevenue - lastMonthExpenses;

    if (lastMonthRevenue > 0) {
      revenueChange = ((totalRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
    }
    if (lastMonthExpenses > 0) {
      expensesChange = ((totalExpenses - lastMonthExpenses) / lastMonthExpenses) * 100;
    }
    if (lastMonthProfit !== 0) {
      profitChange = ((netProfit - lastMonthProfit) / Math.abs(lastMonthProfit)) * 100;
    }
  }

  res.status(200).json({
    success: true,
    data: {
      totalRevenue,
      totalSales: totalSalesAmount,
      totalSalesAllTime,
      totalExpenses,
      netProfit,
      profitMargin: profitMargin.toFixed(2),
      revenueBreakdown: {
        paymentRevenue: paymentRevenueAmount, // Completed payments from Payment model
        projectInstallmentRevenue: projectInstallmentRevenueAmount, // Paid installments
        paymentReceiptRevenue: paymentReceiptRevenueAmount, // Approved payment receipts
        transactionRevenue: transactionRevenueAmount // Other incoming transactions (manual, etc.)
        // Note: Project Advances not included to avoid double counting with receipts and installments
      },
      expenseBreakdown: {
        salaryExpenses: salaryExpensesAmount,
        recurringExpenses: recurringExpensesAmount,
        dueRecurringExpenses: pendingRecurringExpensesAmount, // Due/pending recurring expenses
        monthlyRecurringExpenses: monthlyRecurringExpensesBreakdown, // Month-wise breakdown
        projectExpenses: projectExpensesAmount, // Total project expenses
        incentiveExpenses: incentiveExpensesAmount,
        rewardExpenses: rewardExpensesAmount,
        otherExpenses: otherExpensesAmount
      },
      pendingAmounts: {
        pendingSalaries: pendingSalariesAmount,
        pendingRecurringExpenses: pendingRecurringExpensesAmount,
        pendingProjectOutstanding: pendingProjectOutstandingFinal,
        totalPendingReceivables,
        totalPendingPayables
      },
      todayEarnings,
      todayExpenses,
      todayProfit,
      revenueChange: revenueChange.toFixed(1),
      expensesChange: expensesChange.toFixed(1),
      profitChange: profitChange.toFixed(1),
      activeProjects,
      totalClients,
      // Legacy fields for backward compatibility
      rewardMoney: rewardExpensesAmount,
      employeeSalary: salaryExpensesAmount,
      otherExpenses: otherExpensesAmount,
      profitLoss: netProfit
    }
  });
});

// ========== ACCOUNT MANAGEMENT ==========

// @desc    Get all accounts
// @route   GET /api/admin/finance/accounts
// @access  Admin only
const getAccounts = asyncHandler(async (req, res, next) => {
  const { isActive } = req.query;

  const filter = {};
  if (isActive !== undefined) {
    filter.isActive = isActive === 'true';
  }

  const accounts = await Account.find(filter)
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: accounts.length,
    data: accounts
  });
});

// @desc    Get single account
// @route   GET /api/admin/finance/accounts/:id
// @access  Admin only
const getAccount = asyncHandler(async (req, res, next) => {
  const account = await Account.findById(req.params.id)
    .populate('createdBy', 'name email');

  if (!account) {
    return next(new ErrorResponse('Account not found', 404));
  }

  res.status(200).json({
    success: true,
    data: account
  });
});

// @desc    Create new account
// @route   POST /api/admin/finance/accounts
// @access  Admin only
const createAccount = asyncHandler(async (req, res, next) => {
  // Check if admin is authenticated
  if (!req.admin || !req.admin._id) {
    return next(new ErrorResponse('Admin authentication required', 401));
  }

  const {
    accountName,
    bankName,
    accountNumber,
    ifscCode,
    branchName,
    accountType,
    description,
    isActive
  } = req.body;

  // Validate required fields
  if (!accountName || !bankName || !accountNumber) {
    return next(new ErrorResponse('Account name, bank name, and account number are required', 400));
  }

  // Check if account number already exists
  const existingAccount = await Account.findOne({ accountNumber });
  if (existingAccount) {
    return next(new ErrorResponse('Account with this account number already exists', 400));
  }

  const accountData = {
    accountName,
    bankName,
    accountNumber,
    ifscCode: ifscCode ? ifscCode.toUpperCase() : undefined,
    branchName,
    accountType: accountType || 'current',
    description,
    isActive: isActive !== undefined ? isActive : true,
    createdBy: req.admin._id
  };

  const account = await Account.create(accountData);

  await account.populate('createdBy', 'name email');

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    data: account
  });
});

// @desc    Update account
// @route   PUT /api/admin/finance/accounts/:id
// @access  Admin only
const updateAccount = asyncHandler(async (req, res, next) => {
  const {
    accountName,
    bankName,
    accountNumber,
    ifscCode,
    branchName,
    accountType,
    description,
    isActive
  } = req.body;

  let account = await Account.findById(req.params.id);

  if (!account) {
    return next(new ErrorResponse('Account not found', 404));
  }

  // Check if account number is being changed and if it already exists
  if (accountNumber && accountNumber !== account.accountNumber) {
    const existingAccount = await Account.findOne({ accountNumber });
    if (existingAccount) {
      return next(new ErrorResponse('Account with this account number already exists', 400));
    }
  }

  // Update fields
  if (accountName !== undefined) account.accountName = accountName;
  if (bankName !== undefined) account.bankName = bankName;
  if (accountNumber !== undefined) account.accountNumber = accountNumber;
  if (ifscCode !== undefined) account.ifscCode = ifscCode ? ifscCode.toUpperCase() : ifscCode;
  if (branchName !== undefined) account.branchName = branchName;
  if (accountType !== undefined) account.accountType = accountType;
  if (description !== undefined) account.description = description;
  if (isActive !== undefined) account.isActive = isActive;

  await account.save();

  await account.populate('createdBy', 'name email');

  res.status(200).json({
    success: true,
    message: 'Account updated successfully',
    data: account
  });
});

// @desc    Delete account
// @route   DELETE /api/admin/finance/accounts/:id
// @access  Admin only
const deleteAccount = asyncHandler(async (req, res, next) => {
  const account = await Account.findById(req.params.id);

  if (!account) {
    return next(new ErrorResponse('Account not found', 404));
  }

  // Check if account is used in any transactions
  const transactionCount = await AdminFinance.countDocuments({ account: account._id });
  if (transactionCount > 0) {
    return next(new ErrorResponse(`Cannot delete account. It is used in ${transactionCount} transaction(s)`, 400));
  }

  await account.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Account deleted successfully',
    data: {}
  });
});

// ========== EXPENSE MANAGEMENT ==========

// @desc    Get all expenses (outgoing transactions)
// @route   GET /api/admin/finance/expenses
// @access  Admin only
const getExpenses = asyncHandler(async (req, res, next) => {
  const {
    status,
    category,
    startDate,
    endDate,
    page = 1,
    limit = 20,
    search
  } = req.query;

  // Build filter - expenses are outgoing transactions
  const filter = {
    recordType: 'transaction',
    transactionType: 'outgoing'
  };

  if (status) filter.status = status;
  if (category) filter.category = { $regex: category, $options: 'i' };

  // Date range filter
  if (startDate || endDate) {
    filter.transactionDate = {};
    if (startDate) filter.transactionDate.$gte = new Date(startDate);
    if (endDate) filter.transactionDate.$lte = new Date(endDate);
  }

  // Search filter - MongoDB will automatically AND this with other conditions
  if (search) {
    filter.$or = [
      { category: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { vendor: { $regex: search, $options: 'i' } }
    ];
  }

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  try {
    const expenses = await AdminFinance.find(filter)
      .populate({
        path: 'employee',
        select: 'name email department',
        strictPopulate: false // Don't throw error if reference doesn't exist
      })
      .populate({
        path: 'client',
        select: 'name email companyName',
        strictPopulate: false
      })
      .populate({
        path: 'project',
        select: 'name status',
        strictPopulate: false
      })
      .populate({
        path: 'createdBy',
        select: 'name email',
        strictPopulate: false
      })
      .sort({ createdAt: -1, transactionDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AdminFinance.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: expenses.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: expenses
    });
  } catch (error) {
    console.error('Error in getExpenses:', error);
    return next(new ErrorResponse(error.message || 'Failed to fetch expenses', 500));
  }
});

// @desc    Get single expense (outgoing transaction)
// @route   GET /api/admin/finance/expenses/:id
// @access  Admin only
const getExpense = asyncHandler(async (req, res, next) => {
  const expense = await AdminFinance.findOne({
    _id: req.params.id,
    recordType: 'transaction',
    transactionType: 'outgoing'
  })
    .populate('employee', 'name email department')
    .populate('client', 'name email companyName')
    .populate('project', 'name status')
    .populate('createdBy', 'name email');

  if (!expense) {
    return next(new ErrorResponse('Expense not found', 404));
  }

  res.status(200).json({
    success: true,
    data: expense
  });
});

// @desc    Create new expense (outgoing transaction)
// @route   POST /api/admin/finance/expenses
// @access  Admin only
const createExpense = asyncHandler(async (req, res, next) => {
  // Check if admin is authenticated
  if (!req.admin || !req.admin._id) {
    return next(new ErrorResponse('Admin authentication required', 401));
  }

  const {
    category,
    amount,
    date,
    description
  } = req.body;

  // Validate required fields
  if (!category || !amount || !date) {
    return next(new ErrorResponse('Category, amount, and date are required', 400));
  }

  // Create expense as outgoing transaction
  const expenseData = {
    recordType: 'transaction',
    transactionType: 'outgoing', // Expenses are outgoing transactions
    category,
    amount: parseFloat(amount),
    transactionDate: new Date(date),
    description: description || '',
    createdBy: req.admin._id,
    status: 'completed' // Expenses are typically completed when created
  };

  try {
    const expense = await AdminFinance.create(expenseData);

    // Populate references for response
    await expense.populate([
      { path: 'employee', select: 'name email department' },
      { path: 'client', select: 'name email companyName' },
      { path: 'project', select: 'name status' },
      { path: 'createdBy', select: 'name email' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Expense created successfully',
      data: expense
    });
  } catch (error) {
    console.error('Error creating expense:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((errItem) => errItem.message).join(', ');
      return next(new ErrorResponse(messages, 400));
    }
    return next(new ErrorResponse(error.message || 'Failed to create expense', 500));
  }
});

// @desc    Update expense (outgoing transaction)
// @route   PUT /api/admin/finance/expenses/:id
// @access  Admin only
const updateExpense = asyncHandler(async (req, res, next) => {
  const {
    category,
    amount,
    date,
    description,
    status
  } = req.body;

  let expense = await AdminFinance.findOne({
    _id: req.params.id,
    recordType: 'transaction',
    transactionType: 'outgoing'
  });

  if (!expense) {
    return next(new ErrorResponse('Expense not found', 404));
  }

  // Update fields
  if (category) expense.category = category;
  if (amount !== undefined) expense.amount = parseFloat(amount);
  if (date) expense.transactionDate = new Date(date);
  if (description !== undefined) expense.description = description;
  if (status) expense.status = status;

  await expense.save();

  // Populate references for response
  await expense.populate([
    { path: 'employee', select: 'name email department' },
    { path: 'client', select: 'name email companyName' },
    { path: 'project', select: 'name status' },
    { path: 'createdBy', select: 'name email' }
  ]);

  res.status(200).json({
    success: true,
    message: 'Expense updated successfully',
    data: expense
  });
});

// @desc    Delete expense (outgoing transaction)
// @route   DELETE /api/admin/finance/expenses/:id
// @access  Admin only
const deleteExpense = asyncHandler(async (req, res, next) => {
  const expense = await AdminFinance.findOne({
    _id: req.params.id,
    recordType: 'transaction',
    transactionType: 'outgoing'
  });

  if (!expense) {
    return next(new ErrorResponse('Expense not found', 404));
  }

  await expense.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Expense deleted successfully',
    data: {}
  });
});

// @desc    Approve expense (outgoing transaction)
// @route   PUT /api/admin/finance/expenses/:id/approve
// @access  Admin only
const approveExpense = asyncHandler(async (req, res, next) => {
  if (!req.admin || !req.admin._id) {
    return next(new ErrorResponse('Admin authentication required', 401));
  }

  const expense = await AdminFinance.findOne({
    _id: req.params.id,
    recordType: 'transaction',
    transactionType: 'outgoing'
  });

  if (!expense) {
    return next(new ErrorResponse('Expense not found', 404));
  }

  // Update status to completed (approved)
  expense.status = 'completed';
  await expense.save();

  await expense.populate([
    { path: 'employee', select: 'name email department' },
    { path: 'client', select: 'name email companyName' },
    { path: 'project', select: 'name status' },
    { path: 'createdBy', select: 'name email' }
  ]);

  res.status(200).json({
    success: true,
    message: 'Expense approved successfully',
    data: expense
  });
});

// ========== BUDGET MANAGEMENT ==========

// Helper function to calculate spent amount for a budget
const calculateBudgetSpent = async (budget) => {
  try {
    // Calculate spent amount from outgoing transactions that match the budget category
    // and fall within the budget date range
    const outgoingTransactions = await AdminFinance.aggregate([
      {
        $match: {
          recordType: 'transaction',
          transactionType: 'outgoing',
          category: budget.budgetCategory,
          transactionDate: {
            $gte: budget.startDate,
            $lte: budget.endDate
          },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalSpent: { $sum: '$amount' }
        }
      }
    ]);

    return outgoingTransactions.length > 0 ? outgoingTransactions[0].totalSpent : 0;
  } catch (error) {
    console.error('Error calculating budget spent:', error);
    return 0;
  }
};

// @desc    Get all budgets
// @route   GET /api/admin/finance/budgets
// @access  Admin only
const getBudgets = asyncHandler(async (req, res, next) => {
  const {
    status,
    category,
    startDate,
    endDate,
    page = 1,
    limit = 20,
    search
  } = req.query;

  // Build filter
  const filter = {
    recordType: 'budget'
  };

  if (status) filter.status = status;
  if (category) filter.budgetCategory = { $regex: category, $options: 'i' };

  // Date range filter
  if (startDate || endDate) {
    filter.$or = [
      { startDate: { $gte: new Date(startDate), $lte: new Date(endDate || '2099-12-31') } },
      { endDate: { $gte: new Date(startDate || '1970-01-01'), $lte: new Date(endDate) } }
    ];
  }

  // Search filter
  if (search) {
    const searchRegex = { $regex: search, $options: 'i' };
    filter.$or = [
      { budgetName: searchRegex },
      { budgetCategory: searchRegex },
      { description: searchRegex }
    ];
  }

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const budgets = await AdminFinance.find(filter)
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  // Calculate spent amount for each budget
  const budgetsWithSpent = await Promise.all(
    budgets.map(async (budget) => {
      const spentAmount = await calculateBudgetSpent(budget);
      budget.spentAmount = spentAmount;
      budget.remainingAmount = budget.allocatedAmount - spentAmount;
      await budget.save();
      return budget;
    })
  );

  const total = await AdminFinance.countDocuments(filter);

  res.status(200).json({
    success: true,
    count: budgetsWithSpent.length,
    total,
    page: parseInt(page),
    pages: Math.ceil(total / parseInt(limit)),
    data: budgetsWithSpent
  });
});

// @desc    Get single budget
// @route   GET /api/admin/finance/budgets/:id
// @access  Admin only
const getBudget = asyncHandler(async (req, res, next) => {
  const budget = await AdminFinance.findOne({
    _id: req.params.id,
    recordType: 'budget'
  })
    .populate('createdBy', 'name email');

  if (!budget) {
    return next(new ErrorResponse('Budget not found', 404));
  }

  // Calculate spent amount
  const spentAmount = await calculateBudgetSpent(budget);
  budget.spentAmount = spentAmount;
  budget.remainingAmount = budget.allocatedAmount - spentAmount;
  await budget.save();

  res.status(200).json({
    success: true,
    data: budget
  });
});

// @desc    Create new budget
// @route   POST /api/admin/finance/budgets
// @access  Admin only
const createBudget = asyncHandler(async (req, res, next) => {
  // Check if admin is authenticated
  if (!req.admin || !req.admin._id) {
    return next(new ErrorResponse('Admin authentication required', 401));
  }

  const {
    name,
    category,
    allocated,
    startDate,
    endDate,
    description,
    projects
  } = req.body;

  // Validate required fields
  if (!name || !category || !allocated || !startDate || !endDate) {
    return next(new ErrorResponse('Name, category, allocated amount, start date, and end date are required', 400));
  }

  // Validate dates
  if (new Date(startDate) >= new Date(endDate)) {
    return next(new ErrorResponse('End date must be after start date', 400));
  }

  // Create budget record
  const budgetData = {
    recordType: 'budget',
    budgetName: name,
    budgetCategory: category,
    allocatedAmount: parseFloat(allocated),
    spentAmount: 0,
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    description: description || '',
    createdBy: req.admin._id,
    status: 'active'
  };

  // Add projects if provided
  if (projects && Array.isArray(projects) && projects.length > 0) {
    budgetData.budgetProjects = projects;
  }

  try {
    const budget = await AdminFinance.create(budgetData);

    // Calculate initial spent amount
    const spentAmount = await calculateBudgetSpent(budget);
    budget.spentAmount = spentAmount;
    budget.remainingAmount = budget.allocatedAmount - spentAmount;
    await budget.save();

    // Populate references for response
    await budget.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      message: 'Budget created successfully',
      data: budget
    });
  } catch (error) {
    console.error('Error creating budget:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((errItem) => errItem.message).join(', ');
      return next(new ErrorResponse(messages, 400));
    }
    return next(new ErrorResponse(error.message || 'Failed to create budget', 500));
  }
});

// @desc    Update budget
// @route   PUT /api/admin/finance/budgets/:id
// @access  Admin only
const updateBudget = asyncHandler(async (req, res, next) => {
  const {
    name,
    category,
    allocated,
    startDate,
    endDate,
    description,
    status,
    projects
  } = req.body;

  let budget = await AdminFinance.findOne({
    _id: req.params.id,
    recordType: 'budget'
  });

  if (!budget) {
    return next(new ErrorResponse('Budget not found', 404));
  }

  // Update fields
  if (name) budget.budgetName = name;
  if (category) budget.budgetCategory = category;
  if (allocated !== undefined) budget.allocatedAmount = parseFloat(allocated);
  if (startDate) budget.startDate = new Date(startDate);
  if (endDate) budget.endDate = new Date(endDate);
  if (description !== undefined) budget.description = description;
  if (status) budget.status = status;
  if (projects !== undefined) {
    budget.budgetProjects = Array.isArray(projects) ? projects : [];
  }

  // Validate dates if both are being updated
  if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
    return next(new ErrorResponse('End date must be after start date', 400));
  }

  // Recalculate spent amount after category or date changes
  if (category || startDate || endDate) {
    const spentAmount = await calculateBudgetSpent(budget);
    budget.spentAmount = spentAmount;
  }

  budget.remainingAmount = budget.allocatedAmount - budget.spentAmount;
  await budget.save();

  // Populate references for response
  await budget.populate('createdBy', 'name email');

  res.status(200).json({
    success: true,
    message: 'Budget updated successfully',
    data: budget
  });
});

// @desc    Delete budget
// @route   DELETE /api/admin/finance/budgets/:id
// @access  Admin only
const deleteBudget = asyncHandler(async (req, res, next) => {
  const budget = await AdminFinance.findOne({
    _id: req.params.id,
    recordType: 'budget'
  });

  if (!budget) {
    return next(new ErrorResponse('Budget not found', 404));
  }

  await budget.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Budget deleted successfully',
    data: {}
  });
});

// @desc    Record sales incentive payment (helper function)
// @access  Internal
const recordSalesIncentivePayment = async (salesEmployeeId, amount, transactionDate, adminId) => {
  try {
    const transactionData = {
      recordType: 'transaction',
      transactionType: 'outgoing',
      category: 'Sales Incentives',
      amount: parseFloat(amount),
      transactionDate: transactionDate || new Date(),
      paymentMethod: 'Bank Transfer',
      description: 'Sales conversion incentive payment',
      employee: salesEmployeeId,
      createdBy: adminId,
      status: 'completed'
    };

    const transaction = await AdminFinance.create(transactionData);
    return transaction;
  } catch (error) {
    console.error('Error recording sales incentive payment:', error);
    throw error;
  }
};

// @desc    Get sales incentive monthly summary
// @route   GET /api/admin/finance/sales-incentives/monthly-summary
// @access  Admin only
const getSalesIncentiveMonthlySummary = asyncHandler(async (req, res, next) => {
  const { year, month } = req.query;

  if (!year || !month) {
    return next(new ErrorResponse('Year and month are required', 400));
  }

  const yearNum = parseInt(year);
  const monthNum = parseInt(month);

  if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
    return next(new ErrorResponse('Invalid year or month', 400));
  }

  const startDate = new Date(yearNum, monthNum - 1, 1, 0, 0, 0, 0);
  const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);

  try {
    const Incentive = require('../models/Incentive');
    const Sales = require('../models/Sales');

    // Get all conversion-based incentives for the month
    const incentives = await Incentive.find({
      isConversionBased: true,
      dateAwarded: {
        $gte: startDate,
        $lte: endDate
      }
    })
      .populate('salesEmployee', 'name email employeeId')
      .populate('clientId', 'name')
      .populate('projectId', 'name')
      .sort({ dateAwarded: -1 });

    // Aggregate by sales employee
    const employeeMap = new Map();
    let totalAmount = 0;
    let totalCurrentBalance = 0;
    let totalPendingBalance = 0;

    incentives.forEach(incentive => {
      const salesId = incentive.salesEmployee._id.toString();

      if (!employeeMap.has(salesId)) {
        employeeMap.set(salesId, {
          salesEmployee: {
            id: incentive.salesEmployee._id,
            name: incentive.salesEmployee.name,
            email: incentive.salesEmployee.email,
            employeeId: incentive.salesEmployee.employeeId
          },
          totalAmount: 0,
          currentBalance: 0,
          pendingBalance: 0,
          incentiveCount: 0,
          incentives: []
        });
      }

      const employeeData = employeeMap.get(salesId);
      employeeData.totalAmount += incentive.amount;
      employeeData.currentBalance += incentive.currentBalance || 0;
      employeeData.pendingBalance += incentive.pendingBalance || 0;
      employeeData.incentiveCount += 1;
      employeeData.incentives.push({
        id: incentive._id,
        amount: incentive.amount,
        currentBalance: incentive.currentBalance || 0,
        pendingBalance: incentive.pendingBalance || 0,
        clientName: incentive.clientId?.name || 'Unknown',
        projectName: incentive.projectId?.name || 'Unknown',
        dateAwarded: incentive.dateAwarded
      });

      totalAmount += incentive.amount;
      totalCurrentBalance += incentive.currentBalance || 0;
      totalPendingBalance += incentive.pendingBalance || 0;
    });

    const employeeBreakdown = Array.from(employeeMap.values())
      .sort((a, b) => b.totalAmount - a.totalAmount);

    // Get finance transactions for sales incentives in this month
    const financeTransactions = await AdminFinance.find({
      recordType: 'transaction',
      category: 'Sales Incentives',
      transactionDate: {
        $gte: startDate,
        $lte: endDate
      }
    })
      .populate('employee', 'name email employeeId')
      .sort({ transactionDate: -1 });

    res.status(200).json({
      success: true,
      data: {
        month: monthNum,
        year: yearNum,
        summary: {
          totalAmount,
          totalCurrentBalance,
          totalPendingBalance,
          totalIncentives: incentives.length,
          totalSalesEmployees: employeeMap.size
        },
        employeeBreakdown,
        financeTransactions: financeTransactions.map(t => ({
          id: t._id,
          amount: t.amount,
          transactionDate: t.transactionDate,
          salesEmployee: t.employee ? {
            id: t.employee._id,
            name: t.employee.name,
            email: t.employee.email,
            employeeId: t.employee.employeeId
          } : null,
          description: t.description
        }))
      }
    });
  } catch (error) {
    console.error('Error getting sales incentive monthly summary:', error);
    return next(new ErrorResponse('Failed to fetch sales incentive monthly summary', 500));
  }
});

// @desc    Get all projects with pending recovery (remaining amount to be collected)
// @route   GET /api/admin/finance/pending-recovery
// @access  Private (Admin/Finance)
const getPendingRecovery = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;

  const filter = {
    'financialDetails.remainingAmount': { $gt: 0 },
    'financialDetails.totalCost': { $gt: 0 },
    status: { $nin: ['cancelled'] }
  };

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  const projects = await Project.find(filter)
    .populate('client', 'name companyName convertedBy')
    .populate('submittedBy', 'name')
    .select('name status progress financialDetails submittedBy client')
    .sort({ createdAt: -1, 'financialDetails.remainingAmount': -1 })
    .lean();

  const data = projects.map((p) => {
    const totalCost = Number(p.financialDetails?.totalCost || p.budget || 0);
    const advanceReceived = Number(p.financialDetails?.advanceReceived || 0);
    const remainingAmount = Number(p.financialDetails?.remainingAmount || 0);
    const progress = Number(p.progress) || 0;
    const salesName = p.submittedBy?.name || null;
    const clientName = p.client?.companyName || p.client?.name || 'N/A';
    return {
      projectId: p._id,
      projectName: p.name,
      clientName,
      pendingRecovery: remainingAmount,
      recoveredAmount: advanceReceived,
      totalCost,
      relatedSalesOrCp: salesName || '—',
      progress: Math.min(100, Math.max(0, progress))
    };
  });

  res.status(200).json({
    success: true,
    data
  });
});

// @desc    Get all GST projects (projects with includeGST = true) for finance management
// @route   GET /api/admin/finance/gst-projects
// @access  Private (Admin/Finance)
const getGstProjects = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;

  const filter = {
    'financialDetails.includeGST': true,
    status: { $nin: ['cancelled'] }
  };

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  const projects = await Project.find(filter)
    .populate('client', 'name companyName phone email convertedBy')
    .populate('submittedBy', 'name')
    .populate('projectManager', 'name')
    .select('name status progress financialDetails submittedBy client projectManager dueDate')
    .sort({ createdAt: -1, 'financialDetails.remainingAmount': -1 })
    .lean();

  const data = projects.map((p) => {
    const totalCost = Number(p.financialDetails?.totalCost || p.budget || 0);
    const advanceReceived = Number(p.financialDetails?.advanceReceived || 0);
    const remainingAmount = Number(p.financialDetails?.remainingAmount || 0);
    const includeGST = !!p.financialDetails?.includeGST;
    // When includeGST: totalCost = base * 1.18, so base = totalCost/1.18, gstAmount = totalCost - base
    const baseCost = includeGST ? totalCost / 1.18 : totalCost;
    const gstAmount = includeGST ? Math.round(totalCost - baseCost) : 0;
    const progress = Number(p.progress) || 0;
    const salesName = p.submittedBy?.name || null;
    const client = p.client;
    const clientName = client?.companyName || client?.name || 'N/A';
    const clientPhone = client?.phone || null;
    const clientEmail = client?.email || null;
    return {
      projectId: p._id,
      projectName: p.name,
      projectStatus: p.status,
      progress: Math.min(100, Math.max(0, progress)),
      clientName,
      clientPhone,
      clientEmail,
      recoveredAmount: advanceReceived,
      pendingRecovery: remainingAmount,
      totalCost,
      gstApplied: gstAmount,
      baseCost: Math.round(baseCost),
      relatedSalesOrCp: salesName || '—'
    };
  });

  res.status(200).json({
    success: true,
    data
  });
});

module.exports = {
  createTransaction,
  getTransactions,
  getTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionStats,
  getAccounts,
  getAccount,
  createAccount,
  updateAccount,
  deleteAccount,
  getExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
  approveExpense,
  getBudgets,
  getBudget,
  createBudget,
  updateBudget,
  deleteBudget,
  getFinanceStatistics,
  recordSalesIncentivePayment,
  getSalesIncentiveMonthlySummary,
  getPendingRecovery,
  getGstProjects,
};
