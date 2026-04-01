const Admin = require('../models/Admin');
const PM = require('../models/PM');
const Sales = require('../models/Sales');
const Employee = require('../models/Employee');
const Client = require('../models/Client');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Payment = require('../models/Payment');
const Milestone = require('../models/Milestone');
const PaymentReceipt = require('../models/PaymentReceipt');
const AdminFinance = require('../models/AdminFinance');
const Incentive = require('../models/Incentive');
const Request = require('../models/Request');
const Lead = require('../models/Lead');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { uploadFile, deleteFile } = require('../services/cloudinaryService');

// @desc    Get all users with filtering and pagination
// @route   GET /api/admin/users
// @access  Private (Admin only)
const getAllUsers = asyncHandler(async (req, res, next) => {
  const { role, team, department, status, search, page = 1, limit = 20, includeStats = false } = req.query;

  // Build filter object
  let filter = {};

  // Role filter
  if (role && role !== 'all') {
    if (role === 'admin-hr') {
      // Special handling for admin-hr filter
      filter.role = { $in: ['admin', 'hr'] };
    } else {
      filter.role = role;
    }
  }

  // Team filter (for employees)
  if (team && team !== 'all') {
    filter.team = team;
  }

  // Department filter (for employees)
  if (department && department !== 'all') {
    filter.department = department;
  }

  // Status filter
  if (status && status !== 'all') {
    filter.isActive = status === 'active';
  }

  // Search filter
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { phoneNumber: { $regex: search, $options: 'i' } }
    ];
  }

  // Calculate pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Get users from all collections with enhanced data, sorted by creation date (newest first)
  const [admins, pms, sales, employees, clients] = await Promise.all([
    Admin.find(filter).select('-password -loginAttempts -lockUntil').sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    PM.find(filter).select('-password -loginAttempts -lockUntil').populate('projectsManaged', 'name status dueDate').sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    Sales.find(filter).select('-password -loginAttempts -lockUntil').sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    Employee.find(filter).select('-password -loginAttempts -lockUntil').populate('projectsAssigned', 'name status').populate('tasksAssigned', 'name status').sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    Client.find(filter).select('-otp -otpExpires -otpAttempts -otpLockUntil -loginAttempts -lockUntil').populate('tag', 'name color').sort({ createdAt: -1 }).skip(skip).limit(limitNum)
  ]);

  // Format admins with userType based on role
  const formattedAdmins = admins.map(admin => {
    const adminObj = admin.toObject();
    let userType = 'admin';
    if (adminObj.role === 'hr') userType = 'admin';
    else if (adminObj.role === 'accountant') userType = 'accountant';
    else if (adminObj.role === 'pem') userType = 'pem';
    return { ...adminObj, userType };
  });

  // Process clients with project data
  const clientsWithProjects = await Promise.all(clients.map(async user => {
    const userObj = user.toObject();

    // Get projects for this client
    const clientProjects = await Project.find({ client: user._id }).select('name status budget');
    const totalProjects = clientProjects.length;
    const activeProjects = clientProjects.filter(p =>
      ['untouched', 'started', 'active'].includes(p.status)
    ).length;
    const totalSpent = clientProjects.reduce((sum, p) => sum + (p.budget || 0), 0);

    return {
      ...userObj,
      userType: 'client',
      projects: totalProjects,
      totalSpent,
      lastActivity: user.lastLogin || user.updatedAt,
      createdAt: userObj.createdAt || user._id.getTimestamp()
    };
  }));

  // Combine all users with enhanced statistics
  let allUsers = [
    ...formattedAdmins.map(admin => ({ ...admin, createdAt: admin.createdAt || admin._id.getTimestamp() })),
    ...pms.map(user => {
      const userObj = user.toObject();
      const now = new Date();

      // Filter projects by status
      const activeProjects = user.projectsManaged.filter(p =>
        ['untouched', 'started', 'active', 'on-hold', 'testing'].includes(p.status)
      );
      const completedProjects = user.projectsManaged.filter(p =>
        p.status === 'completed'
      );
      const totalProjects = user.projectsManaged.length;

      // Calculate completion rate
      const completionRate = totalProjects > 0 ?
        Math.round((completedProjects.length / totalProjects) * 100) : 0;

      // Calculate overdue projects (not completed/cancelled and past due date)
      const overdueProjects = activeProjects.filter(p => {
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
        ...userObj,
        userType: 'project-manager',
        projects: activeProjects.length,
        completionRate,
        performance,
        teamSize: user.projectsManaged.reduce((sum, p) => sum + (p.assignedTeam?.length || 0), 0),
        createdAt: userObj.createdAt || user._id.getTimestamp()
      };
    }),
    ...sales.map(user => ({ ...user.toObject(), userType: 'sales', createdAt: user.createdAt || user._id.getTimestamp() })),
    ...(await Promise.all(employees.map(async (user) => {
      const userObj = user.toObject();

      // Calculate projects count: projects where employee is in assignedTeam (all non-cancelled projects)
      const projectsCount = await Project.countDocuments({
        assignedTeam: { $in: [user._id] },
        status: { $ne: 'cancelled' } // Count all projects except cancelled
      });

      // Calculate tasks count: tasks assigned to employee (all non-cancelled tasks)
      const tasksCount = await Task.countDocuments({
        assignedTo: { $in: [user._id] },
        status: { $ne: 'cancelled' } // Count all tasks except cancelled
      });

      return {
        ...userObj,
        userType: 'employee',
        projects: projectsCount || 0,
        tasks: tasksCount || 0,
        performance: Math.min(100, Math.max(0,
          (tasksCount > 0 ? 85 : 70) + (projectsCount > 0 ? 10 : 0)
        )),
        createdAt: userObj.createdAt || user._id.getTimestamp()
      };
    }))),
    ...clientsWithProjects
  ];

  // Sort all users by creation date (newest first)
  allUsers.sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
    const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
    return dateB - dateA; // Descending order (newest first)
  });

  // Get total counts for statistics
  const [adminCount, hrCount, accountantCount, pemCount, pmCount, salesCount, employeeCount, clientCount] = await Promise.all([
    Admin.countDocuments({ role: 'admin' }),
    Admin.countDocuments({ role: 'hr' }),
    Admin.countDocuments({ role: 'accountant' }),
    Admin.countDocuments({ role: 'pem' }),
    PM.countDocuments(),
    Sales.countDocuments(),
    Employee.countDocuments(),
    Client.countDocuments()
  ]);

  const [activeAdminCount, activeHrCount, activeAccountantCount, activePemCount, activePmCount, activeSalesCount, activeEmployeeCount, activeClientCount] = await Promise.all([
    Admin.countDocuments({ role: 'admin', isActive: true }),
    Admin.countDocuments({ role: 'hr', isActive: true }),
    Admin.countDocuments({ role: 'accountant', isActive: true }),
    Admin.countDocuments({ role: 'pem', isActive: true }),
    PM.countDocuments({ isActive: true }),
    Sales.countDocuments({ isActive: true }),
    Employee.countDocuments({ isActive: true }),
    Client.countDocuments({ isActive: true })
  ]);

  // Calculate statistics
  const statistics = {
    total: adminCount + hrCount + accountantCount + pemCount + pmCount + salesCount + employeeCount + clientCount,
    admins: adminCount,
    hr: hrCount,
    accountant: accountantCount,
    pem: pemCount,
    projectManagers: pmCount,
    employees: salesCount + employeeCount,
    clients: clientCount,
    developers: employeeCount,
    salesTeam: salesCount,
    active: activeAdminCount + activeHrCount + activeAccountantCount + activePemCount + activePmCount + activeSalesCount + activeEmployeeCount + activeClientCount,
    inactive: (adminCount + hrCount + accountantCount + pemCount + pmCount + salesCount + employeeCount + clientCount) - (activeAdminCount + activeHrCount + activeAccountantCount + activePemCount + activePmCount + activeSalesCount + activeEmployeeCount + activeClientCount)
  };

  res.status(200).json({
    success: true,
    count: allUsers.length,
    statistics,
    data: allUsers
  });
});

