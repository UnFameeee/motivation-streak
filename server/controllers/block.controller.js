const { validationResult } = require('express-validator');
const { 
  Block, 
  Community, 
  UserCommunity, 
  CommunitySchedule, 
  Post,
  User, 
  Language,
  sequelize 
} = require('../database/models');
const aiService = require('../services/ai.service');
const moment = require('moment-timezone');

/**
 * Get blocks by community
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getBlocksByCommunity = async (req, res) => {
  try {
    const { id: communityId } = req.params;
    const { page = 1, limit = 10, startDate, endDate, search } = req.query;
    const offset = (page - 1) * limit;
    
    // Find the community
    const community = await Community.findByPk(communityId);
    
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }
    
    // Check if community is private and user has access
    if (!community.is_public && req.user) {
      const membership = await UserCommunity.findOne({
        where: {
          user_id: req.user.id,
          community_id: communityId,
          deleted: false
        }
      });
      
      if (!membership && req.user.id !== community.owner_id) {
        return res.status(403).json({ message: 'This is a private community. You do not have access.' });
      }
    } else if (!community.is_public && !req.user) {
      return res.status(403).json({ message: 'This is a private community. Please log in to access.' });
    }
    
    // Build where conditions
    const whereConditions = {
      community_id: communityId,
      deleted: false
    };
    
    // Add date range filter if provided
    if (startDate && endDate) {
      whereConditions.date = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      whereConditions.date = {
        [Op.gte]: new Date(startDate)
      };
    } else if (endDate) {
      whereConditions.date = {
        [Op.lte]: new Date(endDate)
      };
    }
    
    // Add search filter if provided
    if (search) {
      whereConditions.title = {
        [Op.like]: `%${search}%`
      };
    }
    
    // Get blocks with pagination
    const { count, rows } = await Block.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: Post,
          as: 'posts',
          separate: true,
          attributes: ['id'],
          where: { deleted: false },
          required: false
        }
      ],
      order: [['date', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    // Format blocks to include post count
    const blocks = rows.map(block => ({
      ...block.get({ plain: true }),
      postCount: block.posts ? block.posts.length : 0,
      posts: undefined // Remove posts array to reduce payload size
    }));
    
    res.json({
      blocks,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Error getting blocks by community:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get a block by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getBlockById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the block with posts
    const block = await Block.findOne({
      where: { id, deleted: false },
      include: [
        {
          model: Community,
          as: 'community',
          attributes: ['id', 'name', 'is_public', 'owner_id']
        },
        {
          model: Post,
          as: 'posts',
          where: { deleted: false },
          required: false,
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
    
    // Get total translations for each post
    for (let i = 0; i < block.posts.length; i++) {
      const translationCount = await sequelize.models.PostTranslation.count({
        where: {
          post_id: block.posts[i].id,
          deleted: false
        }
      });
      
      block.posts[i].dataValues.translationCount = translationCount;
    }
    
    res.json(block);
  } catch (error) {
    console.error('Error getting block:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Create a new block
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createBlock = async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { id: communityId } = req.params;
  const { title, date, generate_post } = req.body;
  
  const transaction = await sequelize.transaction();
  
  try {
    // Find the community
    const community = await Community.findByPk(communityId);
    
    if (!community) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Community not found' });
    }
    
    // Check if user has permission (owner or moderator)
    if (community.owner_id !== req.user.id) {
      const membership = await UserCommunity.findOne({
        where: {
          user_id: req.user.id,
          community_id: communityId,
          role: 'moderator',
          deleted: false
        }
      });
      
      if (!membership) {
        await transaction.rollback();
        return res.status(403).json({ message: 'You do not have permission to create blocks in this community' });
      }
    }
    
    // Check if block with same date already exists
    const blockDate = new Date(date);
    const existingBlock = await Block.findOne({
      where: {
        community_id: communityId,
        date: blockDate,
        deleted: false
      }
    });
    
    if (existingBlock) {
      await transaction.rollback();
      return res.status(400).json({ message: 'A block for this date already exists in this community' });
    }
    
    // Get schedule if available (for auto-generated content)
    const schedule = await CommunitySchedule.findOne({
      where: {
        community_id: communityId,
        is_active: true,
        deleted: false
      }
    });
    
    // Create the block
    const block = await Block.create({
      community_id: communityId,
      title,
      date: blockDate,
      is_auto_generated: false,
      schedule_id: schedule ? schedule.id : null
    }, { transaction });
    
    // Handle auto-generated post if requested
    if (generate_post && schedule && schedule.auto_gen_post) {
      try {
        // Get default language (English)
        const defaultLanguage = await Language.findOne({
          where: {
            code: 'en',
            is_active: true
          }
        });
        
        if (defaultLanguage) {
          // Generate post content using AI
          const content = await aiService.generatePostContent(
            title,
            schedule.post_prompt || '',
            schedule.word_limit_min,
            schedule.word_limit_max,
            'English'
          );
          
          // Create the post
          await Post.create({
            block_id: block.id,
            user_id: req.user.id,
            title: `${title} - Auto Generated`,
            content,
            language_id: defaultLanguage.id,
            is_auto_generated: true
          }, { transaction });
        }
      } catch (aiError) {
        console.error('Error generating post content:', aiError);
        // Continue without auto-generated post
      }
    }
    
    await transaction.commit();
    
    // Get the created block with any posts
    const createdBlock = await Block.findByPk(block.id, {
      include: [
        {
          model: Post,
          as: 'posts',
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
        }
      ]
    });
    
    res.status(201).json({
      message: 'Block created successfully',
      block: createdBlock
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating block:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update a block
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateBlock = async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { id } = req.params;
  const { title } = req.body;
  
  try {
    // Find the block
    const block = await Block.findOne({
      where: { id, deleted: false },
      include: [
        {
          model: Community,
          as: 'community',
          attributes: ['id', 'owner_id']
        }
      ]
    });
    
    if (!block) {
      return res.status(404).json({ message: 'Block not found' });
    }
    
    // Check if user has permission (owner or moderator)
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
        return res.status(403).json({ message: 'You do not have permission to update this block' });
      }
    }
    
    // Update the block
    await block.update({ title });
    
    res.json({
      message: 'Block updated successfully',
      block
    });
  } catch (error) {
    console.error('Error updating block:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Delete a block
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteBlock = async (req, res) => {
  const { id } = req.params;
  
  const transaction = await sequelize.transaction();
  
  try {
    // Find the block
    const block = await Block.findOne({
      where: { id, deleted: false },
      include: [
        {
          model: Community,
          as: 'community',
          attributes: ['id', 'owner_id']
        }
      ]
    });
    
    if (!block) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Block not found' });
    }
    
    // Check if user has permission (owner or moderator)
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
        await transaction.rollback();
        return res.status(403).json({ message: 'You do not have permission to delete this block' });
      }
    }
    
    // Soft delete the block
    await block.update({ deleted: true, deleted_at: new Date() }, { transaction });
    
    // Soft delete associated posts would be handled by a cascade job
    
    await transaction.commit();
    
    res.json({ message: 'Block deleted successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting block:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 