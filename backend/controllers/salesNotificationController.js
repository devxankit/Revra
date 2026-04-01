const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const SalesTask = require('../models/SalesTask');
const SalesMeeting = require('../models/SalesMeeting');
const Request = require('../models/Request');
const PaymentReceipt = require('../models/PaymentReceipt');
const Project = require('../models/Project');
const Client = require('../models/Client');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

const toObjectId = (value) => {
  if (!value) return null;
  try {
    return new mongoose.Types.ObjectId(value);
  } catch (error) {
    return null;
  }
};

const extractId = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value instanceof mongoose.Types.ObjectId) return value.toString();
  if (value._id) return extractId(value._id);
  if (typeof value.toString === 'function') return value.toString();
  return null;
};

const formatLeadNotification = (lead) => {
  const statusMessages = {
    new: 'A new lead has been assigned to you',
    connected: 'Lead has been marked as connected',
    hot: 'Lead has been marked as hot',
    converted: 'Lead has been converted to client',
    lost: 'Lead has been marked as lost',
    not_picked: 'Lead did not pick up the call',
    followup: 'Follow-up required for this lead',
    quotation_sent: 'Quotation has been sent',
    dq_sent: 'Demo/Quotation has been sent',
    demo_requested: 'Demo has been requested',
    not_interested: 'Lead is not interested'
  };

  return {
    id: `lead_${lead._id}`,
    type: 'lead',
    title: 'Lead Update',
    message: `${statusMessages[lead.status] || 'Lead status updated'}: ${lead.phone}${lead.name ? ` (${lead.name})` : ''}`,
    createdAt: lead.updatedAt || lead.createdAt,
    updatedAt: lead.updatedAt,
    lead: {
      id: lead._id,
      phone: lead.phone,
      name: lead.name,
      status: lead.status,
      priority: lead.priority
    }
  };
};

const formatTaskNotification = (task) => {
  return {
    id: `task_${task._id}`,
    type: 'task',
    title: task.completed ? 'Task Completed' : 'New Task Assigned',
    message: `Task: "${task.title}"${task.priority === 'high' || task.priority === 'urgent' ? ` with ${task.priority} priority` : ''}`,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    task: {
      id: task._id,
      title: task.title,
      status: task.completed ? 'completed' : 'pending',
      priority: task.priority,
      dueDate: task.dueDate
    }
  };
};

const formatMeetingNotification = (meeting) => {
  return {
    id: `meeting_${meeting._id}`,
    type: 'meeting',
    title: 'Sales Meeting',
    message: `Meeting${meeting.meetingDate ? ` scheduled for ${new Date(meeting.meetingDate).toLocaleDateString()}` : ''}${meeting.client?.name ? ` with ${meeting.client.name}` : ''}`,
    createdAt: meeting.createdAt,
    updatedAt: meeting.updatedAt,
    meeting: {
      id: meeting._id,
      meetingDate: meeting.meetingDate,
      meetingTime: meeting.meetingTime,
      meetingType: meeting.meetingType,
      location: meeting.location,
      status: meeting.status
    }
  };
};

const formatRequestNotification = (request, salesIdStr) => {
  const recipientId = extractId(request.recipient);
  const requesterId = extractId(request.requestedBy);

  const isRecipient =
    request.recipientModel === 'Sales' && recipientId === salesIdStr;
  const isRequester =
    request.requestedByModel === 'Sales' && requesterId === salesIdStr;

  const direction = isRecipient ? 'incoming' : isRequester ? 'outgoing' : 'other';
  const statusLabel = request.status || 'pending';

  const requestedByName =
    request.requestedBy?.name ||
    request.requestedBy?.fullName ||
    'Team';
  const recipientName =
    request.recipient?.name ||
    request.recipient?.fullName ||
    'Team';

  let message;
  if (direction === 'incoming') {
    message =
      statusLabel === 'pending'
        ? `${requestedByName} sent you a ${request.type} request.`
        : `${requestedByName} updated the request – status is now ${statusLabel}.`;
  } else if (direction === 'outgoing') {
    message =
      statusLabel === 'pending'
        ? `Your request "${request.title}" is awaiting a response.`
        : `Your request "${request.title}" was ${statusLabel}.`;
  } else {
    message = `Request "${request.title}" for ${recipientName} is ${statusLabel}.`;
  }

  return {
    id: request._id,
    type: 'request',
    direction,
    title: request.title,
    message,
    status: statusLabel,
    priority: request.priority,
    module: request.module,
    requestType: request.type,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    actors: {
      requestedBy: requestedByName,
      recipient: recipientName
    }
  };
};

