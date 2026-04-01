const express = require('express');
const { getServiceCatalog, createServiceRequest } = require('../controllers/clientExploreController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('client'));

router.get('/', getServiceCatalog);
router.post('/request', createServiceRequest);

module.exports = router;

