const express = require('express');
const router = express.Router();
const blockController = require('../controllers/block.controller');
const postController = require('../controllers/post.controller');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const { check } = require('express-validator');

// @route   GET api/blocks/:id
// @desc    Get a block by ID
// @access  Public (with optional auth)
router.get('/:id', optionalAuth, blockController.getBlockById);

// @route   PUT api/blocks/:id
// @desc    Update a block
// @access  Private (community owner or moderator)
router.put(
  '/:id',
  authenticate,
  [
    check('title', 'Title is required').not().isEmpty(),
    check('title', 'Title cannot exceed 255 characters').isLength({ max: 255 })
  ],
  blockController.updateBlock
);

// @route   DELETE api/blocks/:id
// @desc    Delete a block
// @access  Private (community owner or moderator)
router.delete('/:id', authenticate, blockController.deleteBlock);

// Post routes within blocks
// @route   GET api/blocks/:id/posts
// @desc    Get posts in a block
// @access  Public (with optional auth)
router.get('/:id/posts', optionalAuth, postController.getPostsByBlock);

// @route   POST api/blocks/:id/posts
// @desc    Create a new post in a block
// @access  Private
router.post(
  '/:id/posts',
  authenticate,
  [
    check('title', 'Title is required').not().isEmpty(),
    check('title', 'Title cannot exceed 255 characters').isLength({ max: 255 }),
    check('content', 'Content is required').not().isEmpty(),
    check('language_id', 'Valid language ID is required').isUUID()
  ],
  postController.createPost
);

// @route   POST api/blocks/:id/auto-generate
// @desc    Auto-generate a post for this block
// @access  Private (community owner or moderator)
router.post(
  '/:id/auto-generate',
  authenticate,
  [
    check('language_id', 'Valid language ID is required').isUUID()
  ],
  postController.autoGeneratePost
);

module.exports = router; 