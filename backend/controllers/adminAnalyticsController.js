const Project = require('../models/Project');
const Milestone = require('../models/Milestone');
const Task = require('../models/Task');
const Payment = require('../models/Payment');
const Employee = require('../models/Employee');
const PM = require('../models/PM');
const Client = require('../models/Client');
const Sales = require('../models/Sales');
const Lead = require('../models/Lead');
const AdminFinance = require('../models/AdminFinance');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// Helper function to get date range based on filter
const getDateRangeFromFilter = (timeFilter, startDate, endDate) => {
  const now = new Date();
  let dateFilter = {};
  let periodStart, periodEnd;
  
  // If no timeFilter or 'all', return empty filter (show all data)
  if (!timeFilter || timeFilter === 'all') {
    return { dateFilter: null, periodStart: null, periodEnd: null };
  }
  
  if (timeFilter === 'custom' && startDate && endDate) {
    periodStart = new Date(startDate);
    periodStart.setHours(0, 0, 0, 0);
    periodEnd = new Date(endDate);
    periodEnd.setHours(23, 59, 59, 999);
    dateFilter = { $gte: periodStart, $lte: periodEnd };
  } else {
    switch (timeFilter) {
      case 'day':
        periodStart = new Date(now);
        periodStart.setHours(0, 0, 0, 0);
        periodEnd = new Date(now);
        periodEnd.setHours(23, 59, 59, 999);
        dateFilter = { $gte: periodStart, $lte: periodEnd };
        break;
      case 'week':
        periodStart = new Date(now);
        periodStart.setDate(periodStart.getDate() - 6);
        periodStart.setHours(0, 0, 0, 0);
        periodEnd = new Date(now);
        periodEnd.setHours(23, 59, 59, 999);
        dateFilter = { $gte: periodStart, $lte: periodEnd };
        break;
      case 'month':
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodStart.setHours(0, 0, 0, 0);
        periodEnd = new Date(now);
        periodEnd.setHours(23, 59, 59, 999);
        dateFilter = { $gte: periodStart, $lte: periodEnd };
        break;
      case 'year':
        periodStart = new Date(now.getFullYear(), 0, 1);
        periodStart.setHours(0, 0, 0, 0);
        periodEnd = new Date(now);
        periodEnd.setHours(23, 59, 59, 999);
        dateFilter = { $gte: periodStart, $lte: periodEnd };
        break;
      default:
        // Default to current month
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodStart.setHours(0, 0, 0, 0);
        periodEnd = new Date(now);
        periodEnd.setHours(23, 59, 59, 999);
        dateFilter = { $gte: periodStart, $lte: periodEnd };
    }
  }
  
  return { dateFilter, periodStart, periodEnd };
};

