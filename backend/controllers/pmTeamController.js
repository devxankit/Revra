const Employee = require('../models/Employee');
const Client = require('../models/Client');
const PM = require('../models/PM');
const Project = require('../models/Project');
const Task = require('../models/Task');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all employees for PM team management
// @route   GET /api/pm/team/employees
// @access  PM only
const getPMEmployees = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 50, department, position, isActive } = req.query;

  // Build filter object
  const filter = {};
  if (department) filter.department = department;
  if (position) filter.position = position;
  if (isActive !== undefined) filter.isActive = isActive === 'true';

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Get employees with pagination
  const employees = await Employee.find(filter)
    .select('-password -otp -otpExpires')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  // Get total count for pagination
  const total = await Employee.countDocuments(filter);

  res.json({
    success: true,
    data: employees,
    pagination: {
      current: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      total: total
    }
  });
});

// @desc    Get all clients for PM team management
// @route   GET /api/pm/team/clients
// @access  PM only
const getPMClients = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 50, isActive } = req.query;

  // Build filter object
  const filter = {};
  if (isActive !== undefined) filter.isActive = isActive === 'true';

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Get clients with pagination
  const clients = await Client.find(filter)
    .populate({
      path: 'originLead',
      select: 'category',
      populate: {
        path: 'category',
        select: 'name color icon'
      }
    })
    .select('-otp -otpExpires')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  // Get total count for pagination
  const total = await Client.countDocuments(filter);

  res.json({
    success: true,
    data: clients,
    pagination: {
      current: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      total: total
    }
  });
});

// @desc    Get all PMs for team management
// @route   GET /api/pm/team/members
// @access  PM only
const getPMTeamMembers = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 50, isActive } = req.query;

  // Build filter object
  const filter = {};
  if (isActive !== undefined) filter.isActive = isActive === 'true';

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  // Get PMs with pagination
  const pms = await PM.find(filter)
    .select('-password')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  // Get total count for pagination
  const total = await PM.countDocuments(filter);

  res.json({
    success: true,
    data: pms,
    pagination: {
      current: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      total: total
    }
  });
});

