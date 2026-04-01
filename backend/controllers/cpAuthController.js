const ChannelPartner = require('../models/ChannelPartner');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const smsService = require('../services/smsService');

// Helper function to send token response
const sendTokenResponse = (channelPartner, statusCode, res) => {
  const token = channelPartner.getSignedJwtToken();
  const cookieOptions = {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: false, // so CP frontend can also send it in Authorization if needed
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  };
  res.cookie('cpToken', token, cookieOptions);

  res.status(statusCode).json({
    success: true,
    token,
    data: {
      id: channelPartner._id,
      name: channelPartner.name,
      email: channelPartner.email,
      phoneNumber: channelPartner.phoneNumber,
      companyName: channelPartner.companyName,
      role: channelPartner.role,
      totalRevenue: channelPartner.totalRevenue,
      isActive: channelPartner.isActive
    }
  });
};

// Constants for demo/testing
const DEFAULT_DEMO_PHONE = process.env.DEMO_PHONE || '9755620716';
const DEFAULT_DEMO_OTP = '123456';
const isNonProductionEnv = process.env.NODE_ENV !== 'production';

// @desc    Send OTP to channel partner phone number
// @route   POST /api/channel-partner/send-otp
// @access  Public
exports.sendOTP = asyncHandler(async (req, res, next) => {
  const { phoneNumber } = req.body;

  // Validate phone number
  if (!phoneNumber) {
    return next(new ErrorResponse('Phone number is required', 400));
  }

  // Clean and validate phone number format
  const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');
  if (!/^[6-9]\d{9}$/.test(cleanPhoneNumber)) {
    return next(new ErrorResponse('Please enter a valid 10-digit Indian mobile number', 400));
  }

  try {
    // Find channel partner
    let channelPartner = await ChannelPartner.findOne({ phoneNumber: cleanPhoneNumber });

    if (!channelPartner) {
      return next(new ErrorResponse('Channel partner not found. Please contact admin to create your account.', 404));
    }

    // Check if channel partner is active
    if (!channelPartner.isActive) {
      return next(new ErrorResponse('Your account is inactive. Please contact admin.', 403));
    }

    // Check if channel partner is locked
    if (channelPartner.isLocked) {
      return next(new ErrorResponse('Account is temporarily locked. Please try again later.', 403));
    }

    // Check if OTP is locked
    if (channelPartner.isOtpLocked) {
      return next(new ErrorResponse('Too many OTP attempts. Please try again later.', 403));
    }

    // In non-production environments, use default OTP for demo phone
    if (isNonProductionEnv && cleanPhoneNumber === DEFAULT_DEMO_PHONE) {
      channelPartner.otp = DEFAULT_DEMO_OTP;
      channelPartner.otpExpires = null; // Non-expiring for demo usage
      channelPartner.otpAttempts = 0;
      channelPartner.otpLockUntil = undefined;
      await channelPartner.save();
      
      console.log(`\n========================================`);
      console.log(`📱 OTP Generated for Channel Partner Login (Demo)`);
      console.log(`========================================`);
      console.log(`Phone Number: ${cleanPhoneNumber}`);
      console.log(`OTP: ${DEFAULT_DEMO_OTP}`);
      console.log(`Expires In: Never (Demo Mode)`);
      console.log(`========================================\n`);
      
      return res.status(200).json({
        success: true,
        message: 'OTP sent successfully (Development Mode)',
        phoneNumber: cleanPhoneNumber,
        otp: DEFAULT_DEMO_OTP,
        expiresIn: null
      });
    }

    // Generate new OTP
    const otp = channelPartner.generateOTP();
    await channelPartner.save();

    // Print OTP to terminal
    console.log(`\n========================================`);
    console.log(`📱 OTP Generated for Channel Partner Login`);
    console.log(`========================================`);
    console.log(`Phone Number: ${cleanPhoneNumber}`);
    console.log(`OTP: ${otp}`);
    console.log(`Expires In: 5 minutes`);
    console.log(`========================================\n`);

    // Send OTP via SMS
    const smsResult = await smsService.sendOTP(cleanPhoneNumber, otp, 'otp_login');

    if (!smsResult.success) {
      console.error('SMS sending failed:', smsResult.error);
      
      // In development, we still return success
      if (process.env.NODE_ENV === 'development') {
        console.log(`\n========================================`);
        console.log(`📱 OTP Generated (SMS Failed - Dev Mode)`);
        console.log(`========================================`);
        console.log(`Phone Number: ${cleanPhoneNumber}`);
        console.log(`OTP: ${otp}`);
        console.log(`Expires In: 5 minutes`);
        console.log(`========================================\n`);
        
        return res.status(200).json({
          success: true,
          message: 'OTP sent successfully (Development Mode)',
          phoneNumber: cleanPhoneNumber,
          otp: otp,
          expiresIn: 300
        });
      }
      
      return next(new ErrorResponse('Failed to send OTP. Please try again.', 500));
    }

    // In development mode, include OTP in response for auto-fill
    const responseData = {
      success: true,
      message: 'OTP sent successfully',
      phoneNumber: cleanPhoneNumber,
      messageId: smsResult.messageId,
      expiresIn: 300
    };

    if (process.env.NODE_ENV === 'development') {
      responseData.otp = otp;
    }

    res.status(200).json(responseData);

  } catch (error) {
    console.error('Send OTP Error:', error);
    return next(new ErrorResponse('Failed to send OTP. Please try again.', 500));
  }
});

