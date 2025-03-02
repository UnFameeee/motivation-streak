const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const streakController = require('../controllers/streak.controller');
const { authJwt } = require('../middleware');

// Record user activity (requires authentication)
router.post(
  '/activity',
  [authJwt.verifyToken],
  streakController.recordActivity
);

// Get user streaks (can see own or others' streaks)
router.get(
  '/user/:userId?',
  [authJwt.verifyToken],
  streakController.getUserStreaks
);

// Get leaderboard for a specific activity type (public)
router.get(
  '/leaderboard/:activityType',
  streakController.getLeaderboard
);

// Get user's translation streak
// GET /api/streaks/translation
router.get('/translation', auth, streakController.getTranslationStreak);

// Get user's writing streak
// GET /api/streaks/writing
router.get('/writing', auth, streakController.getWritingStreak);

// Complete a recovery task for translation streak
// POST /api/streaks/translation/recovery
router.post('/translation/recovery', auth, streakController.completeTranslationRecoveryTask);

// Complete a recovery task for writing streak
// POST /api/streaks/writing/recovery
router.post('/writing/recovery', auth, streakController.completeWritingRecoveryTask);

// Get leaderboard for translation streaks (Diệu Thuật Bảng)
// GET /api/streaks/translation/leaderboard
router.get('/translation/leaderboard', streakController.getTranslationLeaderboard);

// Get leaderboard for writing streaks (Phong Vân Bảng)
// GET /api/streaks/writing/leaderboard
router.get('/writing/leaderboard', streakController.getWritingLeaderboard);

module.exports = router; 