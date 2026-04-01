const Project = require('../models/Project');
const Milestone = require('../models/Milestone');
const Task = require('../models/Task');
const Payment = require('../models/Payment');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get client's projects
// @route   GET /api/client/projects
// @access  Client only
const getClientProjects = asyncHandler(async (req, res, next) => {
  const clientId = req.user.id;
  const { status, page = 1, limit = 20 } = req.query;
  
  // Build filter - client can only see their own projects
  const filter = { client: clientId };
  if (status) filter.status = status;

  // Calculate pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const projects = await Project.find(filter)
    .populate('projectManager', 'name email phone')
    .populate('assignedTeam', 'name email department position')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Project.countDocuments(filter);

  // Calculate progress for each project based on completed milestones
  const Milestone = require('../models/Milestone');
  const projectsWithProgress = await Promise.all(
    projects.map(async (project) => {
      const projectObj = project.toObject();
      
      // Calculate progress based on completed milestones vs total milestones
      const milestones = await Milestone.find({ project: project._id });
      const totalMilestones = milestones.length;
      const completedMilestones = milestones.filter(m => m.status === 'completed').length;
      
      // For completed projects, always set progress to 100%
      if (project.status === 'completed') {
        projectObj.progress = 100;
      } else {
        // Calculate progress as percentage of completed milestones
        projectObj.progress = totalMilestones > 0 
          ? Math.round((completedMilestones / totalMilestones) * 100) 
          : (project.progress || 0);
      }
      
      // Calculate task counts for the project
      const projectTasks = await Task.find({ project: project._id });
      const totalTasks = projectTasks.length;
      const completedTasks = projectTasks.filter(t => t.status === 'completed').length;
      // Tasks awaiting client feedback: pending or in-progress tasks (active tasks that may need client input)
      const awaitingClientFeedback = projectTasks.filter(t => 
        t.status === 'pending' || t.status === 'in-progress' || t.status === 'testing'
      ).length;
      
      projectObj.totalTasks = totalTasks;
      projectObj.completedTasks = completedTasks;
      projectObj.awaitingClientFeedback = awaitingClientFeedback;
      
      return projectObj;
    })
  );

  res.json({
    success: true,
    count: projectsWithProgress.length,
    total,
    data: projectsWithProgress,
    pagination: {
      current: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      total
    }
  });
});

// @desc    Get project details (Client view - only their projects)
// @route   GET /api/client/projects/:id
// @access  Client only
const getClientProjectById = asyncHandler(async (req, res, next) => {
  const clientId = req.user.id;
  
  const project = await Project.findOne({
    _id: req.params.id,
    client: clientId
  })
    .populate('projectManager', 'name email phone')
    .populate('assignedTeam', 'name email department position')
    .populate({
      path: 'milestones',
      populate: {
        path: 'tasks',
        select: 'title status priority dueDate progress' // Limited task info for clients
      }
    });

  if (!project) {
    return next(new ErrorResponse('Project not found or you do not have access to this project', 404));
  }

  // Recalculate financials so client gets accurate totalCost, remainingAmount, advanceReceived
  try {
    const { recalculateProjectFinancials } = require('../utils/projectFinancialHelper');
    await recalculateProjectFinancials(project);
    await project.save();
  } catch (err) {
    console.error('Error recalculating project financials in getClientProjectById:', err);
  }

  // Calculate progress based on completed milestones vs total milestones
  const Milestone = require('../models/Milestone');
  const milestones = await Milestone.find({ project: project._id });
  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter(m => m.status === 'completed').length;
  
  const projectObj = project.toObject();
  
  // For completed projects, always set progress to 100%
  if (project.status === 'completed') {
    projectObj.progress = 100;
  } else {
    // Calculate progress as percentage of completed milestones
    projectObj.progress = totalMilestones > 0 
      ? Math.round((completedMilestones / totalMilestones) * 100) 
      : (project.progress || 0);
  }

  res.json({
    success: true,
    data: projectObj
  });
});

