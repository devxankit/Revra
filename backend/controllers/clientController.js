const Client = require('../models/Client');
const smsService = require('../services/smsService');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

const DEFAULT_DEMO_PHONE = process.env.DEFAULT_DEMO_PHONE || '9755620716';
const DEFAULT_DEMO_OTP = process.env.DEFAULT_DEMO_OTP || '123456';
const isNonProductionEnv = (process.env.NODE_ENV || 'development') !== 'production';

// Helper function to send token in cookie
const sendTokenResponse = (client, statusCode, res) => {
  const token = client.getSignedJwtToken();

  // Set cookie expiration to 7 days (default)
  const cookieExpireDays = parseInt(process.env.JWT_EXPIRE_COOKIE) || 7;
  const options = {
    expires: new Date(Date.now() + cookieExpireDays * 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax'
  };

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      data: client
    });
};

// @desc    Send OTP to client phone number
// @route   POST /api/client/send-otp
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
    // Find or create client
    let client = await Client.findOne({ phoneNumber: cleanPhoneNumber });

    if (!client) {
      // Create new client if doesn't exist
      client = await Client.create({
        phoneNumber: cleanPhoneNumber,
        name: `Client ${cleanPhoneNumber.slice(-4)}`, // Default name
        role: 'client',
        isActive: true
      });
    }

    // Check if client is locked
    if (client.isLocked) {
      return next(new ErrorResponse('Account is temporarily locked. Please try again later.', 403));
    }

    // Check if OTP is locked
    if (client.isOtpLocked) {
      return next(new ErrorResponse('Too many OTP attempts. Please try again later.', 403));
    }

    // In non-production environments, always use a non-expiring default OTP for the demo phone number
    if (isNonProductionEnv && cleanPhoneNumber === DEFAULT_DEMO_PHONE) {
      client.otp = DEFAULT_DEMO_OTP;
      client.otpExpires = null; // Non-expiring for demo usage
      client.otpAttempts = 0;
      client.otpLockUntil = undefined;
      await client.save();
      
      // Print OTP to terminal
      console.log(`\n========================================`);
      console.log(`📱 OTP Generated for Client Login (Demo)`);
      console.log(`========================================`);
      console.log(`Phone Number: ${cleanPhoneNumber}`);
      console.log(`OTP: ${DEFAULT_DEMO_OTP}`);
      console.log(`Expires In: Never (Demo Mode)`);
      console.log(`========================================\n`);
      
      return res.status(200).json({
        success: true,
        message: 'OTP sent successfully (Development Mode)',
        phoneNumber: cleanPhoneNumber,
        otp: DEFAULT_DEMO_OTP, // Include OTP in development mode
        expiresIn: null // Non-expiring OTP
      });
    }

    // In non-production environments, always use a non-expiring default OTP for the demo phone number
    if (isNonProductionEnv && cleanPhoneNumber === DEFAULT_DEMO_PHONE) {
      client.otp = DEFAULT_DEMO_OTP;
      client.otpExpires = null;
      client.otpAttempts = 0;
      client.otpLockUntil = undefined;
      await client.save();

      // Print OTP to terminal
      console.log(`\n========================================`);
      console.log(`📱 OTP Resent for Client Login (Demo)`);
      console.log(`========================================`);
      console.log(`Phone Number: ${cleanPhoneNumber}`);
      console.log(`OTP: ${DEFAULT_DEMO_OTP}`);
      console.log(`Expires In: Never (Demo Mode)`);
      console.log(`========================================\n`);
      
      return res.status(200).json({
        success: true,
        message: 'OTP resent successfully (Development Mode)',
        phoneNumber: cleanPhoneNumber,
        otp: DEFAULT_DEMO_OTP,
        expiresIn: null
      });
    }

    // Generate new OTP
    const otp = client.generateOTP();
    await client.save();

    // Print OTP to terminal
    console.log(`\n========================================`);
    console.log(`📱 OTP Generated for Client Login`);
    console.log(`========================================`);
    console.log(`Phone Number: ${cleanPhoneNumber}`);
    console.log(`OTP: ${otp}`);
    console.log(`Expires In: 5 minutes`);
    console.log(`========================================\n`);

    // Send OTP via SMS
    const smsResult = await smsService.sendOTP(cleanPhoneNumber, otp, 'otp_login');

    if (!smsResult.success) {
      // If SMS fails, still allow OTP verification for development
      console.error('SMS sending failed:', smsResult.error);
      
      // In development, we still return success
      if (process.env.NODE_ENV === 'development') {
        // Print OTP to terminal even if SMS fails
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
          otp: otp, // Include OTP in development mode
          expiresIn: 300 // 5 minutes
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
      expiresIn: 300 // 5 minutes
    };

    // Include OTP in development mode for auto-fill
    if (process.env.NODE_ENV === 'development') {
      responseData.otp = otp;
    }

    res.status(200).json(responseData);

  } catch (error) {
    console.error('Send OTP Error:', error);
    return next(new ErrorResponse('Failed to send OTP. Please try again.', 500));
  }
});

