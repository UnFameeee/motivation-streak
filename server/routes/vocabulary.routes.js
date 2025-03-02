const express = require('express');
const router = express.Router();
const vocabularyController = require('../controllers/vocabulary.controller');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const { check } = require('express-validator');

// @route   GET api/vocabulary
// @desc    Get vocabulary words (with filtering)
// @access  Public (with optional auth)
router.get('/', optionalAuth, vocabularyController.getVocabulary);

// @route   GET api/vocabulary/:id
// @desc    Get vocabulary word by ID
// @access  Public (with optional auth)
router.get('/:id', optionalAuth, vocabularyController.getVocabularyById);

// @route   POST api/vocabulary
// @desc    Create vocabulary word
// @access  Private
router.post(
  '/',
  authenticate,
  [
    check('word', 'Word is required').notEmpty(),
    check('language_id', 'Valid language ID is required').isUUID(),
    check('definition', 'Definition is required').notEmpty()
  ],
  vocabularyController.createVocabulary
);

// @route   PUT api/vocabulary/:id
// @desc    Update vocabulary word
// @access  Private (creator only)
router.put(
  '/:id',
  authenticate,
  [
    check('definition', 'Definition cannot be empty if provided').optional().notEmpty(),
    check('difficulty_level', 'Difficulty must be beginner, intermediate, or advanced')
      .optional()
      .isIn(['beginner', 'intermediate', 'advanced'])
  ],
  vocabularyController.updateVocabulary
);

// @route   DELETE api/vocabulary/:id
// @desc    Delete vocabulary word
// @access  Private (creator or admin only)
router.delete('/:id', authenticate, vocabularyController.deleteVocabulary);

// User vocabulary routes
// @route   POST api/vocabulary/:id/learn
// @desc    Add vocabulary to user's learning list
// @access  Private
router.post('/:id/learn', authenticate, vocabularyController.addToUserVocabulary);

// @route   DELETE api/vocabulary/:id/learn
// @desc    Remove vocabulary from user's learning list
// @access  Private
router.delete('/:id/learn', authenticate, vocabularyController.removeFromUserVocabulary);

// @route   PUT api/vocabulary/:id/status
// @desc    Update vocabulary learning status
// @access  Private
router.put(
  '/:id/status',
  authenticate,
  [
    check('status', 'Status must be new, learning, or mastered')
      .optional()
      .isIn(['new', 'learning', 'mastered']),
    check('mastery_level', 'Mastery level must be between 0 and 5')
      .optional()
      .isInt({ min: 0, max: 5 })
  ],
  vocabularyController.updateLearningStatus
);

// @route   GET api/vocabulary/stats/me
// @desc    Get user vocabulary statistics
// @access  Private
router.get('/stats/me', authenticate, vocabularyController.getUserVocabularyStats);

// @route   GET api/vocabulary/review/due
// @desc    Get words due for review
// @access  Private
router.get('/review/due', authenticate, vocabularyController.getWordsForReview);

// @route   POST api/vocabulary/review/:id
// @desc    Record vocabulary review result
// @access  Private
router.post(
  '/review/:id',
  authenticate,
  [
    check('result', 'Result must be success or failure').isIn(['success', 'failure'])
  ],
  vocabularyController.recordReviewResult
);

module.exports = router; 