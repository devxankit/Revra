const Milestone = require('../models/Milestone');
const Task = require('../models/Task');
const Project = require('../models/Project');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get milestone details (Employee view - only assigned projects)
// @route   GET /api/employee/milestones/:id
// @access  Employee only
const getEmployeeMilestoneById = asyncHandler(async (req, res, next) => {
  const employeeId = req.user.id;
  
  // First verify employee is assigned to project containing this milestone
  const milestone = await Milestone.findById(req.params.id)
    .populate('project', 'name status assignedTeam')
    .populate('assignedTo', 'name email position department');

  if (!milestone) {
    return next(new ErrorResponse('Milestone not found', 404));
  }

  // Check if employee is assigned to the project
  const isAssignedToProject = milestone.project.assignedTeam.some(member => 
    member._id.toString() === employeeId
  );

  if (!isAssignedToProject) {
    return next(new ErrorResponse('You are not assigned to this project', 403));
  }

  // Get all tasks in this milestone (not just employee's tasks)
  const tasks = await Task.find({ milestone: req.params.id })
    .populate('assignedTo', 'name email position department')
    .populate('project', 'name status')
    .populate('createdBy', 'name email')
    .sort({ priority: 1, dueDate: 1 });

  // Get employee's specific tasks in this milestone
  const employeeTasks = tasks.filter(task => 
    task.assignedTo.some(assignee => assignee._id.toString() === employeeId)
  );

  // Calculate milestone progress
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Calculate employee's contribution to milestone
  const employeeCompletedTasks = employeeTasks.filter(t => t.status === 'completed').length;
  const employeeProgress = employeeTasks.length > 0 
    ? Math.round((employeeCompletedTasks / employeeTasks.length) * 100) 
    : 0;

  res.json({
    success: true,
    data: {
      milestone: {
        ...milestone.toObject(),
        progress,
        totalTasks,
        completedTasks,
        employeeTasks: employeeTasks.length,
        employeeCompletedTasks,
        employeeProgress
      },
      tasks,
      employeeTasks
    }
  });
});

// @desc    Get milestone tasks (Employee view - filtered to employee's tasks)
// @route   GET /api/employee/milestones/:id/tasks
// @access  Employee only
const getEmployeeMilestoneTasks = asyncHandler(async (req, res, next) => {
  const employeeId = req.user.id;
  const { status, priority, page = 1, limit = 20 } = req.query;
  
  // First verify employee is assigned to project containing this milestone
  const milestone = await Milestone.findById(req.params.id)
    .populate('project', 'assignedTeam');

  if (!milestone) {
    return next(new ErrorResponse('Milestone not found', 404));
  }

  // Check if employee is assigned to the project
  const isAssignedToProject = milestone.project.assignedTeam.some(member => 
    member._id.toString() === employeeId
  );

  if (!isAssignedToProject) {
    return next(new ErrorResponse('You are not assigned to this project', 403));
  }

  // Build filter for employee's tasks in this milestone
  const filter = { 
    milestone: req.params.id,
    assignedTo: employeeId
  };
  
  if (status) filter.status = status;
  if (priority) filter.priority = priority;

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const tasks = await Task.find(filter)
    .populate('project', 'name status')
    .populate('milestone', 'title status')
    .populate('assignedTo', 'name email department')
    .populate('createdBy', 'name email')
    .sort({ 
      isUrgent: -1, // Urgent tasks first
      priority: 1,  // Then by priority
      dueDate: 1    // Then by due date
    })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Task.countDocuments(filter);

  res.json({
    success: true,
    count: tasks.length,
    total,
    data: tasks,
    pagination: {
      current: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      total
    }
  });
});

// @desc    Add comment to milestone (Employee can comment on milestones in assigned projects)
// @route   POST /api/employee/milestones/:id/comments
// @access  Employee only
const addEmployeeMilestoneComment = asyncHandler(async (req, res, next) => {
  const employeeId = req.user.id;
  const { message } = req.body;

  if (!message || message.trim().length === 0) {
    return next(new ErrorResponse('Comment message is required', 400));
  }

  // First verify employee is assigned to project containing this milestone
  const milestone = await Milestone.findById(req.params.id)
    .populate('project', 'assignedTeam');

  if (!milestone) {
    return next(new ErrorResponse('Milestone not found', 404));
  }

  // Check if employee is assigned to the project
  const isAssignedToProject = milestone.project.assignedTeam.some(member => 
    member._id.toString() === employeeId
  );

  if (!isAssignedToProject) {
    return next(new ErrorResponse('You are not assigned to this project', 403));
  }

  // Add comment
  milestone.comments.push({
    user: employeeId,
    userType: 'employee',
    message: message.trim(),
    createdAt: new Date()
  });

  await milestone.save();

  // Populate the updated milestone
  const updatedMilestone = await Milestone.findById(milestone._id)
    .populate('project', 'name status')
    .populate('assignedTo', 'name email position department')
    .populate({
      path: 'comments.user',
      select: 'name email'
    });

  res.json({
    success: true,
    data: updatedMilestone
  });
});

module.exports = {
  getEmployeeMilestoneById,
  getEmployeeMilestoneTasks,
  addEmployeeMilestoneComment
};
