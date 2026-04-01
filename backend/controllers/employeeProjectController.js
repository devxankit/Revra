const Project = require('../models/Project');
const Milestone = require('../models/Milestone');
const Task = require('../models/Task');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get employee's assigned projects
// @route   GET /api/employee/projects
// @access  Employee only
const getEmployeeProjects = asyncHandler(async (req, res, next) => {
  const employeeId = req.employee?.id || req.user?.id;
  
  if (!employeeId) {
    return res.status(401).json({
      success: false,
      message: 'Employee ID not found'
    });
  }
  
  const { status, page = 1, limit = 20 } = req.query;
  
  // Find projects where employee is in assignedTeam (assignedTeam is an array)
  const teamProjects = await Project.find({ assignedTeam: { $in: [employeeId] } }).select('_id');
  const teamProjectIds = teamProjects.map(p => p._id);
  
  // Find projects where employee has tasks assigned (since every task belongs to a project)
  const tasksWithProjects = await Task.find({ assignedTo: { $in: [employeeId] } }).select('project').distinct('project');
  const taskProjectIds = tasksWithProjects.filter(Boolean); // Remove null/undefined
  
  // Combine and deduplicate project IDs
  const allProjectIds = [...new Set([...teamProjectIds.map(id => id.toString()), ...taskProjectIds.map(id => id.toString())])];
  
  // Build filter - include projects from both sources
  const filter = { _id: { $in: allProjectIds } };
  if (status) filter.status = status;

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const projects = await Project.find(filter)
    .populate('client', 'name email company')
    .populate('projectManager', 'name email')
    .populate('assignedTeam', 'name email department position')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Project.countDocuments(filter);
  
  // Calculate employee-specific task counts and progress for each project
  const projectsWithEmployeeData = await Promise.all(projects.map(async (project) => {
    // Get tasks assigned to this employee in this project
    const employeeTasks = await Task.find({
      project: project._id,
      assignedTo: { $in: [employeeId] }
    });
    
    const employeeCompletedTasks = employeeTasks.filter(t => t.status === 'completed').length;
    const employeeTasksCount = employeeTasks.length;
    const employeeProgress = employeeTasksCount > 0 
      ? Math.round((employeeCompletedTasks / employeeTasksCount) * 100) 
      : 0;
    
    // Calculate project progress based on completed milestones vs total milestones
    const milestones = await Milestone.find({ project: project._id });
    const totalMilestones = milestones.length;
    const completedMilestones = milestones.filter(m => m.status === 'completed').length;
    const projectProgress = totalMilestones > 0 
      ? Math.round((completedMilestones / totalMilestones) * 100) 
      : (project.progress || 0);
    
    return {
      ...project.toObject(),
      employeeTasks: employeeTasksCount,
      employeeCompletedTasks,
      employeeProgress,
      progress: projectProgress // Override with milestone-based progress
    };
  }));

  res.json({
    success: true,
    count: projectsWithEmployeeData.length,
    total,
    data: projectsWithEmployeeData,
    pagination: {
      current: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      total
    }
  });
});

// @desc    Get project details (Employee view - only assigned projects)
// @route   GET /api/employee/projects/:id
// @access  Employee only
const getEmployeeProjectById = asyncHandler(async (req, res, next) => {
  const employeeId = req.employee?.id || req.user?.id;
  
  if (!employeeId) {
    return res.status(401).json({
      success: false,
      message: 'Employee ID not found'
    });
  }
  
  // Check if employee is in assignedTeam OR has tasks in this project
  const project = await Project.findById(req.params.id);
  
  if (!project) {
    return next(new ErrorResponse('Project not found', 404));
  }
  
  // Check if employee is in assignedTeam
  const isInTeam = project.assignedTeam.some(id => id.toString() === employeeId.toString());
  
  // Check if employee has tasks in this project
  const hasTasks = await Task.findOne({
    project: project._id,
    assignedTo: { $in: [employeeId] }
  });
  
  if (!isInTeam && !hasTasks) {
    return next(new ErrorResponse('Project not found or you are not assigned to this project', 404));
  }
  
  // Populate project data
  await project.populate('client', 'name email company phoneNumber');
  await project.populate('projectManager', 'name email phone');
  await project.populate('assignedTeam', 'name email department position');
  await project.populate({
    path: 'milestones',
    populate: {
      path: 'tasks',
      populate: {
        path: 'assignedTo',
        select: 'name email department'
      }
    }
  });

  // Per milestone: progress from all tasks completed; plus employee-specific counts
  const milestonesWithEmployeeTasks = project.milestones.map(milestone => {
    const tasksList = milestone.tasks || [];
    const totalTasks = tasksList.length;
    const completedTasks = tasksList.filter(t => (t.status || '').toLowerCase() === 'completed').length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const employeeTasks = tasksList.filter(task =>
      (task.assignedTo || []).some(assignee => assignee && (assignee._id?.toString() === employeeId || assignee.toString() === employeeId))
    );
    const employeeCompletedTasks = employeeTasks.filter(t => (t.status || '').toLowerCase() === 'completed').length;
    const employeeProgress = employeeTasks.length > 0
      ? Math.round((employeeCompletedTasks / employeeTasks.length) * 100)
      : 0;

    return {
      ...milestone.toObject(),
      totalTasks,
      completedTasks,
      progress,
      employeeTasks: employeeTasks.length,
      employeeCompletedTasks,
      employeeProgress
    };
  });

  res.json({
    success: true,
    data: {
      ...project.toObject(),
      milestones: milestonesWithEmployeeTasks
    }
  });
});