// @desc    Get admin dashboard statistics
// @route   GET /api/admin/analytics/dashboard
// @access  Admin only
const getAdminDashboardStats = asyncHandler(async (req, res, next) => {
  const { timeFilter, startDate, endDate } = req.query;
  
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const yesterdayEnd = new Date(todayEnd);
  yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
  
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  
  // Get date range based on filter (null if 'all' or no filter)
  const { dateFilter, periodStart, periodEnd } = getDateRangeFromFilter(timeFilter, startDate, endDate);

  // Get user statistics - apply date filter for clients if filter is provided
  const clientFilter = (timeFilter && dateFilter) ? { createdAt: dateFilter } : {};
  const [totalEmployees, totalPMs, totalSales, totalClients, activeEmployees, activePMs, activeSales, activeClients] = await Promise.all([
    Employee.countDocuments(),
    PM.countDocuments(),
    Sales.countDocuments(),
    Client.countDocuments((timeFilter && dateFilter) ? clientFilter : {}),
    Employee.countDocuments({ isActive: true }),
    PM.countDocuments({ isActive: true }),
    Sales.countDocuments({ isActive: true }),
    Client.countDocuments({ 
      isActive: true,
      ...((timeFilter && dateFilter) ? { createdAt: dateFilter } : {})
    })
  ]);

  // Users new in the filtered period (or this month if no filter, or all time if 'all')
  const newUsersPeriod = (timeFilter && dateFilter && periodStart)
    ? await Promise.all([
        Employee.countDocuments({ createdAt: dateFilter }),
        PM.countDocuments({ createdAt: dateFilter }),
        Sales.countDocuments({ createdAt: dateFilter }),
        Client.countDocuments({ createdAt: dateFilter })
      ]).then(([employees, pms, sales, clients]) => employees + pms + sales + clients)
    : (!timeFilter || timeFilter === 'all')
    ? await Promise.all([
        Employee.countDocuments(),
        PM.countDocuments(),
        Sales.countDocuments(),
        Client.countDocuments()
      ]).then(([employees, pms, sales, clients]) => employees + pms + sales + clients)
    : await Promise.all([
        Employee.countDocuments({ createdAt: { $gte: currentMonthStart } }),
        PM.countDocuments({ createdAt: { $gte: currentMonthStart } }),
        Sales.countDocuments({ createdAt: { $gte: currentMonthStart } }),
        Client.countDocuments({ createdAt: { $gte: currentMonthStart } })
      ]).then(([employees, pms, sales, clients]) => employees + pms + sales + clients);

  // Calculate user growth
  const totalUsersLastMonth = await Promise.all([
    Employee.countDocuments({ createdAt: { $lt: currentMonthStart } }),
    PM.countDocuments({ createdAt: { $lt: currentMonthStart } }),
    Sales.countDocuments({ createdAt: { $lt: currentMonthStart } }),
    Client.countDocuments({ createdAt: { $lt: currentMonthStart } })
  ]).then(([employees, pms, sales, clients]) => employees + pms + sales + clients);
  
  const totalUsersNow = totalEmployees + totalPMs + totalSales + totalClients;
  const userGrowth = totalUsersLastMonth > 0 
    ? ((totalUsersNow - totalUsersLastMonth) / totalUsersLastMonth) * 100 
    : 0;

  // Get project statistics - apply date filter for overdue projects if filter is provided
  // For overdue projects, filter by creation date to show overdue projects created during the period
  // This is simpler and more intuitive - shows overdue projects from the selected time period
  let overdueFilter = {
    dueDate: { $lt: now }, // Must be overdue
    status: { $nin: ['completed', 'cancelled'] }
  };
  
  // If filter is provided, add creation date filter to show overdue projects from that period
  if (timeFilter && dateFilter && periodStart && periodEnd) {
    overdueFilter = {
      ...overdueFilter,
      createdAt: dateFilter // Created during the filter period
    };
  }
  
  const [totalProjects, activeProjects, completedProjects, onHoldProjects, overdueProjects] = await Promise.all([
    Project.countDocuments(),
    Project.countDocuments({ status: { $in: ['planning', 'active', 'on-hold', 'testing'] } }),
    Project.countDocuments({ status: 'completed' }),
    Project.countDocuments({ status: 'on-hold' }),
    Project.countDocuments(overdueFilter)
  ]);

  // Get project financial data
  // Business rule:
  // - A sale is only counted once an advance payment has been approved by admin.
  // - This is reflected when financialDetails.advanceReceived > 0
  //   (updated by PaymentReceipt/Payment hooks after approval).
  const projectFinancials = await Project.aggregate([
    {
      $match: {
        'financialDetails.totalCost': { $gt: 0 },
        'financialDetails.advanceReceived': { $gt: 0 }
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: { $ifNull: ['$financialDetails.totalCost', '$budget', 0] } },
        avgProjectValue: { $avg: { $ifNull: ['$financialDetails.totalCost', '$budget', 0] } },
        totalProjects: { $sum: 1 },
        completedProjects: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        }
      }
    }
  ]);

  const projectFinancialData = projectFinancials[0] || { totalRevenue: 0, avgProjectValue: 0, totalProjects: 0, completedProjects: 0 };
  const completionRate = projectFinancialData.totalProjects > 0 
    ? (projectFinancialData.completedProjects / projectFinancialData.totalProjects) * 100 
    : 0;

  // Get sales statistics - apply date filter if provided
  // Only count converted leads that still have an existing client (so deleted clients don't inflate stats)
  const leadDateFilter = (timeFilter && dateFilter) ? { createdAt: dateFilter } : {};
  const validOriginLeadIds = await Client.distinct('originLead', { originLead: { $ne: null } });
  const convertedMatch = {
    status: 'converted',
    _id: validOriginLeadIds.length ? { $in: validOriginLeadIds } : { $in: [null] }, // no valid clients -> 0 converted
    ...((timeFilter && dateFilter) ? { createdAt: dateFilter } : {})
  };
  const [totalLeads, convertedLeads] = await Promise.all([
    Lead.countDocuments((timeFilter && dateFilter) ? leadDateFilter : {}),
    Lead.countDocuments(convertedMatch)
  ]);

  const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

  // Get sales revenue from converted leads and projects
  const salesRevenue = projectFinancialData.totalRevenue;
  const avgDealSize = convertedLeads > 0 ? salesRevenue / convertedLeads : 0;

  // Calculate sales growth (compare this month vs last month)
  const leadsThisMonth = await Lead.countDocuments({ createdAt: { $gte: currentMonthStart } });
  const leadsLastMonth = await Lead.countDocuments({ 
    createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd } 
  });
  const salesGrowth = leadsLastMonth > 0 
    ? ((leadsThisMonth - leadsLastMonth) / leadsLastMonth) * 100 
    : 0;

  // Get financial statistics
  const todayTransactions = await AdminFinance.find({
    recordType: 'transaction',
    transactionDate: { $gte: todayStart, $lte: todayEnd }
  });

  const todayEarnings = todayTransactions
    .filter(t => t.transactionType === 'incoming')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  
  const todayExpenses = todayTransactions
    .filter(t => t.transactionType === 'outgoing')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const todaySales = todayEarnings; // Sales = incoming transactions today
  const todayProfit = todayEarnings - todayExpenses;
  const todayLoss = todayExpenses > todayEarnings ? todayExpenses - todayEarnings : 0;

  // Get yesterday's data for comparison
  const yesterdayTransactions = await AdminFinance.find({
    recordType: 'transaction',
    transactionDate: { $gte: yesterdayStart, $lte: yesterdayEnd }
  });

  const yesterdayEarnings = yesterdayTransactions
    .filter(t => t.transactionType === 'incoming')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  
  const yesterdayExpenses = yesterdayTransactions
    .filter(t => t.transactionType === 'outgoing')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const yesterdayProfit = yesterdayEarnings - yesterdayExpenses;
  const yesterdayLoss = yesterdayExpenses > yesterdayEarnings ? yesterdayExpenses - yesterdayEarnings : 0;

  // Calculate percentage changes
  // Handle division by zero: if yesterday was 0 and today > 0, calculate growth as if yesterday was 0.01
  const earningsGrowth = yesterdayEarnings > 0 
    ? ((todayEarnings - yesterdayEarnings) / yesterdayEarnings) * 100 
    : (todayEarnings > 0 ? ((todayEarnings - 0.01) / 0.01) * 100 : 0);
  const expensesGrowth = yesterdayExpenses > 0 
    ? ((todayExpenses - yesterdayExpenses) / yesterdayExpenses) * 100 
    : (todayExpenses > 0 ? ((todayExpenses - 0.01) / 0.01) * 100 : 0);
  const salesGrowthToday = yesterdayEarnings > 0 
    ? ((todaySales - yesterdayEarnings) / yesterdayEarnings) * 100 
    : (todaySales > 0 ? ((todaySales - 0.01) / 0.01) * 100 : 0);
  const profitGrowth = Math.abs(yesterdayProfit) > 0.01
    ? ((todayProfit - yesterdayProfit) / Math.abs(yesterdayProfit)) * 100
    : (todayProfit > 0.01 ? ((todayProfit - 0.01) / 0.01) * 100 : (todayProfit < -0.01 ? ((todayProfit + 0.01) / 0.01) * 100 : 0));
  const lossGrowth = yesterdayLoss > 0
    ? ((todayLoss - yesterdayLoss) / yesterdayLoss) * 100
    : (todayLoss > 0 ? ((todayLoss - 0.01) / 0.01) * 100 : 0);

  // Pending payments (from Payment model)
  const pendingPayments = await Payment.find({ status: 'pending' });
  const pendingAmount = pendingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const pendingCount = pendingPayments.length;

  // Overall financial statistics
  const allTransactions = await AdminFinance.find({ recordType: 'transaction' });
  const totalRevenue = allTransactions
    .filter(t => t.transactionType === 'incoming')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  
  const totalExpenses = allTransactions
    .filter(t => t.transactionType === 'outgoing')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const profit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

  // Outstanding payments (pending payments)
  const outstandingPayments = pendingAmount;

  // Calculate overall finance growth (compare this month vs last month)
  const transactionsThisMonth = await AdminFinance.find({
    recordType: 'transaction',
    transactionDate: { $gte: currentMonthStart, $lte: currentMonthEnd }
  });
  
  const revenueThisMonth = transactionsThisMonth
    .filter(t => t.transactionType === 'incoming')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const transactionsLastMonth = await AdminFinance.find({
    recordType: 'transaction',
    transactionDate: { $gte: lastMonthStart, $lte: lastMonthEnd }
  });
  
  const revenueLastMonth = transactionsLastMonth
    .filter(t => t.transactionType === 'incoming')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const financeGrowth = revenueLastMonth > 0 
    ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100 
    : (revenueThisMonth > 0 ? 0 : 0);

  // Get revenue trend data (last 7 months)
  const revenueTrendData = [];
  const currentDate = new Date(); // Use fresh date for loop
  for (let i = 6; i >= 0; i--) {
    const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 0);
    const monthName = monthDate.toLocaleString('en-US', { month: 'short' });
    
    const monthTransactions = await AdminFinance.find({
      recordType: 'transaction',
      transactionType: 'incoming',
      transactionDate: { $gte: monthDate, $lte: monthEnd }
    });
    
    const monthRevenue = monthTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    
    const monthProjects = await Project.countDocuments({
      createdAt: { $gte: monthDate, $lte: monthEnd }
    });

    revenueTrendData.push({
      month: monthName,
      revenue: monthRevenue,
      projects: monthProjects
    });
  }

  // Get project status distribution - only show Active, Completed, On Hold, and Overdue (matching original mock data)
  // Apply date filter when provided so Project Status chart respects the date range
  const projectStatusMatch = (timeFilter && dateFilter) ? [{ $match: { createdAt: dateFilter } }] : [];
  const projectStatusData = await Project.aggregate([
    ...projectStatusMatch,
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  // Map statuses to the 4 categories shown in original mock data
  const statusMap = {
    'active': { name: 'Active', color: '#10B981' },
    'planning': { name: 'Active', color: '#10B981' },
    'testing': { name: 'Active', color: '#10B981' },
    'started': { name: 'Active', color: '#10B981' },
    'completed': { name: 'Completed', color: '#3B82F6' },
    'on-hold': { name: 'On Hold', color: '#F59E0B' }
  };

  const statusCounts = {};
  
  // Count active projects (combining planning, active, testing, started)
  let activeCount = 0;
  projectStatusData.forEach(item => {
    if (['active', 'planning', 'testing', 'started'].includes(item._id)) {
      activeCount += item.count;
    } else if (statusMap[item._id]) {
      const statusInfo = statusMap[item._id];
      if (!statusCounts[statusInfo.name]) {
        statusCounts[statusInfo.name] = {
          name: statusInfo.name,
          value: 0,
          color: statusInfo.color
        };
      }
      statusCounts[statusInfo.name].value += item.count;
    }
  });

  // Add active count
  if (activeCount > 0) {
    statusCounts['Active'] = {
      name: 'Active',
      value: activeCount,
      color: '#10B981'
    };
  }

  // Add overdue count (projects with dueDate in past and not completed/cancelled)
  // Apply date filter if provided - filter by createdAt to show overdue projects from that period
  let overdueCountFilter = {
    dueDate: { $lt: now },
    status: { $nin: ['completed', 'cancelled'] }
  };
  // If filter is provided, add creation date filter
  if (timeFilter && dateFilter && periodStart && periodEnd) {
    overdueCountFilter = {
      ...overdueCountFilter,
      createdAt: dateFilter // Created during the filter period
    };
  }
  const overdueCount = await Project.countDocuments(overdueCountFilter);

  if (overdueCount > 0) {
    statusCounts['Overdue'] = {
      name: 'Overdue',
      value: overdueCount,
      color: '#EF4444'
    };
  }

  // Convert to array - only include the 4 statuses from original mock data
  const projectStatusDistribution = [];
  const allowedStatuses = ['Active', 'Completed', 'On Hold', 'Overdue'];
  
  allowedStatuses.forEach(statusName => {
    if (statusCounts[statusName] && statusCounts[statusName].value > 0) {
      projectStatusDistribution.push({
        name: statusCounts[statusName].name,
        value: statusCounts[statusName].value,
        color: statusCounts[statusName].color
      });
    }
  });

  // System health (mock data for now - can be enhanced with real monitoring)
  const systemHealth = {
    uptime: 99.9, // Can be calculated from process.uptime()
    performance: 95, // Can be calculated from various metrics
    errors: 0, // Can be tracked from error logs
    activeUsers: activeEmployees + activePMs + activeSales + activeClients,
    serverLoad: 45 // Can be calculated from system metrics
  };

  // Format the response
  const result = {
    users: {
      total: totalUsersNow,
      sales: totalSales,
      pm: totalPMs,
      employees: totalEmployees,
      clients: totalClients,
      active: activeEmployees + activePMs + activeSales + activeClients,
      newThisMonth: newUsersPeriod,
      growth: parseFloat(userGrowth.toFixed(2))
    },
    projects: {
      total: totalProjects,
      active: activeProjects,
      completed: completedProjects,
      onHold: onHoldProjects,
      overdue: overdueProjects,
      totalRevenue: projectFinancialData.totalRevenue || 0,
      avgProjectValue: projectFinancialData.avgProjectValue || 0,
      completionRate: parseFloat(completionRate.toFixed(2))
    },
    sales: {
      totalLeads: totalLeads,
      converted: convertedLeads,
      conversionRate: parseFloat(conversionRate.toFixed(2)),
      totalRevenue: salesRevenue,
      avgDealSize: avgDealSize,
      growth: parseFloat(salesGrowth.toFixed(2))
    },
    finance: {
      totalRevenue: totalRevenue,
      monthlyRevenue: revenueThisMonth,
      outstandingPayments: outstandingPayments,
      expenses: totalExpenses,
      profit: profit,
      profitMargin: parseFloat(profitMargin.toFixed(2)),
      growth: parseFloat(financeGrowth.toFixed(2))
    },
    today: {
      earnings: todayEarnings,
      expenses: todayExpenses,
      sales: todaySales,
      pendingAmount: pendingAmount,
      profit: todayProfit,
      loss: todayLoss,
      // Growth percentages for today
      earningsGrowth: parseFloat(earningsGrowth.toFixed(2)),
      expensesGrowth: parseFloat(expensesGrowth.toFixed(2)),
      salesGrowth: parseFloat(salesGrowthToday.toFixed(2)),
      profitGrowth: parseFloat(profitGrowth.toFixed(2)),
      lossGrowth: parseFloat(lossGrowth.toFixed(2))
    },
    system: systemHealth,
    revenueTrend: revenueTrendData,
    projectStatusDistribution: projectStatusDistribution
  };

  res.json({
    success: true,
    data: result
  });
});

