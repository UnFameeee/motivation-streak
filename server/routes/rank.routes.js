const express = require('express');
const router = express.Router();
const rankController = require('../controllers/rank.controller');
const { authenticate, optionalAuth, isAdmin } = require('../middleware/auth.middleware');
const auth = require('../middleware/auth');

// @route   GET api/ranks
// @desc    Get rank statistics
// @access  Public (with optional auth)
router.get('/', optionalAuth, rankController.getRankStatistics);

// @route   GET api/ranks/translation
// @desc    Get translation ranks leaderboard
// @access  Public (with optional auth)
router.get('/translation', optionalAuth, rankController.getTranslationRanks);

// @route   GET api/ranks/writing
// @desc    Get writing ranks leaderboard
// @access  Public (with optional auth)
router.get('/writing', optionalAuth, rankController.getWritingRanks);

// @route   GET api/ranks/user/:id
// @desc    Get user ranks
// @access  Public (with optional auth)
router.get('/user/:id', optionalAuth, rankController.getUserRanks);

// @route   GET api/ranks/me
// @desc    Get current user ranks
// @access  Private
router.get('/me', authenticate, rankController.getCurrentUserRanks);

// @route   GET api/ranks/constants
// @desc    Get rank calculation constants
// @access  Public
router.get('/constants', rankController.getRankConstants);

// @route   PUT api/ranks/constants/:type
// @desc    Update rank calculation constant
// @access  Admin only
router.put('/constants/:type', authenticate, isAdmin, rankController.updateRankConstant);

// Get user's translation rank
// GET /api/ranks/translation
router.get('/translation', auth, rankController.getTranslationRank);

// Get user's writing rank
// GET /api/ranks/writing
router.get('/writing', auth, rankController.getWritingRank);

// Get tiers for Đại Cảnh Giới
// GET /api/ranks/tiers/dai-canh-gioi
router.get('/tiers/dai-canh-gioi', rankController.getDaiCanhGioiTiers);

// Get tiers for Cảnh Con
// GET /api/ranks/tiers/canh-con
router.get('/tiers/canh-con', rankController.getCanhConTiers);

// Get tiers for Đẳng
// GET /api/ranks/tiers/dang
router.get('/tiers/dang', rankController.getDangTiers);

// Get user's translation rank history
// GET /api/ranks/translation/history
router.get('/translation/history', auth, rankController.getTranslationRankHistory);

// Get user's writing rank history
// GET /api/ranks/writing/history
router.get('/writing/history', auth, rankController.getWritingRankHistory);

module.exports = router; 