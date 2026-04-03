const InsuranceProduct = require('../models/InsuranceProduct');
const InsurancePolicy = require('../models/InsurancePolicy');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// PRODUCT ENDPOINTS

// @desc    Get all insurance products
// @route   GET /api/admin/insurance/products
// @access  Private (Admin only)
exports.getProducts = asyncHandler(async (req, res, next) => {
  const products = await InsuranceProduct.find().sort({ createdAt: -1 });
  res.status(200).json({ success: true, count: products.length, data: products });
});

// @desc    Create insurance product
// @route   POST /api/admin/insurance/products
// @access  Private (Admin only)
exports.createProduct = asyncHandler(async (req, res, next) => {
  req.body.createdBy = req.admin.id;
  const product = await InsuranceProduct.create(req.body);
  res.status(201).json({ success: true, data: product });
});

// @desc    Update insurance product
// @route   PUT /api/admin/insurance/products/:id
// @access  Private (Admin only)
exports.updateProduct = asyncHandler(async (req, res, next) => {
  const product = await InsuranceProduct.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!product) return next(new ErrorResponse('Product not found', 404));
  res.status(200).json({ success: true, data: product });
});

// @desc    Delete insurance product
// @route   DELETE /api/admin/insurance/products/:id
// @access  Private (Admin only)
exports.deleteProduct = asyncHandler(async (req, res, next) => {
  const product = await InsuranceProduct.findById(req.params.id);
  if (!product) return next(new ErrorResponse('Product not found', 404));
  // check if policies exist
  const policies = await InsurancePolicy.countDocuments({ product: req.params.id });
  if (policies > 0) return next(new ErrorResponse('Cannot delete product with existing policies', 400));

  await product.deleteOne();
  res.status(200).json({ success: true, data: {} });
});


// POLICY ENDPOINTS

// @desc    Get all policies
// @route   GET /api/admin/insurance/policies
// @access  Private
exports.getPolicies = asyncHandler(async (req, res, next) => {
  const { status, client, product, isUpcomingRenewal } = req.query;
  const filter = {};
  if (status && status !== 'all') filter.status = status;
  if (client) filter.client = client;
  if (product && product !== 'all') filter.product = product;
  
  if (isUpcomingRenewal === 'true') {
     const nextMonth = new Date();
     nextMonth.setMonth(nextMonth.getMonth() + 1);
     filter.renewalDate = { $gte: new Date(), $lte: nextMonth };
     filter.status = 'active'; // Only active policies are up for renewal
  }

  const policies = await InsurancePolicy.find(filter)
    .populate('product', 'name type code provider')
    .populate('client', 'name email phoneNumber companyName')
    .populate('salesEmployee', 'name email')
    .sort({ createdAt: -1 });

  res.status(200).json({ success: true, count: policies.length, data: policies });
});

// @desc    Create policy
// @route   POST /api/admin/insurance/policies
// @access  Private
exports.createPolicy = asyncHandler(async (req, res, next) => {
  req.body.createdBy = req.admin ? req.admin.id : (req.user ? req.user.id : null);
  req.body.creatorModel = req.admin ? 'Admin' : 'Sales';
  
  const policy = await InsurancePolicy.create(req.body);
  await policy.populate([
    { path: 'product', select: 'name type code provider' },
    { path: 'client', select: 'name email phoneNumber companyName' }
  ]);
  
  res.status(201).json({ success: true, data: policy });
});

// @desc    Update policy
// @route   PUT /api/admin/insurance/policies/:id
// @access  Private
exports.updatePolicy = asyncHandler(async (req, res, next) => {
  const policy = await InsurancePolicy.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    .populate('product', 'name type code provider')
    .populate('client', 'name email phoneNumber companyName');
  if (!policy) return next(new ErrorResponse('Policy not found', 404));
  res.status(200).json({ success: true, data: policy });
});

// @desc    Delete policy
// @route   DELETE /api/admin/insurance/policies/:id
// @access  Private
exports.deletePolicy = asyncHandler(async (req, res, next) => {
  const policy = await InsurancePolicy.findById(req.params.id);
  if (!policy) return next(new ErrorResponse('Policy not found', 404));
  await policy.deleteOne();
  res.status(200).json({ success: true, data: {} });
});

// @desc    Get dashboard stats for insurance
// @route   GET /api/admin/insurance/stats
// @access  Private
exports.getInsuranceStats = asyncHandler(async (req, res, next) => {
  const totalPolicies = await InsurancePolicy.countDocuments();
  const activePolicies = await InsurancePolicy.countDocuments({ status: 'active' });
  const expiredPolicies = await InsurancePolicy.countDocuments({ status: 'expired' });
  
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const upcomingRenewals = await InsurancePolicy.countDocuments({
     status: 'active',
     renewalDate: { $gte: new Date(), $lte: nextMonth }
  });

  const totalProducts = await InsuranceProduct.countDocuments();

  res.status(200).json({
    success: true,
    data: {
       totalPolicies,
       activePolicies,
       expiredPolicies,
       upcomingRenewals,
       totalProducts
    }
  });
});
