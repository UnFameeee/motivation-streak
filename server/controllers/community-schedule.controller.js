const { 
  CommunitySchedule, 
  Community, 
  Block, 
  Post, 
  User, 
  Language,
  UserCommunity 
} = require('../database/models');
const { validationResult } = require('express-validator');
const aiService = require('../services/ai.service');

/**
 * Get community schedule
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.getCommunitySchedule = async (req, res) => {
  try {
    const { communityId } = req.params;
    const userId = req.user.id;

    // Check if community exists
    const community = await Community.findOne({
      where: { id: communityId, deleted: false }
    });

    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Check if user is member of community
    const userCommunity = await UserCommunity.findOne({
      where: { user_id: userId, community_id: communityId, deleted: false }
    });

    if (!userCommunity && community.owner_id !== userId) {
      return res.status(403).json({ message: 'You are not a member of this community' });
    }

    // Get schedule
    const schedule = await CommunitySchedule.findOne({
      where: { community_id: communityId, deleted: false }
    });

    if (!schedule) {
      return res.status(404).json({ message: 'No schedule found for this community' });
    }

    res.json(schedule);
  } catch (err) {
    console.error('Error in getCommunitySchedule:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Create or update community schedule
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.createOrUpdateCommunitySchedule = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { communityId } = req.params;
    const userId = req.user.id;
    const {
      time,
      timezone,
      period,
      auto_gen_title,
      title_prompt,
      auto_gen_post,
      post_prompt,
      word_limit_min,
      word_limit_max
    } = req.body;

    // Check if community exists
    const community = await Community.findOne({
      where: { id: communityId, deleted: false }
    });

    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Check if user is admin or owner
    const userCommunity = await UserCommunity.findOne({
      where: { user_id: userId, community_id: communityId, deleted: false }
    });

    if ((userCommunity && userCommunity.role !== 'admin') && community.owner_id !== userId) {
      return res.status(403).json({ 
        message: 'Only community admins or owners can manage schedules' 
      });
    }

    // Validate inputs
    if (auto_gen_title && !title_prompt) {
      return res.status(400).json({ 
        message: 'Title prompt is required when auto-generating titles' 
      });
    }

    if (auto_gen_post && !post_prompt) {
      return res.status(400).json({ 
        message: 'Post prompt is required when auto-generating posts' 
      });
    }

    if (word_limit_min > word_limit_max) {
      return res.status(400).json({ 
        message: 'Minimum word limit must be less than maximum word limit' 
      });
    }

    // Find or create schedule
    let schedule = await CommunitySchedule.findOne({
      where: { community_id: communityId, deleted: false }
    });

    if (schedule) {
      // Update existing schedule
      await schedule.update({
        time,
        timezone,
        period,
        auto_gen_title,
        title_prompt,
        auto_gen_post,
        post_prompt,
        word_limit_min,
        word_limit_max,
        updated_at: new Date()
      });
    } else {
      // Create new schedule
      schedule = await CommunitySchedule.create({
        community_id: communityId,
        time,
        timezone,
        period,
        auto_gen_title,
        title_prompt,
        auto_gen_post,
        post_prompt,
        word_limit_min,
        word_limit_max,
        created_at: new Date(),
        updated_at: new Date(),
        deleted: false
      });
    }

    res.json({
      message: 'Community schedule updated successfully',
      schedule
    });
  } catch (err) {
    console.error('Error in createOrUpdateCommunitySchedule:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Delete community schedule
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.deleteCommunitySchedule = async (req, res) => {
  try {
    const { communityId } = req.params;
    const userId = req.user.id;

    // Check if community exists
    const community = await Community.findOne({
      where: { id: communityId, deleted: false }
    });

    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Check if user is admin or owner
    const userCommunity = await UserCommunity.findOne({
      where: { user_id: userId, community_id: communityId, deleted: false }
    });

    if ((userCommunity && userCommunity.role !== 'admin') && community.owner_id !== userId) {
      return res.status(403).json({ 
        message: 'Only community admins or owners can manage schedules' 
      });
    }

    // Find schedule
    const schedule = await CommunitySchedule.findOne({
      where: { community_id: communityId, deleted: false }
    });

    if (!schedule) {
      return res.status(404).json({ message: 'No schedule found for this community' });
    }

    // Soft delete the schedule
    await schedule.update({
      deleted: true,
      deleted_at: new Date()
    });

    res.json({ message: 'Community schedule deleted successfully' });
  } catch (err) {
    console.error('Error in deleteCommunitySchedule:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Execute schedule to create blocks and posts
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.executeSchedule = async (req, res) => {
  try {
    const { communityId } = req.params;
    const userId = req.user.id;

    // Check if community exists
    const community = await Community.findOne({
      where: { id: communityId, deleted: false }
    });

    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Check if user is admin or owner
    const userCommunity = await UserCommunity.findOne({
      where: { user_id: userId, community_id: communityId, deleted: false }
    });

    if ((userCommunity && userCommunity.role !== 'admin') && community.owner_id !== userId) {
      return res.status(403).json({ 
        message: 'Only community admins or owners can execute schedules' 
      });
    }

    // Find schedule
    const schedule = await CommunitySchedule.findOne({
      where: { community_id: communityId, deleted: false }
    });

    if (!schedule) {
      return res.status(404).json({ message: 'No schedule found for this community' });
    }

    // Execute schedule
    const result = await executeScheduleForCommunity(schedule, community);

    res.json({
      message: 'Schedule executed successfully',
      block: result.block,
      post: result.post
    });
  } catch (err) {
    console.error('Error in executeSchedule:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Execute schedule to create blocks and posts
 * @param {Object} schedule - CommunitySchedule object
 * @param {Object} community - Community object
 * @returns {Object} Created block and post
 */
