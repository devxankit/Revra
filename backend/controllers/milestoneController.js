const Milestone = require('../models/Milestone');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Activity = require('../models/Activity');
const { uploadToCloudinary, deleteFromCloudinary } = require('../services/cloudinaryService');
const socketService = require('../services/socketService');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Create new milestone
// @route   POST /api/milestones
// @access  PM only
const createMilestone = asyncHandler(async (req, res, next) => {
  const {
    title,
    description,
    project,
    sequence,
    dueDate,
    priority,
    assignedTo
  } = req.body;

  // Verify project exists and user is the project manager
  const projectDoc = await Project.findById(project);
  if (!projectDoc) {
    return next(new ErrorResponse('Project not found', 404));
  }

  if (!projectDoc.projectManager.equals(req.user.id)) {
    return next(new ErrorResponse('Not authorized to create milestones for this project', 403));
  }

  // Check for sequence conflict before creating milestone
  let sequenceConflict = false;
  let originalSequence = sequence;
  
  if (sequence && sequence > 0) {
    const existingMilestone = await Milestone.findOne({
      project: project,
      sequence: sequence
    });
    
    if (existingMilestone) {
      sequenceConflict = true;
      // Return error for sequence conflict instead of auto-assigning
      return next(new ErrorResponse(`Sequence number ${sequence} already exists for this project. Please choose a different sequence number.`, 400));
    }
  }

  // Create milestone
  const milestone = await Milestone.create({
    title,
    description,
    project,
    sequence,
    dueDate,
    priority,
    assignedTo
  });

  // Add milestone to project
  await projectDoc.addMilestone(milestone._id);

  // Populate the milestone with related data
  await milestone.populate([
    { path: 'project', select: 'name status' },
    { path: 'assignedTo', select: 'name email position' }
  ]);

  // Log activity
  await Activity.logMilestoneActivity(
    milestone._id,
    'created',
    req.user.id,
    'PM',
    `Milestone "${milestone.title}" was created for project "${projectDoc.name}"`,
    { milestoneTitle: milestone.title, projectName: projectDoc.name }
  );

  // Emit WebSocket events
  socketService.emitToProject(project, 'milestone_created', {
    milestone: milestone,
    createdBy: req.user.name,
    timestamp: new Date()
  });

  // Notify assigned team members
  milestone.assignedTo.forEach(employee => {
    socketService.emitToUser(employee._id, 'milestone_assigned', {
      milestone: milestone,
      message: `New milestone "${milestone.title}" has been assigned to you`
    });
  });

  res.status(201).json({
    success: true,
    data: milestone
  });
});

// @desc    Get milestones by project
// @route   GET /api/milestones/project/:projectId
// @access  PM, Employee (if assigned), Client (if their project)
const getMilestonesByProject = asyncHandler(async (req, res, next) => {
  const { projectId } = req.params;

  // Verify project exists and user has access
  const project = await Project.findById(projectId);
  if (!project) {
    return next(new ErrorResponse('Project not found', 404));
  }

  // Check access permissions
  if (req.user.role === 'client' && !project.client.equals(req.user.id)) {
    return next(new ErrorResponse('Not authorized to access this project', 403));
  }

  if (req.user.role === 'employee' && !project.assignedTeam.some(member => member.equals(req.user.id))) {
    return next(new ErrorResponse('Not authorized to access this project', 403));
  }

  const milestones = await Milestone.find({ project: projectId })
    .populate('project', 'name status')
    .populate('assignedTo', 'name email position')
    .populate({
      path: 'tasks',
      select: 'title status priority dueDate',
      populate: {
        path: 'assignedTo',
        select: 'name email'
      }
    })
    .sort({ sequence: 1 });

  res.json({
    success: true,
    count: milestones.length,
    data: milestones
  });
});