// @desc    Get system-wide analytics
// @route   GET /api/admin/analytics/system
// @access  Admin only
const getSystemAnalytics = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  // Build date filter
  const dateFilter = {};
  if (startDate || endDate) {
    dateFilter.createdAt = {};
    if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
    if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
  }

  // Get productivity metrics
  const productivityMetrics = await Task.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: null,
        totalTasks: { $sum: 1 },
        completedTasks: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        totalEstimatedHours: { $sum: '$estimatedHours' },
        totalActualHours: { $sum: '$actualHours' },
        avgCompletionTime: {
          $avg: {
            $cond: [
              { $ne: ['$completedDate', null] },
              { $subtract: ['$completedDate', '$createdAt'] },
              null
            ]
          }
        }
      }
    }
  ]);

  // Get team performance
  const teamPerformance = await Task.aggregate([
    { $match: dateFilter },
    { $unwind: '$assignedTo' },
    {
      $group: {
        _id: '$assignedTo',
        totalTasks: { $sum: 1 },
        completedTasks: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        totalEstimatedHours: { $sum: '$estimatedHours' },
        totalActualHours: { $sum: '$actualHours' }
      }
    },
    {
      $lookup: {
        from: 'employees',
        localField: '_id',
        foreignField: '_id',
        as: 'employee'
      }
    },
    { $unwind: '$employee' },
    {
      $project: {
        _id: 1,
        name: '$employee.name',
        email: '$employee.email',
        department: '$employee.department',
        position: '$employee.position',
        totalTasks: 1,
        completedTasks: 1,
        completionRate: {
          $multiply: [
            { $divide: ['$completedTasks', '$totalTasks'] },
            100
          ]
        },
        totalEstimatedHours: 1,
        totalActualHours: 1,
        efficiency: {
          $cond: [
            { $gt: ['$totalActualHours', 0] },
            { $multiply: [{ $divide: ['$totalEstimatedHours', '$totalActualHours'] }, 100] },
            0
          ]
        }
      }
    },
    { $sort: { completionRate: -1 } }
  ]);

  // Get PM performance
  const pmPerformance = await Project.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: '$projectManager',
        totalProjects: { $sum: 1 },
        completedProjects: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        avgProgress: { $avg: '$progress' },
        totalBudget: { $sum: '$budget' }
      }
    },
    {
      $lookup: {
        from: 'pms',
        localField: '_id',
        foreignField: '_id',
        as: 'pm'
      }
    },
    { $unwind: '$pm' },
    {
      $project: {
        _id: 1,
        name: '$pm.name',
        email: '$pm.email',
        totalProjects: 1,
        completedProjects: 1,
        completionRate: {
          $multiply: [
            { $divide: ['$completedProjects', '$totalProjects'] },
            100
          ]
        },
        avgProgress: 1,
        totalBudget: 1
      }
    },
    { $sort: { completionRate: -1 } }
  ]);

  const result = {
    productivity: productivityMetrics[0] || {
      totalTasks: 0,
      completedTasks: 0,
      totalEstimatedHours: 0,
      totalActualHours: 0,
      avgCompletionTime: 0
    },
    teamPerformance,
    pmPerformance,
    summary: {
      totalEmployees: await Employee.countDocuments(),
      totalPMs: await PM.countDocuments(),
      totalClients: await Client.countDocuments(),
      totalProjects: await Project.countDocuments(),
      totalTasks: await Task.countDocuments(),
      totalPayments: await Payment.countDocuments()
    }
  };

  res.json({
    success: true,
    data: result
  });
});