// @desc    Get single user by ID and type
// @route   GET /api/admin/users/:userType/:id
// @access  Private (Admin only)
const getUser = asyncHandler(async (req, res, next) => {
  const { userType, id } = req.params;

  let user;
  let Model;

  switch (userType) {
    case 'admin':
    case 'accountant':
    case 'pem':
      Model = Admin;
      break;
    case 'pm':
      Model = PM;
      break;
    case 'sales':
      Model = Sales;
      break;
    case 'employee':
      Model = Employee;
      break;
    case 'client':
      Model = Client;
      break;
    default:
      return next(new ErrorResponse('Invalid user type', 400));
  }

  if (userType === 'client') {
    user = await Model.findById(id).populate('tag', 'name color');
  } else {
    user = await Model.findById(id);
  }

  // Set userType based on role for admin types
  if (userType === 'admin' && user) {
    if (user.role === 'accountant') userType = 'accountant';
    else if (user.role === 'pem') userType = 'pem';
    else if (user.role === 'hr') userType = 'admin';
  }

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  res.status(200).json({
    success: true,
    data: { ...user.toObject(), userType }
  });
});

// @desc    Create new user
// @route   POST /api/admin/users
// @access  Private (Admin only)
const createUser = asyncHandler(async (req, res, next) => {
  const { role, team, department, name, email, phone, dateOfBirth, joiningDate, status, password, confirmPassword, linkedSalesEmployee } = req.body;

  // Validation
  if (!name || !email || !phone || !dateOfBirth || !joiningDate) {
    return next(new ErrorResponse('Please provide all required fields', 400));
  }

  // Password validation for non-client users
  if (role !== 'client') {
    if (!password || !confirmPassword) {
      return next(new ErrorResponse('Password and confirm password are required', 400));
    }
    if (password !== confirmPassword) {
      return next(new ErrorResponse('Passwords do not match', 400));
    }
    if (password.length < 6) {
      return next(new ErrorResponse('Password must be at least 6 characters long', 400));
    }
  }

  // Department validation for developer employees
  if (role === 'employee' && team === 'developer' && !department) {
    return next(new ErrorResponse('Please select a department for developer employees', 400));
  }

  // Helper function to parse date string correctly (preserves calendar date)
  const parseDate = (dateString) => {
    if (!dateString) return null;
    // If date is in YYYY-MM-DD format, parse it to ensure correct date
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Parse components and create date at UTC midnight to preserve calendar date
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    }
    // Otherwise, parse as normal date
    return new Date(dateString);
  };

  let user;
  let userData = {
    name,
    email,
    phone: role === 'client' ? phone : phone,
    dateOfBirth: parseDate(dateOfBirth),
    joiningDate: parseDate(joiningDate),
    isActive: status === 'active'
  };

  // Handle document data if present (already uploaded to Cloudinary)
  if (req.body.document) {
    userData.document = req.body.document;
  }

  switch (role) {
    case 'admin':
    case 'hr':
    case 'accountant':
    case 'pem':
      userData.role = role;
      userData.password = password;
      user = await Admin.create(userData);
      break;

    case 'project-manager':
      userData.role = 'project-manager';
      userData.password = password;
      user = await PM.create(userData);
      break;

    case 'employee':
      userData.role = 'employee';
      userData.team = team;
      userData.department = department;
      userData.password = password;
      userData.position = 'Developer'; // Default position

      if (team === 'sales') {
        user = await Sales.create(userData);
      } else {
        user = await Employee.create(userData);
      }
      break;

    case 'client':
      userData.role = 'client';
      userData.phoneNumber = phone; // Client uses phoneNumber field
      if (linkedSalesEmployee) {
        userData.linkedSalesEmployee = linkedSalesEmployee;
      }
      user = await Client.create(userData);
      break;

    default:
      return next(new ErrorResponse('Invalid role', 400));
  }

  // Send welcome email based on role
  try {
    const emailService = require('../services/emailService');

    if (role === 'client') {
      // Send welcome-only email for clients (no credentials - OTP login)
      await emailService.sendClientWelcomeEmail(email, name, phone);
    } else {
      // Send welcome email with credentials for all other roles
      await emailService.sendWelcomeEmailWithCredentials(email, name, password, role);
    }
  } catch (emailError) {
    // Log email error but don't fail user creation
    console.error('Failed to send welcome email:', emailError);
    // Continue with user creation even if email fails
  }

  res.status(201).json({
    success: true,
    data: { ...user.toObject(), userType: role === 'employee' ? (team === 'sales' ? 'sales' : 'employee') : role === 'project-manager' ? 'project-manager' : role }
  });
});

