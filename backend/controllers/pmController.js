const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const mongoose = require('mongoose');
const PM = require('../models/PM');
const Salary = require('../models/Salary');
const PMReward = require('../models/PMReward');
const emailService = require('../services/emailService');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id, role: 'project-manager' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// @desc    Login PM
// @route   POST /api/pm/login
// @access  Public
const loginPM = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Check if PM exists and include password for comparison
    const pm = await PM.findOne({ email }).select('+password');

    if (!pm) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (pm.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account temporarily locked due to too many failed login attempts. Please try again later.'
      });
    }

    // Check if PM is active
    if (!pm.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact system administrator.'
      });
    }

    // Check password
    const isPasswordValid = await pm.comparePassword(password);

    if (!isPasswordValid) {
      // Increment login attempts
      await pm.incLoginAttempts();

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Reset login attempts and update last login
    await pm.resetLoginAttempts();

    // Generate JWT token
    const token = generateToken(pm._id);

    // Set cookie options
    const cookieOptions = {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    };

    // Send response with token
    res.status(200)
      .cookie('pmToken', token, cookieOptions)
      .json({
        success: true,
        message: 'Login successful',
        data: {
          pm: {
            id: pm._id,
            name: pm.name,
            email: pm.email,
            role: pm.role,
            department: pm.department,
            employeeId: pm.employeeId,
            phone: pm.phone,
            lastLogin: pm.lastLogin,
            experience: pm.experience,
            skills: pm.skills
          },
          token
        }
      });

  } catch (error) {
    console.error('PM Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// @desc    Get current PM profile
// @route   GET /api/pm/profile
// @access  Private
const getPMProfile = async (req, res) => {
  try {
    const pm = await PM.findById(req.pm.id);

    if (!pm) {
      return res.status(404).json({
        success: false,
        message: 'PM not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        pm: {
          id: pm._id,
          name: pm.name,
          email: pm.email,
          role: pm.role,
          department: pm.department,
          employeeId: pm.employeeId,
          phone: pm.phone,
          isActive: pm.isActive,
          lastLogin: pm.lastLogin,
          experience: pm.experience,
          skills: pm.skills,
          projectsManaged: pm.projectsManaged,
          createdAt: pm.createdAt
        }
      }
    });

  } catch (error) {
    console.error('Get PM profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile'
    });
  }
};

