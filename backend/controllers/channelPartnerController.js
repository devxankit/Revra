const ChannelPartner = require('../models/ChannelPartner');
const { CPWallet, CPWalletTransaction } = require('../models/CPWallet');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { deleteFile } = require('../services/cloudinaryService');

// @desc    Get all channel partners with filtering and pagination
// @route   GET /api/admin/channel-partners
// @access  Private (Admin only)
const getAllChannelPartners = asyncHandler(async (req, res, next) => {
  const { status, search, page = 1, limit = 20 } = req.query;
  
  // Build filter object
  let filter = {};
  
  // Status filter
  if (status && status !== 'all') {
    filter.isActive = status === 'active';
  }
  
  // Search filter
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phoneNumber: { $regex: search, $options: 'i' } },
      { partnerId: { $regex: search, $options: 'i' } },
      { companyName: { $regex: search, $options: 'i' } }
    ];
  }

  // Calculate pagination
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Get total count for pagination
  const total = await ChannelPartner.countDocuments(filter);

  // Get channel partners
  const channelPartners = await ChannelPartner.find(filter)
    .select('-otp -otpExpires -otpAttempts -otpLockUntil -loginAttempts -lockUntil')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  // Format channel partners for display
  const formattedPartners = channelPartners.map(partner => ({
    ...partner.toObject(),
    userType: 'channel-partner'
  }));

  res.status(200).json({
    success: true,
    count: formattedPartners.length,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
    data: formattedPartners
  });
});

// @desc    Get channel partner statistics
// @route   GET /api/admin/channel-partners/statistics
// @access  Private (Admin only)
const getChannelPartnerStatistics = asyncHandler(async (req, res, next) => {
  const [total, active, inactive] = await Promise.all([
    ChannelPartner.countDocuments(),
    ChannelPartner.countDocuments({ isActive: true }),
    ChannelPartner.countDocuments({ isActive: false })
  ]);

  // Calculate total revenue from all channel partners
  const revenueData = await ChannelPartner.aggregate([
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$totalRevenue' }
      }
    }
  ]);

  const statistics = {
    total,
    active,
    inactive,
    totalRevenue: revenueData[0]?.totalRevenue || 0
  };

  res.status(200).json({
    success: true,
    data: statistics
  });
});

// @desc    Get single channel partner by ID
// @route   GET /api/admin/channel-partners/:id
// @access  Private (Admin only)
const getChannelPartner = asyncHandler(async (req, res, next) => {
  const channelPartner = await ChannelPartner.findById(req.params.id)
    .select('-otp -otpExpires -otpAttempts -otpLockUntil -loginAttempts -lockUntil');
  
  if (!channelPartner) {
    return next(new ErrorResponse('Channel partner not found', 404));
  }

  res.status(200).json({
    success: true,
    data: { ...channelPartner.toObject(), userType: 'channel-partner' }
  });
});

