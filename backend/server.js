const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');

// Load environment variables from .env file
// Standard Node.js practice: load dotenv once at entry point
require('dotenv').config();

// Validate critical environment variables on startup
if (!process.env.MONGODB_URI) {
  console.error('❌ ERROR: MONGODB_URI environment variable is not set!');
  console.error('   Please ensure your .env file exists and contains MONGODB_URI');
  process.exit(1);
}

// Import database connection
const connectDB = require('./config/db');

// Import routes
const adminRoutes = require('./routes/adminRoutes');
const adminUserRoutes = require('./routes/adminUserRoutes');
const pmRoutes = require('./routes/pmRoutes');
const salesRoutes = require('./routes/salesRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const clientRoutes = require('./routes/clientRoutes');
const cpAuthRoutes = require('./routes/cpAuthRoutes');

// Import new PM module routes
const projectRoutes = require('./routes/projectRoutes');
const milestoneRoutes = require('./routes/milestoneRoutes');
const taskRoutes = require('./routes/taskRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

// Import role-specific routes
const adminProjectRoutes = require('./routes/adminProjectRoutes');
const adminAnalyticsRoutes = require('./routes/adminAnalyticsRoutes');
const adminSalesRoutes = require('./routes/adminSalesRoutes');
const adminFinanceRoutes = require('./routes/adminFinanceRoutes');
const adminProjectExpenseRoutes = require('./routes/adminProjectExpenseRoutes');
const adminProjectExpenseCategoryRoutes = require('./routes/adminProjectExpenseCategoryRoutes');
const adminProjectCredentialRoutes = require('./routes/adminProjectCredentialRoutes');
const adminRewardRoutes = require('./routes/adminRewardRoutes');
const adminNoticeRoutes = require('./routes/adminNoticeRoutes');
const adminBackupRoutes = require('./routes/adminBackupRoutes');
const adminClientTagRoutes = require('./routes/adminClientTagRoutes');
const adminClientBannerRoutes = require('./routes/adminClientBannerRoutes');
const channelPartnerRoutes = require('./routes/channelPartnerRoutes');
const quotationRoutes = require('./routes/quotationRoutes');
const employeeProjectRoutes = require('./routes/employeeProjectRoutes');
const employeeTaskRoutes = require('./routes/employeeTaskRoutes');
const employeeAnalyticsRoutes = require('./routes/employeeAnalyticsRoutes');
const employeeMilestoneRoutes = require('./routes/employeeMilestoneRoutes');
const employeeNotificationRoutes = require('./routes/employeeNotificationRoutes');
const clientProjectRoutes = require('./routes/clientProjectRoutes');
const clientMilestoneRoutes = require('./routes/clientMilestoneRoutes');
const clientPaymentRoutes = require('./routes/clientPaymentRoutes');
const clientWalletRoutes = require('./routes/clientWalletRoutes');
const clientNotificationRoutes = require('./routes/clientNotificationRoutes');
const clientExploreRoutes = require('./routes/clientExploreRoutes');
const clientBannerRoutes = require('./routes/clientBannerRoutes');
const requestRoutes = require('./routes/requestRoutes');
const cpRoutes = require('./routes/cpRoutes');
const fcmTokenRoutes = require('./routes/fcmTokenRoutes');

// Import socket service
const socketService = require('./services/socketService');

// Import daily points scheduler
const { startDailyScheduler } = require('./services/dailyPointsScheduler');
// Import recurring expense auto-pay scheduler
const { startRecurringExpenseAutoPayScheduler } = require('./services/recurringExpenseAutoPayScheduler');
// Import daily backup scheduler (runs at 2 AM - no crontab needed)
const { startBackupScheduler } = require('./services/backupScheduler');
// Import reward automation scheduler (runs on 1st of month)
const { startRewardScheduler } = require('./services/rewardScheduler');

const app = express();
const PORT = process.env.PORT || 5000;

// Define allowed origins
const allowedOrigins = [
  process.env.CORS_ORIGIN || 'http://localhost:3000',
  'http://localhost:5173', // Vite default port
  'http://localhost:5174', // Vite alternative port
  'http://localhost:5175', // Vite alternative port
  'http://localhost:5176', // Vite alternative port
  'http://localhost:5177', // Vite alternative port
  'http://localhost:5178', // Vite alternative port
  'http://localhost:5179', // Vite alternative port
  'http://localhost:5180', // Vite alternative port
  'http://localhost:5181', // Vite alternative port
  'http://localhost:3000',  // React default port
  'https://supercrm.appzeto.com',  // Production frontend
  'https://www.supercrm.appzeto.com',  // Production frontend with www
  'https://api.supercrm.appzeto.com'  // API domain (for cross-origin requests)
];

// ROOT CAUSE FIX: Custom CORS middleware that runs BEFORE everything else
// This ensures CORS headers are ALWAYS set, even if the cors package fails under PM2
// MUST be the ABSOLUTE FIRST middleware - nothing can run before this
app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Handle OPTIONS preflight requests FIRST - respond immediately
  if (req.method === 'OPTIONS') {

    // Check if origin is allowed
    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
      res.header('Access-Control-Max-Age', '86400');
      return res.sendStatus(204);
    } else if (!origin) {
      // No origin (same-origin request) - allow it
      return res.sendStatus(204);
    } else {
      // Origin not in allowed list
      if (process.env.NODE_ENV === 'development') {
        console.log(`⚠️  CORS blocked: ${origin} not in allowed origins`);
      }
      res.sendStatus(403);
      return;
    }
  }

  // For non-OPTIONS requests, set CORS headers if origin is allowed
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Expose-Headers', 'Content-Range, X-Content-Range');
  }

  next();
});