// @desc    Logout PM
// @route   POST /api/pm/logout
// @access  Private
const logoutPM = async (req, res) => {
  try {
    res.cookie('pmToken', '', {
      expires: new Date(0),
      httpOnly: true
    });

    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('PM Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
};

// @desc    Create demo PM (for development only)
// @route   POST /api/pm/create-demo
// @access  Public (remove in production)
const createDemoPM = async (req, res) => {
  try {
    // Check if demo PM already exists
    const existingPM = await PM.findOne({ email: 'pm@demo.com' });

    if (existingPM) {
      return res.status(400).json({
        success: false,
        message: 'Demo PM already exists'
      });
    }

    // Create demo PM
    const demoPM = await PM.create({
      name: 'Demo Project Manager',
      email: 'pm@demo.com',
      password: 'password123',
      role: 'project-manager',
      department: 'Development',
      employeeId: 'PM001',
      phone: '+1234567890',
      dateOfBirth: new Date('1990-01-01'),
      joiningDate: new Date(),
      skills: ['Project Management', 'Agile', 'Scrum'],
      experience: 3
    });

    res.status(201).json({
      success: true,
      message: 'Demo PM created successfully',
      data: {
        pm: {
          id: demoPM._id,
          name: demoPM.name,
          email: demoPM.email,
          role: demoPM.role,
          department: demoPM.department,
          employeeId: demoPM.employeeId
        }
      }
    });

  } catch (error) {
    console.error('Create demo PM error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating demo PM'
    });
  }
};

// Helper to safely cast id
const safeObjectId = (value) => {
  try { return new mongoose.Types.ObjectId(value); } catch { return value; }
};

// @desc    Get PM wallet summary
// @route   GET /api/pm/wallet/summary
// @access  Private (PM only)
const getWalletSummary = async (req, res) => {
  try {
    const pmId = safeObjectId(req.pm.id);

    // Load PM for fixed salary
    const pm = await PM.findById(pmId).select('fixedSalary name');
    if (!pm) {
      return res.status(404).json({ success: false, message: 'PM not found' });
    }
    const fixedSalary = Number(pm?.fixedSalary || 0);

    // Get current month dates
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Get salary for current month
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const currentMonthSalary = await Salary.findOne({
      employeeId: pmId,
      employeeModel: 'PM',
      month: currentMonthStr
    });

    const salaryStatus = currentMonthSalary?.status === 'paid' ? 'paid' : 'unpaid';

    // Total Paid Rewards (All Time)
    const paidRewards = await PMReward.aggregate([
      { $match: { pmId: pmId, status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalPaidRewards = paidRewards.length > 0 ? paidRewards[0].total : 0;

    // All Time Pending Rewards (In Salary records)
    const pendingRewardsFromSalary = await Salary.aggregate([
      { $match: { employeeId: pmId, employeeModel: 'PM', rewardStatus: 'pending' } },
      { $group: { _id: null, total: { $sum: '$rewardAmount' } } }
    ]);
    const totalPendingRewards = pendingRewardsFromSalary.length > 0 ? pendingRewardsFromSalary[0].total : 0;

    // All Time Salary Paid
    const allTimeSalary = await Salary.aggregate([
      { $match: { employeeId: pmId, employeeModel: 'PM', status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$fixedSalary' } } }
    ]);
    const totalPaidSalary = allTimeSalary.length > 0 ? allTimeSalary[0].total : 0;

    // Calculate PM Progress (Average milestone completion for active projects)
    const Project = mongoose.model('Project');
    const projects = await Project.find({ projectManager: pmId, status: { $ne: 'cancelled' } });

    let totalProgress = 0;
    projects.forEach(p => { totalProgress += (p.progress || 0); });
    const avgProgress = projects.length > 0 ? totalProgress / projects.length : 0;

    res.status(200).json({
      success: true,
      data: {
        monthlySalary: fixedSalary,
        totalPaidRewards: totalPaidRewards,
        totalPendingRewards: totalPendingRewards,
        totalEarnings: totalPaidSalary + totalPaidRewards,
        salaryStatus: salaryStatus,
        rewardProgress: {
          completionRate: Math.round(avgProgress),
          totalProjects: projects.length,
          rewardTarget: 90
        }
      }
    });
  } catch (error) {
    console.error('Get wallet summary error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch wallet summary' });
  }
};

// @desc    Get reward progress for current month
// @route   GET /api/pm/rewards/progress
// @access  Private (PM only)
const getRewardProgress = async (req, res) => {
  try {
    const pmId = safeObjectId(req.pm.id);
    const Project = mongoose.model('Project');
    const projects = await Project.find({ projectManager: pmId, status: { $ne: 'cancelled' } });

    let totalProgress = 0;
    projects.forEach(p => { totalProgress += (p.progress || 0); });
    const avgProgress = projects.length > 0 ? totalProgress / projects.length : 0;

    res.status(200).json({
      success: true,
      data: {
        completionRate: Math.round(avgProgress),
        totalProjects: projects.length,
        targetRate: 90,
        isEligible: avgProgress >= 90
      }
    });
  } catch (error) {
    console.error('Get reward progress error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reward progress' });
  }
};

// @desc    Get PM wallet transactions
// @route   GET /api/pm/wallet/transactions
// @access  Private (PM only)
const getWalletTransactions = async (req, res) => {
  try {
    const pmId = safeObjectId(req.pm.id);
    const { limit = 50 } = req.query;

    // Get all salaries (paid)
    const salaries = await Salary.find({
      employeeId: pmId,
      employeeModel: 'PM',
      status: 'paid'
    })
      .select('fixedSalary month paidDate status')
      .sort({ paidDate: -1 })
      .limit(parseInt(limit));

    // Get all rewards (paid)
    const rewards = await PMReward.find({
      pmId: pmId,
      status: 'paid'
    })
      .select('amount reason description category dateAwarded paidAt')
      .sort({ paidAt: -1 })
      .limit(parseInt(limit));

    // Combine and format transactions
    const transactions = [];

    // Add salary transactions
    salaries.forEach(salary => {
      const paidDate = salary.paidDate || new Date();
      transactions.push({
        id: `salary-${salary.month}`,
        amount: salary.fixedSalary,
        type: 'salary',
        date: paidDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        category: 'Fixed Salary',
        description: `Monthly Salary - ${new Date(salary.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
        status: 'Paid'
      });
    });

    // Add reward transactions
    rewards.forEach(reward => {
      const paidDate = reward.paidAt || reward.dateAwarded || new Date();
      transactions.push({
        id: `reward-${reward._id}`,
        amount: reward.amount,
        type: 'reward',
        date: paidDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        category: reward.category || 'Performance Reward',
        description: reward.description || reward.reason,
        status: 'Paid'
      });
    });

    // Sort by date descending
    transactions.sort((a, b) => {
      const dateA = new Date(a.date.split('/').reverse().join('-'));
      const dateB = new Date(b.date.split('/').reverse().join('-'));
      return dateB - dateA;
    });

    // Limit results
    const limitedTransactions = transactions.slice(0, parseInt(limit));

    res.status(200).json({
      success: true,
      data: limitedTransactions,
      count: limitedTransactions.length
    });
  } catch (error) {
    console.error('Get wallet transactions error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch wallet transactions' });
  }
};

// @desc    Forgot password
// @route   POST /api/pm/forgot-password
// @access  Public
const forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new ErrorResponse('Please provide an email address', 400));
  }

  const pm = await PM.findOne({ email });

  if (!pm) {
    return res.status(200).json({
      success: true,
      message: 'If that email exists, a password reset link has been sent'
    });
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  pm.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  pm.resetPasswordExpire = Date.now() + 60 * 60 * 1000;

  await pm.save({ validateBeforeSave: false });

  try {
    await emailService.sendPasswordResetEmail(pm.email, resetToken, 'pm');

    res.status(200).json({
      success: true,
      message: 'Password reset email sent successfully'
    });
  } catch (error) {
    console.error('Email sending error:', error);
    pm.resetPasswordToken = undefined;
    pm.resetPasswordExpire = undefined;
    await pm.save({ validateBeforeSave: false });

    return next(new ErrorResponse('Email could not be sent', 500));
  }
});

// @desc    Reset password
// @route   PUT /api/pm/reset-password/:resettoken
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

  const resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  const pm = await PM.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() }
  }).select('+password');

  if (!pm) {
    return next(new ErrorResponse('Invalid or expired reset token', 400));
  }

  pm.password = password;
  pm.resetPasswordToken = undefined;
  pm.resetPasswordExpire = undefined;
  await pm.save();

  const token = generateToken(pm._id);

  res.status(200).json({
    success: true,
    message: 'Password reset successful',
    token
  });
});

module.exports = {
  loginPM,
  getPMProfile,
  logoutPM,
  createDemoPM,
  getWalletSummary,
  getWalletTransactions,
  forgotPassword,
  resetPassword,
  getRewardProgress
};