// @desc    Update user
// @route   PUT /api/admin/users/:userType/:id
// @access  Private (Admin only)
const updateUser = asyncHandler(async (req, res, next) => {
  const { userType, id } = req.params;
  const { name, email, phone, dateOfBirth, joiningDate, status, password, confirmPassword, team, department, tag, linkedSalesEmployee } = req.body;

  let user;
  let Model;

  switch (userType) {
    case 'admin':
      Model = Admin;
      break;
    case 'pm':
      Model = PM;
      break;
    case 'sales':
      Model = Sales;
      break;
    case 'employee':
      Model = Employee;
      break;
    case 'client':
      Model = Client;
      break;
    default:
      return next(new ErrorResponse('Invalid user type', 400));
  }

  user = await Model.findById(id);

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  // Helper function to parse date string correctly (preserves calendar date)
  const parseDate = (dateString) => {
    if (!dateString) return null;
    // If date is in YYYY-MM-DD format, parse it to ensure correct date
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Parse components and create date at UTC midnight to preserve calendar date
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    }
    // Otherwise, parse as normal date
    return new Date(dateString);
  };

  // Update fields
  if (name) user.name = name;
  if (email) user.email = email;
  if (phone) {
    if (userType === 'client') {
      user.phoneNumber = phone;
    } else {
      user.phone = phone;
    }
  }
  if (dateOfBirth) user.dateOfBirth = parseDate(dateOfBirth);
  if (joiningDate) user.joiningDate = parseDate(joiningDate);
  if (status !== undefined) user.isActive = status === 'active';
  if (team) user.team = team;
  if (department) user.department = department;

  // Handle tag assignment for clients
  if (userType === 'client' && tag !== undefined) {
    if (tag === '' || tag === null) {
      user.tag = null;
    } else {
      // Validate tag exists
      const ClientTag = require('../models/ClientTag');
      const tagExists = await ClientTag.findById(tag);
      if (!tagExists) {
        return next(new ErrorResponse('Tag not found', 404));
      }
      user.tag = tag;
    }
  }

  // Handle password update for non-client users
  // Only require password update if password is provided and not empty
  // Check if password is a non-empty string (handles null, undefined, empty string, whitespace)
  const hasPassword = password && typeof password === 'string' && password.trim().length > 0;

  if (userType !== 'client' && hasPassword) {
    const hasConfirmPassword = confirmPassword && typeof confirmPassword === 'string' && confirmPassword.trim().length > 0;

    if (!hasConfirmPassword) {
      return next(new ErrorResponse('Please confirm password', 400));
    }
    if (password !== confirmPassword) {
      return next(new ErrorResponse('Passwords do not match', 400));
    }
    if (password.length < 6) {
      return next(new ErrorResponse('Password must be at least 6 characters long', 400));
    }
    user.password = password;
  }

  // Handle document update if present (already uploaded to Cloudinary)
  if (req.body.document) {
    // Delete old document from Cloudinary if exists
    if (user.document && user.document.public_id) {
      await deleteFile(user.document.public_id);
    }

    // Set new document data
    user.document = req.body.document;
  }

  await user.save();

  res.status(200).json({
    success: true,
    data: { ...user.toObject(), userType }
  });
});