// Also use cors package as additional layer (but custom middleware above handles OPTIONS first)
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Log CORS configuration on startup (cleaner format)
const localOrigins = allowedOrigins.filter(o => o.includes('localhost')).length;
const productionOrigins = allowedOrigins.filter(o => o.includes('https://')).length;
console.log('🔒 CORS: ' + allowedOrigins.length + ' origins configured' +
  (localOrigins > 0 ? ` (${localOrigins} local, ${productionOrigins} production)` : ''));

// Configure Helmet AFTER CORS - Helmet must not interfere with CORS headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false, // Allow embedding if needed
  contentSecurityPolicy: false // Disable CSP to avoid conflicts with CORS
}));

// Other middleware
app.use(morgan('combined')); // Logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(cookieParser()); // Parse cookies

// Serve static files from public directory
app.use('/public', express.static(path.join(__dirname, 'public')));

// Note: OPTIONS are handled by custom CORS middleware above, so no need for explicit handler here

// Basic route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Appzeto Backend API',
    status: 'Server is running successfully',
    timestamp: new Date().toISOString()
  });
});

// Health check route
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Server status route with WebSocket info
app.get('/status', (req, res) => {
  const connectedUsers = socketService.getConnectedUsersCount();
  const uptime = process.uptime();
  const memoryUsage = process.memoryUsage();

  res.json({
    server: {
      status: 'RUNNING',
      uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`,
      memory: {
        used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
      }
    },
    websocket: {
      status: socketService.io ? 'ACTIVE' : 'INACTIVE',
      connectedUsers: connectedUsers,
      activeRooms: socketService.io?.sockets.adapter.rooms.size || 0
    },
    database: {
      status: 'CONNECTED',
      host: process.env.MONGODB_URI ? 'Connected' : 'Not configured'
    },
    timestamp: new Date().toISOString()
  });
});

// API routes with /api prefix
// Note: More specific routes MUST come before /api/admin (adminRoutes) so PEM etc. can reach project-expenses, projects, etc.
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/admin/projects', adminProjectRoutes);
app.use('/api/admin/analytics', adminAnalyticsRoutes);
app.use('/api/admin/sales', adminSalesRoutes);
app.use('/api/admin/finance', adminFinanceRoutes);
app.use('/api/admin/project-expenses', adminProjectExpenseRoutes);
app.use('/api/admin/project-expense-categories', adminProjectExpenseCategoryRoutes);
app.use('/api/admin/project-credentials', adminProjectCredentialRoutes);
app.use('/api/admin/rewards', adminRewardRoutes);
app.use('/api/admin/notices', adminNoticeRoutes);
app.use('/api/admin/backup', adminBackupRoutes);
app.use('/api/admin/client-tags', adminClientTagRoutes);
app.use('/api/admin/client-banners', adminClientBannerRoutes);
app.use('/api/admin/channel-partners', channelPartnerRoutes);
app.use('/api/admin/quotations', quotationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/pm', pmRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/employee', employeeRoutes);
// Client-specific routes (must come before /api/client to avoid prefix capture)
app.use('/api/client/projects', clientProjectRoutes);
app.use('/api/client/milestones', clientMilestoneRoutes);
app.use('/api/client/payments', clientPaymentRoutes);
app.use('/api/client/wallet', clientWalletRoutes);
app.use('/api/client/notifications', clientNotificationRoutes);
app.use('/api/client/explore', clientExploreRoutes);
app.use('/api/client/banners', clientBannerRoutes);
app.use('/api/client', clientRoutes);
app.use('/api/channel-partner', cpAuthRoutes);
app.use('/api/cp', cpRoutes);

// API routes without /api prefix (for reverse proxy compatibility)
// Note: More specific admin routes MUST come before /admin (adminRoutes)
app.use('/admin/users', adminUserRoutes);
app.use('/admin/projects', adminProjectRoutes);
app.use('/admin/analytics', adminAnalyticsRoutes);
app.use('/admin/sales', adminSalesRoutes);
app.use('/admin/finance', adminFinanceRoutes);
app.use('/admin/project-expenses', adminProjectExpenseRoutes);
app.use('/admin/project-expense-categories', adminProjectExpenseCategoryRoutes);
app.use('/admin/project-credentials', adminProjectCredentialRoutes);
app.use('/admin/rewards', adminRewardRoutes);
app.use('/admin/notices', adminNoticeRoutes);
app.use('/admin/backup', adminBackupRoutes);
app.use('/admin/client-tags', adminClientTagRoutes);
app.use('/admin/client-banners', adminClientBannerRoutes);
app.use('/admin/channel-partners', channelPartnerRoutes);
app.use('/admin/quotations', quotationRoutes);
app.use('/admin', adminRoutes);
app.use('/pm', pmRoutes);
app.use('/sales', salesRoutes);
app.use('/employee', employeeRoutes);
// Client-specific routes (must come before /client)
app.use('/client/projects', clientProjectRoutes);
app.use('/client/milestones', clientMilestoneRoutes);
app.use('/client/payments', clientPaymentRoutes);
app.use('/client/wallet', clientWalletRoutes);
app.use('/client/notifications', clientNotificationRoutes);
app.use('/client/explore', clientExploreRoutes);
app.use('/client/banners', clientBannerRoutes);
app.use('/client', clientRoutes);
app.use('/channel-partner', cpAuthRoutes);
app.use('/cp', cpRoutes);

// Universal API routes with /api prefix (available to all authenticated users)
app.use('/api/requests', requestRoutes);
app.use('/api/fcm-tokens', fcmTokenRoutes);

// PM Module API routes (PM-only) with /api prefix
app.use('/api/projects', projectRoutes);
app.use('/api/milestones', milestoneRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/analytics', analyticsRoutes);

// Universal API routes without /api prefix (for reverse proxy compatibility)
app.use('/requests', requestRoutes);
app.use('/fcm-tokens', fcmTokenRoutes);

// PM Module API routes without /api prefix (for reverse proxy compatibility)
app.use('/projects', projectRoutes);
app.use('/milestones', milestoneRoutes);
app.use('/tasks', taskRoutes);
app.use('/payments', paymentRoutes);
app.use('/analytics', analyticsRoutes);

// Role-specific API routes with /api prefix
// Admin routes already registered above (before adminRoutes)
// Employee routes
app.use('/api/employee/projects', employeeProjectRoutes);
app.use('/api/employee/tasks', employeeTaskRoutes);
app.use('/api/employee/analytics', employeeAnalyticsRoutes);
app.use('/api/employee/milestones', employeeMilestoneRoutes);
app.use('/api/employee/notifications', employeeNotificationRoutes);

// Client routes (already registered above with /api prefix)

// Role-specific API routes without /api prefix (for reverse proxy compatibility)
// Admin routes already registered above (before adminRoutes)
// Employee routes
app.use('/employee/projects', employeeProjectRoutes);
app.use('/employee/tasks', employeeTaskRoutes);
app.use('/employee/analytics', employeeAnalyticsRoutes);
app.use('/employee/milestones', employeeMilestoneRoutes);
app.use('/employee/notifications', employeeNotificationRoutes);

// Client routes (already registered above)

// API routes documentation
app.get('/api', (req, res) => {
  res.json({
    message: 'Appzeto Backend API Documentation',
    version: '1.0.0',
    availableRoutes: {
      authentication: [
        'POST /api/admin/login',
        'GET /api/admin/profile',
        'POST /api/admin/logout',
        'POST /api/pm/login',
        'GET /api/pm/profile',
        'POST /api/pm/logout',
        'POST /api/sales/login',
        'GET /api/sales/profile',
        'POST /api/sales/logout',
        'POST /api/employee/login',
        'GET /api/employee/profile',
        'POST /api/employee/logout',
        'POST /api/client/send-otp',
        'POST /api/client/verify-otp',
        'GET /api/client/profile',
        'POST /api/client/logout'
      ],
      admin: [
        'GET /api/admin/users/statistics',
        'GET /api/admin/users',
        'GET /api/admin/users/:userType/:id',
        'POST /api/admin/users',
        'PUT /api/admin/users/:userType/:id',
        'DELETE /api/admin/users/:userType/:id',
        'GET /api/admin/projects',
        'GET /api/admin/projects/:id',
        'POST /api/admin/projects',
        'PUT /api/admin/projects/:id',
        'DELETE /api/admin/projects/:id',
        'GET /api/admin/projects/statistics',
        'GET /api/admin/analytics/dashboard',
        'GET /api/admin/analytics/system',
        'POST /api/admin/sales/leads',
        'POST /api/admin/sales/leads/bulk',
        'GET /api/admin/sales/leads',
        'GET /api/admin/sales/leads/:id',
        'PUT /api/admin/sales/leads/:id',
        'DELETE /api/admin/sales/leads/:id',
        'GET /api/admin/sales/leads/statistics',
        'POST /api/admin/sales/categories',
        'GET /api/admin/sales/categories',
        'GET /api/admin/sales/categories/:id',
        'PUT /api/admin/sales/categories/:id',
        'DELETE /api/admin/sales/categories/:id',
        'GET /api/admin/sales/categories/performance',
        'GET /api/admin/sales/team',
        'GET /api/admin/sales/team/:id',
        'PUT /api/admin/sales/team/:id/target',
        'POST /api/admin/sales/team/:id/distribute-leads',
        'GET /api/admin/sales/team/:id/leads',
        'GET /api/admin/sales/team/:id/leads/category/:categoryId',
        'POST /api/admin/sales/team/:id/incentive',
        'GET /api/admin/sales/team/:id/incentives',
        'PUT /api/admin/sales/team/:id/incentive/:incentiveId',
        'GET /api/admin/sales/overview',
        'GET /api/admin/sales/analytics/categories',
        'GET /api/admin/sales/analytics/team'
      ],
      projects: [
        'POST /api/projects (PM only)',
        'GET /api/projects (PM only)',
        'GET /api/projects/:id (PM only)',
        'PUT /api/projects/:id (PM only)',
        'DELETE /api/projects/:id (PM only)',
        'GET /api/projects/client/:clientId (PM only)',
        'GET /api/projects/pm/:pmId (PM only)',
        'GET /api/projects/statistics (PM only)',
        'POST /api/projects/:id/attachments (PM only)',
        'DELETE /api/projects/:id/attachments/:attachmentId (PM only)'
      ],
      milestones: [
        'POST /api/milestones',
        'GET /api/milestones/project/:projectId',
        'GET /api/milestones/:id',
        'PUT /api/milestones/:id',
        'DELETE /api/milestones/:id',
        'PATCH /api/milestones/:id/progress',
        'POST /api/milestones/:id/attachments',
        'DELETE /api/milestones/:id/attachments/:attachmentId'
      ],
      tasks: [
        'POST /api/tasks',
        'POST /api/tasks/urgent',
        'GET /api/tasks/milestone/:milestoneId',
        'GET /api/tasks/project/:projectId',
        'GET /api/tasks/employee/:employeeId',
        'GET /api/tasks/urgent',
        'GET /api/tasks/:id',
        'PUT /api/tasks/:id',
        'DELETE /api/tasks/:id',
        'PATCH /api/tasks/:id/status',
        'PATCH /api/tasks/:id/assign',
        'POST /api/tasks/:id/comments',
        'POST /api/tasks/:id/attachments',
        'DELETE /api/tasks/:id/attachments/:attachmentId'
      ],
      payments: [
        'POST /api/payments',
        'GET /api/payments/project/:projectId',
        'GET /api/payments/client/:clientId',
        'PUT /api/payments/:id',
        'GET /api/payments/statistics',
        'GET /api/payments/project/:projectId/statistics',
        'GET /api/payments/client/:clientId/statistics'
      ],
      analytics: [
        'GET /api/analytics/pm/dashboard',
        'GET /api/analytics/project/:projectId',
        'GET /api/analytics/employee/:employeeId',
        'GET /api/analytics/client/:clientId',
        'GET /api/analytics/productivity'
      ],
      employee: [
        'GET /api/employee/projects (Employee only)',
        'GET /api/employee/projects/:id (Employee only)',
        'GET /api/employee/projects/:id/milestones (Employee only)',
        'GET /api/employee/projects/statistics (Employee only)',
        'GET /api/employee/tasks (Employee only)',
        'GET /api/employee/tasks/:id (Employee only)',
        'PATCH /api/employee/tasks/:id/status (Employee only)',
        'POST /api/employee/tasks/:id/comments (Employee only)',
        'GET /api/employee/tasks/urgent (Employee only)',
        'GET /api/employee/tasks/statistics (Employee only)'
      ],
      client: [
        'GET /api/client/projects (Client only)',
        'GET /api/client/projects/:id (Client only)',
        'GET /api/client/projects/:id/milestones (Client only)',
        'GET /api/client/projects/statistics (Client only)',
        'GET /api/client/payments (Client only)',
        'GET /api/client/payments/:id (Client only)',
        'GET /api/client/payments/statistics (Client only)'
      ]
    },
    websocket: {
      connection: 'Socket.io connection with JWT authentication',
      rooms: [
        'project_{projectId}',
        'milestone_{milestoneId}',
        'task_{taskId}',
        'user_{userId}'
      ],
      events: [
        'join_project',
        'leave_project',
        'join_milestone',
        'leave_milestone',
        'join_task',
        'leave_task',
        'project_updated',
        'milestone_updated',
        'task_updated',
        'task_status_changed',
        'comment_added'
      ]
    }
  });
});

// 404 handler - ensure CORS headers are set
app.use('*', (req, res) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Error handling middleware - ensure CORS headers are set on errors
app.use((err, req, res, next) => {
  console.error('Error occurred:', err);
  console.error('Error stack:', err.stack);

  // Set CORS headers on error responses
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: statusCode === 500 ? 'Something went wrong!' : 'Request failed',
    message: process.env.NODE_ENV === 'development' ? message : (statusCode === 500 ? 'Internal server error' : message)
  });
});

// Connect to database and start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start server with error handling for port conflicts
    const server = app.listen(PORT, () => {
      // Clear console for clean startup
      console.clear();

      // Beautiful server startup display
      console.log('\n');
      console.log('🚀 ' + '='.repeat(60));
      console.log('   🎯 APPZETO BACKEND SERVER - PROJECT MANAGEMENT SYSTEM');
      console.log('🚀 ' + '='.repeat(60));
      console.log('');
      console.log('📊 SERVER STATUS:');
      console.log('   ✅ Server: RUNNING');
      console.log('   ✅ Database: CONNECTED');
      console.log('');
      console.log('🔧 CONFIGURATION:');
      console.log(`   🌐 Port: ${PORT}`);
      console.log(`   🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   🔗 API Base URL: http://localhost:${PORT}`);
      console.log('');
      console.log('🚀 ' + '='.repeat(60));
      console.log('   🎉 Server started successfully! Ready for connections.');
      console.log('🚀 ' + '='.repeat(60));
      console.log('');
    });

    // Handle server errors (especially port conflicts)
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.log('\n');
        console.log('❌ ' + '='.repeat(60));
        console.log('   🚨 PORT ALREADY IN USE');
        console.log('❌ ' + '='.repeat(60));
        console.log(`   ⚠️  Port ${PORT} is already being used by another process.`);
        console.log('');
        console.log('🔧 SOLUTIONS:');
        console.log('');
        console.log('   1️⃣  Find and kill the process using port ' + PORT + ':');
        console.log('      • Linux/Mac: lsof -ti:' + PORT + ' | xargs kill -9');
        console.log('      • Or: fuser -k ' + PORT + '/tcp');
        console.log('      • Or: netstat -tulpn | grep :' + PORT);
        console.log('');
        console.log('   2️⃣  If using PM2, check for running instances:');
        console.log('      • pm2 list');
        console.log('      • pm2 stop Appzeto-Backend');
        console.log('      • pm2 delete Appzeto-Backend');
        console.log('');
        console.log('   3️⃣  Change the port in your .env file:');
        console.log('      • Set PORT=5051 (or another available port)');
        console.log('');
        console.log('❌ ' + '='.repeat(60));
        process.exit(1);
      } else {
        console.log('\n');
        console.log('❌ ' + '='.repeat(50));
        console.log('   🚨 SERVER ERROR');
        console.log('❌ ' + '='.repeat(50));
        console.error('   Error:', error.message);
        console.log('❌ ' + '='.repeat(50));
        process.exit(1);
      }
    });

    // Initialize Socket.io with enhanced logging
    socketService.initialize(server);

    // Start daily points scheduler
    startDailyScheduler();
    startRecurringExpenseAutoPayScheduler();
    // Start daily backup scheduler (2 AM - runs when GOOGLE_DRIVE_FOLDER_ID is set)
    startBackupScheduler();
    // Start reward automation scheduler
    startRewardScheduler();

    // Graceful shutdown handling
    process.on('SIGINT', () => {
      console.log('\n');
      console.log('🛑 ' + '='.repeat(50));
      console.log('   ⚠️  Received SIGINT (Ctrl+C)');
      console.log('   🔄 Shutting down gracefully...');
      console.log('🛑 ' + '='.repeat(50));
      server.close(() => {
        console.log('   ✅ Server closed successfully');
        console.log('   👋 Goodbye!');
        process.exit(0);
      });
    });

    process.on('SIGTERM', () => {
      console.log('\n');
      console.log('🛑 ' + '='.repeat(50));
      console.log('   ⚠️  Received SIGTERM');
      console.log('   🔄 Shutting down gracefully...');
      console.log('🛑 ' + '='.repeat(50));
      server.close(() => {
        console.log('   ✅ Server closed successfully');
        console.log('   👋 Goodbye!');
        process.exit(0);
      });
    });

  } catch (error) {
    console.log('\n');
    console.log('❌ ' + '='.repeat(50));
    console.log('   🚨 FAILED TO START SERVER');
    console.log('❌ ' + '='.repeat(50));
    console.error('   Error:', error.message);
    console.log('   🔧 Please check your configuration and try again.');
    console.log('❌ ' + '='.repeat(50));
    process.exit(1);
  }
};

// Start the application
startServer();

module.exports = app;