// @desc    Verify OTP and login client
// @route   POST /api/client/verify-otp
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
    console.log(`[DEBUG] Verifying OTP for ${cleanPhoneNumber} with OTP: ${otp}`);
    
    // Find client with OTP data
    const client = await Client.findOne({ phoneNumber: cleanPhoneNumber }).select('+otp +otpExpires +otpAttempts +otpLockUntil');

    if (!client) {
      console.log(`[DEBUG] Client not found for phone: ${cleanPhoneNumber}`);
      return next(new ErrorResponse('Client not found. Please request OTP first.', 404));
    }

    console.log(`[DEBUG] Client found:`, {
      phoneNumber: client.phoneNumber,
      otp: client.otp,
      otpExpires: client.otpExpires,
      otpAttempts: client.otpAttempts,
      isLocked: client.isLocked,
      isOtpLocked: client.isOtpLocked
    });

    // Check if client is locked
    if (client.isLocked) {
      console.log(`[DEBUG] Client is locked`);
      return next(new ErrorResponse('Account is temporarily locked. Please try again later.', 403));
    }

    // Check if OTP is locked
    if (client.isOtpLocked) {
      console.log(`[DEBUG] OTP is locked`);
      return next(new ErrorResponse('Too many OTP attempts. Please request a new OTP.', 403));
    }

    // Verify OTP
    console.log(`[DEBUG] Verifying OTP: expected=${client.otp}, provided=${otp}`);
    const isOtpValid = client.verifyOTP(otp);
    console.log(`[DEBUG] OTP verification result: ${isOtpValid}`);

    if (!isOtpValid) {
      console.log(`[DEBUG] OTP verification failed, incrementing attempts`);
      // Increment OTP attempts
      await client.incOtpAttempts();
      
      return next(new ErrorResponse('Invalid or expired OTP', 401));
    }

    console.log(`[DEBUG] OTP verification successful, clearing OTP and generating token`);
    
    // Clear OTP after successful verification
    await client.clearOTP();
    console.log(`[DEBUG] OTP cleared successfully`);

    // Reset login attempts
    await client.resetLoginAttempts();
    console.log(`[DEBUG] Login attempts reset successfully`);

    // Update last login
    client.lastLogin = new Date();
    await client.save();
    console.log(`[DEBUG] Last login updated successfully`);

    // Send token response
    console.log(`[DEBUG] Sending token response`);
    sendTokenResponse(client, 200, res);

  } catch (error) {
    console.error('Verify OTP Error:', error);
    return next(new ErrorResponse('OTP verification failed. Please try again.', 500));
  }
});

// @desc    Get current logged in client
// @route   GET /api/client/profile
// @access  Private
exports.getClientProfile = asyncHandler(async (req, res, next) => {
  const client = await Client.findById(req.client.id);
  
  res.status(200).json({
    success: true,
    data: client
  });
});

// @desc    Log client out / clear cookie
// @route   POST /api/client/logout
// @access  Private
exports.logoutClient = asyncHandler(async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax'
  });

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Update client profile
// @route   PUT /api/client/profile
// @access  Private
exports.updateClientProfile = asyncHandler(async (req, res, next) => {
  const allowedFields = ['name', 'email', 'companyName', 'industry', 'address', 'preferences'];
  const updates = {};

  // Filter allowed fields
  Object.keys(req.body).forEach(key => {
    if (allowedFields.includes(key)) {
      updates[key] = req.body[key];
    }
  });

  const client = await Client.findByIdAndUpdate(
    req.client.id,
    updates,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    success: true,
    data: client
  });
});