// @desc    Delete user
// @route   DELETE /api/admin/users/:userType/:id
// @access  Private (Admin only)
const deleteUser = asyncHandler(async (req, res, next) => {
  const { userType, id } = req.params;

  let user;
  let Model;

  switch (userType) {
    case 'admin':
      Model = Admin;
      break;
    case 'pm':
      Model = PM;
      break;
    case 'sales':
      Model = Sales;
      break;
    case 'employee':
      Model = Employee;
      break;
    case 'client':
      Model = Client;
      break;
    default:
      return next(new ErrorResponse('Invalid user type', 400));
  }

  user = await Model.findById(id);

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  // If deleting a client, also clean up all related financial and project records
  if (userType === 'client') {
    try {
      const clientId = user._id;

      // If this client was converted from a sales lead, also remove that lead
      // so that sales "Total Leads" and related statistics stay accurate.
      if (user.originLead) {
        try {
          await Lead.findByIdAndDelete(user.originLead);
        } catch (err) {
          console.error('Error deleting origin lead for client on delete:', err);
        }
      }

      // Find all projects for this client
      const projects = await Project.find({ client: clientId }).select('_id submittedBy');
      const projectIds = projects.map(p => p._id);

      // Collect related sales employees for incentive recalculation
      const salesIdSet = new Set();
      if (user.convertedBy) {
        salesIdSet.add(String(user.convertedBy));
      }
      projects.forEach(p => {
        if (p.submittedBy) {
          salesIdSet.add(String(p.submittedBy));
        }
      });
      const salesIds = Array.from(salesIdSet);

      // Delete dependent records in parallel where safe
      const deleteOps = [];

      if (projectIds.length > 0) {
        deleteOps.push(
          Task.deleteMany({ project: { $in: projectIds } }),
          Milestone.deleteMany({ project: { $in: projectIds } }),
          Payment.deleteMany({
            $or: [
              { client: clientId },
              { project: { $in: projectIds } }
            ]
          }),
          PaymentReceipt.deleteMany({
            $or: [
              { client: clientId },
              { project: { $in: projectIds } }
            ]
          }),
          AdminFinance.deleteMany({
            $or: [
              { client: clientId },
              { project: { $in: projectIds } }
            ]
          }),
          Incentive.deleteMany({
            $or: [
              { clientId: clientId },
              { projectId: { $in: projectIds } }
            ]
          }),
          Request.deleteMany({
            $or: [
              { client: clientId },
              { project: { $in: projectIds } }
            ]
          }),
          Project.deleteMany({ _id: { $in: projectIds } })
        );
      } else {
        // Even if there are no projects, still clean up any stray records tied only to client
        deleteOps.push(
          Payment.deleteMany({ client: clientId }),
          PaymentReceipt.deleteMany({ client: clientId }),
          AdminFinance.deleteMany({ client: clientId }),
          Incentive.deleteMany({ clientId: clientId }),
          Request.deleteMany({ client: clientId })
        );
      }

      if (deleteOps.length > 0) {
        await Promise.all(deleteOps);
      }

      // Recalculate currentIncentive for affected sales employees
      if (salesIds.length > 0) {
        const salesMembers = await Sales.find({ _id: { $in: salesIds } });
        await Promise.all(
          salesMembers.map(async (member) => {
            try {
              await member.updateCurrentIncentive();
            } catch (err) {
              console.error('Error updating currentIncentive after client delete:', err);
            }
          })
        );
      }
    } catch (cleanupError) {
      // Log cleanup problems but do not block client deletion
      console.error('Error cleaning up client related data on delete:', cleanupError);
    }
  }

  // Delete associated document from Cloudinary if exists
  if (user.document && user.document.public_id) {
    try {
      await deleteFile(user.document.public_id);
    } catch (error) {
      console.error('Error deleting document from Cloudinary:', error);
    }
  }

  await Model.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'User deleted successfully'
  });
});

