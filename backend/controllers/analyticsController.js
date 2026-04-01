const mongoose = require('mongoose');
const Project = require('../models/Project');
const Milestone = require('../models/Milestone');
const Task = require('../models/Task');
const Payment = require('../models/Payment');
const Employee = require('../models/Employee');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get PM dashboard statistics
// @route   GET /api/analytics/pm/dashboard
// @access  PM only
const getPMDashboardStats = asyncHandler(async (req, res, next) => {
  const pmId = req.user.id;

  // Get project statistics
  const projectStats = await Project.aggregate([
    { $match: { projectManager: new mongoose.Types.ObjectId(pmId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  // Get task statistics
  const taskStats = await Task.aggregate([
    {
      $lookup: {
        from: 'projects',
        localField: 'project',
        foreignField: '_id',
        as: 'project'
      }
    },
    { $unwind: '$project' },
    { $match: { 'project.projectManager': new mongoose.Types.ObjectId(pmId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  // Get urgent tasks count
  const urgentTasksCount = await Task.aggregate([
    {
      $lookup: {
        from: 'projects',
        localField: 'project',
        foreignField: '_id',
        as: 'project'
      }
    },
    { $unwind: '$project' },
    { $match: { 'project.projectManager': new mongoose.Types.ObjectId(pmId), isUrgent: true } },
    { $count: 'urgentTasks' }
  ]);

  // Get overdue projects count
  const overdueProjectsCount = await Project.countDocuments({
    projectManager: new mongoose.Types.ObjectId(pmId),
    dueDate: { $lt: new Date() },
    status: { $nin: ['completed', 'cancelled'] }
  });

  // Get overdue tasks count
  const overdueTasksCount = await Task.aggregate([
    {
      $lookup: {
        from: 'projects',
        localField: 'project',
        foreignField: '_id',
        as: 'project'
      }
    },
    { $unwind: '$project' },
    {
      $match: {
        'project.projectManager': new mongoose.Types.ObjectId(pmId),
        dueDate: { $lt: new Date() },
        status: { $nin: ['completed', 'cancelled'] }
      }
    },
    { $count: 'overdueTasks' }
  ]);

  // Get recent projects
  const recentProjects = await Project.find({ projectManager: new mongoose.Types.ObjectId(pmId) })
    .populate('client', 'name companyName')
    .populate('assignedTeam', 'name email position')
    .sort({ createdAt: -1 })
    .limit(5);

  // Get team performance (employees with most completed tasks)
  const teamPerformance = await Task.aggregate([
    {
      $lookup: {
        from: 'projects',
        localField: 'project',
        foreignField: '_id',
        as: 'project'
      }
    },
    { $unwind: '$project' },
    { $match: { 'project.projectManager': new mongoose.Types.ObjectId(pmId), status: 'completed' } },
    { $unwind: '$assignedTo' },
    {
      $group: {
        _id: '$assignedTo',
        completedTasks: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: 'employees',
        localField: '_id',
        foreignField: '_id',
        as: 'employee'
      }
    },
    { $unwind: '$employee' },
    {
      $project: {
        employeeName: '$employee.name',
        employeeEmail: '$employee.email',
        completedTasks: 1
      }
    },
    { $sort: { completedTasks: -1 } },
    { $limit: 5 }
  ]);

  // Format results
  const result = {
    projects: {
      total: 0,
      planning: 0,
      active: 0,
      'on-hold': 0,
      testing: 0,
      completed: 0,
      cancelled: 0,
      overdue: overdueProjectsCount
    },
    tasks: {
      total: 0,
      pending: 0,
      'in-progress': 0,
      testing: 0,
      completed: 0,
      cancelled: 0,
      urgent: urgentTasksCount[0]?.urgentTasks || 0,
      overdue: overdueTasksCount[0]?.overdueTasks || 0
    },
    recentProjects,
    teamPerformance
  };

  // Populate project statistics
  projectStats.forEach(stat => {
    result.projects[stat._id] = stat.count;
    result.projects.total += stat.count;
  });

  // Populate task statistics
  taskStats.forEach(stat => {
    result.tasks[stat._id] = stat.count;
    result.tasks.total += stat.count;
  });

  res.json({
    success: true,
    data: result
  });
});

// @desc    Get project analytics
// @route   GET /api/analytics/project/:projectId
// @access  PM, Employee (if assigned), Client (if their project)
const getProjectAnalytics = asyncHandler(async (req, res, next) => {
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

  // Get milestone statistics
  const milestoneStats = await Milestone.aggregate([
    { $match: { project: projectId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgProgress: { $avg: '$progress' }
      }
    }
  ]);

  // Get task statistics
  const taskStats = await Task.aggregate([
    { $match: { project: projectId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  // Get team performance for this project
  const teamPerformance = await Task.aggregate([
    { $match: { project: projectId } },
    { $unwind: '$assignedTo' },
    {
      $group: {
        _id: '$assignedTo',
        totalTasks: { $sum: 1 },
        completedTasks: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        inProgressTasks: {
          $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] }
        }
      }
    },
    {
      $lookup: {
        from: 'employees',
        localField: '_id',
        foreignField: '_id',
        as: 'employee'
      }
    },
    { $unwind: '$employee' },
    {
      $project: {
        employeeName: '$employee.name',
        employeeEmail: '$employee.email',
        totalTasks: 1,
        completedTasks: 1,
        inProgressTasks: 1,
        completionRate: {
          $multiply: [
            { $divide: ['$completedTasks', '$totalTasks'] },
            100
          ]
        }
      }
    },
    { $sort: { completionRate: -1 } }
  ]);

  // Get payment statistics
  const paymentStats = await Payment.getProjectPaymentStats(projectId);

  // Get project timeline (milestones with due dates)
  const projectTimeline = await Milestone.find({ project: projectId })
    .select('title sequence dueDate status progress')
    .sort({ sequence: 1 });

  // Format results
  const result = {
    project: {
      name: project.name,
      status: project.status,
      progress: project.progress,
      dueDate: project.dueDate,
      isOverdue: project.isOverdue
    },
    milestones: {
      total: 0,
      pending: 0,
      'in-progress': 0,
      testing: 0,
      completed: 0,
      cancelled: 0,
      avgProgress: 0
    },
    tasks: {
      total: 0,
      pending: 0,
      'in-progress': 0,
      testing: 0,
      completed: 0,
      cancelled: 0
    },
    teamPerformance,
    paymentStats,
    projectTimeline
  };

  // Populate milestone statistics
  let totalMilestoneProgress = 0;
  milestoneStats.forEach(stat => {
    result.milestones[stat._id] = stat.count;
    result.milestones.total += stat.count;
    totalMilestoneProgress += stat.avgProgress * stat.count;
  });
  result.milestones.avgProgress = result.milestones.total > 0 
    ? Math.round(totalMilestoneProgress / result.milestones.total) 
    : 0;

  // Populate task statistics
  taskStats.forEach(stat => {
    result.tasks[stat._id] = stat.count;
    result.tasks.total += stat.count;
  });

  res.json({
    success: true,
    data: result
  });
});

// @desc    Get employee performance
// @route   GET /api/analytics/employee/:employeeId
// @access  Employee (own data only), PM, Admin
const getEmployeePerformance = asyncHandler(async (req, res, next) => {
  const { employeeId } = req.params;

  // Check access permissions
  if (req.user.role === 'employee' && req.user.id !== employeeId) {
    return next(new ErrorResponse('Not authorized to access this employee data', 403));
  }

  // Get employee info
  const employee = await Employee.findById(employeeId).select('name email position department');
  if (!employee) {
    return next(new ErrorResponse('Employee not found', 404));
  }

  // Get task statistics
  const taskStats = await Task.aggregate([
    { $match: { assignedTo: employeeId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgHours: { $avg: '$actualHours' }
      }
    }
  ]);

  // Get project statistics
  const projectStats = await Project.aggregate([
    { $match: { assignedTeam: employeeId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  // Get performance over time (last 6 months)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const performanceOverTime = await Task.aggregate([
    {
      $match: {
        assignedTo: employeeId,
        completedDate: { $gte: sixMonthsAgo }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$completedDate' },
          month: { $month: '$completedDate' }
        },
        completedTasks: { $sum: 1 },
        avgCompletionTime: {
          $avg: {
            $divide: [
              { $subtract: ['$completedDate', '$startDate'] },
              1000 * 60 * 60 * 24 // Convert to days
            ]
          }
        }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  // Get recent tasks
  const recentTasks = await Task.find({ assignedTo: employeeId })
    .populate('project', 'name status')
    .populate('milestone', 'title sequence')
    .sort({ createdAt: -1 })
    .limit(10);

  // Calculate completion rate
  const totalTasks = taskStats.reduce((sum, stat) => sum + stat.count, 0);
  const completedTasks = taskStats.find(stat => stat._id === 'completed')?.count || 0;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Format results
  const result = {
    employee: {
      name: employee.name,
      email: employee.email,
      position: employee.position,
      department: employee.department
    },
    tasks: {
      total: totalTasks,
      pending: 0,
      'in-progress': 0,
      testing: 0,
      completed: completedTasks,
      cancelled: 0,
      completionRate
    },
    projects: {
      total: 0,
      planning: 0,
      active: 0,
      'on-hold': 0,
      testing: 0,
      completed: 0,
      cancelled: 0
    },
    performanceOverTime,
    recentTasks
  };

  // Populate task statistics
  taskStats.forEach(stat => {
    result.tasks[stat._id] = stat.count;
  });

  // Populate project statistics
  projectStats.forEach(stat => {
    result.projects[stat._id] = stat.count;
    result.projects.total += stat.count;
  });

  res.json({
    success: true,
    data: result
  });
});

// @desc    Get client project statistics
// @route   GET /api/analytics/client/:clientId
// @access  Client (own data only), PM, Admin
const getClientProjectStats = asyncHandler(async (req, res, next) => {
  const { clientId } = req.params;

  // Check access permissions
  if (req.user.role === 'client' && req.user.id !== clientId) {
    return next(new ErrorResponse('Not authorized to access this client data', 403));
  }

  // Get client projects
  const projects = await Project.find({ client: clientId })
    .populate('projectManager', 'name email')
    .populate('assignedTeam', 'name email position')
    .sort({ createdAt: -1 });

  // Get project statistics
  const projectStats = await Project.aggregate([
    { $match: { client: clientId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgProgress: { $avg: '$progress' }
      }
    }
  ]);

  // Get payment statistics
  const paymentStats = await Payment.getClientPaymentStats(clientId);

  // Get recent activities
  const recentActivities = await Task.aggregate([
    {
      $lookup: {
        from: 'projects',
        localField: 'project',
        foreignField: '_id',
        as: 'project'
      }
    },
    { $unwind: '$project' },
    { $match: { 'project.client': clientId } },
    {
      $project: {
        title: 1,
        status: 1,
        updatedAt: 1,
        projectName: '$project.name'
      }
    },
    { $sort: { updatedAt: -1 } },
    { $limit: 10 }
  ]);

  // Format results
  const result = {
    projects: {
      total: projects.length,
      planning: 0,
      active: 0,
      'on-hold': 0,
      testing: 0,
      completed: 0,
      cancelled: 0,
      avgProgress: 0
    },
    paymentStats,
    recentActivities,
    projectList: projects
  };

  // Populate project statistics
  let totalProgress = 0;
  projectStats.forEach(stat => {
    result.projects[stat._id] = stat.count;
    totalProgress += stat.avgProgress * stat.count;
  });
  result.projects.avgProgress = result.projects.total > 0 
    ? Math.round(totalProgress / result.projects.total) 
    : 0;

  res.json({
    success: true,
    data: result
  });
});

// @desc    Get project growth analytics (monthly creation data)
// @route   GET /api/analytics/pm/project-growth
// @access  PM only
const getProjectGrowthAnalytics = asyncHandler(async (req, res, next) => {
  const pmId = req.user.id;
  const currentYear = new Date().getFullYear();

  // Get projects created in current year, grouped by month
  const projectGrowth = await Project.aggregate([
    {
      $match: {
        projectManager: new mongoose.Types.ObjectId(pmId),
        createdAt: {
          $gte: new Date(`${currentYear}-01-01`),
          $lte: new Date(`${currentYear}-12-31T23:59:59`)
        }
      }
    },
    {
      $group: {
        _id: { $month: '$createdAt' },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);

  // Create array for all 12 months with 0 as default
  const monthlyData = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    count: 0
  }));

  // Fill in actual data
  projectGrowth.forEach(item => {
    monthlyData[item._id - 1].count = item.count;
  });

  res.status(200).json({
    success: true,
    data: {
      year: currentYear,
      monthlyData,
      totalProjects: monthlyData.reduce((sum, m) => sum + m.count, 0)
    }
  });
});

// @desc    Get productivity metrics
// @route   GET /api/analytics/productivity
// @access  PM, Admin
const getProductivityMetrics = asyncHandler(async (req, res, next) => {
  const { startDate, endDate, employeeId, projectId } = req.query;
  
  // Build match criteria
  const matchCriteria = {};
  if (startDate || endDate) {
    matchCriteria.createdAt = {};
    if (startDate) matchCriteria.createdAt.$gte = new Date(startDate);
    if (endDate) matchCriteria.createdAt.$lte = new Date(endDate);
  }
  if (employeeId) matchCriteria.assignedTo = employeeId;
  if (projectId) matchCriteria.project = projectId;

  // Get task completion statistics
  const taskStats = await Task.aggregate([
    { $match: matchCriteria },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalHours: { $sum: '$estimatedHours' },
        actualHours: { $sum: '$actualHours' }
      }
    }
  ]);

  // Get milestone completion statistics
  const milestoneStats = await Milestone.aggregate([
    { $match: matchCriteria },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgProgress: { $avg: '$progress' }
      }
    }
  ]);

  // Get project completion statistics
  const projectStats = await Project.aggregate([
    { $match: matchCriteria },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgProgress: { $avg: '$progress' }
      }
    }
  ]);

  // Calculate productivity metrics
  const totalTasks = taskStats.reduce((sum, stat) => sum + stat.count, 0);
  const completedTasks = taskStats.find(stat => stat._id === 'completed')?.count || 0;
  const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  const totalEstimatedHours = taskStats.reduce((sum, stat) => sum + (stat.totalHours || 0), 0);
  const totalActualHours = taskStats.reduce((sum, stat) => sum + (stat.actualHours || 0), 0);
  const efficiency = totalEstimatedHours > 0 ? (totalEstimatedHours / totalActualHours) * 100 : 0;

  const result = {
    taskStats,
    milestoneStats,
    projectStats,
    metrics: {
      totalTasks,
      completedTasks,
      completionRate: Math.round(completionRate * 100) / 100,
      totalEstimatedHours,
      totalActualHours,
      efficiency: Math.round(efficiency * 100) / 100,
      avgTaskCompletionTime: 0, // Can be calculated based on actual data
      productivityScore: Math.round((completionRate + efficiency) / 2 * 100) / 100
    }
  };

  res.json({
    success: true,
    data: result
  });
});

module.exports = {
  getPMDashboardStats,
  getProjectAnalytics,
  getEmployeePerformance,
  getClientProjectStats,
  getProductivityMetrics,
  getProjectGrowthAnalytics
};
