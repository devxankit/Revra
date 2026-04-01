const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getUserStatistics,
  updateDeveloperTeamMembers
} = require('../controllers/adminUserController');
const { protect, authorize } = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const { uploadAttendance, getAttendance } = require('../controllers/adminAttendanceController');
const {
  setEmployeeSalary,
  getSalaryRecords,
  getSalaryRecord,
  getEmployeesWithSalary,
  getEmployeesWithSalaryDetails,
  updateSalaryRecord,
  generateMonthlySalaries,
  getEmployeeSalaryHistory,
  deleteSalaryRecord,
  updateIncentivePayment,
  updateRewardPayment
} = require('../controllers/adminSalaryController');
const {
  createAllowance,
  getAllAllowances,
  getAllowanceById,
  updateAllowance,
  deleteAllowance,
  getAllowanceStatistics
} = require('../controllers/adminAllowanceController');
const {
  createRecurringExpense,
  getAllRecurringExpenses,
  getRecurringExpenseById,
  updateRecurringExpense,
  deleteRecurringExpense,
  generateExpenseEntries,
  getExpenseEntries,
  markEntryAsPaid
} = require('../controllers/adminRecurringExpenseController');

// Apply authentication; all routes require admin, HR, or accountant
router.use(protect);
router.use(authorize('admin', 'hr', 'accountant'));

// @route   GET /api/admin/users/statistics
// @desc    Get user statistics
// @access  Private (Admin/HR only)
router.get('/statistics', getUserStatistics);

// IMPORTANT: All specific routes (attendance, salary) must come BEFORE generic routes (/:userType/:id)
// Otherwise, Express will match /salary/:id as /:userType/:id where userType="salary"

// Attendance (Admin/HR/Accountant) - Must come before generic routes
router.post('/attendance/upload', upload.single('file'), uploadAttendance);
router.get('/attendance', getAttendance);

// Salary Management (Admin/HR/Accountant) - Must come before generic routes
router.post('/salary/generate/:month', protect, authorize('admin', 'hr', 'accountant'), generateMonthlySalaries);
router.get('/salary/generate/:month', protect, authorize('admin', 'hr', 'accountant'), generateMonthlySalaries);
router.get('/salary/employee-ids', protect, authorize('admin', 'hr', 'accountant'), getEmployeesWithSalary);
router.get('/salary/employees', protect, authorize('admin', 'hr', 'accountant'), getEmployeesWithSalaryDetails);
router.get('/salary/employee/:userType/:employeeId', protect, authorize('admin', 'hr', 'accountant'), getEmployeeSalaryHistory);
router.put('/salary/set/:userType/:employeeId', protect, authorize('admin', 'hr', 'accountant'), setEmployeeSalary);
router.put('/salary/:id/incentive', protect, authorize('admin', 'hr', 'accountant'), updateIncentivePayment);
router.put('/salary/:id/reward', protect, authorize('admin', 'hr', 'accountant'), updateRewardPayment);
router.get('/salary/:id', protect, authorize('admin', 'hr', 'accountant'), getSalaryRecord);
router.put('/salary/:id', protect, authorize('admin', 'hr', 'accountant'), updateSalaryRecord);
router.delete('/salary/:id', protect, authorize('admin', 'hr', 'accountant'), deleteSalaryRecord);
router.get('/salary', protect, authorize('admin', 'hr', 'accountant'), getSalaryRecords);

// Allowances Management (Admin/HR) - Must come before generic routes
router.get('/allowances/statistics', getAllowanceStatistics);
router.post('/allowances', createAllowance);
router.get('/allowances/:id', getAllowanceById);
router.put('/allowances/:id', updateAllowance);
router.delete('/allowances/:id', deleteAllowance);
router.get('/allowances', getAllAllowances);

// Recurring Expenses Management (Admin/HR) - Must come before generic routes
router.get('/recurring-expenses/entries', protect, authorize('admin', 'hr', 'accountant'), getExpenseEntries);
router.post('/recurring-expenses/:id/generate-entries', protect, authorize('admin', 'hr', 'accountant'), generateExpenseEntries);
router.put('/recurring-expenses/entries/:id/pay', protect, authorize('admin', 'hr', 'accountant'), markEntryAsPaid);
router.post('/recurring-expenses', protect, authorize('admin', 'hr', 'accountant'), createRecurringExpense);
router.get('/recurring-expenses/:id', protect, authorize('admin', 'hr', 'accountant'), getRecurringExpenseById);
router.put('/recurring-expenses/:id', protect, authorize('admin', 'hr', 'accountant'), updateRecurringExpense);
router.delete('/recurring-expenses/:id', protect, authorize('admin', 'hr', 'accountant'), deleteRecurringExpense);
router.get('/recurring-expenses', protect, authorize('admin', 'hr', 'accountant'), getAllRecurringExpenses);

// Developer Team Lead Management - Must come before generic routes
// @route   PUT /api/admin/users/developers/:id/team-members
// @desc    Update team members assignment for developer team lead
// @access  Private (Admin/HR only)
router.put('/developers/:id/team-members', protect, authorize('admin', 'hr', 'accountant'), updateDeveloperTeamMembers);

// Generic user routes (must come after all specific routes)
// @route   GET /api/admin/users
// @desc    Get all users with filtering and pagination
// @access  Private (Admin/HR only)
router.get('/', getAllUsers);

// @route   POST /api/admin/users
// @desc    Create new user
// @access  Private (Admin/HR only)
router.post('/', createUser);

// @route   GET /api/admin/users/:userType/:id
// @desc    Get single user by ID and type
// @access  Private (Admin/HR only)
router.get('/:userType/:id', getUser);

// @route   PUT /api/admin/users/:userType/:id
// @desc    Update user
// @access  Private (Admin/HR only)
router.put('/:userType/:id', updateUser);

// @route   DELETE /api/admin/users/:userType/:id
// @desc    Delete user
// @access  Private (Admin/HR only)
router.delete('/:userType/:id', deleteUser);

module.exports = router;
