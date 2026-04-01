const mongoose = require('mongoose');
const Request = require('../models/Request');
const Admin = require('../models/Admin');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

const catalog = [
  {
    id: 'website-development',
    title: 'Website Development',
    description:
      'Custom website development with modern technologies and responsive design tailored to your brand.',
    category: 'website',
    priceRange: { min: 50000, max: 200000, currency: 'INR' },
    duration: '4-8 weeks',
    rating: 4.8,
    reviews: 156,
    features: [
      'Responsive Design',
      'SEO Optimized',
      'CMS Integration',
      'Mobile Friendly',
      'Fast Loading',
      'Cross Browser Compatible'
    ],
    technologies: ['React', 'Next.js', 'Node.js', 'MongoDB', 'Express'],
    deliverables: [
      'Responsive Website',
      'Admin Panel',
      'SEO Optimization',
      'Performance Optimization',
      'Documentation',
      '3 Months Support'
    ],
    popular: true,
    image:
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop'
  },
  {
    id: 'mobile-app-development',
    title: 'Mobile App Development',
    description:
      'Native and cross-platform mobile applications for iOS and Android with smooth user experience.',
    category: 'mobile',
    priceRange: { min: 100000, max: 500000, currency: 'INR' },
    duration: '8-16 weeks',
    rating: 4.9,
    reviews: 89,
    features: [
      'Cross Platform',
      'Native Performance',
      'App Store Ready',
      'Push Notifications',
      'Offline Support',
      'Real-time Sync'
    ],
    technologies: ['React Native', 'Flutter', 'Swift', 'Kotlin', 'Firebase'],
    deliverables: [
      'iOS App',
      'Android App',
      'Admin Dashboard',
      'Push Notifications',
      'App Store Submission',
      '6 Months Support'
    ],
    popular: true,
    image:
      'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=600&fit=crop'
  },
  {
    id: 'ecommerce-platform',
    title: 'E-commerce Website',
    description:
      'Complete e-commerce platforms with secure payment integration and inventory management.',
    category: 'website',
    priceRange: { min: 75000, max: 300000, currency: 'INR' },
    duration: '6-12 weeks',
    rating: 4.7,
    reviews: 124,
    features: [
      'Payment Gateway',
      'Inventory Management',
      'Order Tracking',
      'Admin Dashboard',
      'Multi-vendor Support',
      'Analytics'
    ],
    technologies: ['React', 'Node.js', 'Stripe', 'PayPal', 'MongoDB'],
    deliverables: [
      'E-commerce Website',
      'Payment Integration',
      'Admin Panel',
      'Inventory System',
      'Order Management',
      'Analytics Dashboard'
    ],
    popular: false,
    image:
      'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=600&fit=crop'
  },
  {
    id: 'pwa-solution',
    title: 'Progressive Web App',
    description:
      'Modern PWAs that work like native apps across devices with offline support and push notifications.',
    category: 'website',
    priceRange: { min: 60000, max: 250000, currency: 'INR' },
    duration: '6-10 weeks',
    rating: 4.8,
    reviews: 67,
    features: [
      'Offline Functionality',
      'Push Notifications',
      'App-like Experience',
      'Fast Loading',
      'Installable',
      'Responsive'
    ],
    technologies: [
      'React',
      'Service Workers',
      'Web App Manifest',
      'IndexedDB',
      'PWA'
    ],
    deliverables: [
      'PWA Website',
      'Offline Support',
      'Push Notifications',
      'App Installation',
      'Performance Optimization',
      'Cross Platform'
    ],
    popular: false,
    image:
      'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=800&h=600&fit=crop'
  },
  {
    id: 'hybrid-app',
    title: 'Hybrid Mobile App',
    description:
      'Cross-platform mobile apps using web technologies for faster delivery and cost efficiency.',
    category: 'mobile',
    priceRange: { min: 80000, max: 350000, currency: 'INR' },
    duration: '6-12 weeks',
    rating: 4.6,
    reviews: 45,
    features: [
      'Single Codebase',
      'Cost Effective',
      'Faster Development',
      'Easy Maintenance',
      'Cross Platform',
      'Native Features'
    ],
    technologies: ['Ionic', 'Cordova', 'Capacitor', 'Angular', 'React'],
    deliverables: [
      'iOS App',
      'Android App',
      'Single Codebase',
      'Native Features',
      'App Store Submission',
      'Maintenance Support'
    ],
    popular: false,
    image:
      'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=600&fit=crop'
  },
  {
    id: 'website-redesign',
    title: 'Website Redesign',
    description:
      'Modern redesign of existing websites focused on UX improvements, accessibility, and performance.',
    category: 'website',
    priceRange: { min: 30000, max: 150000, currency: 'INR' },
    duration: '3-6 weeks',
    rating: 4.9,
    reviews: 92,
    features: [
      'Modern Design',
      'Improved UX',
      'Mobile Optimization',
      'Performance Boost',
      'SEO Enhancement',
      'Content Migration'
    ],
    technologies: ['Modern CSS', 'JavaScript', 'Performance Tools', 'SEO Tools'],
    deliverables: [
      'Redesigned Website',
      'Improved Performance',
      'Mobile Optimization',
      'SEO Enhancement',
      'Content Migration',
      'Training'
    ],
    popular: true,
    image:
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop'
  }
];

