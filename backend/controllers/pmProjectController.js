const Project = require('../models/Project');
const Activity = require('../models/Activity');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const socketService = require('../services/socketService');

// @desc    Get new projects assigned to PM
// @route   GET /api/pm/new-projects
// @access  PM only
const getNewProjects = asyncHandler(async (req, res, next) => {
  const { status, priority, search, page = 1, limit = 20 } = req.query;

  // Build filter object
  const filter = {
    projectManager: req.user.id,
    status: { $in: ['untouched', 'started'] }
  };

  if (status && status !== 'all') {
    filter.status = status;
  }

  if (priority && priority !== 'all') {
    filter.priority = priority;
  }

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { 'client.name': { $regex: search, $options: 'i' } },
      { 'client.companyName': { $regex: search, $options: 'i' } }
    ];
  }

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const projects = await Project.find(filter)
    .populate('client', 'name email phoneNumber companyName')
    .populate('submittedBy', 'name email')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Project.countDocuments(filter);

  res.json({
    success: true,
    count: projects.length,
    total,
    data: projects,
    pagination: {
      current: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      total
    }
  });
});

// @desc    Update meeting status for a project
// @route   PATCH /api/pm/projects/:id/meeting-status
// @access  PM only
const updateMeetingStatus = asyncHandler(async (req, res, next) => {
  const { meetingStatus } = req.body;
  const projectId = req.params.id;

  if (!meetingStatus || !['pending', 'done'].includes(meetingStatus)) {
    return next(new ErrorResponse('Valid meeting status is required (pending or done)', 400));
  }

  // Find the project
  const project = await Project.findById(projectId);
  if (!project) {
    return next(new ErrorResponse('Project not found', 404));
  }

  // Check if project belongs to the PM
  if (project.projectManager.toString() !== req.user.id) {
    return next(new ErrorResponse('Unauthorized to update this project', 403));
  }

  // Check if project status allows meeting status update
  if (!['untouched', 'started'].includes(project.status)) {
    return next(new ErrorResponse('Meeting status can only be updated for untouched or acknowledged projects', 400));
  }

  // Update meeting status
  project.meetingStatus = meetingStatus;
  await project.save();

  // Create activity log
  await Activity.logProjectActivity(
    project._id,
    'meeting_status_updated',
    req.user.id,
    'PM',
    `Meeting status updated to ${meetingStatus}`,
    { meetingStatus, projectName: project.name }
  );

  // Emit WebSocket event
  socketService.emitToProject(project._id, 'meeting_status_updated', {
    project: project,
    meetingStatus,
    updatedBy: req.user.name
  });

  res.json({
    success: true,
    data: project,
    message: 'Meeting status updated successfully'
  });
});

// @desc    Acknowledge a project (convert untouched → acknowledged)
// @route   PATCH /api/pm/projects/:id/start
// @access  PM only
const startProject = asyncHandler(async (req, res, next) => {
  const projectId = req.params.id;

  // Find the project
  const project = await Project.findById(projectId);
  if (!project) {
    return next(new ErrorResponse('Project not found', 404));
  }

  // Check if project belongs to the PM
  if (project.projectManager.toString() !== req.user.id) {
    return next(new ErrorResponse('Unauthorized to update this project', 403));
  }

  // Check if project status allows starting
  if (project.status !== 'untouched') {
    return next(new ErrorResponse('Project can only be acknowledged from untouched status', 400));
  }

  // Update status to started
  project.status = 'started';
  await project.save();

  // Create activity log
  await Activity.logProjectActivity(
    project._id,
    'project_started',
    req.user.id,
    'PM',
    `Project acknowledged by PM`,
    { projectName: project.name }
  );

  // Emit WebSocket event
  socketService.emitToProject(project._id, 'project_started', {
    project: project,
    acknowledgedBy: req.user.name
  });

  res.json({
    success: true,
    data: project,
    message: 'Project acknowledged successfully'
  });
});

// @desc    Activate a project (convert acknowledged → active with full details)
// @route   PATCH /api/pm/projects/:id/activate
// @access  PM only
const activateProject = asyncHandler(async (req, res, next) => {
  const { dueDate, assignedTeam, estimatedHours, tags } = req.body;
  const projectId = req.params.id;

  if (!dueDate) {
    return next(new ErrorResponse('Due date is required', 400));
  }

  if (!assignedTeam || !Array.isArray(assignedTeam) || assignedTeam.length === 0) {
    return next(new ErrorResponse('At least one team member is required', 400));
  }

  // Find the project
  const project = await Project.findById(projectId);
  if (!project) {
    return next(new ErrorResponse('Project not found', 404));
  }

  // Check if project belongs to the PM
  if (project.projectManager.toString() !== req.user.id) {
    return next(new ErrorResponse('Unauthorized to update this project', 403));
  }

  // Check if project status allows activation
  if (project.status !== 'started') {
    return next(new ErrorResponse('Project can only be activated from acknowledged status', 400));
  }

  // Update project with full details
  project.status = 'active';
  project.dueDate = new Date(dueDate);
  project.assignedTeam = assignedTeam;
  if (estimatedHours) project.estimatedHours = estimatedHours;
  if (tags) project.tags = tags;

  await project.save();

  // Create activity log
  await Activity.logProjectActivity(
    project._id,
    'project_activated',
    req.user.id,
    'PM',
    `Project activated with team assignment`,
    {
      projectName: project.name,
      teamSize: assignedTeam.length,
      dueDate: project.dueDate
    }
  );

  // Emit WebSocket events to team members
  assignedTeam.forEach(memberId => {
    socketService.emitToUser(memberId, 'project_assigned', {
      project: project,
      message: `You have been assigned to project "${project.name}"`,
      assignedBy: req.user.name
    });
  });

  // Emit project-wide event
  socketService.emitToProject(project._id, 'project_activated', {
    project: project,
    activatedBy: req.user.name
  });

  // Populate the updated project
  const populatedProject = await Project.findById(projectId)
    .populate('client', 'name email phoneNumber companyName')
    .populate('projectManager', 'name email')
    .populate('assignedTeam', 'name email position department');

  res.json({
    success: true,
    data: populatedProject,
    message: 'Project activated successfully'
  });
});

module.exports = {
  getNewProjects,
  updateMeetingStatus,
  startProject,
  activateProject
};
