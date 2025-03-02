const { validationResult } = require('express-validator');
const { 
  Vocabulary, 
  UserVocabulary, 
  Language, 
  User,
  sequelize,
  Sequelize
} = require('../database/models');
const { Op } = Sequelize;

/**
 * Get vocabulary words (with filtering)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getVocabulary = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      language, 
      difficulty, 
      tags,
      status
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Build query conditions
    const whereConditions = { deleted: false };
    
    // Add search filter
    if (search) {
      whereConditions[Op.or] = [
        { word: { [Op.like]: `%${search}%` } },
        { definition: { [Op.like]: `%${search}%` } },
        { example: { [Op.like]: `%${search}%` } }
      ];
    }
    
    // Add language filter
    if (language) {
      const lang = await Language.findOne({
        where: {
          [Op.or]: [
            { id: language },
            { code: language }
          ],
          is_active: true
        }
      });
      
      if (lang) {
        whereConditions.language_id = lang.id;
      }
    }
    
    // Add difficulty filter
    if (difficulty && ['beginner', 'intermediate', 'advanced'].includes(difficulty)) {
      whereConditions.difficulty_level = difficulty;
    }
    
    // Add tags filter
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      const tagConditions = tagArray.map(tag => ({
        tags: { [Op.like]: `%${tag}%` }
      }));
      
      whereConditions[Op.and] = tagConditions;
    }
    
    // Get base query
    let query = {
      where: whereConditions,
      include: [
        {
          model: Language,
          as: 'language',
          attributes: ['id', 'code', 'name']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'avatar']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    };
    
    // For authenticated users, include learning status
    if (req.user) {
      // Add UserVocabulary status filter if requested
      if (status && ['new', 'learning', 'mastered'].includes(status)) {
        query = {
          include: [
            {
              model: Language,
              as: 'language',
              attributes: ['id', 'code', 'name']
            },
            {
              model: User,
              as: 'creator',
              attributes: ['id', 'username', 'avatar']
            },
            {
              model: User,
              as: 'learners',
              attributes: [],
              through: {
                where: {
                  user_id: req.user.id,
                  status,
                  deleted: false
                }
              },
              required: true
            }
          ],
          where: whereConditions,
          order: [['created_at', 'DESC']],
          limit: parseInt(limit),
          offset: parseInt(offset)
        };
      } else {
        // Just include the status info without filtering
        query.include.push({
          model: User,
          as: 'learners',
          attributes: [],
          through: {
            where: {
              user_id: req.user.id,
              deleted: false
            }
          },
          required: false
        });
        
        // Add raw learning status info
        query.attributes = {
          include: [
            [
              sequelize.literal(`(
                SELECT status FROM user_vocabulary
                WHERE user_vocabulary.vocabulary_id = Vocabulary.id
                AND user_vocabulary.user_id = '${req.user.id}'
                AND user_vocabulary.deleted = false
                LIMIT 1
              )`),
              'learning_status'
            ],
            [
              sequelize.literal(`(
                SELECT mastery_level FROM user_vocabulary
                WHERE user_vocabulary.vocabulary_id = Vocabulary.id
                AND user_vocabulary.user_id = '${req.user.id}'
                AND user_vocabulary.deleted = false
                LIMIT 1
              )`),
              'mastery_level'
            ]
          ]
        };
      }
    }
    
    // Get vocabulary with pagination
    const { count, rows } = await Vocabulary.findAndCountAll(query);
    
    res.json({
      vocabulary: rows,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Error getting vocabulary:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get vocabulary word by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getVocabularyById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find vocabulary
    const vocab = await Vocabulary.findOne({
      where: { id, deleted: false },
      include: [
        {
          model: Language,
          as: 'language',
          attributes: ['id', 'code', 'name']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'avatar']
        }
      ]
    });
    
    if (!vocab) {
      return res.status(404).json({ message: 'Vocabulary not found' });
    }
    
    // For authenticated users, include learning status
    if (req.user) {
      const userVocab = await UserVocabulary.findOne({
        where: {
          user_id: req.user.id,
          vocabulary_id: id,
          deleted: false
        }
      });
      
      if (userVocab) {
        vocab.dataValues.userVocabulary = userVocab;
      }
    }
    
    res.json(vocab);
  } catch (error) {
    console.error('Error getting vocabulary by ID:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Create vocabulary word
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createVocabulary = async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { 
    word, 
    language_id, 
    definition, 
    example, 
    pronunciation, 
    part_of_speech, 
    difficulty_level,
    tags
  } = req.body;
  
  try {
    // Check if language exists
    const language = await Language.findOne({
      where: { id: language_id, is_active: true }
    });
    
    if (!language) {
      return res.status(404).json({ message: 'Language not found' });
    }
    
    // Check if word already exists in this language
    const existingWord = await Vocabulary.findOne({
      where: {
        word: word.trim(),
        language_id,
        deleted: false
      }
    });
    
    if (existingWord) {
      return res.status(400).json({ message: 'This word already exists in the vocabulary' });
    }
    
    // Create vocabulary
    const vocabulary = await Vocabulary.create({
      word: word.trim(),
      language_id,
      definition,
      example,
      pronunciation,
      part_of_speech,
      difficulty_level: difficulty_level || 'intermediate',
      tags: tags || [],
      user_id: req.user.id
    });
    
    // Automatically add to user's vocabulary
    await UserVocabulary.create({
      user_id: req.user.id,
      vocabulary_id: vocabulary.id,
      status: 'new',
      last_reviewed: new Date(),
      next_review: new Date()
    });
    
    // Get created vocabulary with language and creator info
    const createdVocabulary = await Vocabulary.findByPk(vocabulary.id, {
      include: [
        {
          model: Language,
          as: 'language',
          attributes: ['id', 'code', 'name']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'avatar']
        }
      ]
    });
    
    res.status(201).json({
      message: 'Vocabulary created successfully',
      vocabulary: createdVocabulary
    });
  } catch (error) {
    console.error('Error creating vocabulary:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update vocabulary word
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateVocabulary = async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { id } = req.params;
  const { 
    definition, 
    example, 
    pronunciation, 
    part_of_speech, 
    difficulty_level,
    tags
  } = req.body;
  
  try {
    // Find vocabulary
    const vocabulary = await Vocabulary.findOne({
      where: { id, deleted: false }
    });
    
    if (!vocabulary) {
      return res.status(404).json({ message: 'Vocabulary not found' });
    }
    
    // Check if user is the creator
    if (vocabulary.user_id !== req.user.id) {
      return res.status(403).json({ message: 'You can only edit vocabulary you created' });
    }
    
    // Update vocabulary
    await vocabulary.update({
      definition: definition !== undefined ? definition : vocabulary.definition,
      example: example !== undefined ? example : vocabulary.example,
      pronunciation: pronunciation !== undefined ? pronunciation : vocabulary.pronunciation,
      part_of_speech: part_of_speech !== undefined ? part_of_speech : vocabulary.part_of_speech,
      difficulty_level: difficulty_level || vocabulary.difficulty_level,
      tags: tags !== undefined ? tags : vocabulary.tags
    });
    
    // Get updated vocabulary with language and creator info
    const updatedVocabulary = await Vocabulary.findByPk(vocabulary.id, {
      include: [
        {
          model: Language,
          as: 'language',
          attributes: ['id', 'code', 'name']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'avatar']
        }
      ]
    });
    
    res.json({
      message: 'Vocabulary updated successfully',
      vocabulary: updatedVocabulary
    });
  } catch (error) {
    console.error('Error updating vocabulary:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Delete vocabulary word
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteVocabulary = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Find vocabulary
    const vocabulary = await Vocabulary.findOne({
      where: { id, deleted: false }
    });
    
    if (!vocabulary) {
      return res.status(404).json({ message: 'Vocabulary not found' });
    }
    
    // Check if user is the creator
    if (vocabulary.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'You can only delete vocabulary you created' });
    }
    
    // Soft delete the vocabulary
    await vocabulary.update({
      deleted: true,
      deleted_at: new Date()
    });
    
    res.json({ message: 'Vocabulary deleted successfully' });
  } catch (error) {
    console.error('Error deleting vocabulary:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Add vocabulary to user's learning list
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.addToUserVocabulary = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Find vocabulary
    const vocabulary = await Vocabulary.findOne({
      where: { id, deleted: false }
    });
    
    if (!vocabulary) {
      return res.status(404).json({ message: 'Vocabulary not found' });
    }
    
    // Check if already in user's vocabulary
    const existing = await UserVocabulary.findOne({
      where: {
        user_id: req.user.id,
        vocabulary_id: id
      }
    });
    
    if (existing) {
      if (existing.deleted) {
        // Reactivate if previously deleted
        await existing.update({
          deleted: false,
          deleted_at: null,
          status: 'new',
          last_reviewed: new Date(),
          next_review: new Date()
        });
        
        return res.json({ message: 'Word added back to your vocabulary' });
      } else {
        return res.status(400).json({ message: 'This word is already in your vocabulary' });
      }
    }
    
    // Add to user's vocabulary
    await UserVocabulary.create({
      user_id: req.user.id,
      vocabulary_id: id,
      status: 'new',
      last_reviewed: new Date(),
      next_review: new Date()
    });
    
    res.json({ message: 'Word added to your vocabulary' });
  } catch (error) {
    console.error('Error adding to user vocabulary:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Remove vocabulary from user's learning list
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.removeFromUserVocabulary = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Find user vocabulary entry
    const userVocab = await UserVocabulary.findOne({
      where: {
        user_id: req.user.id,
        vocabulary_id: id,
        deleted: false
      }
    });
    
    if (!userVocab) {
      return res.status(404).json({ message: 'Word not found in your vocabulary' });
    }
    
    // Soft delete the user vocabulary entry
    await userVocab.update({
      deleted: true,
      deleted_at: new Date()
    });
    
    res.json({ message: 'Word removed from your vocabulary' });
  } catch (error) {
    console.error('Error removing from user vocabulary:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update vocabulary learning status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateLearningStatus = async (req, res) => {
  const { id } = req.params;
  const { status, mastery_level, personal_note } = req.body;
  
  try {
    // Find user vocabulary entry
    const userVocab = await UserVocabulary.findOne({
      where: {
        user_id: req.user.id,
        vocabulary_id: id,
        deleted: false
      }
    });
    
    if (!userVocab) {
      return res.status(404).json({ message: 'Word not found in your vocabulary' });
    }
    
    // Update status
    const updates = {};
    
    if (status && ['new', 'learning', 'mastered'].includes(status)) {
      updates.status = status;
    }
    
    if (mastery_level !== undefined && mastery_level >= 0 && mastery_level <= 5) {
      updates.mastery_level = mastery_level;
    }
    
    if (personal_note !== undefined) {
      updates.personal_note = personal_note;
    }
    
    // Update last reviewed date
    updates.last_reviewed = new Date();
    
    // Update next review date based on mastery level
    if (mastery_level !== undefined) {
      const daysUntilNextReview = [1, 3, 7, 14, 30, 90][mastery_level];
      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + daysUntilNextReview);
      updates.next_review = nextReview;
    }
    
    await userVocab.update(updates);
    
    res.json({ 
      message: 'Learning status updated successfully',
      userVocabulary: await UserVocabulary.findByPk(userVocab.id)
    });
  } catch (error) {
    console.error('Error updating learning status:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get user vocabulary statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getUserVocabularyStats = async (req, res) => {
  try {
    // Count vocabulary by status
    const [stats] = await sequelize.query(`
      SELECT 
        status, 
        COUNT(*) as count
      FROM user_vocabulary
      WHERE user_id = :userId AND deleted = false
      GROUP BY status
    `, {
      replacements: { userId: req.user.id }
    });
    
    // Count by language
    const [languageStats] = await sequelize.query(`
      SELECT 
        l.name as language,
        l.code as code,
        COUNT(*) as count
      FROM user_vocabulary uv
      JOIN vocabulary v ON uv.vocabulary_id = v.id
      JOIN language l ON v.language_id = l.id
      WHERE uv.user_id = :userId AND uv.deleted = false
      GROUP BY l.id
    `, {
      replacements: { userId: req.user.id }
    });
    
    // Count by difficulty
    const [difficultyStats] = await sequelize.query(`
      SELECT 
        v.difficulty_level,
        COUNT(*) as count
      FROM user_vocabulary uv
      JOIN vocabulary v ON uv.vocabulary_id = v.id
      WHERE uv.user_id = :userId AND uv.deleted = false
      GROUP BY v.difficulty_level
    `, {
      replacements: { userId: req.user.id }
    });
    
    // Count by mastery level
    const [masteryStats] = await sequelize.query(`
      SELECT 
        mastery_level,
        COUNT(*) as count
      FROM user_vocabulary
      WHERE user_id = :userId AND deleted = false
      GROUP BY mastery_level
    `, {
      replacements: { userId: req.user.id }
    });
    
    // Get total count
    const totalCount = await UserVocabulary.count({
      where: {
        user_id: req.user.id,
        deleted: false
      }
    });
    
    // Get words due for review
    const dueForReview = await UserVocabulary.count({
      where: {
        user_id: req.user.id,
        deleted: false,
        next_review: {
          [Op.lte]: new Date()
        }
      }
    });
    
    res.json({
      totalCount,
      dueForReview,
      byStatus: stats,
      byLanguage: languageStats,
      byDifficulty: difficultyStats,
      byMastery: masteryStats
    });
  } catch (error) {
    console.error('Error getting user vocabulary stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get words due for review
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getWordsForReview = async (req, res) => {
  try {
    const { limit = 10, language } = req.query;
    
    // Build query
    const query = {
      where: {
        user_id: req.user.id,
        deleted: false,
        next_review: {
          [Op.lte]: new Date()
        }
      },
      include: [
        {
          model: Vocabulary,
          as: 'vocabulary',
          include: [
            {
              model: Language,
              as: 'language'
            }
          ]
        }
      ],
      order: [['next_review', 'ASC']],
      limit: parseInt(limit)
    };
    
    // Add language filter if provided
    if (language) {
      query.include[0].include[0].where = {
        [Op.or]: [
          { id: language },
          { code: language }
        ]
      };
    }
    
    const wordsForReview = await UserVocabulary.findAll(query);
    
    res.json(wordsForReview);
  } catch (error) {
    console.error('Error getting words for review:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Record vocabulary review result
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.recordReviewResult = async (req, res) => {
  const { id } = req.params;
  const { result } = req.body;
  
  if (!['success', 'failure'].includes(result)) {
    return res.status(400).json({ message: 'Result must be "success" or "failure"' });
  }
  
  try {
    // Find user vocabulary entry
    const userVocab = await UserVocabulary.findOne({
      where: {
        id,
        user_id: req.user.id,
        deleted: false
      }
    });
    
    if (!userVocab) {
      return res.status(404).json({ message: 'User vocabulary entry not found' });
    }
    
    if (result === 'success') {
      // Increment mastery level on success
      await userVocab.incrementReview();
    } else {
      // Reset progress on failure
      await userVocab.resetProgress();
    }
    
    res.json({
      message: 'Review result recorded',
      userVocabulary: await UserVocabulary.findByPk(userVocab.id)
    });
  } catch (error) {
    console.error('Error recording review result:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 