// @desc    Get single milestone
// @route   GET /api/milestones/:id
// @access  PM, Employee (if assigned), Client (if their project)
const getMilestoneById = asyncHandler(async (req, res, next) => {
  const milestone = await Milestone.findById(req.params.id)
    .populate('project', 'name status client projectManager assignedTeam')
    .populate('assignedTo', 'name email position department')
    .populate({
      path: 'tasks',
      populate: {
        path: 'assignedTo',
        select: 'name email position'
      }
    });

  if (!milestone) {
    return next(new ErrorResponse('Milestone not found', 404));
  }

  // Check access permissions
  const project = milestone.project;
  if (req.user.role === 'client' && !project.client.equals(req.user.id)) {
    return next(new ErrorResponse('Not authorized to access this milestone', 403));
  }

  if (req.user.role === 'employee' && !project.assignedTeam.some(member => member.equals(req.user.id))) {
    return next(new ErrorResponse('Not authorized to access this milestone', 403));
  }

  res.json({
    success: true,
    data: milestone
  });
});

// @desc    Update milestone
// @route   PUT /api/milestones/:id
// @access  PM only
const updateMilestone = asyncHandler(async (req, res, next) => {
  let milestone = await Milestone.findById(req.params.id);

  if (!milestone) {
    return next(new ErrorResponse('Milestone not found', 404));
  }

  // Verify user is the project manager
  const project = await Project.findById(milestone.project);
  if (!project.projectManager.equals(req.user.id)) {
    return next(new ErrorResponse('Not authorized to update this milestone', 403));
  }

  const {
    title,
    description,
    sequence,
    dueDate,
    status,
    priority,
    assignedTo
  } = req.body;

  // Build update object with only provided fields
  const updateData = {};
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (sequence !== undefined) updateData.sequence = sequence;
  if (dueDate !== undefined) updateData.dueDate = dueDate;
  if (priority !== undefined) updateData.priority = priority;
  if (assignedTo !== undefined) updateData.assignedTo = assignedTo;
  if (status !== undefined) {
    // Validate status if provided
    const validStatuses = ['pending', 'in-progress', 'testing', 'completed', 'cancelled'];
    if (validStatuses.includes(status)) {
      updateData.status = status;
    }
  }

  // Update milestone
  milestone = await Milestone.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  ).populate([
    { path: 'project', select: 'name status' },
    { path: 'assignedTo', select: 'name email position' }
  ]);

  // Log activity
  await Activity.logMilestoneActivity(
    milestone._id,
    'updated',
    req.user.id,
    'PM',
    `Milestone "${milestone.title}" was updated`,
    { milestoneTitle: milestone.title }
  );

  res.json({
    success: true,
    data: milestone
  });
});

// @desc    Delete milestone
// @route   DELETE /api/milestones/:id
// @access  PM only
const deleteMilestone = asyncHandler(async (req, res, next) => {
  const milestone = await Milestone.findById(req.params.id);

  if (!milestone) {
    return next(new ErrorResponse('Milestone not found', 404));
  }

  // Verify user is the project manager
  const project = await Project.findById(milestone.project);
  if (!project.projectManager.equals(req.user.id)) {
    return next(new ErrorResponse('Not authorized to delete this milestone', 403));
  }

  // Delete associated tasks
  await Task.deleteMany({ milestone: milestone._id });

  // Remove milestone from project
  await project.removeMilestone(milestone._id);

  // Delete milestone
  await Milestone.findByIdAndDelete(req.params.id);

  // Log activity
  await Activity.logMilestoneActivity(
    milestone._id,
    'deleted',
    req.user.id,
    'PM',
    `Milestone "${milestone.title}" was deleted from project "${project.name}"`,
    { milestoneTitle: milestone.title, projectName: project.name }
  );

  res.json({
    success: true,
    message: 'Milestone deleted successfully'
  });
});