// @desc    Create new channel partner
// @route   POST /api/admin/channel-partners
// @access  Private (Admin only)
const createChannelPartner = asyncHandler(async (req, res, next) => {
  const { 
    name, 
    email, 
    phoneNumber, 
    partnerId,
    dateOfBirth, 
    gender,
    joiningDate, 
    status, 
    companyName,
    address
  } = req.body;

  // Validation
  if (!name || !phoneNumber || !dateOfBirth || !joiningDate) {
    return next(new ErrorResponse('Please provide all required fields', 400));
  }

  // Validate phone number format (10 digits)
  const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');
  if (!/^[6-9]\d{9}$/.test(cleanPhoneNumber)) {
    return next(new ErrorResponse('Please enter a valid 10-digit Indian mobile number', 400));
  }

  // Check if channel partner with this phone number already exists
  const existingPartner = await ChannelPartner.findOne({ phoneNumber: cleanPhoneNumber });
  if (existingPartner) {
    return next(new ErrorResponse('Channel partner with this phone number already exists', 400));
  }

  // Check if partnerId is provided and if it already exists
  if (partnerId) {
    const existingPartnerId = await ChannelPartner.findOne({ partnerId: partnerId.trim() });
    if (existingPartnerId) {
      return next(new ErrorResponse('Channel partner with this Partner ID already exists', 400));
    }
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

  // Prepare channel partner data
  const partnerData = {
    name,
    email: email || undefined,
    phoneNumber: cleanPhoneNumber,
    partnerId: partnerId ? partnerId.trim() : undefined,
    dateOfBirth: parseDate(dateOfBirth),
    gender: gender || undefined,
    joiningDate: parseDate(joiningDate),
    isActive: status === 'active',
    companyName: companyName || undefined,
    address: address || undefined
  };

  // Handle document data if present (already uploaded to Cloudinary)
  if (req.body.document) {
    partnerData.document = req.body.document;
  }

  // Create channel partner
  const channelPartner = await ChannelPartner.create(partnerData);

  res.status(201).json({
    success: true,
    data: { ...channelPartner.toObject(), userType: 'channel-partner' }
  });
});

// @desc    Update channel partner
// @route   PUT /api/admin/channel-partners/:id
// @access  Private (Admin only)
const updateChannelPartner = asyncHandler(async (req, res, next) => {
  const { 
    name, 
    email, 
    phoneNumber, 
    partnerId,
    dateOfBirth, 
    gender,
    joiningDate, 
    status, 
    companyName,
    address,
    salesTeamLeadId,
    salesTeamLeadName,
    teamLeadAssignedDate
  } = req.body;

  let channelPartner = await ChannelPartner.findById(req.params.id);
  
  if (!channelPartner) {
    return next(new ErrorResponse('Channel partner not found', 404));
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
  if (name) channelPartner.name = name;
  if (email !== undefined) channelPartner.email = email;
  if (phoneNumber) {
    // Validate phone number format
    const cleanPhoneNumber = phoneNumber.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(cleanPhoneNumber)) {
      return next(new ErrorResponse('Please enter a valid 10-digit Indian mobile number', 400));
    }
    
    // Check if phone number is already taken by another channel partner
    if (cleanPhoneNumber !== channelPartner.phoneNumber) {
      const existingPartner = await ChannelPartner.findOne({ phoneNumber: cleanPhoneNumber });
      if (existingPartner) {
        return next(new ErrorResponse('Channel partner with this phone number already exists', 400));
      }
    }
    
    channelPartner.phoneNumber = cleanPhoneNumber;
  }
  if (partnerId !== undefined) {
    const trimmedPartnerId = partnerId ? partnerId.trim() : null;
    // Check if partnerId is already taken by another channel partner
    if (trimmedPartnerId && trimmedPartnerId !== channelPartner.partnerId) {
      const existingPartnerId = await ChannelPartner.findOne({ partnerId: trimmedPartnerId });
      if (existingPartnerId) {
        return next(new ErrorResponse('Channel partner with this Partner ID already exists', 400));
      }
    }
    channelPartner.partnerId = trimmedPartnerId || undefined;
  }
  if (dateOfBirth) channelPartner.dateOfBirth = parseDate(dateOfBirth);
  if (gender !== undefined) channelPartner.gender = gender;
  if (joiningDate) channelPartner.joiningDate = parseDate(joiningDate);
  if (status !== undefined) channelPartner.isActive = status === 'active';
  if (companyName !== undefined) channelPartner.companyName = companyName;
  if (address !== undefined) channelPartner.address = address;
  
  // Handle sales team lead assignment
  if (salesTeamLeadId !== undefined) {
    if (salesTeamLeadId === null || salesTeamLeadId === '') {
      // Remove team lead assignment
      channelPartner.salesTeamLeadId = null;
      channelPartner.salesTeamLeadName = null;
      channelPartner.teamLeadAssignedDate = null;
    } else {
      // Validate that the sales team lead exists and is actually a team lead
      const Sales = require('../models/Sales');
      const salesTeamLead = await Sales.findById(salesTeamLeadId);
      if (!salesTeamLead) {
        return next(new ErrorResponse('Sales team lead not found', 404));
      }
      if (!salesTeamLead.isTeamLead && salesTeamLead.role !== 'team_lead' && salesTeamLead.role !== 'Team Lead') {
        return next(new ErrorResponse('Selected sales member is not a team lead', 400));
      }
      channelPartner.salesTeamLeadId = salesTeamLeadId;
      channelPartner.salesTeamLeadName = salesTeamLeadName || salesTeamLead.name;
      channelPartner.teamLeadAssignedDate = teamLeadAssignedDate ? parseDate(teamLeadAssignedDate) : new Date();
    }
  }

  // Handle document update if present (already uploaded to Cloudinary)
  if (req.body.document) {
    // Delete old document from Cloudinary if exists
    if (channelPartner.document && channelPartner.document.public_id) {
      await deleteFile(channelPartner.document.public_id);
    }
    
    // Set new document data
    channelPartner.document = req.body.document;
  }

  await channelPartner.save();

  res.status(200).json({
    success: true,
    data: { ...channelPartner.toObject(), userType: 'channel-partner' }
  });
});

// @desc    Delete channel partner
// @route   DELETE /api/admin/channel-partners/:id
// @access  Private (Admin only)
const deleteChannelPartner = asyncHandler(async (req, res, next) => {
  const channelPartner = await ChannelPartner.findById(req.params.id);
  
  if (!channelPartner) {
    return next(new ErrorResponse('Channel partner not found', 404));
  }

  // Delete document from Cloudinary if exists
  if (channelPartner.document && channelPartner.document.public_id) {
    await deleteFile(channelPartner.document.public_id);
  }

  await ChannelPartner.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Channel partner deleted successfully'
  });
});

