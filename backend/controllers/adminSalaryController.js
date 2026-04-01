const Salary = require('../models/Salary');
const Employee = require('../models/Employee');
const Sales = require('../models/Sales');
const PM = require('../models/PM');
const Admin = require('../models/Admin');
const Incentive = require('../models/Incentive');
const Project = require('../models/Project');
const Client = require('../models/Client');
const EmployeeReward = require('../models/EmployeeReward');
const PMReward = require('../models/PMReward');
const mongoose = require('mongoose');
const asyncHandler = require('../middlewares/asyncHandler');

// Helper: Get employee by ID and model type (includes Admin for HR salary)
const getEmployee = async (employeeId, employeeModel) => {
  let Model;
  switch (employeeModel) {
    case 'Employee':
      Model = Employee;
      break;
    case 'Sales':
      Model = Sales;
      break;
    case 'PM':
      Model = PM;
      break;
    case 'Admin':
      Model = Admin;
      break;
    default:
      return null;
  }
  return await Model.findById(employeeId);
};

// Helper: Calculate payment date based on joining date for a given month
const calculatePaymentDate = (joiningDate, month) => {
  const [year, monthNum] = month.split('-');
  const joiningDay = new Date(joiningDate).getDate();
  const lastDayOfMonth = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
  const paymentDay = Math.min(joiningDay, lastDayOfMonth);
  return new Date(parseInt(year), parseInt(monthNum) - 1, paymentDay);
};

// Helper: Get employee model type from user type (admin/hr/accountant/pem for Admin salary)
const getEmployeeModelType = (userType) => {
  switch (userType) {
    case 'employee':
      return 'Employee';
    case 'sales':
      return 'Sales';
    case 'project-manager':
    case 'pm':
      return 'PM';
    case 'admin':
    case 'hr':
    case 'accountant':
    case 'pem':
      return 'Admin';
    default:
      return null;
  }
};

// Helper: Calculate team target reward for a sales team lead for a given month
// Returns the reward amount if team target was achieved in that month, else 0
const calculateTeamTargetRewardForMonth = async (salesEmployeeId, month) => {
  try {
    const sales = await Sales.findById(salesEmployeeId)
      .select('isTeamLead teamMembers teamLeadTarget teamLeadTargetReward');
    if (!sales || !sales.isTeamLead || !(sales.teamLeadTarget > 0) || !(sales.teamLeadTargetReward > 0)) return 0;
    if (!sales.teamMembers || sales.teamMembers.length === 0) return 0;

    const [year, monthNum] = month.split('-');
    const monthStart = new Date(parseInt(year), parseInt(monthNum) - 1, 1, 0, 0, 0, 0);
    const monthEnd = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999);

    const teamMemberIds = sales.teamMembers
      .map(id => (mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null))
      .filter(Boolean);
    // Include team lead's own conversions + team members (full team sales for target)
    const allTeamIds = [new mongoose.Types.ObjectId(salesEmployeeId), ...teamMemberIds];

    const teamSalesAggregation = await Project.aggregate([
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
          totalSales: {
            $sum: { $ifNull: ['$financialDetails.totalCost', { $ifNull: ['$budget', 0] }] }
          }
        }
      }
    ]);

    const teamMonthlySales = teamSalesAggregation.length > 0 ? (Number(teamSalesAggregation[0].totalSales) || 0) : 0;
    return teamMonthlySales >= sales.teamLeadTarget ? Number(sales.teamLeadTargetReward) : 0;
  } catch (error) {
    console.error(`Error calculating team target reward for sales ${salesEmployeeId}, month ${month}:`, error);
    return 0;
  }
};

// Helper: Calculate personal sales target reward for a sales employee for a given month
// Uses the same rules as sales wallet/dashboard: sum rewards for all targets
// where that month's approved project sales volume >= target.amount.
const calculatePersonalTargetRewardForMonth = async (salesEmployeeId, month) => {
  try {
    const sales = await Sales.findById(salesEmployeeId)
      .select('salesTargets');
    if (!sales || !Array.isArray(sales.salesTargets) || sales.salesTargets.length === 0) {
      return 0;
    }

    const [year, monthNum] = month.split('-');
    const monthStart = new Date(parseInt(year), parseInt(monthNum) - 1, 1, 0, 0, 0, 0);
    const monthEnd = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999);

    // Get clients converted by this sales employee
    const convertedClients = await Client.find({ convertedBy: salesEmployeeId })
      .select('_id conversionDate')
      .sort({ conversionDate: -1 });

    if (!convertedClients || convertedClients.length === 0) {
      return 0;
    }

    // Filter clients converted in the requested month
    const monthlyClientIds = convertedClients
      .filter(c => c.conversionDate && c.conversionDate >= monthStart && c.conversionDate <= monthEnd)
      .map(c => c._id.toString());

    if (monthlyClientIds.length === 0) {
      return 0;
    }

    // Only projects where advance has been approved
    const allClientIds = convertedClients.map(c => c._id);
    const projects = await Project.find({
      client: { $in: allClientIds },
      'financialDetails.advanceReceived': { $gt: 0 }
    }).select('client financialDetails.totalCost financialDetails.includeGST budget');

    if (!projects || projects.length === 0) {
      return 0;
    }

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

    if (monthlySales <= 0) {
      return 0;
    }

    // Sum rewards for all targets achieved this month
    let totalReward = 0;
    sales.salesTargets.forEach(t => {
      const targetAmount = Number(t?.amount || 0);
      const targetReward = Number(t?.reward || 0);
      if (targetAmount > 0 && targetReward > 0 && monthlySales >= targetAmount) {
        totalReward += targetReward;
      }
    });

    return totalReward;
  } catch (error) {
    console.error(`Error calculating personal target reward for sales ${salesEmployeeId}, month ${month}:`, error);
    return 0;
  }
};

