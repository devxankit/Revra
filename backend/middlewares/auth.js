const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const PM = require('../models/PM');
const Sales = require('../models/Sales');
const Employee = require('../models/Employee');
const Client = require('../models/Client');

// @desc    Protect routes - verify JWT token
// @access  Private
const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in headers (Bearer)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Check for token in cookies
    else if (req.cookies.token) {
      token = req.cookies.token;
    }
    // Check for employee token in cookies
    else if (req.cookies.employeeToken) {
      token = req.cookies.employeeToken;
    }
    // Check for sales token in cookies
    else if (req.cookies.salesToken) {
      token = req.cookies.salesToken;
    }

    // Make sure token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // If role is present in token, use it for direct lookup
      if (decoded.role) {
        if (['admin', 'hr', 'accountant', 'pem'].includes(decoded.role)) {
          const admin = await Admin.findById(decoded.id);
          if (admin && admin.isActive) {
            req.admin = admin;
            req.user = admin;
            req.userType = admin.role; // e.g. 'admin', 'hr'
            req.user.role = admin.role;
            return next();
          }
        } else if (decoded.role === 'project-manager') {
          const pm = await PM.findById(decoded.id);
          if (pm && pm.isActive) {
            req.pm = pm;
            req.user = pm;
            req.userType = 'project-manager';
            req.user.role = 'project-manager';
            return next();
          }
        } else if (decoded.role === 'sales') {
          const sales = await Sales.findById(decoded.id);
          if (sales && sales.isActive) {
            req.sales = sales;
            req.user = sales;
            req.userType = 'sales';
            req.user.role = 'sales';
            return next();
          }
        } else if (decoded.role === 'employee') {
          const employee = await Employee.findById(decoded.id);
          if (employee && employee.isActive) {
            req.employee = employee;
            req.user = employee;
            req.userType = 'employee';
            req.user.role = 'employee';
            return next();
          }
        } else if (decoded.role === 'client') {
          const client = await Client.findById(decoded.id);
          if (client && client.isActive) {
            req.client = client;
            req.user = client;
            req.userType = 'client';
            req.user.role = 'client';
            return next();
          }
        }
      }

      // Legacy fallback (if no role in token or role lookup failed)
      // Try to find admin first
      let admin = await Admin.findById(decoded.id);
      if (admin && admin.isActive) {
        req.admin = admin;
        req.user = admin;
        req.userType = admin.role;
        req.user.role = admin.role;
        return next();
      }

      // Try to find PM if not admin
      let pm = await PM.findById(decoded.id);
      if (pm && pm.isActive) {
        req.pm = pm;
        req.user = pm;
        req.userType = 'project-manager';
        req.user.role = 'project-manager';
        return next();
      }

      // Try to find Sales if not admin or PM
      let sales = await Sales.findById(decoded.id);
      if (sales && sales.isActive) {
        req.sales = sales;
        req.user = sales;
        req.userType = 'sales';
        req.user.role = 'sales';
        return next();
      }

      // Try to find Employee if not admin, PM, or Sales
      let employee = await Employee.findById(decoded.id);
      if (employee && employee.isActive) {
        req.employee = employee;
        req.user = employee;
        req.userType = 'employee';
        req.user.role = 'employee';
        return next();
      }

      // Try to find Client if not admin, PM, Sales, or Employee
      let client = await Client.findById(decoded.id);
      if (client && client.isActive) {
        req.client = client;
        req.user = client;
        req.userType = 'client';
        req.user.role = 'client';
        return next();
      }

      // If no user found
      return res.status(401).json({
        success: false,
        message: 'No user found with this token'
      });

    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

// @desc    Authorize specific roles
// @access  Private
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    // Check if user role is in allowed roles
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }

    next();
  };
};

// @desc    Check if user can access HR management (admin or hr)
// @access  Private
const canAccessHR = (req, res, next) => {
  if (!req.admin) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  // Admin can access everything; HR and Accountant can access HR management
  if (req.admin.role === 'admin' || req.admin.role === 'hr' || req.admin.role === 'accountant') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Insufficient permissions to access HR management'
    });
  }
};