const catalogMap = catalog.reduce((map, service) => {
  map.set(service.id, service);
  return map;
}, new Map());

// @desc    Get service catalog for explore page
// @route   GET /api/client/explore
// @access  Client only
const getServiceCatalog = asyncHandler(async (req, res) => {
  const { category, search } = req.query;

  let results = catalog;

  if (category && category !== 'all') {
    const normalized = category.toLowerCase();
    results = results.filter(
      (service) => service.category.toLowerCase() === normalized
    );
  }

  if (search) {
    const term = search.toLowerCase();
    results = results.filter(
      (service) =>
        service.title.toLowerCase().includes(term) ||
        service.description.toLowerCase().includes(term)
    );
  }

  res.status(200).json({
    success: true,
    data: results
  });
});

// @desc    Create a service inquiry request
// @route   POST /api/client/explore/request
// @access  Client only
const createServiceRequest = asyncHandler(async (req, res, next) => {
  const clientId = req.client?.id || req.user?.id;
  const clientObjectId = clientId ? new mongoose.Types.ObjectId(clientId) : null;

  if (!clientObjectId) {
    return next(new ErrorResponse('Client context not found', 401));
  }

  const { serviceId, message, priority = 'normal' } = req.body || {};

  if (!serviceId) {
    return next(new ErrorResponse('Service ID is required', 400));
  }

  const service = catalogMap.get(serviceId);

  if (!service) {
    return next(new ErrorResponse('Selected service is not available', 404));
  }

  const admin = await Admin.findOne({ role: 'admin', isActive: true })
    .select('_id name')
    .lean();

  if (!admin) {
    return next(new ErrorResponse('No administrator available to receive requests', 500));
  }

  const description =
    message && message.trim().length > 0
      ? message.trim()
      : `Client has expressed interest in ${service.title}. Please follow up for scoping and quotation.`;

  const createdRequest = await Request.create({
    module: 'client',
    type: 'resource-allocation',
    title: `Service inquiry: ${service.title}`,
    description: description.substring(0, 1800),
    category: service.category,
    priority,
    requestedBy: clientObjectId,
    requestedByModel: 'Client',
    recipient: admin._id,
    recipientModel: 'Admin',
    client: clientObjectId
  });

  res.status(201).json({
    success: true,
    data: {
      requestId: createdRequest._id,
      service: {
        id: service.id,
        title: service.title
      }
    },
    message: 'Your service inquiry has been submitted successfully.'
  });
});

module.exports = {
  getServiceCatalog,
  createServiceRequest
};