// @desc    Set employee fixed salary
// @route   PUT /api/admin/salary/set/:userType/:employeeId
// @access  Private (Admin/HR)
exports.setEmployeeSalary = asyncHandler(async (req, res) => {
  const { userType, employeeId } = req.params;
  const { fixedSalary, effectiveFromMonth } = req.body;

  if (fixedSalary === undefined || fixedSalary === null) {
    return res.status(400).json({
      success: false,
      message: 'Valid fixed salary amount is required'
    });
  }

  const employeeModel = getEmployeeModelType(userType);
  if (!employeeModel) {
    return res.status(400).json({
      success: false,
      message: 'Invalid user type'
    });
  }

  const employee = await getEmployee(employeeId, employeeModel);
  if (!employee) {
    return res.status(404).json({
      success: false,
      message: 'Employee not found'
    });
  }

  // Update fixed salary (ensure number for Mongoose)
  const amount = Number(fixedSalary);
  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Valid fixed salary amount is required'
    });
  }
  employee.fixedSalary = amount;
  await employee.save();

  const joiningDate = employee.joiningDate || new Date();
  const joinDate = new Date(joiningDate);
  const now = new Date();
  // Month indices for iteration (year * 12 + monthIndex where monthIndex is 0–11)
  const joinMonthIndex = joinDate.getFullYear() * 12 + joinDate.getMonth();
  const currentMonthIndex = now.getFullYear() * 12 + now.getMonth();

  // Determine the first month for which to generate salary records.
  // - Default: month AFTER joining.
  // - If effectiveFromMonth is provided, it must not be earlier than joining month.
  let startIndex = joinMonthIndex + 1;
  if (effectiveFromMonth && /^\d{4}-\d{2}$/.test(effectiveFromMonth)) {
    const [effYear, effMonth] = effectiveFromMonth.split('-').map(n => parseInt(n, 10));
    if (!isNaN(effYear) && !isNaN(effMonth)) {
      const effIndex = effYear * 12 + (effMonth - 1);
      if (effIndex >= joinMonthIndex) {
        startIndex = Math.max(startIndex, effIndex);
      }
    }
  }
  const paymentDay = new Date(joiningDate).getDate();

  // Helper to create or update a salary record for a given month string
  const upsertSalaryForMonth = async (month, source = 'set-salary') => {
    const paymentDate = calculatePaymentDate(joiningDate, month);

    // Calculate incentiveAmount and rewardAmount (team + personal target rewards) for sales team
    let incentiveAmount = 0;
    let rewardAmount = 0;
    if (employeeModel === 'Sales') {
      try {
        const incentives = await Incentive.find({
          salesEmployee: employee._id,
          currentBalance: { $gt: 0 }
        });
        incentiveAmount = incentives.reduce((sum, inc) => sum + (inc.currentBalance || 0), 0);
        const teamTargetReward = await calculateTeamTargetRewardForMonth(employee._id, month);
        const personalTargetReward = await calculatePersonalTargetRewardForMonth(employee._id, month);
        rewardAmount = teamTargetReward + personalTargetReward;
      } catch (error) {
        console.error(`Error calculating incentive/reward for employee ${employee._id}:`, error);
      }
    }

    const department = employeeModel === 'Admin' ? (employee.role || 'HR') : (employee.department || 'unknown');
    const role = employeeModel === 'Admin' ? (employee.role || 'hr') : (employee.role || userType);

    await Salary.findOneAndUpdate(
      {
        employeeId: employee._id,
        employeeModel,
        month
      },
      {
        employeeId: employee._id,
        employeeModel,
        employeeName: employee.name,
        department,
        role,
        month,
        fixedSalary: amount,
        paymentDate,
        paymentDay,
        status: 'pending',
        source,
        incentiveAmount,
        incentiveStatus: 'pending',
        rewardAmount,
        rewardStatus: 'pending',
        createdBy: req.admin.id
      },
      {
        upsert: true,
        new: true
      }
    );
  };

  // Seed only the first two months for this employee (start month + next month).
  // After this, each time a month is marked as paid, the next month is auto-created
  // by updateSalaryRecord, so records continue indefinitely until admin deletes them.
  const seedMonths = [];
  for (let offset = 0; offset < 2; offset++) {
    const index = startIndex + offset;
    const y = Math.floor(index / 12);
    const mo = (index % 12) + 1;
    seedMonths.push(`${y}-${String(mo).padStart(2, '0')}`);
  }

  for (const month of seedMonths) {
    await upsertSalaryForMonth(month, 'set-salary');
  }

  res.json({
    success: true,
    message: `Fixed salary set to ₹${amount.toLocaleString()} and salary records generated`,
    data: {
      employeeId: employee._id,
      employeeName: employee.name,
      fixedSalary: employee.fixedSalary
    }
  });
});

