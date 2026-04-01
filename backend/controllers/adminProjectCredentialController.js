const ProjectCredential = require('../models/ProjectCredential');
const Project = require('../models/Project');
const asyncHandler = require('../middlewares/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all project credentials
// @route   GET /api/admin/project-credentials
// @access  Admin/PEM only
const getAllCredentials = asyncHandler(async (req, res, next) => {
  const { projectId, credentialType, isActive, search } = req.query;
  
  const filter = {};
  if (projectId) {
    filter.project = projectId;
  }
  if (credentialType) {
    filter.credentialType = credentialType;
  }
  if (isActive !== undefined) {
    filter.isActive = isActive === 'true';
  }
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { username: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { url: { $regex: search, $options: 'i' } }
    ];
  }

  const credentials = await ProjectCredential.find(filter)
    .populate({
      path: 'project',
      select: 'name client',
      populate: {
        path: 'client',
        select: 'companyName name'
      }
    })
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: credentials.length,
    data: credentials
  });
});

// @desc    Get credentials by project ID
// @route   GET /api/admin/project-credentials/project/:projectId
// @access  Admin/PEM only
const getCredentialsByProject = asyncHandler(async (req, res, next) => {
  const { projectId } = req.params;
  
  const credentials = await ProjectCredential.find({ project: projectId })
    .populate('project', 'name client')
    .populate('project.client', 'companyName name')
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: credentials.length,
    data: credentials
  });
});

// @desc    Get single project credential
// @route   GET /api/admin/project-credentials/:id
// @access  Admin/PEM only
const getCredentialById = asyncHandler(async (req, res, next) => {
  const credential = await ProjectCredential.findById(req.params.id)
    .populate({
      path: 'project',
      select: 'name client',
      populate: {
        path: 'client',
        select: 'companyName name'
      }
    })
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email');

  if (!credential) {
    return next(new ErrorResponse('Credential not found', 404));
  }

  res.status(200).json({
    success: true,
    data: credential
  });
});

// @desc    Create project credential
// @route   POST /api/admin/project-credentials
// @access  Admin only
const createCredential = asyncHandler(async (req, res, next) => {
  if (!req.admin || !req.admin._id) {
    return next(new ErrorResponse('Admin authentication required', 401));
  }

  const {
    projectId,
    credentialType,
    title,
    username,
    email,
    password,
    url,
    ipAddress,
    port,
    additionalInfo,
    notes,
    expiryDate,
    isActive
  } = req.body;

  if (!projectId || !credentialType || !password) {
    return next(new ErrorResponse('Project ID, credential type, and password are required', 400));
  }

  // Verify project exists
  const project = await Project.findById(projectId);
  if (!project) {
    return next(new ErrorResponse('Project not found', 404));
  }

  const credential = await ProjectCredential.create({
    project: projectId,
    credentialType,
    title: title ? title.trim() : 'Credential', // Auto-generate if not provided
    username: username ? username.trim() : '',
    email: email ? email.trim().toLowerCase() : '',
    password: password.trim(),
    url: url ? url.trim() : '',
    ipAddress: ipAddress ? ipAddress.trim() : '',
    port: port || undefined,
    additionalInfo: additionalInfo ? additionalInfo.trim() : '',
    notes: notes ? notes.trim() : '',
    expiryDate: expiryDate ? new Date(expiryDate) : undefined,
    isActive: isActive !== undefined ? isActive : true,
    createdBy: req.admin._id
  });

  await credential.populate({
    path: 'project',
    select: 'name client',
    populate: {
      path: 'client',
      select: 'companyName name'
    }
  });
  await credential.populate('createdBy', 'name email');

  res.status(201).json({
    success: true,
    message: 'Credential created successfully',
    data: credential
  });
});