// @desc    Get user statistics
// @route   GET /api/admin/users/statistics
// @access  Private (Admin only)
const getUserStatistics = asyncHandler(async (req, res, next) => {
  const [adminCount, hrCount, accountantCount, pemCount, pmCount, salesCount, employeeCount, clientCount] = await Promise.all([
    Admin.countDocuments({ role: 'admin' }),
    Admin.countDocuments({ role: 'hr' }),
    Admin.countDocuments({ role: 'accountant' }),
    Admin.countDocuments({ role: 'pem' }),
    PM.countDocuments(),
    Sales.countDocuments(),
    Employee.countDocuments(),
    Client.countDocuments()
  ]);

  const [activeAdminCount, activeHrCount, activeAccountantCount, activePemCount, activePmCount, activeSalesCount, activeEmployeeCount, activeClientCount] = await Promise.all([
    Admin.countDocuments({ role: 'admin', isActive: true }),
    Admin.countDocuments({ role: 'hr', isActive: true }),
    Admin.countDocuments({ role: 'accountant', isActive: true }),
    Admin.countDocuments({ role: 'pem', isActive: true }),
    PM.countDocuments({ isActive: true }),
    Sales.countDocuments({ isActive: true }),
    Employee.countDocuments({ isActive: true }),
    Client.countDocuments({ isActive: true })
  ]);

  const statistics = {
    total: adminCount + hrCount + accountantCount + pemCount + pmCount + salesCount + employeeCount + clientCount,
    admins: adminCount,
    hr: hrCount,
    accountant: accountantCount,
    pem: pemCount,
    projectManagers: pmCount,
    employees: salesCount + employeeCount,
    clients: clientCount,
    developers: employeeCount,
    salesTeam: salesCount,
    active: activeAdminCount + activeHrCount + activeAccountantCount + activePemCount + activePmCount + activeSalesCount + activeEmployeeCount + activeClientCount,
    inactive: (adminCount + hrCount + accountantCount + pemCount + pmCount + salesCount + employeeCount + clientCount) - (activeAdminCount + activeHrCount + activeAccountantCount + activePemCount + activePmCount + activeSalesCount + activeEmployeeCount + activeClientCount)
  };

  res.status(200).json({
    success: true,
    data: statistics
  });
});