// @desc    Create a demo client user (for development/testing)
// @route   POST /api/client/create-demo
// @access  Public (should be restricted in production)
exports.createDemoClient = asyncHandler(async (req, res, next) => {
  const demoPhoneNumber = '9755620716'; // Your phone number
  let client = await Client.findOne({ phoneNumber: demoPhoneNumber });

  if (client) {
    return next(new ErrorResponse('Demo client user already exists', 400));
  }

  const demoClient = await Client.create({
    name: 'Demo Client',
    phoneNumber: demoPhoneNumber,
    email: 'demo@appzeto.com',
    role: 'client',
    companyName: 'Demo Company',
    industry: 'Technology',
    address: {
      street: 'Demo Street',
      city: 'Demo City',
      state: 'Demo State',
      country: 'India',
      zipCode: '123456'
    },
    preferences: {
      notifications: {
        email: true,
        sms: true,
        push: true
      },
      language: 'en',
      timezone: 'Asia/Kolkata'
    },
    isActive: true
  });

  // Generate and set default OTP for development
  const otp = demoClient.generateOTP();
  await demoClient.save();

  res.status(201).json({
    success: true,
    message: 'Demo client created successfully',
    data: {
      id: demoClient._id,
      name: demoClient.name,
      phoneNumber: demoClient.phoneNumber,
      email: demoClient.email,
      role: demoClient.role,
      companyName: demoClient.companyName,
      isActive: demoClient.isActive,
      createdAt: demoClient.createdAt
    },
    otp: otp // Include OTP for development
  });
});

// @desc    Resend OTP
// @route   POST /api/client/resend-otp
// @access  Public
exports.resendOTP = asyncHandler(async (req, res, next) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return next(new ErrorResponse('Phone number is required', 400));
  }

  const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');
  if (!/^[6-9]\d{9}$/.test(cleanPhoneNumber)) {
    return next(new ErrorResponse('Invalid phone number format', 400));
  }

  try {
    const client = await Client.findOne({ phoneNumber: cleanPhoneNumber });

    if (!client) {
      return next(new ErrorResponse('Client not found. Please register first.', 404));
    }

    // Check if OTP is locked
    if (client.isOtpLocked) {
      return next(new ErrorResponse('Too many OTP attempts. Please try again later.', 403));
    }

    // Generate new OTP
    const otp = client.generateOTP();
    await client.save();

    // Send OTP via SMS
    const smsResult = await smsService.sendOTP(cleanPhoneNumber, otp, 'otp_login');

    if (!smsResult.success) {
      console.error('SMS sending failed:', smsResult.error);
      
      if (process.env.NODE_ENV === 'development') {
        return res.status(200).json({
          success: true,
          message: 'OTP resent successfully (Development Mode)',
          phoneNumber: cleanPhoneNumber,
          otp: otp,
          expiresIn: 300
        });
      }
      
      return next(new ErrorResponse('Failed to resend OTP. Please try again.', 500));
    }

    res.status(200).json({
      success: true,
      message: 'OTP resent successfully',
      phoneNumber: cleanPhoneNumber,
      messageId: smsResult.messageId,
      expiresIn: 300
    });

  } catch (error) {
    console.error('Resend OTP Error:', error);
    return next(new ErrorResponse('Failed to resend OTP. Please try again.', 500));
  }
});

// @desc    Check SMS service status
// @route   GET /api/client/sms-status
// @access  Public (for testing)
exports.checkSMSStatus = asyncHandler(async (req, res, next) => {
  try {
    const balance = await smsService.getBalance();
    
    res.status(200).json({
      success: true,
      smsEnabled: process.env.SMS_INDIA_ENABLED === 'true',
      environment: process.env.NODE_ENV,
      balance: balance
    });
  } catch (error) {
    res.status(200).json({
      success: false,
      smsEnabled: false,
      environment: process.env.NODE_ENV,
      error: error.message
    });
  }
});
