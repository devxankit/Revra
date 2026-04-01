const Project = require('../models/Project');
const Milestone = require('../models/Milestone');
const Task = require('../models/Task');
const Activity = require('../models/Activity');
const PM = require('../models/PM');
const LeadCategory = require('../models/LeadCategory');
const { uploadToCloudinary, deleteFromCloudinary } = require('../services/cloudinaryService');
const socketService = require('../services/socketService');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Create new project
// @route   POST /api/projects
// @access  PM only
const createProject = asyncHandler(async (req, res, next) => {
  const {
    name,
    description,
    client,
    category,
    categoryId,
    priority,
    status,
    dueDate,
    startDate,
    assignedTeam,
    budget,
    estimatedHours,
    tags
  } = req.body;

  // Validate status if provided
  const validStatuses = ['pending-assignment', 'untouched', 'started', 'active', 'on-hold', 'testing', 'completed', 'cancelled'];
  const projectStatus = status && validStatuses.includes(status) ? status : 'active'; // Default to 'active' if invalid or not provided

  // Create project
  const project = await Project.create({
    name,
    description,
    client,
    category: category || categoryId, // Use category (preferred)
    projectManager: req.user.id,
    status: projectStatus, // Use provided status or default to 'active'
    priority,
    dueDate,
    startDate,
    assignedTeam,
    budget,
    estimatedHours,
    tags
  });

  // Update PM's projectsManaged array
  const pm = await PM.findById(req.user.id);
  if (pm && !pm.projectsManaged.includes(project._id)) {
    pm.projectsManaged.push(project._id);
    await pm.save();
  }

  // Populate the project with related data
  await project.populate([
    { path: 'client', select: 'name companyName email phoneNumber' },
    { path: 'projectManager', select: 'name email' },
    { path: 'assignedTeam', select: 'name email position department' }
  ]);

  // Log activity
  await Activity.logProjectActivity(
    project._id,
    'created',
    req.user.id,
    'PM',
    `Project "${project.name}" was created`,
    { projectName: project.name, client: project.client.name }
  );

  // Emit WebSocket event
  socketService.emitToProject(project._id, 'project_created', {
    project: project,
    createdBy: req.user.name,
    timestamp: new Date()
  });

  // Notify client
  socketService.emitToUser(project.client._id, 'project_created', {
    project: project,
    message: `New project "${project.name}" has been created for you`
  });

  // Notify assigned team members
  project.assignedTeam.forEach(employee => {
    socketService.emitToUser(employee._id, 'project_assigned', {
      project: project,
      message: `You have been assigned to project "${project.name}"`
    });
  });

  res.status(201).json({
    success: true,
    data: project
  });
});