// @desc    Update developer team member team assignment
// @route   PUT /api/admin/users/developers/:id/team-members
// @access  Private (Admin/HR only)
const updateDeveloperTeamMembers = asyncHandler(async (req, res, next) => {
  const { teamMembers, isTeamLead } = req.body;

  const member = await Employee.findById(req.params.id);

  if (!member) {
    return next(new ErrorResponse('Developer team member not found', 404));
  }

  // Ensure this is a developer team member
  if (member.team !== 'developer') {
    return next(new ErrorResponse('This endpoint is only for developer team members', 400));
  }

  // Update team members if provided
  if (teamMembers !== undefined) {
    // Validate team members are valid ObjectIds
    if (Array.isArray(teamMembers)) {
      const mongoose = require('mongoose');
      const validTeamMembers = teamMembers.filter(id => {
        try {
          return mongoose.Types.ObjectId.isValid(id);
        } catch {
          return false;
        }
      });
      member.teamMembers = validTeamMembers;
    } else {
      member.teamMembers = [];
    }
  }

  // Update isTeamLead if provided
  if (isTeamLead !== undefined) {
    member.isTeamLead = Boolean(isTeamLead);
  }

  await member.save();

  res.status(200).json({
    success: true,
    message: 'Team members updated successfully',
    data: {
      id: member._id,
      name: member.name,
      isTeamLead: member.isTeamLead,
      teamMembers: member.teamMembers
    }
  });
});

module.exports = {
  getAllUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getUserStatistics,
  updateDeveloperTeamMembers
};