// @desc    Check if user is admin (full access)
// @access  Private
const isAdmin = (req, res, next) => {
  if (!req.admin) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  if (req.admin.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin role required to access this route'
    });
  }

  next();
};

// @desc    Check if user is PM
// @access  Private
const isPM = (req, res, next) => {
  if (!req.pm) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  next();
};

// @desc    Check if user is Employee
// @access  Private
const isEmployee = (req, res, next) => {
  if (!req.employee) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  next();
};

// @desc    Check if user is Client
// @access  Private
const isClient = (req, res, next) => {
  if (!req.client) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  next();
};

// @desc    Check if user can access project
// @access  Private
const canAccessProject = async (req, res, next) => {
  try {
    const Project = require('../models/Project');
    const projectId = req.params.projectId || req.params.id;

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required'
      });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check access permissions
    if (req.userType === 'client' && !project.client.equals(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this project'
      });
    }

    if (req.userType === 'employee' && !project.assignedTeam.some(member => member.equals(req.user.id))) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this project'
      });
    }

    if (req.userType === 'project-manager' && !project.projectManager.equals(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this project'
      });
    }

    req.project = project;
    next();
  } catch (error) {
    console.error('Project access check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error in project access check'
    });
  }
};

// @desc    Check if user can access task
// @access  Private
const canAccessTask = async (req, res, next) => {
  try {
    const Task = require('../models/Task');
    const Project = require('../models/Project');
    const taskId = req.params.taskId || req.params.id;

    if (!taskId) {
      return res.status(400).json({
        success: false,
        message: 'Task ID is required'
      });
    }

    const task = await Task.findById(taskId).populate('project');
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const project = task.project;

    // Check access permissions
    if (req.userType === 'client' && !project.client.equals(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this task'
      });
    }

    if (req.userType === 'employee' && !project.assignedTeam.some(member => member.equals(req.user.id))) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this task'
      });
    }

    if (req.userType === 'project-manager' && !project.projectManager.equals(req.user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this task'
      });
    }

    req.task = task;
    next();
  } catch (error) {
    console.error('Task access check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error in task access check'
    });
  }
};

// @desc    Optional auth - doesn't fail if no token
// @access  Public/Private
const optionalAuth = async (req, res, next) => {
  try {
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // Check for token in query (for iframe viewing)
    else if (req.query.token) {
      token = req.query.token;
    }
    // Check for token in cookies
    else if (req.cookies.token) {
      token = req.cookies.token;
    }
    // Check for sales token in cookies
    else if (req.cookies.salesToken) {
      token = req.cookies.salesToken;
    }

    if (token) {
      try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // If role is present, use it
        if (decoded.role) {
          if (['admin', 'hr', 'accountant', 'pem'].includes(decoded.role)) {
            const admin = await Admin.findById(decoded.id);
            if (admin && admin.isActive) {
              req.admin = admin;
              req.user = admin;
              req.userType = admin.role;
              req.user.role = admin.role;
            }
          } else if (decoded.role === 'project-manager') {
            const pm = await PM.findById(decoded.id);
            if (pm && pm.isActive) {
              req.pm = pm;
              req.user = pm;
              req.userType = 'project-manager';
              req.user.role = 'project-manager';
            }
          }
          // Add other roles if needed for optionalAuth...
        } else {
          // Legacy fallback
          const admin = await Admin.findById(decoded.id);
          if (admin && admin.isActive) {
            req.admin = admin;
            req.user = admin;
            req.userType = 'admin';
            req.user.role = 'admin';
          }
        }
      } catch (error) {
        // Token is invalid, but we don't fail the request
      }
    }

    next();

  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next(); // Continue even if there's an error
  }
};

module.exports = {
  protect,
  authorize,
  canAccessHR,
  isAdmin,
  isPM,
  isEmployee,
  isClient,
  canAccessProject,
  canAccessTask,
  optionalAuth
};