// @desc    Get all projects
// @route   GET /api/projects
// @access  PM, Employee, Client
const getAllProjects = asyncHandler(async (req, res, next) => {
  const {
    status,
    priority,
    client,
    projectManager,
    page = 1,
    limit = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  // Build filter object
  const filter = {};
  if (status && status !== 'all') filter.status = status;
  if (priority) filter.priority = priority;
  if (client) filter.client = client;
  if (projectManager) filter.projectManager = projectManager;

  // Role-based filtering
  if (req.user.role === 'client') {
    filter.client = req.user.id;
  } else if (req.user.role === 'employee') {
    filter.assignedTeam = req.user.id;
  } else if (req.user.role === 'project-manager') {
    filter.projectManager = req.user.id;
  }

  // Calculate pagination
  const skip = (page - 1) * limit;

  // Build sort object
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const projects = await Project.find(filter)
    .populate('client', 'name companyName email')
    .populate('projectManager', 'name email')
    .populate('assignedTeam', 'name email position')
    .sort(sort)
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Project.countDocuments(filter);

  res.json({
    success: true,
    count: projects.length,
    total,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit)
    },
    data: projects
  });
});

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  PM, Employee (if assigned), Client (if their project)
const getProjectById = asyncHandler(async (req, res, next) => {
  const project = await Project.findById(req.params.id)
    .populate('client', 'name companyName email phoneNumber address')
    .populate('category', 'name color icon')
    .populate('projectManager', 'name email phone')
    .populate('assignedTeam', 'name email position department')
    .populate({
      path: 'milestones',
      populate: {
        path: 'assignedTo',
        select: 'name email position'
      }
    });

  if (!project) {
    return next(new ErrorResponse('Project not found', 404));
  }

  // Check access permissions
  if (req.user.role === 'client' && !project.client._id.equals(req.user.id)) {
    return next(new ErrorResponse('Not authorized to access this project', 403));
  }

  if (req.user.role === 'employee' && !project.assignedTeam.some(member => member._id.equals(req.user.id))) {
    return next(new ErrorResponse('Not authorized to access this project', 403));
  }

  res.json({
    success: true,
    data: project
  });
});

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  PM only
const updateProject = asyncHandler(async (req, res, next) => {
  let project = await Project.findById(req.params.id);

  if (!project) {
    return next(new ErrorResponse('Project not found', 404));
  }

  // Check if user is the project manager
  if (!project.projectManager.equals(req.user.id)) {
    return next(new ErrorResponse('Not authorized to update this project', 403));
  }

  const {
    name,
    description,
    client,
    priority,
    status,
    dueDate,
    startDate,
    assignedTeam,
    budget,
    estimatedHours,
    tags,
    category,
    categoryId
  } = req.body;

  // Build update object with only provided fields
  const updateData = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (client !== undefined) updateData.client = client;
  if (category !== undefined || categoryId !== undefined) updateData.category = category || categoryId;
  if (priority !== undefined) updateData.priority = priority;
  if (status !== undefined) {
    // Validate status if provided
    const validStatuses = ['pending-assignment', 'untouched', 'started', 'active', 'on-hold', 'testing', 'completed', 'cancelled'];
    if (validStatuses.includes(status)) {
      updateData.status = status;
      if (status === 'completed') updateData.progress = 100;
    }
  }
  if (dueDate !== undefined) updateData.dueDate = dueDate;
  if (startDate !== undefined) updateData.startDate = startDate;
  if (assignedTeam !== undefined) updateData.assignedTeam = assignedTeam;
  if (budget !== undefined) updateData.budget = budget;
  if (estimatedHours !== undefined) updateData.estimatedHours = estimatedHours;
  if (tags !== undefined) updateData.tags = tags;

  // Update project
  project = await Project.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  ).populate([
    { path: 'client', select: 'name companyName email' },
    { path: 'projectManager', select: 'name email' },
    { path: 'assignedTeam', select: 'name email position' }
  ]);

  // Log activity
  await Activity.logProjectActivity(
    project._id,
    'updated',
    req.user.id,
    'PM',
    `Project "${project.name}" was updated`,
    { projectName: project.name }
  );

  // Emit WebSocket event
  socketService.emitToProject(project._id, 'project_updated', {
    project: project,
    updatedBy: req.user.name,
    timestamp: new Date()
  });

  res.json({
    success: true,
    data: project
  });
});

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  PM only
const deleteProject = asyncHandler(async (req, res, next) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return next(new ErrorResponse('Project not found', 404));
  }

  // Check if user is the project manager
  if (!project.projectManager.equals(req.user.id)) {
    return next(new ErrorResponse('Not authorized to delete this project', 403));
  }

  // Delete associated milestones and tasks
  await Milestone.deleteMany({ project: project._id });
  await Task.deleteMany({ project: project._id });

  // Delete project
  await Project.findByIdAndDelete(req.params.id);

  // Log activity
  await Activity.logProjectActivity(
    project._id,
    'deleted',
    req.user.id,
    'PM',
    `Project "${project.name}" was deleted`,
    { projectName: project.name }
  );

  // Emit WebSocket event
  socketService.emitToProject(project._id, 'project_deleted', {
    projectId: project._id,
    projectName: project.name,
    deletedBy: req.user.name,
    timestamp: new Date()
  });

  res.json({
    success: true,
    message: 'Project deleted successfully'
  });
});