// Helper function to calculate trend
const calculateTrend = (pointsHistory, period) => {
  if (!pointsHistory || pointsHistory.length === 0) return 'stable';
  
  // Get recent points based on period
  const now = new Date();
  const periodStart = new Date(now);
  
  switch (period) {
    case 'week':
      periodStart.setDate(periodStart.getDate() - 7);
      break;
    case 'month':
      periodStart.setMonth(periodStart.getMonth() - 1);
      break;
    case 'quarter':
      periodStart.setMonth(periodStart.getMonth() - 3);
      break;
    case 'year':
      periodStart.setFullYear(periodStart.getFullYear() - 1);
      break;
    default:
      periodStart.setMonth(periodStart.getMonth() - 1);
  }
  
  const recentPoints = pointsHistory
    .filter(h => new Date(h.date) >= periodStart)
    .map(h => h.points);
    
  if (recentPoints.length < 2) return 'stable';
  
  const first = recentPoints[0];
  const last = recentPoints[recentPoints.length - 1];
  
  if (last > first) return 'up';
  if (last < first) return 'down';
  return 'stable';
};

// Helper function to calculate trend value
const calculateTrendValue = (pointsHistory, period) => {
  if (!pointsHistory || pointsHistory.length === 0) return '0%';
  
  const now = new Date();
  const periodStart = new Date(now);
  
  switch (period) {
    case 'week':
      periodStart.setDate(periodStart.getDate() - 7);
      break;
    case 'month':
      periodStart.setMonth(periodStart.getMonth() - 1);
      break;
    case 'quarter':
      periodStart.setMonth(periodStart.getMonth() - 3);
      break;
    case 'year':
      periodStart.setFullYear(periodStart.getFullYear() - 1);
      break;
    default:
      periodStart.setMonth(periodStart.getMonth() - 1);
  }
  
  const recentPoints = pointsHistory
    .filter(h => new Date(h.date) >= periodStart)
    .map(h => h.points);
    
  if (recentPoints.length < 2) return '0%';
  
  const first = recentPoints[0];
  const last = recentPoints[recentPoints.length - 1];
  
  if (first === 0) return last > 0 ? '+100%' : '0%';
  const change = ((last - first) / first) * 100;
  return change > 0 ? `+${change.toFixed(0)}%` : `${change.toFixed(0)}%`;
};

