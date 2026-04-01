const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Admin = require('../models/Admin');
const emailService = require('../services/emailService');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id, role: 'admin' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// @desc    Login admin
// @route   POST /api/admin/login
// @access  Public
const loginAdmin = async (req, res) => {
  try {
    const { email, password, securityCode } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check if admin exists and include password for comparison
    const admin = await Admin.findOne({ email }).select('+password');

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (admin.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account temporarily locked due to too many failed login attempts. Please try again later.'
      });
    }

    // Check if admin is active
    if (!admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact system administrator.'
      });
    }

    // Check password
    const isPasswordValid = await admin.comparePassword(password);

    if (!isPasswordValid) {
      // Increment login attempts
      await admin.incLoginAttempts();

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Additional security code check for main admin role only
    if (admin.role === 'admin') {
      const requiredCode = (process.env.ADMIN_SECURITY_CODE || '').trim();
      if (requiredCode) {
        if (!securityCode) {
          return res.status(400).json({
            success: false,
            code: 'SECURITY_CODE_REQUIRED',
            message: 'Security code is required for admin login'
          });
        }
        if (securityCode !== requiredCode) {
          return res.status(401).json({
            success: false,
            message: 'Invalid security code'
          });
        }
      }
    }

    // Reset login attempts and update last login
    await admin.resetLoginAttempts();

    // Generate JWT token
    const token = generateToken(admin._id);

    // Set cookie options
    const cookieOptions = {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    };

    // Send response with token
    res.status(200)
      .cookie('token', token, cookieOptions)
      .json({
        success: true,
        message: 'Login successful',
        data: {
          admin: {
            id: admin._id,
            name: admin.name,
            email: admin.email,
            role: admin.role,
            lastLogin: admin.lastLogin
          },
          token
        }
      });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// @desc    Get current admin profile
// @route   GET /api/admin/profile
// @access  Private
const getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          role: admin.role,
          isActive: admin.isActive,
          lastLogin: admin.lastLogin,
          createdAt: admin.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile'
    });
  }
};

// @desc    Update admin password (while logged in)
// @route   PUT /api/admin/profile/password
// @access  Private
const updateAdminPassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return next(new ErrorResponse('Current password and new password are required', 400));
  }

  if (newPassword.length < 6) {
    return next(new ErrorResponse('New password must be at least 6 characters', 400));
  }

  // Find the logged-in admin with password field
  const admin = await Admin.findById(req.admin.id).select('+password');

  if (!admin) {
    return next(new ErrorResponse('Admin not found', 404));
  }

  const isMatch = await admin.comparePassword(currentPassword);

  if (!isMatch) {
    return next(new ErrorResponse('Current password is incorrect', 400));
  }

  admin.password = newPassword;
  await admin.save();

  res.status(200).json({
    success: true,
    message: 'Password updated successfully'
  });
});

// @desc    Logout admin
// @route   POST /api/admin/logout
// @access  Private
const logoutAdmin = async (req, res) => {
  try {
    res.cookie('token', '', {
      expires: new Date(0),
      httpOnly: true
    });

    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
};

// @desc    Create demo admin (for development only)
// @route   POST /api/admin/create-demo
// @access  Public (remove in production)
const createDemoAdmin = async (req, res) => {
  try {
    // Check if demo admin already exists
    const existingAdmin = await Admin.findOne({ email: 'admin@demo.com' });

    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Demo admin already exists'
      });
    }

    // Create demo admin
    const demoAdmin = await Admin.create({
      name: 'Demo Admin',
      email: 'admin@demo.com',
      password: 'password123',
      role: 'admin'
    });

    res.status(201).json({
      success: true,
      message: 'Demo admin created successfully',
      data: {
        admin: {
          id: demoAdmin._id,
          name: demoAdmin.name,
          email: demoAdmin.email,
          role: demoAdmin.role
        }
      }
    });

  } catch (error) {
    console.error('Create demo admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating demo admin'
    });
  }
};

// @desc    Forgot password
// @route   POST /api/admin/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new ErrorResponse('Please provide an email address', 400));
  }

  // Normalize email and ensure it exists before sending reset link
  const normalizedEmail = String(email).trim().toLowerCase();
  const admin = await Admin.findOne({ email: normalizedEmail });

  if (!admin) {
    return next(new ErrorResponse('No account found with this email address', 404));
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  admin.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  admin.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour

  await admin.save({ validateBeforeSave: false });

  try {
    await emailService.sendPasswordResetEmail(admin.email, resetToken, 'admin');

    res.status(200).json({
      success: true,
      message: 'Password reset email sent successfully'
    });
  } catch (error) {
    console.error('Email sending error:', error);
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpire = undefined;
    await admin.save({ validateBeforeSave: false });

    return next(new ErrorResponse('Email could not be sent', 500));
  }
});

// @desc    Reset password
// @route   PUT /api/admin/reset-password/:resettoken
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

  // Get hashed token
  const resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  const admin = await Admin.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() }
  }).select('+password');

  if (!admin) {
    return next(new ErrorResponse('Invalid or expired reset token', 400));
  }

  // Set new password
  admin.password = password;
  admin.resetPasswordToken = undefined;
  admin.resetPasswordExpire = undefined;
  await admin.save();

  // Generate token
  const token = generateToken(admin._id);

  res.status(200).json({
    success: true,
    message: 'Password reset successful',
    token
  });
});

module.exports = {
  loginAdmin,
  getAdminProfile,
  logoutAdmin,
  createDemoAdmin,
  forgotPassword,
  resetPassword,
  updateAdminPassword
};
