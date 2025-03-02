const express = require('express');
const router = express.Router();
const communityController = require('../controllers/community.controller');
const blockController = require('../controllers/block.controller');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const { check } = require('express-validator');

// Validation middleware
const communityValidation = [
  check('name', 'Community name is required').not().isEmpty(),
  check('name', 'Community name cannot exceed 100 characters').isLength({ max: 100 }),
  check('description', 'Description cannot exceed 5000 characters').optional().isLength({ max: 5000 }),
  check('is_public', 'is_public must be a boolean').optional().isBoolean()
];

const scheduleValidation = [
  check('time', 'Time must be in format HH:MM:SS').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/),
  check('timezone', 'Invalid timezone').optional(),
  check('period', 'Period must be daily, weekly, or monthly').optional().isIn(['daily', 'weekly', 'monthly']),
  check('auto_gen_title', 'auto_gen_title must be a boolean').optional().isBoolean(),
  check('auto_gen_post', 'auto_gen_post must be a boolean').optional().isBoolean(),
  check('word_limit_min', 'word_limit_min must be a number between 50 and 5000').optional().isInt({ min: 50, max: 5000 }),
  check('word_limit_max', 'word_limit_max must be a number between 50 and 5000').optional().isInt({ min: 50, max: 5000 })
];

// Routes
// @route   GET api/communities
// @desc    Get all communities
// @access  Public (with optional auth)
router.get('/', optionalAuth, communityController.getAllCommunities);

// @route   GET api/communities/:id
// @desc    Get a community by ID
// @access  Public (with optional auth)
router.get('/:id', optionalAuth, communityController.getCommunityById);

// @route   POST api/communities
// @desc    Create a new community
// @access  Private
router.post('/', authenticate, communityValidation, communityController.createCommunity);

// @route   PUT api/communities/:id
// @desc    Update a community
// @access  Private (owner or moderator)
router.put('/:id', authenticate, communityValidation, communityController.updateCommunity);

// @route   DELETE api/communities/:id
// @desc    Delete a community
// @access  Private (owner only)
router.delete('/:id', authenticate, communityController.deleteCommunity);

// @route   POST api/communities/:id/join
// @desc    Join a community
// @access  Private
router.post('/:id/join', authenticate, communityController.joinCommunity);

// @route   POST api/communities/:id/leave
// @desc    Leave a community
// @access  Private
router.post('/:id/leave', authenticate, communityController.leaveCommunity);

// @route   PUT api/communities/:id/schedule
// @desc    Update community schedule
// @access  Private (owner or moderator)
router.put('/:id/schedule', authenticate, scheduleValidation, communityController.updateSchedule);

// @route   GET api/communities/:id/members
// @desc    Get community members
// @access  Public (with optional auth)
router.get('/:id/members', optionalAuth, communityController.getCommunityMembers);

// Block routes within communities
// @route   GET api/communities/:id/blocks
// @desc    Get blocks for a community
// @access  Public (with optional auth)
router.get('/:id/blocks', optionalAuth, blockController.getBlocksByCommunity);

// @route   POST api/communities/:id/blocks
// @desc    Create a new block in a community
// @access  Private (owner or moderator)
router.post(
  '/:id/blocks',
  authenticate,
  [
    check('title', 'Title is required').not().isEmpty(),
    check('title', 'Title cannot exceed 255 characters').isLength({ max: 255 }),
    check('date', 'Valid date is required').isISO8601().toDate()
  ],
  blockController.createBlock
);

module.exports = router; 