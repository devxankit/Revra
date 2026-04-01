const mongoose = require('mongoose');
const Request = require('../models/Request');
const Project = require('../models/Project');
const Milestone = require('../models/Milestone');
const Activity = require('../models/Activity');
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

const formatRequestNotification = (request, clientIdStr) => {
  const recipientId = extractId(request.recipient);
  const requesterId = extractId(request.requestedBy);

  const isRecipient =
    request.recipientModel === 'Client' && recipientId === clientIdStr;
  const isRequester =
    request.requestedByModel === 'Client' && requesterId === clientIdStr;

  const direction = isRecipient ? 'incoming' : isRequester ? 'outgoing' : 'other';
  const statusLabel = request.status || 'pending';

  const requestedByName =
    request.requestedBy?.name ||
    request.requestedBy?.fullName ||
    request.requestedBy?.companyName ||
    'Team';
  const recipientName =
    request.recipient?.name ||
    request.recipient?.fullName ||
    request.recipient?.companyName ||
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
    project: request.project
      ? {
          id: request.project._id,
          name: request.project.name,
          status: request.project.status
        }
      : null,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    actors: {
      requestedBy: requestedByName,
      recipient: recipientName
    }
  };
};

const formatActivityNotification = (activity, projectMap, milestoneMap) => {
  const base = {
    id: activity._id,
    type: 'activity',
    activityType: activity.activityType,
    message: activity.message,
    createdAt: activity.createdAt,
    updatedAt: activity.updatedAt,
    actor: activity.user?.name || activity.user?.fullName || 'Team Member',
    metadata: activity.metadata || {}
  };

  if (activity.entityType === 'project') {
    const project = projectMap.get(extractId(activity.entityId));
    return {
      ...base,
      scope: 'project',
      project: project
        ? {
            id: project._id,
            name: project.name,
            status: project.status,
            progress: project.progress || 0
          }
        : null
    };
  }

  if (activity.entityType === 'milestone') {
    const milestone = milestoneMap.get(extractId(activity.entityId));
    const project = milestone
      ? projectMap.get(extractId(milestone.project))
      : null;

    return {
      ...base,
      scope: 'milestone',
      milestone: milestone
        ? {
            id: milestone._id,
            title: milestone.title,
            status: milestone.status,
            dueDate: milestone.dueDate
          }
        : null,
      project: project
        ? {
            id: project._id,
            name: project.name,
            status: project.status
          }
        : null
    };
  }

  return {
    ...base,
    scope: activity.entityType
  };
};

// @desc    Get notifications feed for the authenticated client
// @route   GET /api/client/notifications
// @access  Client only
const getClientNotifications = asyncHandler(async (req, res, next) => {
  const clientId = req.client?.id || req.user?.id;
  const clientObjectId = toObjectId(clientId);

  if (!clientObjectId) {
    return next(new ErrorResponse('Client context not found', 401));
  }

  const clientIdStr = clientObjectId.toString();
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 5), 100);
  const sliceLimit = Math.min(limit, 50);

  const projects = await Project.find({ client: clientObjectId })
    .select('name status progress')
    .lean();

  const projectIds = projects.map((project) => project._id);
  const projectMap = projects.reduce((map, project) => {
    map.set(project._id.toString(), project);
    return map;
  }, new Map());

  const requestDocs = await Request.find({
    $or: [
      { recipientModel: 'Client', recipient: clientObjectId },
      { requestedByModel: 'Client', requestedBy: clientObjectId }
    ]
  })
    .populate('requestedBy', 'name fullName')
    .populate('recipient', 'name fullName')
    .populate('project', 'name status')
    .sort({ updatedAt: -1 })
    .limit(sliceLimit)
    .lean();

  const requestNotifications = requestDocs.map((request) =>
    formatRequestNotification(request, clientIdStr)
  );

  let activityNotifications = [];

  if (projectIds.length > 0) {
    const milestoneDocs = await Milestone.find({ project: { $in: projectIds } })
      .select('_id project title status dueDate')
      .sort({ updatedAt: -1 })
      .limit(200)
      .lean();

    const milestoneIds = milestoneDocs.map((milestone) => milestone._id);
    const milestoneMap = milestoneDocs.reduce((map, milestone) => {
      map.set(milestone._id.toString(), milestone);
      return map;
    }, new Map());

    const activities = await Activity.find({
      $or: [
        { entityType: 'project', entityId: { $in: projectIds } },
        { entityType: 'milestone', entityId: { $in: milestoneIds } }
      ]
    })
      .populate('user', 'name fullName')
      .sort({ createdAt: -1 })
      .limit(sliceLimit)
      .lean();

    activityNotifications = activities.map((activity) =>
      formatActivityNotification(activity, projectMap, milestoneMap)
    );
  }

  const combined = [...requestNotifications, ...activityNotifications].sort(
    (a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    }
  );

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
  getClientNotifications
};