// @desc    Update milestone progress
// @route   PATCH /api/milestones/:id/progress
// @access  PM only
const updateMilestoneProgress = asyncHandler(async (req, res, next) => {
  const { progress } = req.body;
  const milestone = await Milestone.findById(req.params.id);

  if (!milestone) {
    return next(new ErrorResponse('Milestone not found', 404));
  }

  // Verify user is the project manager
  const project = await Project.findById(milestone.project);
  if (!project) {
    return next(new ErrorResponse('Project not found', 404));
  }
  if (!project.projectManager.equals(req.user.id)) {
    return next(new ErrorResponse('Not authorized to update this milestone', 403));
  }

  // Update progress (clamp 0-100)
  const value = Math.min(100, Math.max(0, Number(progress) || 0));
  milestone.progress = value;
  await milestone.save();

  // Update parent project progress
  await project.updateProgress();

  // Log activity
  await Activity.logMilestoneActivity(
    milestone._id,
    'updated',
    req.user.id,
    'PM',
    `Milestone "${milestone.title}" progress updated to ${value}%`,
    { milestoneTitle: milestone.title, progress: value }
  );

  res.json({
    success: true,
    data: milestone
  });
});

// @desc    Upload milestone attachment
// @route   POST /api/milestones/:id/attachments
// @access  PM only
const uploadMilestoneAttachment = asyncHandler(async (req, res, next) => {
  const milestone = await Milestone.findById(req.params.id);

  if (!milestone) {
    return next(new ErrorResponse('Milestone not found', 404));
  }

  // Verify user is the project manager
  const project = await Project.findById(milestone.project);
  if (!project.projectManager.equals(req.user.id)) {
    return next(new ErrorResponse('Not authorized to upload attachments', 403));
  }

  if (!req.file) {
    return next(new ErrorResponse('No file uploaded', 400));
  }

  try {
    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file, 'milestones');

    // Add attachment to milestone
    await milestone.addAttachment(result);

    // Log activity
    await Activity.logMilestoneActivity(
      milestone._id,
      'attachment_added',
      req.user.id,
      'PM',
      `Attachment "${result.originalName}" was added to milestone "${milestone.title}"`,
      { fileName: result.originalName, milestoneTitle: milestone.title }
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    return next(new ErrorResponse('Failed to upload attachment', 500));
  }
});

// @desc    Remove milestone attachment
// @route   DELETE /api/milestones/:id/attachments/:attachmentId
// @access  PM only
const removeMilestoneAttachment = asyncHandler(async (req, res, next) => {
  const milestone = await Milestone.findById(req.params.id);

  if (!milestone) {
    return next(new ErrorResponse('Milestone not found', 404));
  }

  // Verify user is the project manager
  const project = await Project.findById(milestone.project);
  if (!project.projectManager.equals(req.user.id)) {
    return next(new ErrorResponse('Not authorized to remove attachments', 403));
  }

  const attachment = milestone.attachments.id(req.params.attachmentId);

  if (!attachment) {
    return next(new ErrorResponse('Attachment not found', 404));
  }

  try {
    // Delete from Cloudinary
    await deleteFromCloudinary(attachment.public_id);

    // Remove attachment from milestone
    await milestone.removeAttachment(req.params.attachmentId);

    // Log activity
    await Activity.logMilestoneActivity(
      milestone._id,
      'attachment_removed',
      req.user.id,
      'PM',
      `Attachment "${attachment.originalName}" was removed from milestone "${milestone.title}"`,
      { fileName: attachment.originalName, milestoneTitle: milestone.title }
    );

    res.json({
      success: true,
      message: 'Attachment removed successfully'
    });
  } catch (error) {
    return next(new ErrorResponse('Failed to remove attachment', 500));
  }
});

module.exports = {
  createMilestone,
  getMilestonesByProject,
  getMilestoneById,
  updateMilestone,
  deleteMilestone,
  updateMilestoneProgress,
  uploadMilestoneAttachment,
  removeMilestoneAttachment
};