// @desc    Get projects by client
// @route   GET /api/projects/client/:clientId
// @access  PM, Client (own projects only)
const getProjectsByClient = asyncHandler(async (req, res, next) => {
  const { clientId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  // Check access permissions
  if (req.user.role === 'client' && req.user.id !== clientId) {
    return next(new ErrorResponse('Not authorized to access these projects', 403));
  }

  const skip = (page - 1) * limit;

  const projects = await Project.find({ client: clientId })
    .populate('client', 'name companyName email')
    .populate('projectManager', 'name email')
    .populate('assignedTeam', 'name email position')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Project.countDocuments({ client: clientId });

  res.json({
    success: true,
    count: projects.length,
    total,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit)
    },
    data: projects
  });
});

// @desc    Get projects by PM
// @route   GET /api/projects/pm/:pmId
// @access  PM (own projects only)
const getProjectsByPM = asyncHandler(async (req, res, next) => {
  const { pmId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  // Check access permissions
  if (req.user.role === 'project-manager' && req.user.id !== pmId) {
    return next(new ErrorResponse('Not authorized to access these projects', 403));
  }

  const skip = (page - 1) * limit;

  const projects = await Project.find({ projectManager: pmId })
    .populate('client', 'name companyName email')
    .populate('projectManager', 'name email')
    .populate('assignedTeam', 'name email position')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Project.countDocuments({ projectManager: pmId });

  res.json({
    success: true,
    count: projects.length,
    total,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(total / limit)
    },
    data: projects
  });
});

// @desc    Get project statistics
// @route   GET /api/projects/statistics
// @access  PM, Admin
const getProjectStatistics = asyncHandler(async (req, res, next) => {
  const filter = {};

  // Role-based filtering
  if (req.user.role === 'project-manager') {
    filter.projectManager = req.user.id;
  } else if (req.user.role === 'client') {
    filter.client = req.user.id;
  } else if (req.user.role === 'employee') {
    filter.assignedTeam = req.user.id;
  }

  const stats = await Project.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const priorityStats = await Project.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$priority',
        count: { $sum: 1 }
      }
    }
  ]);

  const overdueCount = await Project.countDocuments({
    ...filter,
    dueDate: { $lt: new Date() },
    status: { $nin: ['completed', 'cancelled'] }
  });

  const result = {
    byStatus: {
      planning: 0,
      active: 0,
      'on-hold': 0,
      testing: 0,
      completed: 0,
      cancelled: 0
    },
    byPriority: {
      low: 0,
      normal: 0,
      high: 0,
      urgent: 0
    },
    overdue: overdueCount,
    total: await Project.countDocuments(filter)
  };

  stats.forEach(stat => {
    result.byStatus[stat._id] = stat.count;
  });

  priorityStats.forEach(stat => {
    result.byPriority[stat._id] = stat.count;
  });

  res.json({
    success: true,
    data: result
  });
});

// @desc    Upload project attachment
// @route   POST /api/projects/:id/attachments
// @access  PM only
const uploadProjectAttachment = asyncHandler(async (req, res, next) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return next(new ErrorResponse('Project not found', 404));
  }

  // Check if user is the project manager
  if (!project.projectManager.equals(req.user.id)) {
    return next(new ErrorResponse('Not authorized to upload attachments', 403));
  }

  if (!req.file) {
    return next(new ErrorResponse('No file uploaded', 400));
  }

  try {
    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file, 'projects');

    // Add attachment to project
    await project.addAttachment(result);

    // Log activity
    await Activity.logProjectActivity(
      project._id,
      'attachment_added',
      req.user.id,
      'PM',
      `Attachment "${result.originalName}" was added to project "${project.name}"`,
      { fileName: result.originalName }
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    return next(new ErrorResponse('Failed to upload attachment', 500));
  }
});