// @desc    Get team statistics for PM dashboard
// @route   GET /api/pm/team/statistics
// @access  PM only
const getPMTeamStatistics = asyncHandler(async (req, res, next) => {
  const pmId = req.user.id;

  // Get counts for different user types
  const [employees, clients, pms] = await Promise.all([
    Employee.countDocuments({ isActive: true }),
    Client.countDocuments({ isActive: true }),
    PM.countDocuments({ isActive: true })
  ]);

  // Get PM's project statistics
  const projectStats = await Project.aggregate([
    { $match: { projectManager: pmId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  // Get team members assigned to PM's projects
  const assignedTeamMembers = await Project.aggregate([
    { $match: { projectManager: pmId } },
    { $unwind: '$assignedTeam' },
    {
      $group: {
        _id: '$assignedTeam',
        projectCount: { $sum: 1 }
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
        _id: 1,
        name: '$employee.name',
        email: '$employee.email',
        department: '$employee.department',
        position: '$employee.position',
        projectCount: 1
      }
    }
  ]);

  // Get client statistics for PM's projects
  const clientStats = await Project.aggregate([
    { $match: { projectManager: pmId } },
    {
      $group: {
        _id: '$client',
        projectCount: { $sum: 1 }
      }
    },
    {
      $lookup: {
        from: 'clients',
        localField: '_id',
        foreignField: '_id',
        as: 'client'
      }
    },
    { $unwind: '$client' },
    {
      $project: {
        _id: 1,
        name: '$client.name',
        email: '$client.email',
        company: '$client.company',
        projectCount: 1
      }
    }
  ]);

  const result = {
    totalEmployees: employees,
    totalClients: clients,
    totalPMs: pms,
    projectStats: projectStats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, {}),
    assignedTeamMembers,
    clientStats,
    summary: {
      totalTeamMembers: employees + pms,
      totalUsers: employees + clients + pms,
      activeProjects: projectStats.find(stat => stat._id === 'active')?.count || 0,
      completedProjects: projectStats.find(stat => stat._id === 'completed')?.count || 0
    }
  };

  res.json({
    success: true,
    data: result
  });
});

// Helper function to calculate trend
const calculateTrend = (pointsHistory, period) => {
  if (!pointsHistory || pointsHistory.length === 0) return 'stable';

  const now = new Date();
  const periodStart = new Date(now);

  switch (period) {
    case 'week':
      periodStart.setDate(periodStart.getDate() - 7);
      break;
    case 'month':
      periodStart.setMonth(periodStart.getMonth() - 1);
      break;
    case 'quarter':
      periodStart.setMonth(periodStart.getMonth() - 3);
      break;
    default:
      periodStart.setMonth(periodStart.getMonth() - 1);
  }

  const recentPoints = pointsHistory
    .filter(h => new Date(h.date) >= periodStart)
    .map(h => h.points);

  if (recentPoints.length < 2) return 'stable';

  const first = recentPoints[0];
  const last = recentPoints[recentPoints.length - 1];

  if (last > first) return 'up';
  if (last < first) return 'down';
  return 'stable';
};

// Helper function to calculate trend value
const calculateTrendValue = (pointsHistory, period) => {
  if (!pointsHistory || pointsHistory.length === 0) return '0%';

  const now = new Date();
  const periodStart = new Date(now);

  switch (period) {
    case 'week':
      periodStart.setDate(periodStart.getDate() - 7);
      break;
    case 'month':
      periodStart.setMonth(periodStart.getMonth() - 1);
      break;
    case 'quarter':
      periodStart.setMonth(periodStart.getMonth() - 3);
      break;
    default:
      periodStart.setMonth(periodStart.getMonth() - 1);
  }

  const recentPoints = pointsHistory
    .filter(h => new Date(h.date) >= periodStart)
    .map(h => h.points);

  if (recentPoints.length < 2) return '0%';

  const first = recentPoints[0];
  const last = recentPoints[recentPoints.length - 1];

  if (first === 0) return last > 0 ? '+100%' : '0%';
  const change = ((last - first) / first) * 100;
  return change > 0 ? `+${change.toFixed(0)}%` : `${change.toFixed(0)}%`;
};

// @desc    Get PM team leaderboard
// @route   GET /api/pm/team/leaderboard
// @access  PM only
const getPMTeamLeaderboard = asyncHandler(async (req, res, next) => {
  const pmId = req.user.id;
  const { period = 'month' } = req.query;

  // Get all projects managed by this PM
  const pmProjects = await Project.find({ projectManager: pmId }).select('_id');
  const projectIds = pmProjects.map(p => p._id);

  // Get all employees assigned to PM's projects
  const assignedEmployees = await Project.find({ projectManager: pmId })
    .select('assignedTeam')
    .distinct('assignedTeam');

  // Get employee data with statistics (only dev team employees)
  const employees = await Employee.find({
    _id: { $in: assignedEmployees },
    isActive: true,
    role: 'employee',
    team: 'developer' // Only show dev team employees in PM leaderboard
  })
    .select('name email points statistics department position pointsHistory team')
    .sort({ points: -1 });

  // Get task statistics for each employee in PM's projects
  const teamLeaderboard = await Promise.all(
    employees.map(async (emp) => {
      // Get tasks assigned to this employee in PM's projects
      const employeeTasks = await Task.find({
        project: { $in: projectIds },
        assignedTo: emp._id
      });

      const completedTasks = employeeTasks.filter(t => t.status === 'completed').length;
      const onTimeTasks = employeeTasks.filter(t =>
        t.status === 'completed' &&
        t.completedDate &&
        (!t.dueDate || new Date(t.completedDate) <= new Date(t.dueDate))
      ).length;
      const overdueTasks = employeeTasks.filter(t =>
        t.status !== 'completed' &&
        t.dueDate &&
        new Date(t.dueDate) < new Date()
      ).length;
      const missedTasks = employeeTasks.filter(t =>
        t.status === 'cancelled' ||
        (t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'completed')
      ).length;

      const totalTasks = employeeTasks.length;
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Get projects count for this employee
      const employeeProjects = await Project.find({
        projectManager: pmId,
        assignedTeam: emp._id,
        status: { $nin: ['completed', 'cancelled'] }
      }).countDocuments();

      const stats = emp.statistics || {};

      return {
        _id: emp._id,
        name: emp.name,
        email: emp.email,
        avatar: emp.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
        score: emp.points || 0,
        completed: completedTasks || stats.tasksCompleted || 0,
        overdue: overdueTasks || stats.tasksOverdue || 0,
        missed: missedTasks || stats.tasksMissed || 0,
        onTime: onTimeTasks || stats.tasksOnTime || 0,
        rate: completionRate || Math.round(stats.completionRate || 0),
        trend: calculateTrend(emp.pointsHistory, period),
        trendValue: calculateTrendValue(emp.pointsHistory, period),
        department: emp.department || 'Development',
        avgTime: stats.averageCompletionTime
          ? `${stats.averageCompletionTime.toFixed(1)} days`
          : '2.0 days',
        lastActive: emp.updatedAt,
        projects: employeeProjects,
        role: emp.position || 'Developer'
      };
    })
  );

  // Sort by score and assign ranks
  const sortedLeaderboard = teamLeaderboard
    .sort((a, b) => b.score - a.score)
    .map((member, index) => ({
      ...member,
      rank: index + 1
    }));

  // Calculate team statistics
  const teamStats = {
    totalEmployees: sortedLeaderboard.length,
    avgCompletionRate: sortedLeaderboard.length > 0
      ? Math.round(sortedLeaderboard.reduce((sum, emp) => sum + emp.rate, 0) / sortedLeaderboard.length)
      : 0,
    totalTasksCompleted: sortedLeaderboard.reduce((sum, emp) => sum + emp.completed, 0),
    totalOverdue: sortedLeaderboard.reduce((sum, emp) => sum + emp.overdue, 0),
    topPerformer: sortedLeaderboard.length > 0 ? sortedLeaderboard[0].name : null,
    totalProjects: sortedLeaderboard.reduce((sum, emp) => sum + emp.projects, 0),
    avgProjectProgress: 0 // This would need project progress data
  };

  res.json({
    success: true,
    data: {
      leaderboard: sortedLeaderboard,
      teamStats
    }
  });
});

module.exports = {
  getPMEmployees,
  getPMClients,
  getPMTeamMembers,
  getPMTeamStatistics,
  getPMTeamLeaderboard
};
