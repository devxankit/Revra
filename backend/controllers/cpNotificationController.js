const CPNotification = require('../models/CPNotification');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all notifications
// @route   GET /api/cp/notifications
// @access  Private (Channel Partner only)
exports.getNotifications = asyncHandler(async (req, res, next) => {
  const cpId = req.channelPartner.id;
  const { type, read, page = 1, limit = 30 } = req.query;

  const query = { channelPartner: cpId };
  if (type) query.type = type;
  if (read !== undefined) query.read = read === 'true';

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const notifications = await CPNotification.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  const total = await CPNotification.countDocuments(query);
  const unreadCount = await CPNotification.countDocuments({
    channelPartner: cpId,
    read: false
  });

  res.status(200).json({
    success: true,
    count: notifications.length,
    total,
    unreadCount,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
    data: notifications
  });
});

// @desc    Mark notification as read
// @route   PATCH /api/cp/notifications/:id/read
// @access  Private (Channel Partner only)
exports.markAsRead = asyncHandler(async (req, res, next) => {
  const cpId = req.channelPartner.id;
  const notificationId = req.params.id;

  const notification = await CPNotification.findOne({
    _id: notificationId,
    channelPartner: cpId
  });

  if (!notification) {
    return next(new ErrorResponse('Notification not found', 404));
  }

  await notification.markAsRead();

  res.status(200).json({
    success: true,
    message: 'Notification marked as read',
    data: notification
  });
});

// @desc    Mark all notifications as read
// @route   PATCH /api/cp/notifications/read-all
// @access  Private (Channel Partner only)
exports.markAllAsRead = asyncHandler(async (req, res, next) => {
  const cpId = req.channelPartner.id;

  await CPNotification.updateMany(
    { channelPartner: cpId, read: false },
    { read: true, readAt: new Date() }
  );

  res.status(200).json({
    success: true,
    message: 'All notifications marked as read'
  });
});

// @desc    Get unread count
// @route   GET /api/cp/notifications/unread-count
// @access  Private (Channel Partner only)
exports.getUnreadCount = asyncHandler(async (req, res, next) => {
  const cpId = req.channelPartner.id;

  const count = await CPNotification.getUnreadCount(cpId);

  res.status(200).json({
    success: true,
    data: {
      unreadCount: count
    }
  });
});
