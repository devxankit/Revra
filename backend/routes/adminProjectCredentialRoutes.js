const express = require('express');
const router = express.Router();
const {
  getAllCredentials,
  getCredentialsByProject,
  getCredentialById,
  createCredential,
  updateCredential,
  deleteCredential,
  getProjectsWithExpenses
} = require('../controllers/adminProjectCredentialController');
const { protect, authorize } = require('../middlewares/auth');

// Apply authentication to all routes
router.use(protect);

// GET routes - accessible to admin and PEM
router.get('/', getAllCredentials);
router.get('/projects-with-expenses', getProjectsWithExpenses);
router.get('/project/:projectId', getCredentialsByProject);
router.get('/:id', getCredentialById);

// POST, PUT, DELETE routes - admin only
router.post('/', authorize('admin'), createCredential);
router.put('/:id', authorize('admin'), updateCredential);
router.delete('/:id', authorize('admin'), deleteCredential);

module.exports = router;