// @desc    Get all channel partner wallets with earnings data
// @route   GET /api/admin/channel-partners/wallets
// @access  Private (Admin only)
const getAllChannelPartnerWallets = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 20, search } = req.query;
  
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Get current month start and end dates
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // Build search filter
  let partnerFilter = {};
  if (search) {
    partnerFilter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phoneNumber: { $regex: search, $options: 'i' } },
      { partnerId: { $regex: search, $options: 'i' } }
    ];
  }

  // Get all channel partners
  const channelPartners = await ChannelPartner.find(partnerFilter)
    .select('name email phoneNumber partnerId')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const total = await ChannelPartner.countDocuments(partnerFilter);

  // Get wallet data for each partner
  const walletsData = await Promise.all(
    channelPartners.map(async (partner) => {
      const wallet = await CPWallet.findOne({ channelPartner: partner._id });
      
      if (!wallet) {
        return {
          channelPartner: {
            id: partner._id,
            name: partner.name,
            email: partner.email,
            phoneNumber: partner.phoneNumber,
            partnerId: partner.partnerId
          },
          balance: 0,
          totalEarned: 0,
          currentMonthEarnings: 0,
          rewardAmount: 0,
          paidAmount: 0,
          unpaidAmount: 0
        };
      }

      // Get current month earnings (credits only)
      const currentMonthEarnings = await CPWalletTransaction.aggregate([
        {
          $match: {
            wallet: wallet._id,
            type: 'credit',
            createdAt: {
              $gte: currentMonthStart,
              $lte: currentMonthEnd
            }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);

      // Get reward amount (all time)
      const rewardAmount = await CPWalletTransaction.aggregate([
        {
          $match: {
            wallet: wallet._id,
            type: 'credit',
            transactionType: 'reward'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);

      // Get paid and unpaid amounts
      const paidAmount = await CPWalletTransaction.aggregate([
        {
          $match: {
            wallet: wallet._id,
            type: 'credit',
            status: 'completed'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);

      const unpaidAmount = await CPWalletTransaction.aggregate([
        {
          $match: {
            wallet: wallet._id,
            type: 'credit',
            status: 'pending'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' }
          }
        }
      ]);

      return {
        channelPartner: {
          id: partner._id,
          name: partner.name,
          email: partner.email,
          phoneNumber: partner.phoneNumber,
          partnerId: partner.partnerId
        },
        balance: wallet.balance || 0,
        totalEarned: wallet.totalEarned || 0,
        currentMonthEarnings: currentMonthEarnings[0]?.total || 0,
        rewardAmount: rewardAmount[0]?.total || 0,
        paidAmount: paidAmount[0]?.total || 0,
        unpaidAmount: unpaidAmount[0]?.total || 0
      };
    })
  );

  res.status(200).json({
    success: true,
    count: walletsData.length,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
    data: walletsData
  });
});

module.exports = {
  getAllChannelPartners,
  getChannelPartnerStatistics,
  getChannelPartner,
  createChannelPartner,
  updateChannelPartner,
  deleteChannelPartner,
  getAllChannelPartnerWallets
};
