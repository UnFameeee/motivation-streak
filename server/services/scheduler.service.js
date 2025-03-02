const cron = require('node-cron');
const { 
  CommunitySchedule, 
  Community, 
  Block, 
  Post,
  Language 
} = require('../database/models');
const { Op } = require('sequelize');
const moment = require('moment-timezone');
const aiService = require('./ai.service');

class SchedulerService {
  constructor() {
    this.jobs = {};
    this.initialized = false;
  }

  /**
   * Initialize the scheduler
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    // Schedule a job to check for community schedules every minute
    cron.schedule('* * * * *', async () => {
      try {
        await this.checkAndExecuteSchedules();
      } catch (error) {
        console.error('Error executing scheduled tasks:', error);
      }
    });

    this.initialized = true;
    console.log('Scheduler service initialized');
  }

  /**
   * Check for schedules that need to be executed
   */
  async checkAndExecuteSchedules() {
    try {
      // Get all active schedules
      const schedules = await CommunitySchedule.findAll({
        where: { deleted: false },
        include: [
          {
            model: Community,
            where: { deleted: false, is_active: true }
          }
        ]
      });

      // Current time
      const now = new Date();

      // Check each schedule
      for (const schedule of schedules) {
        await this.checkAndExecuteSchedule(schedule, now);
      }
    } catch (error) {
      console.error('Error checking schedules:', error);
    }
  }

  /**
   * Check if a specific schedule needs to be executed
   * @param {Object} schedule - CommunitySchedule object
   * @param {Date} now - Current time
   */
  async checkAndExecuteSchedule(schedule, now) {
    try {
      // Parse schedule time
      const [hour, minute] = schedule.time.split(':').map(Number);
      
      // Get current time in the schedule's timezone
      const currentTimeInTz = moment().tz(schedule.timezone);
      const scheduleTimeInTz = moment().tz(schedule.timezone).hour(hour).minute(minute).second(0);
      
      // Calculate time difference in minutes
      const diffMinutes = Math.abs(currentTimeInTz.diff(scheduleTimeInTz, 'minutes'));
      
      // If the current time is within 1 minute of the scheduled time
      if (diffMinutes <= 1) {
        // Check if this schedule has already been executed today
        const lastBlock = await Block.findOne({
          where: {
            community_id: schedule.community_id,
            is_auto_generated: true,
            deleted: false
          },
          order: [['created_at', 'DESC']]
        });
        
        if (lastBlock) {
          const lastBlockDate = moment(lastBlock.created_at).tz(schedule.timezone);
          const today = moment().tz(schedule.timezone);
          
          // Check if block was created today or according to the schedule period
          if (this.shouldCreateNewBlock(lastBlockDate, today, schedule.period)) {
            console.log(`Executing schedule for community ${schedule.community_id}`);
            await this.executeSchedule(schedule);
          }
        } else {
          // No previous block, create the first one
          console.log(`Creating first block for community ${schedule.community_id}`);
          await this.executeSchedule(schedule);
        }
      }
    } catch (error) {
      console.error(`Error checking schedule ${schedule.id}:`, error);
    }
  }

  /**
   * Check if a new block should be created based on the last block date and period
   * @param {Moment} lastBlockDate - Date of the last created block
   * @param {Moment} currentDate - Current date
   * @param {string} period - Schedule period (daily, weekly, monthly)
   * @returns {boolean} True if a new block should be created
   */
  shouldCreateNewBlock(lastBlockDate, currentDate, period) {
    switch(period) {
      case 'daily':
        return !lastBlockDate.isSame(currentDate, 'day');
      case 'weekly':
        return !lastBlockDate.isSame(currentDate, 'week');
      case 'monthly':
        return !lastBlockDate.isSame(currentDate, 'month');
      default:
        return true;
    }
  }

  /**
   * Execute a community schedule
   * @param {Object} schedule - CommunitySchedule object
   */
  async executeSchedule(schedule) {
    try {
      // Get community info
      const community = await Community.findByPk(schedule.community_id);
      if (!community || community.deleted) {
        console.error(`Community ${schedule.community_id} not found or deleted`);
        return;
      }

      // Generate block title
      let blockTitle;
      if (schedule.auto_gen_title) {
        // Use AI to generate title
        try {
          blockTitle = await aiService.generateTitle(schedule.title_prompt);
        } catch (error) {
          console.error('Error generating title with AI:', error);
          blockTitle = this.formatDate(new Date());
        }
      } else {
        // Use current date as title
        blockTitle = this.formatDate(new Date());
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

      console.log(`Created block: ${block.id} with title: ${blockTitle}`);

      // Create post if enabled
      if (schedule.auto_gen_post) {
        try {
          // Generate post content with AI
          const content = await aiService.generatePost(
            schedule.post_prompt,
            schedule.word_limit_min,
            schedule.word_limit_max
          );

          // Get default language
          const defaultLanguage = await Language.findOne({
            where: { code: 'en', deleted: false }
          });

          if (!defaultLanguage) {
            throw new Error('Default language not found');
          }

          // Create post
          const post = await Post.create({
            block_id: block.id,
            user_id: community.owner_id,
            title: `Auto-generated post for ${blockTitle}`,
            content: content,
            language_id: defaultLanguage.id,
            word_count: this.countWords(content),
            is_auto_generated: true,
            created_at: new Date(),
            updated_at: new Date(),
            deleted: false
          });

          console.log(`Created post: ${post.id} for block: ${block.id}`);
        } catch (error) {
          console.error('Error creating auto-generated post:', error);
        }
      }
    } catch (error) {
      console.error(`Error executing schedule for community ${schedule.community_id}:`, error);
    }
  }

  /**
   * Format date as DD-MM-YYYY
   * @param {Date} date - Date object
   * @returns {string} Formatted date
   */
  formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  /**
   * Count words in text
   * @param {string} text - Text to count words in
   * @returns {number} Word count
   */
  countWords(text) {
    return text.split(/\s+/).filter(Boolean).length;
  }
}

module.exports = new SchedulerService(); 