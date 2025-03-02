const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const communityScheduleController = require('../controllers/community-schedule.controller');

// Get community schedule
// GET /api/communities/:communityId/schedule
router.get(
  '/:communityId/schedule',
  auth,
  communityScheduleController.getCommunitySchedule
);

// Create or update community schedule
// POST /api/communities/:communityId/schedule
router.post(
  '/:communityId/schedule',
  [
    auth,
    [
      check('time', 'Time is required').not().isEmpty(),
      check('timezone', 'Timezone is required').not().isEmpty(),
      check('period', 'Period is required').isIn(['daily', 'weekly', 'monthly']),
      check('auto_gen_title').isBoolean(),
      check('title_prompt').optional({ checkFalsy: true }).isString(),
      check('auto_gen_post').isBoolean(),
      check('post_prompt').optional({ checkFalsy: true }).isString(),
      check('word_limit_min', 'Minimum word limit must be at least 50').isInt({ min: 50, max: 1000 }),
      check('word_limit_max', 'Maximum word limit must be at most 1000').isInt({ min: 50, max: 1000 })
    ]
  ],
  communityScheduleController.createOrUpdateCommunitySchedule
);

// Delete community schedule
// DELETE /api/communities/:communityId/schedule
router.delete(
  '/:communityId/schedule',
  auth,
  communityScheduleController.deleteCommunitySchedule
);

// Manually trigger schedule execution (for testing)
// POST /api/communities/:communityId/schedule/execute
router.post(
  '/:communityId/schedule/execute',
  auth,
  communityScheduleController.executeSchedule
);

module.exports = router; 