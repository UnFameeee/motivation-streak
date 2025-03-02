const { validationResult } = require('express-validator');
const { 
  Post, 
  Block, 
  Community,
  User,
  Language,
  PostTranslation,
  UserActivity,
  sequelize,
  UserCommunity
} = require('../database/models');
const aiService = require('../services/ai.service');

/**
 * Get posts by block
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getPostsByBlock = async (req, res) => {
  try {
    const { id: blockId } = req.params;
    
    // Find the block and its community to check access
    const block = await Block.findOne({
      where: { id: blockId, deleted: false },
      include: [
        {
          model: Community,
          as: 'community',
          attributes: ['id', 'name', 'is_public', 'owner_id']
        }
      ]
    });
    
    if (!block) {
      return res.status(404).json({ message: 'Block not found' });
    }
    
    // Check if community is private and user has access
    if (!block.community.is_public && req.user) {
      const membership = await UserCommunity.findOne({
        where: {
          user_id: req.user.id,
          community_id: block.community.id,
          deleted: false
        }
      });
      
      if (!membership && req.user.id !== block.community.owner_id) {
        return res.status(403).json({ message: 'This block is in a private community. You do not have access.' });
      }
    } else if (!block.community.is_public && !req.user) {
      return res.status(403).json({ message: 'This block is in a private community. Please log in to access.' });
    }
    
    // Get posts with author and language info
    const posts = await Post.findAll({
      where: { block_id: blockId, deleted: false },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'avatar']
        },
        {
          model: Language,
          as: 'language',
          attributes: ['id', 'code', 'name']
        }
      ],
      order: [['created_at', 'DESC']]
    });
    
    // Get translation counts for each post
    for (let i = 0; i < posts.length; i++) {
      const translationCount = await PostTranslation.count({
        where: {
          post_id: posts[i].id,
          deleted: false
        }
      });
      
      posts[i].dataValues.translationCount = translationCount;
    }
    
    res.json({
      block,
      posts
    });
  } catch (error) {
    console.error('Error getting posts by block:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get a post by ID with translations
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getPostById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the post with author, language, and block info
    const post = await Post.findOne({
      where: { id, deleted: false },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'avatar']
        },
        {
          model: Language,
          as: 'language',
          attributes: ['id', 'code', 'name']
        },
        {
          model: Block,
          as: 'block',
          include: [
            {
              model: Community,
              as: 'community',
              attributes: ['id', 'name', 'is_public', 'owner_id']
            }
          ]
        }
      ]
    });
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Check if community is private and user has access
    if (!post.block.community.is_public && req.user) {
      const membership = await UserCommunity.findOne({
        where: {
          user_id: req.user.id,
          community_id: post.block.community.id,
          deleted: false
        }
      });
      
      if (!membership && req.user.id !== post.block.community.owner_id) {
        return res.status(403).json({ message: 'This post is in a private community. You do not have access.' });
      }
    } else if (!post.block.community.is_public && !req.user) {
      return res.status(403).json({ message: 'This post is in a private community. Please log in to access.' });
    }
    
    // Get translations with translator and language info
    const translations = await PostTranslation.findAll({
      where: { post_id: id, deleted: false },
      include: [
        {
          model: User,
          as: 'translator',
          attributes: ['id', 'username', 'avatar']
        },
        {
          model: Language,
          as: 'language',
          attributes: ['id', 'code', 'name']
        }
      ],
      order: [['created_at', 'DESC']]
    });
    
    res.json({
      post,
      translations
    });
  } catch (error) {
    console.error('Error getting post:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Create a new post
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createPost = async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { id: blockId } = req.params;
  const { title, content, language_id } = req.body;
  
  const transaction = await sequelize.transaction();
  
  try {
    // Find the block and its community to check access
    const block = await Block.findOne({
      where: { id: blockId, deleted: false },
      include: [
        {
          model: Community,
          as: 'community'
        }
      ]
    });
    
    if (!block) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Block not found' });
    }
    
    // Check if community is private and user has access
    if (!block.community.is_public) {
      const membership = await UserCommunity.findOne({
        where: {
          user_id: req.user.id,
          community_id: block.community.id,
          deleted: false
        }
      });
      
      if (!membership && req.user.id !== block.community.owner_id) {
        await transaction.rollback();
        return res.status(403).json({ message: 'You do not have permission to create posts in this private community' });
      }
    }
    
    // Check if language exists
    const language = await Language.findOne({
      where: { id: language_id, is_active: true }
    });
    
    if (!language) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Language not found' });
    }
    
    // Create the post
    const post = await Post.create({
      block_id: blockId,
      user_id: req.user.id,
      title,
      content,
      language_id,
      is_auto_generated: false
    }, { transaction });
    
    // Record user activity for streak tracking
    await UserActivity.create({
      user_id: req.user.id,
      activity_type: 'writing',
      activity_date: new Date(),
      reference_id: post.id
    }, { transaction });
    
    await transaction.commit();
    
    // Get the created post with author and language info
    const createdPost = await Post.findByPk(post.id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'avatar']
        },
        {
          model: Language,
          as: 'language',
          attributes: ['id', 'code', 'name']
        }
      ]
    });
    
    // Update streak (outside transaction to prevent blocking)
    const streakService = require('../services/streak.service');
    streakService.recordActivity(req.user.id, 'writing', post.id)
      .catch(err => console.error('Error recording writing activity for streak:', err));
    
    res.status(201).json({
      message: 'Post created successfully',
      post: createdPost
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating post:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update a post
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updatePost = async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { id } = req.params;
  const { title, content } = req.body;
  
  try {
    // Find the post
    const post = await Post.findOne({
      where: { id, deleted: false }
    });
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Check if user is the author
    if (post.user_id !== req.user.id) {
      return res.status(403).json({ message: 'You can only edit your own posts' });
    }
    
    // Update the post
    await post.update({
      title: title || post.title,
      content: content || post.content
    });
    
    // Get the updated post with author and language info
    const updatedPost = await Post.findByPk(post.id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'avatar']
        },
        {
          model: Language,
          as: 'language',
          attributes: ['id', 'code', 'name']
        }
      ]
    });
    
    res.json({
      message: 'Post updated successfully',
      post: updatedPost
    });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Delete a post
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deletePost = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Find the post with block and community info
    const post = await Post.findOne({
      where: { id, deleted: false },
      include: [
        {
          model: Block,
          as: 'block',
          include: [
            {
              model: Community,
              as: 'community'
            }
          ]
        }
      ]
    });
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Check if user is the author or community owner/moderator
    if (post.user_id !== req.user.id) {
      // Check if user is community owner or moderator
      const isCommunityOwner = post.block.community.owner_id === req.user.id;
      
      if (!isCommunityOwner) {
        const membership = await UserCommunity.findOne({
          where: {
            user_id: req.user.id,
            community_id: post.block.community.id,
            role: 'moderator',
            deleted: false
          }
        });
        
        if (!membership) {
          return res.status(403).json({ message: 'You do not have permission to delete this post' });
        }
      }
    }
    
    // Soft delete the post
    await post.update({
      deleted: true,
      deleted_at: new Date()
    });
    
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Auto-generate a post for a block
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.autoGeneratePost = async (req, res) => {
  const { id: blockId } = req.params;
  const { language_id, prompt } = req.body;
  
  try {
    // Find the block and its community to check access
    const block = await Block.findOne({
      where: { id: blockId, deleted: false },
      include: [
        {
          model: Community,
          as: 'community'
        },
        {
          model: sequelize.models.CommunitySchedule,
          as: 'schedule'
        }
      ]
    });
    
    if (!block) {
      return res.status(404).json({ message: 'Block not found' });
    }
    
    // Check if user has permission
    if (block.community.owner_id !== req.user.id) {
      const membership = await UserCommunity.findOne({
        where: {
          user_id: req.user.id,
          community_id: block.community.id,
          role: 'moderator',
          deleted: false
        }
      });
      
      if (!membership) {
        return res.status(403).json({ message: 'You do not have permission to generate posts' });
      }
    }
    
    // Check if language exists
    const language = await Language.findOne({
      where: { id: language_id, is_active: true }
    });
    
    if (!language) {
      return res.status(404).json({ message: 'Language not found' });
    }
    
    // Get word limits from schedule or use defaults
    const wordLimitMin = block.schedule ? block.schedule.word_limit_min : 50;
    const wordLimitMax = block.schedule ? block.schedule.word_limit_max : 1000;
    const postPrompt = (block.schedule && block.schedule.post_prompt) ? block.schedule.post_prompt : '';
    
    // Generate post content using AI
    const fullPrompt = prompt || postPrompt;
    const content = await aiService.generatePostContent(
      block.title,
      fullPrompt,
      wordLimitMin,
      wordLimitMax,
      language.name
    );
    
    // Create the post
    const post = await Post.create({
      block_id: blockId,
      user_id: req.user.id,
      title: `${block.title} - AI Generated`,
      content,
      language_id,
      is_auto_generated: true
    });
    
    // Get the created post with author and language info
    const createdPost = await Post.findByPk(post.id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'username', 'avatar']
        },
        {
          model: Language,
          as: 'language',
          attributes: ['id', 'code', 'name']
        }
      ]
    });
    
    res.status(201).json({
      message: 'Post generated successfully',
      post: createdPost
    });
  } catch (error) {
    console.error('Error generating post:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Create a translation for a post
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createTranslation = async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { id: postId } = req.params;
  const { content, language_id } = req.body;
  
  const transaction = await sequelize.transaction();
  
  try {
    // Find the post and ensure it exists
    const post = await Post.findOne({
      where: { id: postId, deleted: false },
      include: [
        {
          model: Block,
          as: 'block',
          include: [
            {
              model: Community,
              as: 'community'
            }
          ]
        }
      ]
    });
    
    if (!post) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Post not found' });
    }
    
    // Check if community is private and user has access
    if (!post.block.community.is_public) {
      const membership = await UserCommunity.findOne({
        where: {
          user_id: req.user.id,
          community_id: post.block.community.id,
          deleted: false
        }
      });
      
      if (!membership && req.user.id !== post.block.community.owner_id) {
        await transaction.rollback();
        return res.status(403).json({ message: 'You do not have permission to translate posts in this private community' });
      }
    }
    
    // Check if language exists
    const language = await Language.findOne({
      where: { id: language_id, is_active: true }
    });
    
    if (!language) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Language not found' });
    }
    
    // Check if the language is different from the post language
    if (language_id === post.language_id) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Translation language must be different from the original language' });
    }
    
    // Check if user already has a translation for this post in this language
    const existingTranslation = await PostTranslation.findOne({
      where: {
        post_id: postId,
        user_id: req.user.id,
        language_id,
        deleted: false
      }
    });
    
    if (existingTranslation) {
      await transaction.rollback();
      return res.status(400).json({ message: 'You already have a translation for this post in this language. Update it instead.' });
    }
    
    // Create the translation
    const translation = await PostTranslation.create({
      post_id: postId,
      user_id: req.user.id,
      language_id,
      content
    }, { transaction });
    
    await transaction.commit();
    
    // Get the created translation with translator and language info
    const createdTranslation = await PostTranslation.findByPk(translation.id, {
      include: [
        {
          model: User,
          as: 'translator',
          attributes: ['id', 'username', 'avatar']
        },
        {
          model: Language,
          as: 'language',
          attributes: ['id', 'code', 'name']
        }
      ]
    });
    
    res.status(201).json({
      message: 'Translation created successfully',
      translation: createdTranslation
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating translation:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update a translation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateTranslation = async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { id } = req.params;
  const { content } = req.body;
  
  try {
    // Find the translation
    const translation = await PostTranslation.findOne({
      where: { id, deleted: false }
    });
    
    if (!translation) {
      return res.status(404).json({ message: 'Translation not found' });
    }
    
    // Check if user is the translator
    if (translation.user_id !== req.user.id) {
      return res.status(403).json({ message: 'You can only edit your own translations' });
    }
    
    // Update the translation
    await translation.update({ content });
    
    // Get the updated translation with translator and language info
    const updatedTranslation = await PostTranslation.findByPk(translation.id, {
      include: [
        {
          model: User,
          as: 'translator',
          attributes: ['id', 'username', 'avatar']
        },
        {
          model: Language,
          as: 'language',
          attributes: ['id', 'code', 'name']
        }
      ]
    });
    
    res.json({
      message: 'Translation updated successfully',
      translation: updatedTranslation
    });
  } catch (error) {
    console.error('Error updating translation:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Delete a translation
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteTranslation = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Find the translation with post info
    const translation = await PostTranslation.findOne({
      where: { id, deleted: false },
      include: [
        {
          model: Post,
          as: 'post',
          include: [
            {
              model: Block,
              as: 'block',
              include: [
                {
                  model: Community,
                  as: 'community'
                }
              ]
            }
          ]
        }
      ]
    });
    
    if (!translation) {
      return res.status(404).json({ message: 'Translation not found' });
    }
    
    // Check if user is the translator or community owner/moderator
    if (translation.user_id !== req.user.id) {
      // Check if user is community owner or moderator
      const isCommunityOwner = translation.post.block.community.owner_id === req.user.id;
      
      if (!isCommunityOwner) {
        const membership = await UserCommunity.findOne({
          where: {
            user_id: req.user.id,
            community_id: translation.post.block.community.id,
            role: 'moderator',
            deleted: false
          }
        });
        
        if (!membership) {
          return res.status(403).json({ message: 'You do not have permission to delete this translation' });
        }
      }
    }
    
    // Soft delete the translation
    await translation.update({
      deleted: true,
      deleted_at: new Date()
    });
    
    res.json({ message: 'Translation deleted successfully' });
  } catch (error) {
    console.error('Error deleting translation:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Score a translation using AI
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.scoreTranslation = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Find the translation with post info
    const translation = await PostTranslation.findOne({
      where: { id, deleted: false },
      include: [
        {
          model: Post,
          as: 'post'
        },
        {
          model: Language,
          as: 'language'
        }
      ]
    });
    
    if (!translation) {
      return res.status(404).json({ message: 'Translation not found' });
    }
    
    // Get original post language
    const originalLanguage = await Language.findByPk(translation.post.language_id);
    
    if (!originalLanguage) {
      return res.status(404).json({ message: 'Original language not found' });
    }
    
    // Use AI to score the translation
    const result = await aiService.scoreTranslation(
      translation.post.content,
      translation.content,
      originalLanguage.name,
      translation.language.name
    );
    
    // Save the score
    const score = await sequelize.models.PostScore.create({
      post_translation_id: translation.id,
      post_id: translation.post.id,
      score: result.score || 0,
      feedback: result.feedback,
      requested_by: req.user.id
    });
    
    res.json({
      message: 'Translation scored successfully',
      score: result.score,
      feedback: result.feedback,
      scoreId: score.id
    });
  } catch (error) {
    console.error('Error scoring translation:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get translation scores
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getTranslationScores = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Find the translation
    const translation = await PostTranslation.findOne({
      where: { id, deleted: false }
    });
    
    if (!translation) {
      return res.status(404).json({ message: 'Translation not found' });
    }
    
    // Get scores
    const scores = await sequelize.models.PostScore.findAll({
      where: { post_translation_id: id },
      include: [
        {
          model: User,
          as: 'requestedBy',
          attributes: ['id', 'username', 'avatar']
        }
      ],
      order: [['created_at', 'DESC']]
    });
    
    res.json({ scores });
  } catch (error) {
    console.error('Error getting translation scores:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 