const executeScheduleForCommunity = async (schedule, community) => {
  // Generate block title
  let blockTitle;
  if (schedule.auto_gen_title) {
    // Use AI to generate title
    const aiPrompt = schedule.title_prompt;
    try {
      const aiResponse = await aiService.generateText(aiPrompt, 100);
      blockTitle = aiResponse.trim();
    } catch (error) {
      console.error('Error generating title with AI:', error);
      blockTitle = formatDate(new Date());
    }
  } else {
    // Use current date as title
    blockTitle = formatDate(new Date());
  }

  // Create block
  const block = await Block.create({
    community_id: community.id,
    title: blockTitle,
    date: new Date(),
    is_auto_generated: true,
    created_at: new Date(),
    updated_at: new Date(),
    deleted: false
  });

  let post = null;
  if (schedule.auto_gen_post) {
    // Use AI to generate post content
    const aiPrompt = `${schedule.post_prompt}. Please write a post between ${schedule.word_limit_min} and ${schedule.word_limit_max} words.`;
    try {
      const aiResponse = await aiService.generateText(aiPrompt, schedule.word_limit_max * 10);
      const postContent = aiResponse.trim();
      
      // Get default language
      const defaultLanguage = await Language.findOne({
        where: { code: 'en', deleted: false }
      });
      
      if (!defaultLanguage) {
        throw new Error('Default language not found');
      }
      
      // Create post
      post = await Post.create({
        block_id: block.id,
        user_id: community.owner_id,
        title: `Auto-generated post for ${blockTitle}`,
        content: postContent,
        language_id: defaultLanguage.id,
        word_count: countWords(postContent),
        is_auto_generated: true,
        created_at: new Date(),
        updated_at: new Date(),
        deleted: false
      });
    } catch (error) {
      console.error('Error generating post with AI:', error);
    }
  }

  return { block, post };
};

/**
 * Format date as DD-MM-YYYY
 * @param {Date} date - Date object
 * @returns {string} Formatted date
 */
const formatDate = (date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

/**
 * Count words in text
 * @param {string} text - Text to count words in
 * @returns {number} Word count
 */
const countWords = (text) => {
  return text.split(/\s+/).filter(Boolean).length;
}; 