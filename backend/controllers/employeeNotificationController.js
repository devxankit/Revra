const mongoose = require('mongoose');
const Request = require('../models/Request');
const Project = require('../models/Project');
const Milestone = require('../models/Milestone');
const Task = require('../models/Task');
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

const formatRequestNotification = (request, employeeIdStr) => {
  const recipientId = extractId(request.recipient);
  const requesterId = extractId(request.requestedBy);

  const isRecipient =
    request.recipientModel === 'Employee' && recipientId === employeeIdStr;
  const isRequester =
    request.requestedByModel === 'Employee' && requesterId === employeeIdStr;

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

const formatActivityNotification = (activity, projectMap, milestoneMap, taskMap) => {
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

  if (activity.entityType === 'task') {
    const task = taskMap.get(extractId(activity.entityId));
    const project = task
      ? projectMap.get(extractId(task.project))
      : null;
    const milestone = task
      ? milestoneMap.get(extractId(task.milestone))
      : null;

    return {
      ...base,
      scope: 'task',
      task: task
        ? {
            id: task._id,
            title: task.title,
            status: task.status,
            priority: task.priority,
            dueDate: task.dueDate
          }
        : null,
      project: project
        ? {
            id: project._id,
            name: project.name,
            status: project.status
          }
        : null,
      milestone: milestone
        ? {
            id: milestone._id,
            title: milestone.title,
            status: milestone.status
          }
        : null
    };
  }

  return {
    ...base,
    scope: activity.entityType
  };
};

const formatTaskNotification = (task) => {
  return {
    id: `task_${task._id}`,
    type: 'task',
    title: 'New Task Assigned',
    message: `You have been assigned a new task: "${task.title}"${task.priority === 'urgent' || task.priority === 'high' ? ` with ${task.priority} priority` : ''}`,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    task: {
      id: task._id,
      title: task.title,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate
    },
    project: task.project
      ? {
          id: task.project._id,
          name: task.project.name,
          status: task.project.status
        }
      : null,
    milestone: task.milestone
      ? {
          id: task.milestone._id,
          title: task.milestone.title,
          status: task.milestone.status
        }
      : null
  };
};

// @desc    Get notifications feed for the authenticated employee
// @route   GET /api/employee/notifications
// @access  Employee only
const getEmployeeNotifications = asyncHandler(async (req, res, next) => {
  const employeeId = req.employee?.id || req.user?.id;
  const employeeObjectId = toObjectId(employeeId);

  if (!employeeObjectId) {
    return next(new ErrorResponse('Employee context not found', 401));
  }

  const employeeIdStr = employeeObjectId.toString();
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 5), 100);
  const sliceLimit = Math.min(limit, 50);

  // Get projects where employee is assigned
  const teamProjects = await Project.find({ assignedTeam: { $in: [employeeObjectId] } })
    .select('_id name status progress')
    .lean();
  
  // Get projects where employee has tasks
  const tasksWithProjects = await Task.find({ assignedTo: { $in: [employeeObjectId] } })
    .select('project')
    .distinct('project');
  
  const allProjectIds = [...new Set([
    ...teamProjects.map(p => p._id.toString()),
    ...tasksWithProjects.map(id => id.toString())
  ])];

  const projectIds = allProjectIds.map(id => toObjectId(id)).filter(Boolean);
  const projectMap = teamProjects.reduce((map, project) => {
    map.set(project._id.toString(), project);
    return map;
  }, new Map());

  // Get additional project details for task projects
  if (projectIds.length > 0) {
    const additionalProjects = await Project.find({ _id: { $in: projectIds } })
      .select('_id name status progress')
      .lean();
    additionalProjects.forEach(project => {
      projectMap.set(project._id.toString(), project);
    });
  }

  // Get request notifications
  const requestDocs = await Request.find({
    $or: [
      { recipientModel: 'Employee', recipient: employeeObjectId },
      { requestedByModel: 'Employee', requestedBy: employeeObjectId }
    ]
  })
    .populate('requestedBy', 'name fullName')
    .populate('recipient', 'name fullName')
    .populate('project', 'name status')
    .sort({ updatedAt: -1 })
    .limit(sliceLimit)
    .lean();

  const requestNotifications = requestDocs.map((request) =>
    formatRequestNotification(request, employeeIdStr)
  );

  // Get task assignment notifications (recently assigned tasks)
  const recentTasks = await Task.find({
    assignedTo: { $in: [employeeObjectId] },
    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
  })
    .populate('project', 'name status')
    .populate('milestone', 'title status')
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  const taskNotifications = recentTasks.map(formatTaskNotification);

  // Get activity notifications
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

    // Get tasks for activity notifications
    const taskDocs = await Task.find({
      project: { $in: projectIds },
      assignedTo: { $in: [employeeObjectId] }
    })
      .select('_id project milestone title status priority dueDate')
      .lean();

    const taskMap = taskDocs.reduce((map, task) => {
      map.set(task._id.toString(), task);
      return map;
    }, new Map());

    const taskIds = taskDocs.map(task => task._id);

    const activities = await Activity.find({
      $or: [
        { entityType: 'project', entityId: { $in: projectIds } },
        { entityType: 'milestone', entityId: { $in: milestoneIds } },
        { entityType: 'task', entityId: { $in: taskIds } }
      ]
    })
      .populate('user', 'name fullName')
      .sort({ createdAt: -1 })
      .limit(sliceLimit)
      .lean();

    activityNotifications = activities.map((activity) =>
      formatActivityNotification(activity, projectMap, milestoneMap, taskMap)
    );
  }

  // Combine all notifications
  const combined = [...requestNotifications, ...taskNotifications, ...activityNotifications].sort(
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
  getEmployeeNotifications
};

