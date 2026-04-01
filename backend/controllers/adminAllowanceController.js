const Allowance = require('../models/Allowance');
const Employee = require('../models/Employee');
const Sales = require('../models/Sales');
const PM = require('../models/PM');
const mongoose = require('mongoose');
const asyncHandler = require('../middlewares/asyncHandler');

// Helper: Get employee by ID and model type
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
    default:
      return null;
  }
  return await Model.findById(employeeId);
};

// Helper: Get employee model type from user type
const getEmployeeModelType = (userType) => {
  switch (userType) {
    case 'employee':
      return 'Employee';
    case 'sales':
      return 'Sales';
    case 'project-manager':
    case 'pm':
      return 'PM';
    default:
      return null;
  }
};

// @desc    Create new allowance
// @route   POST /api/admin/users/allowances
// @access  Private (Admin/HR)
exports.createAllowance = asyncHandler(async (req, res) => {
  const {
    employeeId,
    userType,
    itemType,
    itemName,
    serialNumber,
    issueDate,
    returnDate,
    status,
    value,
    remarks
  } = req.body;

  // Validation
  if (!employeeId || !itemType || !itemName || !issueDate || !value) {
    return res.status(400).json({
      success: false,
      message: 'Please provide all required fields: employeeId, itemType, itemName, issueDate, and value'
    });
  }

  if (!['laptop', 'monitor', 'smartphone', 'headphones', 'wifi', 'car', 'other'].includes(itemType)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid item type'
    });
  }

  if (value < 0) {
    return res.status(400).json({
      success: false,
      message: 'Value cannot be negative'
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

  // Create allowance
  const allowance = await Allowance.create({
    employeeId: employee._id,
    employeeModel,
    employeeName: employee.name,
    itemType,
    itemName,
    serialNumber: serialNumber || '',
    issueDate,
    returnDate: returnDate || null,
    status: status || 'active',
    value,
    remarks: remarks || '',
    createdBy: req.admin.id
  });

  res.status(201).json({
    success: true,
    message: 'Allowance created successfully',
    data: allowance
  });
});

// @desc    Get all allowances with filters
// @route   GET /api/admin/users/allowances
// @access  Private (Admin/HR)
exports.getAllAllowances = asyncHandler(async (req, res) => {
  const { employeeId, userType, status, itemType, search } = req.query;

  const filter = {};

  // Filter by employee
  if (employeeId) {
    const employeeModel = userType ? getEmployeeModelType(userType) : null;
    if (employeeModel) {
      filter.employeeId = employeeId;
      filter.employeeModel = employeeModel;
    } else if (userType) {
      // If userType provided but invalid, return empty
      filter.employeeModel = 'INVALID';
    }
  }

  // Filter by status
  if (status && status !== 'all') {
    filter.status = status;
  }

  // Filter by item type
  if (itemType && itemType !== 'all') {
    filter.itemType = itemType;
  }

  // Search by employee name or item name
  if (search) {
    filter.$or = [
      { employeeName: { $regex: search, $options: 'i' } },
      { itemName: { $regex: search, $options: 'i' } },
      { serialNumber: { $regex: search, $options: 'i' } }
    ];
  }

  const allowances = await Allowance.find(filter)
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email')
    .sort({ createdAt: -1 });

  // Calculate statistics
  const stats = {
    totalItems: allowances.length,
    activeItems: allowances.filter(a => a.status === 'active').length,
    returnedItems: allowances.filter(a => a.status === 'returned').length,
    lostItems: allowances.filter(a => a.status === 'lost').length,
    totalValue: allowances.reduce((sum, a) => sum + a.value, 0),
    activeValue: allowances.filter(a => a.status === 'active').reduce((sum, a) => sum + a.value, 0)
  };

  res.json({
    success: true,
    data: allowances,
    stats
  });
});

// @desc    Get single allowance by ID
// @route   GET /api/admin/users/allowances/:id
// @access  Private (Admin/HR)
exports.getAllowanceById = asyncHandler(async (req, res) => {
  const allowance = await Allowance.findById(req.params.id)
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email')
    .populate('employeeId', 'name email department');

  if (!allowance) {
    return res.status(404).json({
      success: false,
      message: 'Allowance not found'
    });
  }

  res.json({
    success: true,
    data: allowance
  });
});

// @desc    Update allowance
// @route   PUT /api/admin/users/allowances/:id
// @access  Private (Admin/HR)
exports.updateAllowance = asyncHandler(async (req, res) => {
  const {
    itemType,
    itemName,
    serialNumber,
    issueDate,
    returnDate,
    status,
    value,
    remarks
  } = req.body;

  const allowance = await Allowance.findById(req.params.id);
  if (!allowance) {
    return res.status(404).json({
      success: false,
      message: 'Allowance not found'
    });
  }

  // Validate item type if provided
  if (itemType && !['laptop', 'monitor', 'smartphone', 'headphones', 'wifi', 'car', 'other'].includes(itemType)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid item type'
    });
  }

  // Validate status if provided
  if (status && !['active', 'returned', 'lost'].includes(status)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid status. Must be "active", "returned", or "lost"'
    });
  }

  // Validate value if provided
  if (value !== undefined && value < 0) {
    return res.status(400).json({
      success: false,
      message: 'Value cannot be negative'
    });
  }

  // Update fields
  if (itemType !== undefined) allowance.itemType = itemType;
  if (itemName !== undefined) allowance.itemName = itemName;
  if (serialNumber !== undefined) allowance.serialNumber = serialNumber;
  if (issueDate !== undefined) allowance.issueDate = issueDate;
  if (returnDate !== undefined) allowance.returnDate = returnDate;
  if (status !== undefined) allowance.status = status;
  if (value !== undefined) allowance.value = value;
  if (remarks !== undefined) allowance.remarks = remarks;
  
  allowance.updatedBy = req.admin.id;

  await allowance.save();

  res.json({
    success: true,
    message: 'Allowance updated successfully',
    data: allowance
  });
});