// @desc    Get all salary records with filters
// @route   GET /api/admin/salary
// @access  Private (Admin/HR)
exports.getSalaryRecords = asyncHandler(async (req, res) => {
  const { month, department, status, search } = req.query;

  const filter = {};

  // Filter by month (default to current month)
  const currentMonth = month || new Date().toISOString().slice(0, 7);
  filter.month = currentMonth;

  // Filter by department
  if (department && department !== 'all') {
    filter.department = department;
  }

  // Filter by status
  if (status && status !== 'all') {
    filter.status = status;
  }

  // Search by employee name
  if (search) {
    filter.employeeName = { $regex: search, $options: 'i' };
  }

  let salaries = await Salary.find(filter)
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email')
    .sort({ paymentDate: 1, employeeName: 1 });

  // Sync incentiveAmount and rewardAmount for sales (pending only). Do NOT overwrite
  // existing non-zero amounts with 0 – that would "remove" incentive/reward after an admin
  // only updates fixed salary and list is reloaded.
  for (const salary of salaries) {
    if (salary.employeeModel === 'Sales' && salary.department === 'sales') {
      try {
        if (salary.incentiveStatus === 'pending') {
          const incentives = await Incentive.find({
            salesEmployee: salary.employeeId,
            currentBalance: { $gt: 0 }
          });
          const totalIncentive = incentives.reduce((sum, inc) => sum + (inc.currentBalance || 0), 0);
          const existing = salary.incentiveAmount || 0;
          const diff = Math.abs(existing - totalIncentive) > 0.01;
          const wouldZero = totalIncentive === 0 && existing > 0;
          if (diff && !wouldZero) {
            salary.incentiveAmount = totalIncentive;
            await salary.save();
          }
        }
        if (salary.rewardStatus === 'pending') {
          const teamTargetReward = await calculateTeamTargetRewardForMonth(salary.employeeId, salary.month);
          const personalTargetReward = await calculatePersonalTargetRewardForMonth(salary.employeeId, salary.month);
          const combinedReward = teamTargetReward + personalTargetReward;
          const existing = salary.rewardAmount || 0;
          const diff = Math.abs(existing - combinedReward) > 0.01;
          const wouldZero = combinedReward === 0 && existing > 0;
          if (diff && !wouldZero) {
            salary.rewardAmount = combinedReward;
            await salary.save();
          }
        }
      } catch (error) {
        console.error(`Error calculating incentive/reward for salary ${salary._id}:`, error);
      }
    } else if ((salary.employeeModel === 'Employee' || salary.employeeModel === 'PM') && salary.rewardStatus === 'pending') {
      // Sync Dev/PM rewards from EmployeeReward/PMReward models
      try {
        let totalReward = 0;
        if (salary.employeeModel === 'Employee') {
          const rewards = await EmployeeReward.find({ employeeId: salary.employeeId, month: salary.month });
          totalReward = rewards.reduce((sum, r) => sum + (r.amount || 0), 0);
        } else {
          const rewards = await PMReward.find({ pmId: salary.employeeId, month: salary.month });
          totalReward = rewards.reduce((sum, r) => sum + (r.amount || 0), 0);
        }

        // Always sync rewardAmount to underlying rewards, even when they become 0,
        // so salary records don't keep stale reward values.
        if (Math.abs((salary.rewardAmount || 0) - totalReward) > 0.01) {
          salary.rewardAmount = totalReward;
          await salary.save();
        }
      } catch (error) {
        console.error(`Error syncing reward for ${salary.employeeModel} salary ${salary._id}:`, error);
      }
    }
  }

  // Re-fetch salaries to get updated incentiveAmount values
  salaries = await Salary.find(filter)
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email')
    .sort({ paymentDate: 1, employeeName: 1 });

  // Calculate statistics - incentive only for Sales employees; others have fixed salary + reward only
  const isSales = (s) => s.employeeModel === 'Sales' && s.department === 'sales';
  const stats = {
    totalEmployees: salaries.length,
    paidEmployees: salaries.filter(s => s.status === 'paid').length,
    pendingEmployees: salaries.filter(s => s.status === 'pending').length,
    totalAmount: salaries.reduce((sum, s) => sum + s.fixedSalary, 0),
    paidAmount: salaries.filter(s => s.status === 'paid').reduce((sum, s) => sum + s.fixedSalary, 0),
    pendingAmount: salaries.filter(s => s.status === 'pending').reduce((sum, s) => sum + s.fixedSalary, 0),
    totalIncentiveAmount: salaries.filter(isSales).reduce((sum, s) => sum + (s.incentiveAmount || 0), 0),
    paidIncentiveAmount: salaries.filter(s => isSales(s) && s.incentiveStatus === 'paid').reduce((sum, s) => sum + (s.incentiveAmount || 0), 0),
    pendingIncentiveAmount: salaries.filter(s => isSales(s) && s.incentiveStatus === 'pending').reduce((sum, s) => sum + (s.incentiveAmount || 0), 0),
    totalRewardAmount: salaries.reduce((sum, s) => sum + (s.rewardAmount || 0), 0),
    paidRewardAmount: salaries.filter(s => s.rewardStatus === 'paid').reduce((sum, s) => sum + (s.rewardAmount || 0), 0),
    pendingRewardAmount: salaries.filter(s => s.rewardStatus === 'pending').reduce((sum, s) => sum + (s.rewardAmount || 0), 0)
  };

  res.json({
    success: true,
    data: salaries,
    stats,
    month: currentMonth
  });
});

// @desc    Get employee IDs who already have salary set (for Set salary dropdown)
// @route   GET /api/admin/users/salary/employee-ids
// @access  Private (Admin/HR)
exports.getEmployeesWithSalary = asyncHandler(async (req, res) => {
  const ids = await Salary.distinct('employeeId');
  res.json({
    success: true,
    data: ids.map(id => id.toString())
  });
});

