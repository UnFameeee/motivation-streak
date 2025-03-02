const express = require('express');
const router = express.Router();
const postController = require('../controllers/post.controller');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const { check } = require('express-validator');

// @route   GET api/posts/:id
// @desc    Get a post by ID with translations
// @access  Public (with optional auth)
router.get('/:id', optionalAuth, postController.getPostById);

// @route   PUT api/posts/:id
// @desc    Update a post
// @access  Private (post author only)
router.put(
  '/:id',
  authenticate,
  [
    check('title', 'Title cannot exceed 255 characters').optional().isLength({ max: 255 }),
    check('content', 'Content is required').optional().notEmpty()
  ],
  postController.updatePost
);

// @route   DELETE api/posts/:id
// @desc    Delete a post
// @access  Private (post author or community moderator)
router.delete('/:id', authenticate, postController.deletePost);

// Translation routes
// @route   POST api/posts/:id/translations
// @desc    Create a translation for a post
// @access  Private
router.post(
  '/:id/translations',
  authenticate,
  [
    check('content', 'Content is required').notEmpty(),
    check('language_id', 'Valid language ID is required').isUUID()
  ],
  postController.createTranslation
);

// @route   GET api/posts/:id/translations
// @desc    Get all translations for a post
// @access  Public (with optional auth)
router.get('/:id/translations', optionalAuth, postController.getPostById);

// Translation scoring
// @route   POST api/posts/translations/:id/score
// @desc    Score a translation using AI
// @access  Private
router.post('/translations/:id/score', authenticate, postController.scoreTranslation);

// @route   GET api/posts/translations/:id/scores
// @desc    Get scores for a translation
// @access  Public (with optional auth)
router.get('/translations/:id/scores', optionalAuth, postController.getTranslationScores);

// @route   PUT api/posts/translations/:id
// @desc    Update a translation
// @access  Private (translator only)
router.put(
  '/translations/:id',
  authenticate,
  [
    check('content', 'Content is required').notEmpty()
  ],
  postController.updateTranslation
);

// @route   DELETE api/posts/translations/:id
// @desc    Delete a translation
// @access  Private (translator or community moderator)
router.delete('/translations/:id', authenticate, postController.deleteTranslation);

module.exports = router; 