// @desc    Update project credential
// @route   PUT /api/admin/project-credentials/:id
// @access  Admin only
const updateCredential = asyncHandler(async (req, res, next) => {
  if (!req.admin || !req.admin._id) {
    return next(new ErrorResponse('Admin authentication required', 401));
  }

  const {
    credentialType,
    title,
    username,
    email,
    password,
    url,
    ipAddress,
    port,
    additionalInfo,
    notes,
    expiryDate,
    isActive
  } = req.body;

  let credential = await ProjectCredential.findById(req.params.id);

  if (!credential) {
    return next(new ErrorResponse('Credential not found', 404));
  }

  // Update fields
  if (credentialType !== undefined) credential.credentialType = credentialType;
  if (title !== undefined) credential.title = title.trim();
  if (username !== undefined) credential.username = username.trim();
  if (email !== undefined) credential.email = email.trim().toLowerCase();
  if (password !== undefined) credential.password = password.trim();
  if (url !== undefined) credential.url = url.trim();
  if (ipAddress !== undefined) credential.ipAddress = ipAddress.trim();
  if (port !== undefined) credential.port = port || undefined;
  if (additionalInfo !== undefined) credential.additionalInfo = additionalInfo.trim();
  if (notes !== undefined) credential.notes = notes.trim();
  if (expiryDate !== undefined) credential.expiryDate = expiryDate ? new Date(expiryDate) : undefined;
  if (isActive !== undefined) credential.isActive = isActive;
  credential.updatedBy = req.admin._id;
  
  // Title is optional - keep existing if not provided
  if (title === undefined && !credential.title) {
    credential.title = 'Credential';
  }

  await credential.save();

  await credential.populate({
    path: 'project',
    select: 'name client',
    populate: {
      path: 'client',
      select: 'companyName name'
    }
  });
  await credential.populate('createdBy', 'name email');
  await credential.populate('updatedBy', 'name email');

  res.status(200).json({
    success: true,
    message: 'Credential updated successfully',
    data: credential
  });
});

// @desc    Delete project credential
// @route   DELETE /api/admin/project-credentials/:id
// @access  Admin only
const deleteCredential = asyncHandler(async (req, res, next) => {
  const credential = await ProjectCredential.findById(req.params.id);

  if (!credential) {
    return next(new ErrorResponse('Credential not found', 404));
  }

  await credential.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Credential deleted successfully'
  });
});

// @desc    Get projects with expenses (for credentials section)
// @route   GET /api/admin/project-credentials/projects-with-expenses
// @access  Admin/PEM only
const getProjectsWithExpenses = asyncHandler(async (req, res, next) => {
  // Find all projects that have expenses
  const projects = await Project.find({
    'expenses.0': { $exists: true } // Projects with at least one expense
  })
    .populate('client', 'companyName name')
    .select('name client status')
    .sort({ name: 1 });

  // Get credential counts for each project
  const projectsWithCredentialCounts = await Promise.all(
    projects.map(async (project) => {
      const credentialCount = await ProjectCredential.countDocuments({ 
        project: project._id,
        isActive: true 
      });
      return {
        ...project.toObject(),
        credentialCount
      };
    })
  );

  res.status(200).json({
    success: true,
    count: projectsWithCredentialCounts.length,
    data: projectsWithCredentialCounts
  });
});

// @desc    Get project credentials for PM or Employee (read-only, project must be accessible)
// @route   GET /api/projects/:id/credentials (PM) or GET /api/employee/projects/:id/credentials (Employee)
// @access  PM (own projects) or Employee (assigned projects)
const getCredentialsByProjectForPMOrEmployee = asyncHandler(async (req, res, next) => {
  const projectId = req.params.projectId || req.params.id;
  if (!projectId) {
    return next(new ErrorResponse('Project ID is required', 400));
  }

  const project = await Project.findById(projectId).select('projectManager assignedTeam');
  if (!project) {
    return next(new ErrorResponse('Project not found', 404));
  }

  const userType = req.userType || req.user?.role;
  if (userType === 'project-manager') {
    if (!project.projectManager || !project.projectManager.equals(req.user._id)) {
      return next(new ErrorResponse('Not authorized to access this project', 403));
    }
  } else if (userType === 'employee') {
    const inTeam = project.assignedTeam && project.assignedTeam.some(m => m.equals(req.user._id));
    if (!inTeam) {
      return next(new ErrorResponse('Not authorized to access this project', 403));
    }
  } else {
    return next(new ErrorResponse('Not authorized', 403));
  }

  const credentials = await ProjectCredential.find({ project: projectId, isActive: true })
    .populate('project', 'name')
    .sort({ credentialType: 1, createdAt: -1 });

  res.status(200).json({
    success: true,
    count: credentials.length,
    data: credentials
  });
});

module.exports = {
  getAllCredentials,
  getCredentialsByProject,
  getCredentialById,
  createCredential,
  updateCredential,
  deleteCredential,
  getProjectsWithExpenses,
  getCredentialsByProjectForPMOrEmployee
};
