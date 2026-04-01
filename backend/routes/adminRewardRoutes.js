const express = require('express');
const {
  getRewards,
  getRewardById,
  createReward,
  updateReward,
  toggleRewardStatus,
  deleteReward,
  awardRewardForMonth,
  getTags,
  createTag,
  deleteTag,
  getRewardHistory,
  triggerMonthlyProcess
} = require('../controllers/adminRewardController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);
router.use(authorize('admin'));

router
  .route('/')
  .get(getRewards)
  .post(createReward);

router
  .route('/tags')
  .get(getTags)
  .post(createTag);

router.delete('/tags/:id', deleteTag);

router.get('/history', getRewardHistory);
router.post('/trigger-process', triggerMonthlyProcess);

router.patch('/:id/toggle', toggleRewardStatus);
router.post('/:id/award-month', awardRewardForMonth);

router
  .route('/:id')
  .get(getRewardById)
  .patch(updateReward)
  .delete(deleteReward);

module.exports = router;