const formatPaymentNotification = (receipt) => {
  return {
    id: `payment_${receipt._id}`,
    type: 'payment',
    title: 'Payment Received',
    message: `Payment of ₹${receipt.amount?.toLocaleString('en-IN') || '0'} received${receipt.project?.name ? ` for project ${receipt.project.name}` : ''}`,
    createdAt: receipt.createdAt,
    updatedAt: receipt.updatedAt,
    payment: {
      id: receipt._id,
      amount: receipt.amount,
      method: receipt.method,
      project: receipt.project
    }
  };
};

// @desc    Get notifications feed for the authenticated sales employee
// @route   GET /api/sales/notifications
// @access  Sales only
const getSalesNotifications = asyncHandler(async (req, res, next) => {
  const salesId = req.sales?.id || req.user?.id;
  const salesObjectId = toObjectId(salesId);

  if (!salesObjectId) {
    return next(new ErrorResponse('Sales context not found', 401));
  }

  const salesIdStr = salesObjectId.toString();
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 5), 100);

  // Get leads assigned to this sales employee
  const recentLeads = await Lead.find({
    assignedTo: salesObjectId,
    updatedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
  })
    .select('_id phone name status priority updatedAt createdAt')
    .sort({ updatedAt: -1 })
    .limit(20)
    .lean();

  const leadNotifications = recentLeads.map(formatLeadNotification);

  // Get sales tasks assigned to this sales employee
  const recentTasks = await SalesTask.find({
    owner: salesObjectId,
    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  const taskNotifications = recentTasks.map(formatTaskNotification);

  // Get sales meetings
  const recentMeetings = await SalesMeeting.find({
    $or: [
      { assignee: salesObjectId },
      { createdBy: salesObjectId }
    ],
    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
  })
    .populate('client', 'name')
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  const meetingNotifications = recentMeetings.map(formatMeetingNotification);

  // Get request notifications
  const requestDocs = await Request.find({
    $or: [
      { recipientModel: 'Sales', recipient: salesObjectId },
      { requestedByModel: 'Sales', requestedBy: salesObjectId }
    ]
  })
    .populate('requestedBy', 'name fullName')
    .populate('recipient', 'name fullName')
    .sort({ updatedAt: -1 })
    .limit(20)
    .lean();

  const requestNotifications = requestDocs.map((request) =>
    formatRequestNotification(request, salesIdStr)
  );

  // Get payment receipts for projects where sales employee converted the lead
  // First, get clients converted by this sales employee
  const convertedClients = await Client.find({
    convertedBy: salesObjectId
  })
    .select('_id')
    .lean();

  const clientIds = convertedClients.map(c => c._id);

  if (clientIds.length > 0) {
    // Get projects for these clients
    const projects = await Project.find({
      client: { $in: clientIds }
    })
      .select('_id')
      .lean();

    const projectIds = projects.map(p => p._id);

    if (projectIds.length > 0) {
      // Get recent payment receipts
      const recentReceipts = await PaymentReceipt.find({
        project: { $in: projectIds },
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
      })
        .populate('project', 'name')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      const paymentNotifications = recentReceipts.map(formatPaymentNotification);
      leadNotifications.push(...paymentNotifications);
    }
  }

  // Combine all notifications
  const combined = [
    ...leadNotifications,
    ...taskNotifications,
    ...meetingNotifications,
    ...requestNotifications
  ].sort((a, b) => {
    const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return dateB - dateA;
  });

  const data = combined.slice(0, limit).map((notification) => ({
    ...notification,
    read: false // Placeholder until read-state persistence is implemented
  }));

  res.status(200).json({
    success: true,
    data
  });
});

module.exports = {
  getSalesNotifications
};