// @desc    Verify OTP and login channel partner
// @route   POST /api/channel-partner/verify-otp
// @access  Public
exports.verifyOTP = asyncHandler(async (req, res, next) => {
  const { phoneNumber, otp } = req.body;

  // Validate input
  if (!phoneNumber || !otp) {
    return next(new ErrorResponse('Phone number and OTP are required', 400));
  }

  // Clean phone number
  const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');
  if (!/^[6-9]\d{9}$/.test(cleanPhoneNumber)) {
    return next(new ErrorResponse('Invalid phone number format', 400));
  }

  if (!/^\d{6}$/.test(otp)) {
    return next(new ErrorResponse('OTP must be 6 digits', 400));
  }

  try {
    // Find channel partner with OTP data
    const channelPartner = await ChannelPartner.findOne({ phoneNumber: cleanPhoneNumber }).select('+otp +otpExpires +otpAttempts +otpLockUntil');

    if (!channelPartner) {
      return next(new ErrorResponse('Channel partner not found. Please request OTP first.', 404));
    }

    // Check if channel partner is active
    if (!channelPartner.isActive) {
      return next(new ErrorResponse('Your account is inactive. Please contact admin.', 403));
    }

    // Check if channel partner is locked
    if (channelPartner.isLocked) {
      return next(new ErrorResponse('Account is temporarily locked. Please try again later.', 403));
    }

    // Check if OTP is locked
    if (channelPartner.isOtpLocked) {
      return next(new ErrorResponse('Too many OTP attempts. Please request a new OTP.', 403));
    }

    // Verify OTP
    const isOtpValid = channelPartner.verifyOTP(otp);

    if (!isOtpValid) {
      // Increment OTP attempts
      await channelPartner.incOtpAttempts();
      return next(new ErrorResponse('Invalid or expired OTP', 401));
    }

    // Clear OTP after successful verification
    await channelPartner.clearOTP();

    // Reset login attempts
    await channelPartner.resetLoginAttempts();

    // Update last login
    channelPartner.lastLogin = new Date();
    channelPartner.lastActivity = new Date();
    await channelPartner.save();

    // Send token response
    sendTokenResponse(channelPartner, 200, res);

  } catch (error) {
    console.error('Verify OTP Error:', error);
    return next(new ErrorResponse('OTP verification failed. Please try again.', 500));
  }
});

// @desc    Resend OTP
// @route   POST /api/channel-partner/resend-otp
// @access  Public
exports.resendOTP = asyncHandler(async (req, res, next) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return next(new ErrorResponse('Phone number is required', 400));
  }

  const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');
  if (!/^[6-9]\d{9}$/.test(cleanPhoneNumber)) {
    return next(new ErrorResponse('Please enter a valid 10-digit Indian mobile number', 400));
  }

  // Reuse sendOTP logic
  return exports.sendOTP(req, res, next);
});

// @desc    Get current logged in channel partner
// @route   GET /api/channel-partner/profile
// @access  Private
exports.getCPProfile = asyncHandler(async (req, res, next) => {
  const channelPartner = await ChannelPartner.findById(req.channelPartner.id)
    .populate('salesTeamLeadId', 'name email phone role isTeamLead');
  
  res.status(200).json({
    success: true,
    data: channelPartner
  });
});

// @desc    Update channel partner profile
// @route   PUT /api/channel-partner/profile
// @access  Private
exports.updateCPProfile = asyncHandler(async (req, res, next) => {
  const { name, email, companyName, address } = req.body;

  const channelPartner = await ChannelPartner.findById(req.channelPartner.id);

  if (name) channelPartner.name = name;
  if (email !== undefined) channelPartner.email = email;
  if (companyName !== undefined) channelPartner.companyName = companyName;
  if (address !== undefined) channelPartner.address = address;

  await channelPartner.save();

  res.status(200).json({
    success: true,
    data: channelPartner
  });
});

// @desc    Logout channel partner
// @route   POST /api/channel-partner/logout
// @access  Private
exports.logoutCP = asyncHandler(async (req, res, next) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});