// @desc    Delete allowance
// @route   DELETE /api/admin/users/allowances/:id
// @access  Private (Admin/HR)
exports.deleteAllowance = asyncHandler(async (req, res) => {
  const allowance = await Allowance.findById(req.params.id);
  
  if (!allowance) {
    return res.status(404).json({
      success: false,
      message: 'Allowance not found'
    });
  }

  await Allowance.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: 'Allowance deleted successfully'
  });
});

// @desc    Get allowances statistics
// @route   GET /api/admin/users/allowances/statistics
// @access  Private (Admin/HR)
exports.getAllowanceStatistics = asyncHandler(async (req, res) => {
  const allowances = await Allowance.find()
    .populate('employeeId', 'name department');

  const stats = {
    totalItems: allowances.length,
    activeItems: allowances.filter(a => a.status === 'active').length,
    returnedItems: allowances.filter(a => a.status === 'returned').length,
    lostItems: allowances.filter(a => a.status === 'lost').length,
    totalValue: allowances.reduce((sum, a) => sum + a.value, 0),
    activeValue: allowances.filter(a => a.status === 'active').reduce((sum, a) => sum + a.value, 0),
    returnedValue: allowances.filter(a => a.status === 'returned').reduce((sum, a) => sum + a.value, 0),
    lostValue: allowances.filter(a => a.status === 'lost').reduce((sum, a) => sum + a.value, 0),
    byItemType: {},
    byDepartment: {}
  };

  // Group by item type
  allowances.forEach(allowance => {
    if (!stats.byItemType[allowance.itemType]) {
      stats.byItemType[allowance.itemType] = {
        count: 0,
        value: 0
      };
    }
    stats.byItemType[allowance.itemType].count++;
    stats.byItemType[allowance.itemType].value += allowance.value;
  });

  // Group by department (if employee data available)
  allowances.forEach(allowance => {
    const department = allowance.employeeId?.department || 'Unknown';
    if (!stats.byDepartment[department]) {
      stats.byDepartment[department] = {
        count: 0,
        value: 0
      };
    }
    stats.byDepartment[department].count++;
    stats.byDepartment[department].value += allowance.value;
  });

  res.json({
    success: true,
    data: stats
  });
});