// Helper function to get date range
const getDateRange = (period) => {
  const now = new Date();
  const start = new Date(now);
  
  switch (period) {
    case 'week':
      start.setDate(start.getDate() - 7);
      break;
    case 'month':
      start.setMonth(start.getMonth() - 1);
      break;
    case 'quarter':
      start.setMonth(start.getMonth() - 3);
      break;
    case 'year':
      start.setFullYear(start.getFullYear() - 1);
      break;
    default:
      start.setMonth(start.getMonth() - 1);
  }
  
  return { start, end: now };
};

// @desc    Get admin leaderboard (all modules)
// @route   GET /api/admin/analytics/leaderboard
// @access  Admin only
const getAdminLeaderboard = asyncHandler(async (req, res, next) => {
  const { period = 'month' } = req.query;
  const dateRange = getDateRange(period);
  
  // Get all employees (dev module only - no PMs)
  const employees = await Employee.find({ 
    role: 'employee',
    isActive: true,
    team: 'developer'
  })
    .select('name email points statistics department position pointsHistory')
    .sort({ points: -1 });
  
  // Transform employees for leaderboard
  const devLeaderboard = employees.map((emp, index) => {
    const stats = emp.statistics || {};
    return {
      _id: emp._id,
      name: emp.name,
      email: emp.email,
      avatar: emp.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
      score: emp.points || 0,
      rank: index + 1,
      completed: stats.tasksCompleted || 0,
      overdue: stats.tasksOverdue || 0,
      missed: stats.tasksMissed || 0,
      onTime: stats.tasksOnTime || 0,
      rate: Math.round(stats.completionRate || 0),
      trend: calculateTrend(emp.pointsHistory, period),
      trendValue: calculateTrendValue(emp.pointsHistory, period),
      department: emp.department || 'Development',
      avgTime: stats.averageCompletionTime 
        ? `${stats.averageCompletionTime.toFixed(1)} days` 
        : '2.0 days',
      lastActive: emp.updatedAt,
      projects: 0,
      role: emp.position || 'Developer',
      module: 'dev',
      earnings: emp.salary || 0,
      achievements: []
    };
  });
  
  // Get all PMs for separate PM performance section
  const pms = await PM.find({ isActive: true })
    .select('name email projectsManaged fixedSalary')
    .populate('projectsManaged', 'status progress dueDate createdAt');
  
  // Transform PMs for separate PM performance leaderboard
  const pmLeaderboard = await Promise.all(pms.map(async (pm) => {
    const projects = pm.projectsManaged || [];
    const activeProjects = projects.filter(p => 
      ['untouched', 'started', 'active', 'on-hold', 'testing'].includes(p.status)
    );
    const completedProjects = projects.filter(p => p.status === 'completed');
    const totalProjects = projects.length;
    const projectCompletionRate = totalProjects > 0 
      ? Math.round((completedProjects.length / totalProjects) * 100) 
      : 0;
    
    // Calculate overdue projects (not completed/cancelled and past due date)
    const now = new Date();
    const overdueProjects = projects.filter(p => {
      if (!p.dueDate || p.status === 'completed' || p.status === 'cancelled') return false;
      return new Date(p.dueDate) < now;
    }).length;
    
    // Calculate performance score based on:
    // - Project completion rate (70% weight)
    // - No overdue projects bonus (30% weight)
    let performanceScore = projectCompletionRate;
    if (totalProjects > 0 && overdueProjects === 0) {
      performanceScore += 30; // Bonus for no overdue projects
    } else {
      performanceScore -= (overdueProjects * 10); // Penalty per overdue project
    }
    performanceScore = Math.max(0, Math.min(100, performanceScore)); // Clamp between 0-100
    
    // Get total tasks in PM's projects
    const projectIds = projects.map(p => p._id);
    const totalTasks = await Task.countDocuments({ project: { $in: projectIds } });
    const completedTasks = await Task.countDocuments({ 
      project: { $in: projectIds },
      status: 'completed'
    });
    
    return {
      _id: pm._id,
      name: pm.name,
      email: pm.email,
      avatar: pm.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
      performanceScore: Math.round(performanceScore),
      rank: 0, // Will be set after sorting
      totalProjects: totalProjects,
      completedProjects: completedProjects.length,
      activeProjects: activeProjects.length,
      overdueProjects: overdueProjects,
      projectCompletionRate: projectCompletionRate,
      totalTasks: totalTasks,
      completedTasks: completedTasks,
      lastActive: pm.updatedAt || pm.createdAt,
      role: 'Project Manager',
      module: 'pm',
      earnings: pm.fixedSalary || 0,
      achievements: overdueProjects === 0 && projectCompletionRate >= 90 ? ['Project Champion', 'On-Time Master'] : 
                   overdueProjects === 0 ? ['On-Time Master'] :
                   projectCompletionRate >= 90 ? ['Project Champion'] : []
    };
  }));
  
  // Sort PMs by performance score (highest first)
  pmLeaderboard.sort((a, b) => {
    // Primary: Performance score
    if (b.performanceScore !== a.performanceScore) {
      return b.performanceScore - a.performanceScore;
    }
    // Secondary: Project completion rate
    if (b.projectCompletionRate !== a.projectCompletionRate) {
      return b.projectCompletionRate - a.projectCompletionRate;
    }
    // Tertiary: Fewer overdue projects
    return a.overdueProjects - b.overdueProjects;
  });
  
  // Assign ranks to PMs
  pmLeaderboard.forEach((pm, index) => {
    pm.rank = index + 1;
  });
  
  // Get sales team with conversion metrics (only count converted leads that still have a client)
  const salesTeam = await Sales.find({ isActive: true })
    .select('name email salesTarget currentSales currentIncentive');

  const validOriginLeadIds = await Client.distinct('originLead', { originLead: { $ne: null } });
  const convertedBySales = validOriginLeadIds.length > 0
    ? await Lead.aggregate([
        { $match: { status: 'converted', _id: { $in: validOriginLeadIds } } },
        { $group: { _id: '$assignedTo', convertedLeads: { $sum: 1 }, convertedValue: { $sum: '$value' } } }
      ])
    : [];
  const convertedMap = new Map(convertedBySales.map((r) => [r._id?.toString(), { convertedLeads: r.convertedLeads, convertedValue: r.convertedValue }]));

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
      const corrected = convertedMap.get(member._id.toString()) || { convertedLeads: 0, convertedValue: 0 };
      const convertedLeads = corrected.convertedLeads;
      const totalRevenue = corrected.convertedValue;
      const conversionRate = totalLeads > 0 
        ? Math.round((convertedLeads / totalLeads) * 100) 
        : 0;
      
      return {
        _id: member._id,
        name: member.name,
        email: member.email,
        avatar: member.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
        score: totalRevenue, // Score is now revenue generated from converting clients
        rank: 0, // Will be set after sorting
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
        projects: convertedLeads, // Deals = converted leads with existing client
        role: 'Sales Executive',
        module: 'sales',
        earnings: member.currentSales || 0,
        // Achievements based on revenue thresholds (can be adjusted)
        achievements: totalRevenue >= 1000000 ? ['Sales Champion', 'Revenue Master'] : 
                      totalRevenue >= 500000 ? ['Sales Champion'] : [],
        salesMetrics: {
          leads: totalLeads,
          conversions: convertedLeads,
          revenue: totalRevenue,
          deals: convertedLeads
        },
        conversionRate: conversionRate
      };
    })
  );
  
  // Sort sales by revenue (highest first), then by conversions if revenue is equal
  salesLeaderboard.sort((a, b) => {
    // Primary: Revenue generated from converting clients
    if (b.salesMetrics.revenue !== a.salesMetrics.revenue) {
      return b.salesMetrics.revenue - a.salesMetrics.revenue;
    }
    // Secondary: Number of conversions if revenue is equal
    return b.salesMetrics.conversions - a.salesMetrics.conversions;
  });
  
  // Assign ranks to sales team
  salesLeaderboard.forEach((member, index) => {
    member.rank = index + 1;
  });
  
  // Calculate overall statistics (excluding PMs from dev stats)
  const allMembers = [...devLeaderboard, ...salesLeaderboard];
  const overallStats = {
    totalMembers: allMembers.length,
    avgScore: allMembers.length > 0 
      ? Math.round(allMembers.reduce((sum, m) => sum + m.score, 0) / allMembers.length)
      : 0,
    totalCompleted: allMembers.reduce((sum, m) => sum + m.completed, 0),
    totalProjects: allMembers.reduce((sum, m) => sum + m.projects, 0),
    avgCompletionRate: allMembers.length > 0
      ? Math.round(allMembers.reduce((sum, m) => sum + m.rate, 0) / allMembers.length)
      : 0,
    topPerformer: allMembers.length > 0 
      ? allMembers.reduce((top, m) => m.score > top.score ? m : top, allMembers[0])
      : null,
    totalRevenue: allMembers.reduce((sum, m) => sum + (m.earnings || 0), 0)
  };
  
  // Calculate PM statistics separately
  const pmStats = {
    totalPMs: pmLeaderboard.length,
    avgPerformanceScore: pmLeaderboard.length > 0
      ? Math.round(pmLeaderboard.reduce((sum, pm) => sum + pm.performanceScore, 0) / pmLeaderboard.length)
      : 0,
    avgProjectCompletionRate: pmLeaderboard.length > 0
      ? Math.round(pmLeaderboard.reduce((sum, pm) => sum + pm.projectCompletionRate, 0) / pmLeaderboard.length)
      : 0,
    totalProjects: pmLeaderboard.reduce((sum, pm) => sum + pm.totalProjects, 0),
    totalCompletedProjects: pmLeaderboard.reduce((sum, pm) => sum + pm.completedProjects, 0),
    totalOverdueProjects: pmLeaderboard.reduce((sum, pm) => sum + pm.overdueProjects, 0),
    topPM: pmLeaderboard.length > 0 ? pmLeaderboard[0] : null
  };
  
  res.json({
    success: true,
    data: {
      dev: devLeaderboard,
      sales: salesLeaderboard,
      pm: pmLeaderboard,
      overallStats,
      pmStats
    }
  });
});