// @desc    Get list of employees who have salary set, with basic details
//          (source of truth = Salary collection, not just fixedSalary on employee)
// @route   GET /api/admin/users/salary/employees
// @access  Private (Admin/HR/Accountant)
exports.getEmployeesWithSalaryDetails = asyncHandler(async (req, res) => {
  // Group salary records by employee to find first month, first createdAt, and latest fixedSalary
  const aggregates = await Salary.aggregate([
    {
      $group: {
        _id: { employeeId: '$employeeId', employeeModel: '$employeeModel' },
        firstMonth: { $min: '$month' },
        firstCreatedAt: { $min: '$createdAt' },
        lastUpdatedAt: { $max: '$updatedAt' },
        latestFixedSalary: { $last: '$fixedSalary' }
      }
    }
  ]);

  const results = await Promise.all(
    aggregates.map(async (agg) => {
      const { employeeId, employeeModel } = agg._id;
      const employee = await getEmployee(employeeId, employeeModel);
      if (!employee) {
        return null;
      }

      const role =
        employee.role ||
        (employeeModel === 'Sales'
          ? 'sales'
          : employeeModel === 'PM'
          ? 'project-manager'
          : employeeModel === 'Admin'
          ? 'hr'
          : 'employee');

      return {
        id: employee._id.toString(),
        name: employee.name,
        department: employeeModel === 'Admin' ? (employee.role || 'HR') : (employee.department || 'unknown'),
        role,
        employeeModel,
        fixedSalary: typeof employee.fixedSalary === 'number' && employee.fixedSalary > 0
          ? employee.fixedSalary
          : agg.latestFixedSalary || 0,
        joiningDate: employee.joiningDate || null,
        salaryFirstMonth: agg.firstMonth || null,
        salaryFirstCreatedAt: agg.firstCreatedAt || null,
        salaryLastUpdatedAt: agg.lastUpdatedAt || null
      };
    })
  );

  res.json({
    success: true,
    data: results.filter(Boolean)
  });
});

// @desc    Get single salary record
// @route   GET /api/admin/salary/:id
// @access  Private (Admin/HR)
exports.getSalaryRecord = asyncHandler(async (req, res) => {
  const salary = await Salary.findById(req.params.id)
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email');

  if (!salary) {
    return res.status(404).json({
      success: false,
      message: 'Salary record not found'
    });
  }

  res.json({
    success: true,
    data: salary
  });
});

