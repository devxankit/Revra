const Task = require('../models/Task');
const Project = require('../models/Project');
const Milestone = require('../models/Milestone');
const Employee = require('../models/Employee');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const socketService = require('../services/socketService');

// @desc    Get employee's assigned tasks
// @route   GET /api/employee/tasks
// @access  Employee only
const getEmployeeTasks = asyncHandler(async (req, res, next) => {
  const employeeId = req.employee?.id || req.user?.id;
  
  if (!employeeId) {
    return res.status(401).json({
      success: false,
      message: 'Employee ID not found'
    });
  }
  
  const { status, priority, isUrgent, project, milestone, page = 1, limit = 20 } = req.query;
  
  // Build filter - employee must be in assignedTo array
  const filter = { assignedTo: { $in: [employeeId] } };
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (isUrgent !== undefined) filter.isUrgent = isUrgent === 'true';
  if (project) filter.project = project;
  if (milestone) filter.milestone = milestone;

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

// @desc    Get task details (Employee view - assigned tasks OR tasks in projects they're on)
// @route   GET /api/employee/tasks/:id
// @access  Employee only
const getEmployeeTaskById = asyncHandler(async (req, res, next) => {
  const employeeId = req.employee?.id || req.user?.id;

  if (!employeeId) {
    return res.status(401).json({
      success: false,
      message: 'Employee ID not found'
    });
  }

  const task = await Task.findOne({ _id: req.params.id })
    .populate('project', 'name status description assignedTeam')
    .populate('milestone', 'title status description')
    .populate('assignedTo', 'name email department position')
    .populate('createdBy', 'name email');

  if (!task) {
    return next(new ErrorResponse('Task not found', 404));
  }

  const isAssignedToTask = task.assignedTo && task.assignedTo.some(
    a => (a && (a._id?.toString() === employeeId || a.toString() === employeeId))
  );
  const isOnProjectTeam = task.project && task.project.assignedTeam && task.project.assignedTeam.some(
    id => (id && (id.toString() === employeeId || (id._id && id._id.toString() === employeeId)))
  );

  if (!isAssignedToTask && !isOnProjectTeam) {
    return next(new ErrorResponse('Task not found or you do not have access to this task', 404));
  }

  res.json({
    success: true,
    data: task
  });
});

// @desc    Update task status (Employee can update their assigned tasks)
// @route   PATCH /api/employee/tasks/:id/status
// @access  Employee only
const updateEmployeeTaskStatus = asyncHandler(async (req, res, next) => {
  const employeeId = req.employee?.id || req.user?.id;
  
  if (!employeeId) {
    return res.status(401).json({
      success: false,
      message: 'Employee ID not found'
    });
  }
  
  const { status, actualHours, comments } = req.body;

  const task = await Task.findOne({
    _id: req.params.id,
    assignedTo: { $in: [employeeId] }
  });

  if (!task) {
    return next(new ErrorResponse('Task not found or you are not assigned to this task', 404));
  }

  const previousStatus = task.status;

  // Update task status
  task.status = status;
  if (actualHours) task.actualHours = actualHours;
  
  // Set completion date if task is completed
  if (status === 'completed' && !task.completedDate) {
    task.completedDate = new Date();
  }

  // Add comment if provided
  if (comments) {
    task.comments.push({
      user: employeeId,
      userType: 'employee',
      message: comments,
      createdAt: new Date()
    });
  }

  // Calculate points if task is being completed
  let pointsAwarded = 0;
  let pointsReason = '';
  
  if (status === 'completed' && previousStatus !== 'completed') {
    const pointsResult = task.calculatePoints();
    
    // When completing a task:
    // - If on time: +1 point
    // - If overdue: Points already deducted daily (-1 per day), so we need to account for that
    //   The calculatePoints method returns -daysOverdue, but daily deductions already happened
    //   So we only award/deduct based on whether it's on-time or overdue completion
    
    const isOnTime = task.completedDate <= task.dueDate;
    
    if (isOnTime) {
      // Completed on time: +1 point
      pointsAwarded = 1;
      pointsReason = 'task_completed_on_time';
      
      // Update employee points
      const employee = await Employee.findById(employeeId);
      if (employee) {
        await employee.addPoints(task._id, pointsAwarded, pointsReason);
        await employee.updateStatistics();
      }
    } else {
      // Completed overdue: Daily deductions already happened
      // Just update statistics, no additional point change on completion
      pointsAwarded = 0;
      pointsReason = `task_completed_overdue_${pointsResult.daysOverdue}_days`;
      
      // Update employee statistics
      const employee = await Employee.findById(employeeId);
      if (employee) {
        await employee.updateStatistics();
      }
    }
    
    // Store the points calculation result in task
    task.pointsAwarded = pointsResult.points;
  }

  await task.save();

  // Populate the updated task
  const updatedTask = await Task.findById(task._id)
    .populate('project', 'name status')
    .populate('milestone', 'title status')
    .populate('assignedTo', 'name email department')
    .populate('createdBy', 'name email');

  // Emit WebSocket events
  socketService.emitToTask(task._id, 'task_status_updated', {
    task: updatedTask,
    updatedBy: req.user.name,
    status: status,
    pointsAwarded: pointsAwarded
  });

  // Also emit to project room
  socketService.emitToProject(task.project, 'task_updated', {
    task: updatedTask,
    updatedBy: req.user.name
  });

  // Emit points update event if points were awarded/deducted
  if (pointsAwarded !== 0) {
    socketService.emitToEmployee(employeeId, 'employee_points_updated', {
      employeeId: employeeId,
      pointsAwarded: pointsAwarded,
      reason: pointsReason,
      taskId: task._id,
      taskTitle: task.title
    });

    // Emit leaderboard update to all employees
    socketService.emitToAll('leaderboard_updated', {
      employeeId: employeeId,
      pointsChange: pointsAwarded
    });
  }

  res.json({
    success: true,
    data: updatedTask,
    pointsAwarded: pointsAwarded,
    pointsReason: pointsReason
  });
});

// @desc    Add comment to task (Employee can comment on assigned tasks)
// @route   POST /api/employee/tasks/:id/comments
// @access  Employee only
const addEmployeeTaskComment = asyncHandler(async (req, res, next) => {
  const employeeId = req.employee?.id || req.user?.id;
  
  if (!employeeId) {
    return res.status(401).json({
      success: false,
      message: 'Employee ID not found'
    });
  }
  
  const { message } = req.body;

  const task = await Task.findOne({
    _id: req.params.id,
    assignedTo: { $in: [employeeId] }
  });

  if (!task) {
    return next(new ErrorResponse('Task not found or you are not assigned to this task', 404));
  }

  // Add comment
  task.comments.push({
    user: employeeId,
    userType: 'employee',
    message: message,
    createdAt: new Date()
  });

  await task.save();

  // Populate the updated task
  const updatedTask = await Task.findById(task._id)
    .populate('project', 'name status')
    .populate('milestone', 'title status')
    .populate('assignedTo', 'name email department')
    .populate('createdBy', 'name email');

  // Emit WebSocket event
  socketService.emitToTask(task._id, 'comment_added', {
    task: updatedTask,
    comment: {
      user: req.user.name,
      userType: 'employee',
      message: message,
      createdAt: new Date()
    }
  });

  res.json({
    success: true,
    data: updatedTask
  });
});

// @desc    Get urgent tasks (Employee view - only assigned urgent tasks)
// @route   GET /api/employee/tasks/urgent
// @access  Employee only
const getEmployeeUrgentTasks = asyncHandler(async (req, res, next) => {
  const employeeId = req.employee?.id || req.user?.id;
  
  if (!employeeId) {
    return res.status(401).json({
      success: false,
      message: 'Employee ID not found'
    });
  }
  
  const { page = 1, limit = 20 } = req.query;

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const urgentTasks = await Task.find({
    assignedTo: { $in: [employeeId] },
    isUrgent: true,
    status: { $nin: ['completed', 'cancelled'] }
  })
    .populate('project', 'name status')
    .populate('milestone', 'title status')
    .populate('assignedTo', 'name email department')
    .populate('createdBy', 'name email')
    .sort({ dueDate: 1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Task.countDocuments({
    assignedTo: { $in: [employeeId] },
    isUrgent: true,
    status: { $nin: ['completed', 'cancelled'] }
  });

  res.json({
    success: true,
    count: urgentTasks.length,
    total,
    data: urgentTasks,
    pagination: {
      current: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      total
    }
  });
});

// @desc    Get employee task statistics
// @route   GET /api/employee/tasks/statistics
// @access  Employee only
const getEmployeeTaskStatistics = asyncHandler(async (req, res, next) => {
  const employeeId = req.employee?.id || req.user?.id;
  
  if (!employeeId) {
    return res.status(401).json({
      success: false,
      message: 'Employee ID not found'
    });
  }

  // Get task statistics
  const taskStats = await Task.aggregate([
    { $match: { assignedTo: { $in: [employeeId] } } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalEstimatedHours: { $sum: '$estimatedHours' },
        totalActualHours: { $sum: '$actualHours' }
      }
    }
  ]);

  // Get urgent tasks count
  const urgentTasksCount = await Task.countDocuments({
    assignedTo: { $in: [employeeId] },
    isUrgent: true,
    status: { $nin: ['completed', 'cancelled'] }
  });

  // Get overdue tasks count
  const overdueTasksCount = await Task.countDocuments({
    assignedTo: { $in: [employeeId] },
    dueDate: { $lt: new Date() },
    status: { $nin: ['completed', 'cancelled'] }
  });

  const result = {
    totalTasks: taskStats.reduce((sum, stat) => sum + stat.count, 0),
    completedTasks: taskStats.find(t => t._id === 'completed')?.count || 0,
    inProgressTasks: taskStats.find(t => t._id === 'in-progress')?.count || 0,
    pendingTasks: taskStats.find(t => t._id === 'pending')?.count || 0,
    urgentTasks: urgentTasksCount,
    overdueTasks: overdueTasksCount,
    totalEstimatedHours: taskStats.reduce((sum, stat) => sum + (stat.totalEstimatedHours || 0), 0),
    totalActualHours: taskStats.reduce((sum, stat) => sum + (stat.totalActualHours || 0), 0),
    taskStatusBreakdown: taskStats
  };

  res.json({
    success: true,
    data: result
  });
});

// @desc    Upload attachment to task (Employee can upload files to assigned tasks)
// @route   POST /api/employee/tasks/:id/attachments
// @access  Employee only
const uploadEmployeeTaskAttachment = asyncHandler(async (req, res, next) => {
  const employeeId = req.employee?.id || req.user?.id;
  
  if (!employeeId) {
    return res.status(401).json({
      success: false,
      message: 'Employee ID not found'
    });
  }

  const task = await Task.findOne({
    _id: req.params.id,
    assignedTo: { $in: [employeeId] }
  });

  if (!task) {
    return next(new ErrorResponse('Task not found or you are not assigned to this task', 404));
  }

  if (!req.file) {
    return next(new ErrorResponse('No file uploaded', 400));
  }

  // Add attachment to task
  const attachmentData = {
    public_id: req.file.public_id,
    secure_url: req.file.secure_url,
    originalName: req.file.originalname,
    original_filename: req.file.originalname,
    format: req.file.format,
    size: req.file.size,
    bytes: req.file.bytes,
    width: req.file.width,
    height: req.file.height,
    resource_type: req.file.resource_type,
    uploadedAt: new Date()
  };

  task.attachments.push(attachmentData);
  await task.save();

  // Populate the updated task
  const updatedTask = await Task.findById(task._id)
    .populate('project', 'name status')
    .populate('milestone', 'title status')
    .populate('assignedTo', 'name email department')
    .populate('createdBy', 'name email');

  // Emit WebSocket event
  socketService.emitToTask(task._id, 'attachment_uploaded', {
    task: updatedTask,
    attachment: attachmentData,
    uploadedBy: req.user.name
  });

  res.json({
    success: true,
    data: updatedTask,
    attachment: attachmentData
  });
});

// @desc    Get task attachments (Employee can view attachments of assigned tasks)
// @route   GET /api/employee/tasks/:id/attachments
// @access  Employee only
const getEmployeeTaskAttachments = asyncHandler(async (req, res, next) => {
  const employeeId = req.employee?.id || req.user?.id;
  
  if (!employeeId) {
    return res.status(401).json({
      success: false,
      message: 'Employee ID not found'
    });
  }

  const task = await Task.findOne({
    _id: req.params.id,
    assignedTo: { $in: [employeeId] }
  }).select('attachments');

  if (!task) {
    return next(new ErrorResponse('Task not found or you are not assigned to this task', 404));
  }

  res.json({
    success: true,
    data: task.attachments
  });
});

// @desc    Delete task attachment (Employee can remove attachments from assigned tasks)
// @route   DELETE /api/employee/tasks/:id/attachments/:attachmentId
// @access  Employee only
const deleteEmployeeTaskAttachment = asyncHandler(async (req, res, next) => {
  const employeeId = req.employee?.id || req.user?.id;
  
  if (!employeeId) {
    return res.status(401).json({
      success: false,
      message: 'Employee ID not found'
    });
  }
  
  const { attachmentId } = req.params;

  const task = await Task.findOne({
    _id: req.params.id,
    assignedTo: { $in: [employeeId] }
  });

  if (!task) {
    return next(new ErrorResponse('Task not found or you are not assigned to this task', 404));
  }

  // Find the attachment
  const attachment = task.attachments.id(attachmentId);
  if (!attachment) {
    return next(new ErrorResponse('Attachment not found', 404));
  }

  // Remove attachment
  task.attachments.pull(attachmentId);
  await task.save();

  // Populate the updated task
  const updatedTask = await Task.findById(task._id)
    .populate('project', 'name status')
    .populate('milestone', 'title status')
    .populate('assignedTo', 'name email department')
    .populate('createdBy', 'name email');

  // Emit WebSocket event
  socketService.emitToTask(task._id, 'attachment_deleted', {
    task: updatedTask,
    attachmentId: attachmentId,
    deletedBy: req.user.name
  });

  res.json({
    success: true,
    data: updatedTask
  });
});

module.exports = {
  getEmployeeTasks,
  getEmployeeTaskById,
  updateEmployeeTaskStatus,
  addEmployeeTaskComment,
  getEmployeeUrgentTasks,
  getEmployeeTaskStatistics,
  uploadEmployeeTaskAttachment,
  getEmployeeTaskAttachments,
  deleteEmployeeTaskAttachment
};