// @desc    Get project milestones (Employee view - only assigned projects)
// @route   GET /api/employee/projects/:id/milestones
// @access  Employee only
const getEmployeeProjectMilestones = asyncHandler(async (req, res, next) => {
  const employeeId = req.employee?.id || req.user?.id;
  
  if (!employeeId) {
    return res.status(401).json({
      success: false,
      message: 'Employee ID not found'
    });
  }
  
  // First verify employee is assigned to project or has tasks in it
  const project = await Project.findById(req.params.id);
  
  if (!project) {
    return next(new ErrorResponse('Project not found', 404));
  }
  
  // Check if employee is in assignedTeam
  const isInTeam = project.assignedTeam.some(id => id.toString() === employeeId.toString());
  
  // Check if employee has tasks in this project
  const hasTasks = await Task.findOne({
    project: project._id,
    assignedTo: { $in: [employeeId] }
  });
  
  if (!isInTeam && !hasTasks) {
    return next(new ErrorResponse('Project not found or you are not assigned to this project', 404));
  }

  const milestones = await Milestone.find({ project: req.params.id })
    .populate({
      path: 'tasks',
      populate: {
        path: 'assignedTo',
        select: 'name email department'
      }
    })
    .populate('assignedTo', 'name email position department')
    .sort({ sequence: 1 });

  // Add employee task counts and progress to each milestone
  const milestonesWithEmployeeData = milestones.map(milestone => {
    const employeeTasks = milestone.tasks.filter(task => 
      task.assignedTo.some(assignee => assignee._id.toString() === employeeId)
    );
    const employeeCompletedTasks = employeeTasks.filter(task => task.status === 'completed').length;
    
    return {
      ...milestone.toObject(),
      employeeTasks: employeeTasks.length,
      employeeCompletedTasks,
      employeeProgress: employeeTasks.length > 0 
        ? Math.round((employeeCompletedTasks / employeeTasks.length) * 100) 
        : 0
    };
  });

  res.json({
    success: true,
    data: milestonesWithEmployeeData
  });
});

// @desc    Get project statistics (Employee view - only assigned projects)
// @route   GET /api/employee/projects/statistics
// @access  Employee only
const getEmployeeProjectStatistics = asyncHandler(async (req, res, next) => {
  const employeeId = req.employee?.id || req.user?.id;
  
  if (!employeeId) {
    return res.status(401).json({
      success: false,
      message: 'Employee ID not found'
    });
  }

  // Get projects where employee is in assignedTeam
  const teamProjects = await Project.find({ assignedTeam: { $in: [employeeId] } }).select('_id');
  const teamProjectIds = teamProjects.map(p => p._id);
  
  // Get projects where employee has tasks assigned
  const tasksWithProjects = await Task.find({ assignedTo: { $in: [employeeId] } }).select('project').distinct('project');
  const taskProjectIds = tasksWithProjects.filter(Boolean);
  
  // Combine and deduplicate project IDs
  const allProjectIds = [...new Set([...teamProjectIds.map(id => id.toString()), ...taskProjectIds.map(id => id.toString())])];
  
  // Get all assigned projects (from team or tasks)
  const assignedProjects = await Project.find({ _id: { $in: allProjectIds } });
  const projectIds = assignedProjects.map(p => p._id);

  // Get task statistics for assigned projects
  const taskStats = await Task.aggregate([
    { $match: { project: { $in: projectIds }, assignedTo: { $in: [employeeId] } } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalEstimatedHours: { $sum: '$estimatedHours' },
        totalActualHours: { $sum: '$actualHours' }
      }
    }
  ]);

  // Get milestone statistics
  const milestoneStats = await Milestone.aggregate([
    { $match: { project: { $in: projectIds } } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const result = {
    assignedProjects: assignedProjects.length,
    activeProjects: assignedProjects.filter(p => p.status === 'active').length,
    completedProjects: assignedProjects.filter(p => p.status === 'completed').length,
    taskStats,
    milestoneStats,
    totalEstimatedHours: taskStats.reduce((sum, stat) => sum + (stat.totalEstimatedHours || 0), 0),
    totalActualHours: taskStats.reduce((sum, stat) => sum + (stat.totalActualHours || 0), 0)
  };

  res.json({
    success: true,
    data: result
  });
});

module.exports = {
  getEmployeeProjects,
  getEmployeeProjectById,
  getEmployeeProjectMilestones,
  getEmployeeProjectStatistics
};