// @desc    Remove project attachment
// @route   DELETE /api/projects/:id/attachments/:attachmentId
// @access  PM only
const removeProjectAttachment = asyncHandler(async (req, res, next) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return next(new ErrorResponse('Project not found', 404));
  }

  // Check if user is the project manager
  if (!project.projectManager.equals(req.user.id)) {
    return next(new ErrorResponse('Not authorized to remove attachments', 403));
  }

  const attachment = project.attachments.id(req.params.attachmentId);

  if (!attachment) {
    return next(new ErrorResponse('Attachment not found', 404));
  }

  try {
    // Delete from Cloudinary
    await deleteFromCloudinary(attachment.public_id);

    // Remove attachment from project
    await project.removeAttachment(req.params.attachmentId);

    // Log activity
    await Activity.logProjectActivity(
      project._id,
      'attachment_removed',
      req.user.id,
      'PM',
      `Attachment "${attachment.originalName}" was removed from project "${project.name}"`,
      { fileName: attachment.originalName }
    );

    res.json({
      success: true,
      message: 'Attachment removed successfully'
    });
  } catch (error) {
    return next(new ErrorResponse('Failed to remove attachment', 500));
  }
});

// @desc    Update project revision status
// @route   PATCH /api/projects/:id/revisions/:revisionType
// @access  PM only
const updateProjectRevisionStatus = asyncHandler(async (req, res, next) => {
  const { id, revisionType } = req.params;
  const { status, feedback } = req.body;

  // Validate revisionType
  if (!['firstRevision', 'secondRevision'].includes(revisionType)) {
    return next(new ErrorResponse('Invalid revision type', 400));
  }

  // Validate status
  if (!['pending', 'completed'].includes(status)) {
    return next(new ErrorResponse('Invalid status value', 400));
  }

  const project = await Project.findById(id);
  if (!project) {
    return next(new ErrorResponse('Project not found', 404));
  }

  // Check if user is the project manager
  if (!project.projectManager.equals(req.user.id)) {
    return next(new ErrorResponse('Not authorized', 403));
  }

  // Ensure revisions object exists before updating
  if (!project.revisions) {
    project.revisions = {
      firstRevision: { status: 'pending', completedDate: null, feedback: null },
      secondRevision: { status: 'pending', completedDate: null, feedback: null }
    };
  }

  // Update revision status using the model method
  await project.updateRevisionStatus(revisionType, status, feedback);

  // Log activity
  await Activity.logProjectActivity(
    project._id,
    'revision_status_updated',
    req.user.id,
    'PM',
    `Revision status updated to "${status}" for ${revisionType} in project "${project.name}"`,
    { revisionType, status }
  );

  // Emit WebSocket event
  socketService.emitToProjectRoom(id, 'project_revision_updated', {
    revisionType,
    status,
    completedDate: project.revisions[revisionType].completedDate
  });

  res.status(200).json({
    success: true,
    data: project.revisions
  });
});

// @desc    Get project team members
// @route   GET /api/projects/:id/team
// @access  PM only
const getProjectTeamMembers = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const project = await Project.findById(id)
    .populate('assignedTeam', 'name email position department employeeId')
    .populate('projectManager', 'name email')
    .select('assignedTeam name projectManager');

  if (!project) {
    return next(new ErrorResponse('Project not found', 404));
  }

  // Check if user is the project manager
  if (!project.projectManager || !project.projectManager._id.equals(req.user.id)) {
    return next(new ErrorResponse('Not authorized to access this project', 403));
  }

  res.status(200).json({
    success: true,
    data: project.assignedTeam
  });
});

// @desc    Get all project categories (LeadCategories)
// @route   GET /api/projects/meta/categories
// @access  PM only
const getCategories = asyncHandler(async (req, res, next) => {
  const categories = await LeadCategory.find()
    .select('name description color icon')
    .sort('name');

  res.status(200).json({
    success: true,
    data: categories
  });
});

module.exports = {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
  getProjectsByClient,
  getProjectsByPM,
  getProjectStatistics,
  uploadProjectAttachment,
  removeProjectAttachment,
  updateProjectRevisionStatus,
  getProjectTeamMembers,
  getCategories
};