// @desc    Get project milestones (Client view - only their projects)
// @route   GET /api/client/projects/:id/milestones
// @access  Client only
const getClientProjectMilestones = asyncHandler(async (req, res, next) => {
  const clientId = req.user.id;
  
  // First verify client owns the project
  const project = await Project.findOne({
    _id: req.params.id,
    client: clientId
  });

  if (!project) {
    return next(new ErrorResponse('Project not found or you do not have access to this project', 404));
  }

  const milestones = await Milestone.find({ project: req.params.id })
    .populate({
      path: 'tasks',
      select: 'title status priority dueDate progress', // Limited task info for clients
      populate: {
        path: 'assignedTo',
        select: 'name email department'
      }
    })
    .sort({ sequence: 1 });

  res.json({
    success: true,
    data: milestones
  });
});

// @desc    Get milestone by ID (Client view - only their projects)
// @route   GET /api/client/milestones/:id
// @access  Client only
const getClientMilestoneById = asyncHandler(async (req, res, next) => {
  const clientId = req.user.id;
  const Milestone = require('../models/Milestone');
  
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

  // Verify client owns the project
  if (!milestone.project.client.equals(clientId)) {
    return next(new ErrorResponse('Not authorized to access this milestone', 403));
  }

  res.json({
    success: true,
    data: milestone
  });
});

// @desc    Get project tasks (Client view - only their projects)
// @route   GET /api/client/projects/:id/tasks
// @access  Client only
const getClientProjectTasks = asyncHandler(async (req, res, next) => {
  const clientId = req.user.id;
  
  // First verify client owns the project
  const project = await Project.findOne({
    _id: req.params.id,
    client: clientId
  });

  if (!project) {
    return next(new ErrorResponse('Project not found or you do not have access to this project', 404));
  }

  const tasks = await Task.find({ project: req.params.id })
    .populate('assignedTo', 'name email department position')
    .populate('milestone', 'title sequence')
    .select('title description status priority dueDate progress assignedTo milestone createdAt updatedAt')
    .sort({ createdAt: -1 });

  res.json({
    success: true,
    data: tasks
  });
});

// @desc    Get project statistics (Client view - only their projects)
// @route   GET /api/client/projects/statistics
// @access  Client only
const getClientProjectStatistics = asyncHandler(async (req, res, next) => {
  const clientId = req.user.id;

  // Get client's projects
  const clientProjects = await Project.find({ client: clientId });
  const projectIds = clientProjects.map(p => p._id);

  // Get project statistics
  const projectStats = await Project.aggregate([
    { $match: { client: clientId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalBudget: { $sum: '$budget' },
        avgProgress: { $avg: '$progress' }
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

  // Get payment statistics
  const paymentStats = await Payment.aggregate([
    { $match: { client: clientId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);

  const result = {
    totalProjects: clientProjects.length,
    activeProjects: clientProjects.filter(p => p.status === 'active' || p.status === 'in-progress').length,
    completedProjects: clientProjects.filter(p => p.status === 'completed').length,
    totalBudget: clientProjects.reduce((sum, p) => sum + (p.budget || 0), 0),
    avgProgress: clientProjects.length > 0
      ? Math.round(
          Math.min(100, Math.max(0, clientProjects.reduce((sum, p) => sum + (Number(p.progress) || 0), 0) / clientProjects.length))
        )
      : 0,
    projectStatusBreakdown: projectStats,
    milestoneStatusBreakdown: milestoneStats,
    paymentStatusBreakdown: paymentStats,
    totalPaid: paymentStats.find(p => p._id === 'completed')?.totalAmount || 0,
    totalPending: paymentStats.find(p => p._id === 'pending')?.totalAmount || 0
  };

  res.json({
    success: true,
    data: result
  });
});

module.exports = {
  getClientProjects,
  getClientProjectById,
  getClientProjectMilestones,
  getClientMilestoneById,
  getClientProjectTasks,
  getClientProjectStatistics
};