// @desc    Get recent activities for admin dashboard
// @route   GET /api/admin/analytics/recent-activities
// @access  Admin only
const getRecentActivities = asyncHandler(async (req, res, next) => {
  const { limit = 3 } = req.query;
  const fetchLimit = Math.max(parseInt(limit), 5); // Fetch more items from each source to get better mix
  
  const activities = [];
  
  // Get recent transactions (fetch more to get better mix)
  const recentTransactions = await AdminFinance.find({
    recordType: 'transaction'
  })
    .sort({ createdAt: -1 })
    .limit(fetchLimit)
    .lean();
  
  recentTransactions.forEach(transaction => {
    activities.push({
      id: `transaction-${transaction._id.toString()}`,
      type: 'transaction',
      title: transaction.transactionType === 'incoming' ? 'New Transaction' : 'Expense Recorded',
      message: `${transaction.transactionType === 'incoming' ? 'Received' : 'Paid'} ₹${transaction.amount?.toLocaleString('en-IN') || 0} - ${transaction.category || 'Transaction'}`,
      time: transaction.createdAt,
      icon: transaction.transactionType === 'incoming' ? 'trending-up' : 'trending-down',
      color: transaction.transactionType === 'incoming' ? 'green' : 'red'
    });
  });
  
  // Get recent projects
  const recentProjects = await Project.find()
    .sort({ createdAt: -1 })
    .limit(fetchLimit)
    .populate('client', 'name companyName')
    .lean();
  
  recentProjects.forEach(project => {
    activities.push({
      id: `project-${project._id.toString()}`,
      type: 'project',
      title: 'New Project Created',
      message: `Project "${project.name}" created${project.client ? ` for ${project.client.companyName || project.client.name}` : ''}`,
      time: project.createdAt,
      icon: 'folder',
      color: 'blue'
    });
  });
  
  // Get recent payments
  const recentPayments = await Payment.find({
    status: 'completed'
  })
    .sort({ paidAt: -1 })
    .limit(fetchLimit)
    .populate('project', 'name')
    .populate('client', 'name companyName')
    .lean();
  
  recentPayments.forEach(payment => {
    activities.push({
      id: `payment-${payment._id.toString()}`,
      type: 'payment',
      title: 'Payment Received',
      message: `Received ₹${payment.amount?.toLocaleString('en-IN') || 0}${payment.project ? ` for ${payment.project.name}` : ''}${payment.client ? ` from ${payment.client.companyName || payment.client.name}` : ''}`,
      time: payment.paidAt || payment.createdAt,
      icon: 'dollar',
      color: 'green'
    });
  });
  
  // Get recent leads converted
  const recentLeads = await Lead.find({
    status: 'converted'
  })
    .sort({ updatedAt: -1 })
    .limit(fetchLimit)
    .populate('assignedTo', 'name')
    .lean();
  
  recentLeads.forEach(lead => {
    activities.push({
      id: `lead-${lead._id.toString()}`,
      type: 'lead',
      title: 'Lead Converted',
      message: `Lead "${lead.companyName || lead.name || 'Unnamed'}" converted to client${lead.assignedTo ? ` by ${lead.assignedTo.name}` : ''}`,
      time: lead.updatedAt,
      icon: 'target',
      color: 'purple'
    });
  });
  
  // Sort all activities by time (most recent first) and take top N
  activities.sort((a, b) => new Date(b.time) - new Date(a.time));
  const topActivities = activities.slice(0, parseInt(limit));
  
  res.json({
    success: true,
    data: topActivities
  });
});

module.exports = {
  getAdminDashboardStats,
  getSystemAnalytics,
  getAdminLeaderboard,
  getRecentActivities
};