// @desc    Update salary record (mark as paid, update payment details)
// @route   PUT /api/admin/salary/:id
// @access  Private (Admin/HR)
exports.updateSalaryRecord = asyncHandler(async (req, res) => {
  const { status, paymentMethod, remarks, fixedSalary, incentiveStatus, rewardStatus } = req.body;

  const salary = await Salary.findById(req.params.id);
  if (!salary) {
    return res.status(404).json({
      success: false,
      message: 'Salary record not found'
    });
  }

  // Check if trying to edit past month (read-only)
  const salaryMonth = new Date(salary.month + '-01');
  const currentMonth = new Date();
  currentMonth.setDate(1);
  currentMonth.setHours(0, 0, 0, 0);

  if (salaryMonth < currentMonth && salary.status === 'paid') {
    return res.status(400).json({
      success: false,
      message: 'Cannot edit salary records for past months that are already paid'
    });
  }

  // Store previous status for transaction creation and next month creation
  const previousStatus = salary.status;

  // Selective update mode (Safe fields)
  const onlySafeFields = status === undefined && incentiveStatus === undefined && rewardStatus === undefined;
  if (onlySafeFields) {
    if (fixedSalary !== undefined && fixedSalary !== null) {
      const parsedSalary = parseFloat(fixedSalary);
      if (!isNaN(parsedSalary) && parsedSalary >= 0) {
        salary.fixedSalary = parsedSalary;
        const employee = await getEmployee(salary.employeeId, salary.employeeModel);
        if (employee && typeof employee.fixedSalary !== 'undefined') {
          employee.fixedSalary = parsedSalary;
          await employee.save();
        }
      }
    }
    if (remarks !== undefined) salary.remarks = remarks;
    if (paymentMethod && salary.status === 'paid') salary.paymentMethod = paymentMethod;

    salary.updatedBy = req.admin ? req.admin.id : null;
    await salary.save();

    return res.json({
      success: true,
      message: 'Salary record updated successfully',
      data: salary
    });
  }

  // Update fixedSalary if provided
  if (fixedSalary !== undefined && fixedSalary !== null) {
    const parsedSalary = parseFloat(fixedSalary);
    if (!isNaN(parsedSalary) && parsedSalary >= 0) {
      salary.fixedSalary = parsedSalary;
      const employee = await getEmployee(salary.employeeId, salary.employeeModel);
      if (employee && typeof employee.fixedSalary !== 'undefined') {
        employee.fixedSalary = parsedSalary;
        await employee.save();
      }
    }
  }

  // Handle Main Salary Status Update
  if (status) {
    if (!['pending', 'paid'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    salary.status = status;

    if (status === 'paid') {
      salary.paidDate = new Date();
      const payDate = salary.paidDate;

      // Sales Team: Incentive and Reward
      if (previousStatus !== 'paid' && salary.employeeModel === 'Sales' && salary.department === 'sales') {
        try {
          const incentives = await Incentive.find({ salesEmployee: salary.employeeId, currentBalance: { $gt: 0 } });
          const totalIncentive = incentives.reduce((sum, inc) => sum + (inc.currentBalance || 0), 0);
          if (totalIncentive > 0) {
            salary.incentiveAmount = totalIncentive;
            salary.incentiveStatus = 'paid';
            salary.incentivePaidDate = payDate;
            for (const inc of incentives) {
              inc.currentBalance = 0;
              inc.paidAt = payDate;
              await inc.save();
            }
            const { createOutgoingTransaction } = require('../utils/financeTransactionHelper');
            const { mapSalaryPaymentMethodToFinance } = require('../utils/paymentMethodMapper');
            await createOutgoingTransaction({
              amount: totalIncentive,
              category: 'Incentive Payment',
              transactionDate: payDate,
              createdBy: req.admin.id,
              employee: salary.employeeId,
              paymentMethod: paymentMethod ? mapSalaryPaymentMethodToFinance(paymentMethod) : 'Bank Transfer',
              description: `Incentive payment for ${salary.employeeName} - ${salary.month}`,
              metadata: { sourceType: 'incentive', sourceId: salary._id.toString(), month: salary.month },
              checkDuplicate: true
            });
          }
        } catch (e) {
          console.error('Incentive processing error:', e);
        }

        try {
          const rewardAmt = Number(salary.rewardAmount || 0);
          if (rewardAmt > 0) {
            salary.rewardStatus = 'paid';
            salary.rewardPaidDate = payDate;
            const { createOutgoingTransaction } = require('../utils/financeTransactionHelper');
            const { mapSalaryPaymentMethodToFinance } = require('../utils/paymentMethodMapper');
            await createOutgoingTransaction({
              amount: rewardAmt,
              category: 'Reward Payment',
              transactionDate: payDate,
              createdBy: req.admin.id,
              employee: salary.employeeId,
              paymentMethod: paymentMethod ? mapSalaryPaymentMethodToFinance(paymentMethod) : 'Bank Transfer',
              description: `Reward payment for ${salary.employeeName} - ${salary.month}`,
              metadata: { sourceType: 'reward', sourceId: salary._id.toString(), month: salary.month },
              checkDuplicate: true
            });
          }
        } catch (e) {
          console.error('Sales Reward processing error:', e);
        }
      }
      // Dev/PM Team: Rewards
      else if (previousStatus !== 'paid' && (salary.employeeModel === 'Employee' || salary.employeeModel === 'PM')) {
        try {
          const rewardAmt = Number(salary.rewardAmount || 0);
          if (rewardAmt > 0) {
            salary.rewardStatus = 'paid';
            salary.rewardPaidDate = payDate;

            if (salary.employeeModel === 'Employee') {
              await EmployeeReward.updateMany(
                { employeeId: salary.employeeId, month: salary.month, status: 'pending' },
                { status: 'paid', paidAt: payDate }
              );
            } else {
              await PMReward.updateMany(
                { pmId: salary.employeeId, month: salary.month, status: 'pending' },
                { status: 'paid', paidAt: payDate }
              );
            }
          }
        } catch (e) {
          console.error('Dev/PM Reward processing error:', e);
        }
      }

      // Salary Finance Transaction
      try {
        const { createOutgoingTransaction } = require('../utils/financeTransactionHelper');
        const { mapSalaryPaymentMethodToFinance } = require('../utils/paymentMethodMapper');

        if (previousStatus !== 'paid') {
          await createOutgoingTransaction({
            amount: salary.fixedSalary,
            category: 'Salary Payment',
            transactionDate: payDate,
            createdBy: req.admin.id,
            employee: salary.employeeId,
            paymentMethod: paymentMethod ? mapSalaryPaymentMethodToFinance(paymentMethod) : 'Bank Transfer',
            description: `Salary payment for ${salary.employeeName} - ${salary.month}`,
            metadata: { sourceType: 'salary', sourceId: salary._id.toString(), month: salary.month },
            checkDuplicate: true
          });
        }
      } catch (error) {
        console.error('Salary Transaction error:', error);
      }

      // Next Month Salary Record
      if (previousStatus !== 'paid') {
        try {
          const [year, moStr] = salary.month.split('-');
          const nextDate = new Date(parseInt(year), parseInt(moStr), 1);
          const nextMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`;

          const employee = await getEmployee(salary.employeeId, salary.employeeModel);
          if (employee) {
            const joiningDate = employee.joiningDate || salary.paymentDate;
            const nextPayDate = calculatePaymentDate(joiningDate, nextMonth);

            const existing = await Salary.findOne({ employeeId: salary.employeeId, employeeModel: salary.employeeModel, month: nextMonth });
            if (!existing) {
              await Salary.create({
                employeeId: salary.employeeId,
                employeeModel: salary.employeeModel,
                employeeName: salary.employeeName,
                department: salary.department,
                role: salary.role,
                month: nextMonth,
                fixedSalary: salary.fixedSalary,
                paymentDate: nextPayDate,
                paymentDay: new Date(joiningDate).getDate(),
                status: 'pending',
                source: 'auto-next-month',
                createdBy: req.admin.id
              });
            }
          }
        } catch (error) {
          console.error('Auto-generation error:', error);
        }
      }
    } else {
      salary.paidDate = null;
      salary.paymentMethod = null;
      try {
        const { cancelTransactionForSource } = require('../utils/financeTransactionHelper');
        await cancelTransactionForSource({ sourceType: 'salary', sourceId: salary._id.toString() }, 'cancel');
      } catch (error) {
        console.error('Transaction cancellation error:', error);
      }
    }
  }

  if (paymentMethod && salary.status === 'paid') salary.paymentMethod = paymentMethod;
  if (remarks !== undefined) salary.remarks = remarks;

  // Separate Incentive Status (Sales)
  if (incentiveStatus !== undefined && salary.employeeModel === 'Sales') {
    const prevIncentiveStatus = salary.incentiveStatus;
    salary.incentiveStatus = incentiveStatus;

    if (incentiveStatus === 'paid') {
      const payDate = new Date();
      salary.incentivePaidDate = payDate;
      const incentives = await Incentive.find({ salesEmployee: salary.employeeId, currentBalance: { $gt: 0 } });
      const totalIncentive = incentives.reduce((sum, inc) => sum + (inc.currentBalance || 0), 0);

      if (totalIncentive > 0) {
        salary.incentiveAmount = totalIncentive;
        for (const inc of incentives) {
          inc.currentBalance = 0;
          inc.paidAt = payDate;
          await inc.save();
        }
        try {
          const { createOutgoingTransaction } = require('../utils/financeTransactionHelper');
          const { mapSalaryPaymentMethodToFinance } = require('../utils/paymentMethodMapper');
          if (prevIncentiveStatus !== 'paid') {
            await createOutgoingTransaction({
              amount: totalIncentive,
              category: 'Incentive Payment',
              transactionDate: payDate,
              createdBy: req.admin.id,
              employee: salary.employeeId,
              paymentMethod: paymentMethod ? mapSalaryPaymentMethodToFinance(paymentMethod) : 'Bank Transfer',
              description: `Incentive payment for ${salary.employeeName} - ${salary.month}`,
              metadata: { sourceType: 'incentive', sourceId: salary._id.toString(), month: salary.month },
              checkDuplicate: true
            });
          }
        } catch (error) {
          console.error('Incentive payout error:', error);
        }
      }
    } else {
      salary.incentivePaidDate = null;
    }
  }

  // Separate Reward Status
  if (rewardStatus !== undefined) {
    const prevRewardStatus = salary.rewardStatus;
    salary.rewardStatus = rewardStatus;

    if (rewardStatus === 'paid') {
      const payDate = new Date();
      salary.rewardPaidDate = payDate;

      try {
        const { createOutgoingTransaction } = require('../utils/financeTransactionHelper');
        const { mapSalaryPaymentMethodToFinance } = require('../utils/paymentMethodMapper');

        if (prevRewardStatus !== 'paid' && salary.rewardAmount > 0) {
          await createOutgoingTransaction({
            amount: salary.rewardAmount,
            category: 'Reward Payment',
            transactionDate: payDate,
            createdBy: req.admin.id,
            employee: salary.employeeId,
            paymentMethod: paymentMethod ? mapSalaryPaymentMethodToFinance(paymentMethod) : 'Bank Transfer',
            description: `Reward payment for ${salary.employeeName} - ${salary.month}`,
            metadata: { sourceType: 'reward', sourceId: salary._id.toString(), month: salary.month },
            checkDuplicate: true
          });
        }

        if (salary.employeeModel === 'Employee') {
          await EmployeeReward.updateMany(
            { employeeId: salary.employeeId, month: salary.month, status: 'pending' },
            { status: 'paid', paidAt: payDate }
          );
        } else if (salary.employeeModel === 'PM') {
          await PMReward.updateMany(
            { pmId: salary.employeeId, month: salary.month, status: 'pending' },
            { status: 'paid', paidAt: payDate }
          );
        }
      } catch (error) {
        console.error('Reward error:', error);
      }
    } else {
      salary.rewardPaidDate = null;
    }
  }

  salary.updatedBy = req.admin ? req.admin.id : null;
  await salary.save();

  res.json({
    success: true,
    message: 'Salary record updated successfully',
    data: salary
  });
});

// @desc    Generate salary records for a specific month (auto-generation)
// @route   POST /api/admin/salary/generate/:month
// @access  Private (Admin/HR)
exports.generateMonthlySalaries = asyncHandler(async (req, res) => {
  const { month } = req.params;

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid month format. Use YYYY-MM'
    });
  }

  // Get all employees with fixedSalary > 0 (including Admin/HR)
  const employees = await Employee.find({ fixedSalary: { $gt: 0 }, isActive: true });
  const sales = await Sales.find({ fixedSalary: { $gt: 0 }, isActive: true });
  const pms = await PM.find({ fixedSalary: { $gt: 0 }, isActive: true });
  const adminsWithSalary = await Admin.find({ fixedSalary: { $gt: 0 }, isActive: true });

  const allEmployees = [
    ...employees.map(e => ({ ...e.toObject(), modelType: 'Employee', model: Employee })),
    ...sales.map(s => ({ ...s.toObject(), modelType: 'Sales', model: Sales })),
    ...pms.map(p => ({ ...p.toObject(), modelType: 'PM', model: PM })),
    ...adminsWithSalary.map(a => ({ ...a.toObject(), modelType: 'Admin', model: Admin }))
  ];

  let generated = 0;
  let updated = 0;

  for (const emp of allEmployees) {
    const joiningDate = emp.joiningDate;
    const paymentDate = calculatePaymentDate(joiningDate, month);
    const paymentDay = new Date(joiningDate).getDate();

    const existing = await Salary.findOne({
      employeeId: emp._id,
      employeeModel: emp.modelType,
      month
    });

    // Calculate incentiveAmount and rewardAmount (team + personal target rewards) for sales team
    let incentiveAmount = 0;
    let rewardAmount = 0;
    if (emp.modelType === 'Sales') {
      try {
        const incentives = await Incentive.find({
          salesEmployee: emp._id,
          currentBalance: { $gt: 0 }
        });
        incentiveAmount = incentives.reduce((sum, inc) => sum + (inc.currentBalance || 0), 0);
        const teamTargetReward = await calculateTeamTargetRewardForMonth(emp._id, month);
        const personalTargetReward = await calculatePersonalTargetRewardForMonth(emp._id, month);
        rewardAmount = teamTargetReward + personalTargetReward;
      } catch (error) {
        console.error(`Error calculating incentive/reward for employee ${emp._id}:`, error);
      }
    }

    if (existing) {
      // Update existing record if salary changed or incentive/reward amounts changed
      let needsUpdate = existing.fixedSalary !== emp.fixedSalary;
      if (emp.modelType === 'Sales') {
        if (Math.abs((existing.incentiveAmount || 0) - incentiveAmount) > 0.01 ||
          Math.abs((existing.rewardAmount || 0) - rewardAmount) > 0.01) {
          needsUpdate = true;
        }
      }
      if (needsUpdate) {
        existing.fixedSalary = emp.fixedSalary;
        existing.paymentDate = paymentDate;
        existing.paymentDay = paymentDay;
        if (emp.modelType === 'Sales') {
          existing.incentiveAmount = incentiveAmount;
          existing.rewardAmount = rewardAmount;
        }
        existing.updatedBy = req.admin.id;
        await existing.save();
        updated++;
      }
    } else {
      // Create new record - map modelType to role for Salary schema
      const role = emp.modelType === 'Sales' ? 'sales' : emp.modelType === 'PM' ? 'project-manager' : emp.role || 'employee';
      const dept = emp.modelType === 'Admin' ? (emp.role || 'HR') : (emp.department || 'unknown');
      await Salary.create({
        employeeId: emp._id,
        employeeModel: emp.modelType,
        employeeName: emp.name,
        department: dept,
        role,
        month,
        fixedSalary: emp.fixedSalary,
        paymentDate,
        paymentDay,
        status: 'pending',
        source: 'bulk-generate',
        incentiveAmount,
        incentiveStatus: 'pending',
        rewardAmount,
        rewardStatus: 'pending',
        createdBy: req.admin.id
      });
      generated++;
    }
  }

  res.json({
    success: true,
    message: `Salary records generated: ${generated} new, ${updated} updated`,
    data: {
      generated,
      updated,
      total: allEmployees.length
    }
  });
});

// @desc    Get salary history for an employee
// @route   GET /api/admin/salary/employee/:userType/:employeeId
// @access  Private (Admin/HR)
exports.getEmployeeSalaryHistory = asyncHandler(async (req, res) => {
  const { userType, employeeId: rawEmployeeId } = req.params;

  const employeeModel = getEmployeeModelType(userType);
  if (!employeeModel) {
    return res.status(400).json({
      success: false,
      message: 'Invalid user type'
    });
  }

  // Ensure employeeId is a valid ObjectId (frontend may send string; reject invalid values like "[object Object]")
  if (!rawEmployeeId || typeof rawEmployeeId !== 'string' || !mongoose.Types.ObjectId.isValid(rawEmployeeId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid employee ID'
    });
  }
  const employeeId = new mongoose.Types.ObjectId(rawEmployeeId);

  const salaries = await Salary.find({
    employeeId,
    employeeModel
  })
    .sort({ month: -1 })
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email');

  res.json({
    success: true,
    data: salaries
  });
});

// @desc    Delete all salary records for an employee (remove from salary system)
// @route   DELETE /api/admin/salary/:id
// @access  Private (Admin/HR)
exports.deleteSalaryRecord = asyncHandler(async (req, res) => {
  const salary = await Salary.findById(req.params.id);

  if (!salary) {
    return res.status(404).json({
      success: false,
      message: 'Salary record not found'
    });
  }

  // Delete ALL salary records for this employee/model combination.
  // This effectively removes the employee from the salary system until salary is set again.
  await Salary.deleteMany({
    employeeId: salary.employeeId,
    employeeModel: salary.employeeModel
  });

  // Also clear fixedSalary on the underlying employee document so they are
  // removed from "Employees With Salary Set" lists until salary is configured again.
  try {
    const employee = await getEmployee(salary.employeeId, salary.employeeModel);
    if (employee && typeof employee.fixedSalary !== 'undefined') {
      employee.fixedSalary = 0;
      await employee.save();
    }
  } catch (error) {
    console.error('Error clearing fixedSalary for employee after deleting salary records:', error);
  }

  res.json({
    success: true,
    message: 'All salary records for this employee have been deleted successfully'
  });
});

// @desc    Update incentive payment status
// @route   PUT /api/admin/salary/:id/incentive
// @access  Private (Admin/HR)
exports.updateIncentivePayment = asyncHandler(async (req, res) => {
  const { incentiveStatus, paymentMethod, remarks } = req.body;

  if (!incentiveStatus || !['pending', 'paid'].includes(incentiveStatus)) {
    return res.status(400).json({
      success: false,
      message: 'Valid incentiveStatus (pending or paid) is required'
    });
  }

  const salary = await Salary.findById(req.params.id);
  if (!salary) {
    return res.status(404).json({
      success: false,
      message: 'Salary record not found'
    });
  }

  // Only allow incentive updates for sales team
  if (salary.employeeModel !== 'Sales' || salary.department !== 'sales') {
    return res.status(400).json({
      success: false,
      message: 'Incentive payment is only available for sales team employees'
    });
  }

  const previousStatus = salary.incentiveStatus;

  // Update incentive status
  salary.incentiveStatus = incentiveStatus;

  if (incentiveStatus === 'paid') {
    salary.incentivePaidDate = new Date();

    // Find all Incentive records for this sales employee with currentBalance > 0
    const incentives = await Incentive.find({
      salesEmployee: salary.employeeId,
      currentBalance: { $gt: 0 }
    });

    // Calculate total incentive amount BEFORE clearing currentBalance
    // This preserves the amount that was paid for historical records
    const totalIncentiveAmount = incentives.reduce((sum, inc) => sum + (inc.currentBalance || 0), 0);

    // Store the incentive amount before clearing balances
    if (totalIncentiveAmount > 0) {
      salary.incentiveAmount = totalIncentiveAmount;
    }

    // Set currentBalance to 0 for all incentive records
    for (const incentive of incentives) {
      incentive.currentBalance = 0;
      if (!incentive.paidAt) {
        incentive.paidAt = new Date();
      }
      await incentive.save();
    }

    // Create finance transaction for incentive payment
    try {
      const { createOutgoingTransaction } = require('../utils/financeTransactionHelper');
      const { mapSalaryPaymentMethodToFinance } = require('../utils/paymentMethodMapper');

      if (previousStatus !== 'paid' && salary.incentiveAmount > 0) {
        await createOutgoingTransaction({
          amount: salary.incentiveAmount,
          category: 'Incentive Payment',
          transactionDate: salary.incentivePaidDate || new Date(),
          createdBy: req.admin.id,
          employee: salary.employeeId,
          paymentMethod: paymentMethod ? mapSalaryPaymentMethodToFinance(paymentMethod) : 'Bank Transfer',
          description: `Incentive payment for ${salary.employeeName} - ${salary.month}`,
          metadata: {
            sourceType: 'incentive',
            sourceId: salary._id.toString(),
            month: salary.month
          },
          checkDuplicate: true
        });
      }
    } catch (error) {
      console.error('Error creating finance transaction for incentive:', error);
    }
  } else {
    salary.incentivePaidDate = null;

    // Cancel transaction if status changed back to pending
    try {
      const { cancelTransactionForSource } = require('../utils/financeTransactionHelper');
      await cancelTransactionForSource({
        sourceType: 'incentive',
        sourceId: salary._id.toString()
      }, 'cancel');
    } catch (error) {
      console.error('Error canceling finance transaction for incentive:', error);
    }
  }

  if (paymentMethod && salary.incentiveStatus === 'paid') {
    // Store payment method in remarks or create a separate field if needed
    if (remarks) {
      salary.remarks = (salary.remarks || '') + ` [Incentive Payment: ${paymentMethod}]`;
    }
  }

  if (remarks && salary.incentiveStatus === 'paid') {
    salary.remarks = (salary.remarks || '') + ` [Incentive: ${remarks}]`;
  }

  salary.updatedBy = req.admin.id;
  await salary.save();

  res.json({
    success: true,
    message: 'Incentive payment status updated successfully',
    data: salary
  });
});

// @desc    Update reward payment status
// @route   PUT /api/admin/salary/:id/reward
// @access  Private (Admin/HR)
exports.updateRewardPayment = asyncHandler(async (req, res) => {
  const { rewardStatus, paymentMethod, remarks } = req.body;

  if (!rewardStatus || !['pending', 'paid'].includes(rewardStatus)) {
    return res.status(400).json({
      success: false,
      message: 'Valid rewardStatus (pending or paid) is required'
    });
  }

  const salary = await Salary.findById(req.params.id);
  if (!salary) {
    return res.status(404).json({
      success: false,
      message: 'Salary record not found'
    });
  }

  const previousStatus = salary.rewardStatus;

  // Update reward status
  salary.rewardStatus = rewardStatus;

  if (rewardStatus === 'paid') {
    salary.rewardPaidDate = new Date();

    // Create finance transaction for reward payment
    try {
      const { createOutgoingTransaction } = require('../utils/financeTransactionHelper');
      const { mapSalaryPaymentMethodToFinance } = require('../utils/paymentMethodMapper');

      if (previousStatus !== 'paid' && salary.rewardAmount > 0) {
        await createOutgoingTransaction({
          amount: salary.rewardAmount,
          category: 'Reward Payment',
          transactionDate: salary.rewardPaidDate || new Date(),
          createdBy: req.admin.id,
          employee: salary.employeeId,
          paymentMethod: paymentMethod ? mapSalaryPaymentMethodToFinance(paymentMethod) : 'Bank Transfer',
          description: `Reward payment for ${salary.employeeName} - ${salary.month}`,
          metadata: {
            sourceType: 'reward',
            sourceId: salary._id.toString(),
            month: salary.month
          },
          checkDuplicate: true
        });
      }
    } catch (error) {
      console.error('Error creating finance transaction for reward:', error);
    }
  } else {
    salary.rewardPaidDate = null;

    // Cancel transaction if status changed back to pending
    try {
      const { cancelTransactionForSource } = require('../utils/financeTransactionHelper');
      await cancelTransactionForSource({
        sourceType: 'reward',
        sourceId: salary._id.toString()
      }, 'cancel');
    } catch (error) {
      console.error('Error canceling finance transaction for reward:', error);
    }
  }

  if (paymentMethod && salary.rewardStatus === 'paid') {
    if (remarks) {
      salary.remarks = (salary.remarks || '') + ` [Reward Payment: ${paymentMethod}]`;
    }
  }

  if (remarks && salary.rewardStatus === 'paid') {
    salary.remarks = (salary.remarks || '') + ` [Reward: ${remarks}]`;
  }

  salary.updatedBy = req.admin.id;
  await salary.save();

  res.json({
    success: true,
    message: 'Reward payment status updated successfully',
    data: salary
  });
});

