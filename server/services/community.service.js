const { Op } = require('sequelize');
const db = require('../database/models');
const { generateBlockTitle, generatePostContent } = require('../utils/aiGenerator');

class CommunityService {
  /**
   * Create a new community
   * @param {string} userId - Creator's user ID
   * @param {Object} communityData - Community data
   * @returns {Object} - Created community
   */
  async createCommunity(userId, communityData) {
    try {
      const { name, description, image_url, is_public } = communityData;

      const community = await db.Community.create({
        name,
        description,
        image_url,
        owner_id: userId,
        is_public: is_public !== undefined ? is_public : true
      });

      // Add creator as a member with moderator role
      await db.UserCommunity.create({
        user_id: userId,
        community_id: community.id,
        role: 'moderator',
        joined_at: new Date()
      });

      return community;
    } catch (error) {
      console.error('Error creating community:', error);
      throw error;
    }
  }

  /**
   * Get communities with pagination, sorting, and filtering
   * @param {Object} options - Query options
   * @returns {Array} - List of communities
   */
  async getCommunities(options) {
    try {
      const {
        page = 1,
        limit = 10,
        sortField = 'created_at',
        sortOrder = 'DESC',
        search = '',
        userId = null,
        isPublic = null,
      } = options;

      const offset = (page - 1) * limit;
      
      const whereClause = {
        deleted: false,
      };

      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } }
        ];
      }

      if (isPublic !== null) {
        whereClause.is_public = isPublic;
      }

      // Query to get communities and count
      const { rows, count } = await db.Community.findAndCountAll({
        where: whereClause,
        order: [[sortField, sortOrder]],
        limit: parseInt(limit),
        offset: parseInt(offset),
        include: [
          {
            model: db.User,
            as: 'owner',
            attributes: ['id', 'username', 'avatar']
          },
          {
            model: db.UserCommunity,
            as: 'members',
            required: false,
            attributes: ['role', 'joined_at']
          }
        ],
        distinct: true
      });

      // Get member count for each community
      const communitiesWithMemberCount = await Promise.all(
        rows.map(async (community) => {
          const memberCount = await db.UserCommunity.count({
            where: {
              community_id: community.id,
              deleted: false
            }
          });

          // Check if user is a member
          let userMembership = null;
          if (userId) {
            userMembership = await db.UserCommunity.findOne({
              where: {
                community_id: community.id,
                user_id: userId,
                deleted: false
              }
            });
          }

          return {
            ...community.toJSON(),
            member_count: memberCount,
            is_member: !!userMembership,
            user_role: userMembership ? userMembership.role : null
          };
        })
      );

      return {
        communities: communitiesWithMemberCount,
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        total_pages: Math.ceil(count / limit)
      };
    } catch (error) {
      console.error('Error getting communities:', error);
      throw error;
    }
  }

  /**
   * Get community by ID
   * @param {string} communityId - Community ID
   * @param {string} userId - User ID (optional)
   * @returns {Object} - Community details
   */
  async getCommunityById(communityId, userId = null) {
    try {
      const community = await db.Community.findOne({
        where: {
          id: communityId,
          deleted: false
        },
        include: [
          {
            model: db.User,
            as: 'owner',
            attributes: ['id', 'username', 'avatar']
          },
          {
            model: db.CommunitySchedule,
            as: 'schedule',
            where: { deleted: false },
            required: false
          }
        ]
      });

      if (!community) {
        throw new Error('Community not found');
      }

      // Get member count
      const memberCount = await db.UserCommunity.count({
        where: {
          community_id: communityId,
          deleted: false
        }
      });

      // Check if user is a member
      let userMembership = null;
      if (userId) {
        userMembership = await db.UserCommunity.findOne({
          where: {
            community_id: communityId,
            user_id: userId,
            deleted: false
          }
        });
      }

      // Get recent blocks
      const recentBlocks = await db.Block.findAll({
        where: {
          community_id: communityId,
          deleted: false
        },
        order: [['date', 'DESC']],
        limit: 10,
        include: [
          {
            model: db.Post,
            as: 'posts',
            required: false,
            where: { deleted: false },
            include: [
              {
                model: db.User,
                as: 'author',
                attributes: ['id', 'username', 'avatar']
              }
            ]
          }
        ]
      });

      return {
        ...community.toJSON(),
        member_count: memberCount,
        is_member: !!userMembership,
        user_role: userMembership ? userMembership.role : null,
        recent_blocks: recentBlocks
      };
    } catch (error) {
      console.error(`Error getting community ${communityId}:`, error);
      throw error;
    }
  }

  /**
   * Update community
   * @param {string} communityId - Community ID
   * @param {string} userId - User ID
   * @param {Object} updateData - Update data
   * @returns {Object} - Updated community
   */
  async updateCommunity(communityId, userId, updateData) {
    try {
      const community = await db.Community.findByPk(communityId);

      if (!community) {
        throw new Error('Community not found');
      }

      // Check if user is owner or moderator
      const userMembership = await db.UserCommunity.findOne({
        where: {
          community_id: communityId,
          user_id: userId,
          role: { [Op.in]: ['moderator'] },
          deleted: false
        }
      });

      if (community.owner_id !== userId && !userMembership) {
        throw new Error('Unauthorized to update this community');
      }

      // Update fields
      const { name, description, image_url, is_public } = updateData;

      if (name !== undefined) community.name = name;
      if (description !== undefined) community.description = description;
      if (image_url !== undefined) community.image_url = image_url;
      if (is_public !== undefined) community.is_public = is_public;

      await community.save();

      return community;
    } catch (error) {
      console.error(`Error updating community ${communityId}:`, error);
      throw error;
    }
  }

  /**
   * Delete community
   * @param {string} communityId - Community ID
   * @param {string} userId - User ID
   * @returns {boolean} - Success status
   */
  async deleteCommunity(communityId, userId) {
    try {
      const community = await db.Community.findByPk(communityId);

      if (!community) {
        throw new Error('Community not found');
      }

      // Only owner can delete community
      if (community.owner_id !== userId) {
        throw new Error('Only the owner can delete this community');
      }

      community.deleted = true;
      community.deleted_at = new Date();
      await community.save();

      return true;
    } catch (error) {
      console.error(`Error deleting community ${communityId}:`, error);
      throw error;
    }
  }

  /**
   * Join community
   * @param {string} communityId - Community ID
   * @param {string} userId - User ID
   * @returns {Object} - Membership details
   */
  async joinCommunity(communityId, userId) {
    try {
      const community = await db.Community.findByPk(communityId);

      if (!community) {
        throw new Error('Community not found');
      }

      if (!community.is_public) {
        throw new Error('Cannot join private community directly');
      }

      // Check if already a member
      const existingMembership = await db.UserCommunity.findOne({
        where: {
          community_id: communityId,
          user_id: userId
        }
      });

      if (existingMembership) {
        if (existingMembership.deleted) {
          // Reactivate membership
          existingMembership.deleted = false;
          existingMembership.deleted_at = null;
          await existingMembership.save();
          return existingMembership;
        }
        throw new Error('Already a member of this community');
      }

      // Create new membership
      const membership = await db.UserCommunity.create({
        community_id: communityId,
        user_id: userId,
        role: 'member',
        joined_at: new Date()
      });

      // Notify community owner
      await db.Notification.create({
        user_id: community.owner_id,
        type: 'new_member',
        content: `A new user has joined your community "${community.name}"`,
        is_read: false,
        reference_id: membership.id
      });

      return membership;
    } catch (error) {
      console.error(`Error joining community ${communityId}:`, error);
      throw error;
    }
  }

  /**
   * Leave community
   * @param {string} communityId - Community ID
   * @param {string} userId - User ID
   * @returns {boolean} - Success status
   */
  async leaveCommunity(communityId, userId) {
    try {
      const community = await db.Community.findByPk(communityId);

      if (!community) {
        throw new Error('Community not found');
      }

      // Cannot leave if you're the owner
      if (community.owner_id === userId) {
        throw new Error('Owner cannot leave the community');
      }

      const membership = await db.UserCommunity.findOne({
        where: {
          community_id: communityId,
          user_id: userId,
          deleted: false
        }
      });

      if (!membership) {
        throw new Error('Not a member of this community');
      }

      membership.deleted = true;
      membership.deleted_at = new Date();
      await membership.save();

      return true;
    } catch (error) {
      console.error(`Error leaving community ${communityId}:`, error);
      throw error;
    }
  }

  /**
   * Create or update community schedule
   * @param {string} communityId - Community ID
   * @param {string} userId - User ID
   * @param {Object} scheduleData - Schedule data
   * @returns {Object} - Created or updated schedule
   */
  async updateCommunitySchedule(communityId, userId, scheduleData) {
    try {
      const community = await db.Community.findByPk(communityId);

      if (!community) {
        throw new Error('Community not found');
      }

      // Check if user is owner or moderator
      const userMembership = await db.UserCommunity.findOne({
        where: {
          community_id: communityId,
          user_id: userId,
          role: { [Op.in]: ['moderator'] },
          deleted: false
        }
      });

      if (community.owner_id !== userId && !userMembership) {
        throw new Error('Unauthorized to update community schedule');
      }

      // Find existing schedule or create new one
      let schedule = await db.CommunitySchedule.findOne({
        where: {
          community_id: communityId,
          deleted: false
        }
      });

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
      } = scheduleData;

      if (!schedule) {
        // Create new schedule
        schedule = await db.CommunitySchedule.create({
          community_id: communityId,
          time,
          timezone,
          period,
          auto_gen_title,
          title_prompt,
          auto_gen_post,
          post_prompt,
          word_limit_min: word_limit_min || 50,
          word_limit_max: word_limit_max || 1000
        });
      } else {
        // Update existing schedule
        if (time !== undefined) schedule.time = time;
        if (timezone !== undefined) schedule.timezone = timezone;
        if (period !== undefined) schedule.period = period;
        if (auto_gen_title !== undefined) schedule.auto_gen_title = auto_gen_title;
        if (title_prompt !== undefined) schedule.title_prompt = title_prompt;
        if (auto_gen_post !== undefined) schedule.auto_gen_post = auto_gen_post;
        if (post_prompt !== undefined) schedule.post_prompt = post_prompt;
        if (word_limit_min !== undefined) schedule.word_limit_min = word_limit_min;
        if (word_limit_max !== undefined) schedule.word_limit_max = word_limit_max;

        await schedule.save();
      }

      return schedule;
    } catch (error) {
      console.error(`Error updating community schedule for ${communityId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new block in community
   * @param {string} communityId - Community ID
   * @param {string} userId - User ID
   * @param {Object} blockData - Block data
   * @returns {Object} - Created block
   */
  async createBlock(communityId, userId, blockData) {
    try {
      const community = await db.Community.findByPk(communityId);

      if (!community) {
        throw new Error('Community not found');
      }

      // Check if user is owner or moderator
      const userMembership = await db.UserCommunity.findOne({
        where: {
          community_id: communityId,
          user_id: userId,
          role: { [Op.in]: ['moderator'] },
          deleted: false
        }
      });

      if (community.owner_id !== userId && !userMembership) {
        throw new Error('Unauthorized to create block in this community');
      }

      const { title, date, is_auto_generated = false } = blockData;

      // Create the block
      const block = await db.Block.create({
        community_id: communityId,
        title,
        date: date || new Date(),
        is_auto_generated
      });

      return block;
    } catch (error) {
      console.error(`Error creating block in community ${communityId}:`, error);
      throw error;
    }
  }

  /**
   * Get blocks for a community with pagination
   * @param {string} communityId - Community ID
   * @param {Object} options - Query options
   * @returns {Array} - List of blocks
   */
  async getBlocksByCommunity(communityId, options) {
    try {
      const {
        page = 1,
        limit = 10,
        sortField = 'date',
        sortOrder = 'DESC',
        startDate,
        endDate,
      } = options;

      const offset = (page - 1) * limit;
      
      const whereClause = {
        community_id: communityId,
        deleted: false
      };

      if (startDate && endDate) {
        whereClause.date = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      } else if (startDate) {
        whereClause.date = {
          [Op.gte]: new Date(startDate)
        };
      } else if (endDate) {
        whereClause.date = {
          [Op.lte]: new Date(endDate)
        };
      }

      const { rows, count } = await db.Block.findAndCountAll({
        where: whereClause,
        order: [[sortField, sortOrder]],
        limit: parseInt(limit),
        offset: parseInt(offset),
        include: [
          {
            model: db.Post,
            as: 'posts',
            required: false,
            where: { deleted: false },
            include: [
              {
                model: db.User,
                as: 'author',
                attributes: ['id', 'username', 'avatar']
              },
              {
                model: db.Language,
                as: 'language'
              },
              {
                model: db.PostTranslation,
                as: 'translations',
                required: false,
                where: { deleted: false },
                include: [
                  {
                    model: db.User,
                    as: 'translator',
                    attributes: ['id', 'username', 'avatar']
                  },
                  {
                    model: db.Language,
                    as: 'language'
                  }
                ]
              }
            ]
          }
        ],
        distinct: true
      });

      return {
        blocks: rows,
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        total_pages: Math.ceil(count / limit)
      };
    } catch (error) {
      console.error(`Error getting blocks for community ${communityId}:`, error);
      throw error;
    }
  }

  /**
   * Get block by ID
   * @param {string} blockId - Block ID
   * @returns {Object} - Block details
   */
  async getBlockById(blockId) {
    try {
      const block = await db.Block.findOne({
        where: {
          id: blockId,
          deleted: false
        },
        include: [
          {
            model: db.Community,
            as: 'community'
          },
          {
            model: db.Post,
            as: 'posts',
            where: { deleted: false },
            required: false,
            include: [
              {
                model: db.User,
                as: 'author',
                attributes: ['id', 'username', 'avatar']
              },
              {
                model: db.Language,
                as: 'language'
              },
              {
                model: db.PostTranslation,
                as: 'translations',
                where: { deleted: false },
                required: false,
                include: [
                  {
                    model: db.User,
                    as: 'translator',
                    attributes: ['id', 'username', 'avatar']
                  },
                  {
                    model: db.Language,
                    as: 'language'
                  },
                  {
                    model: db.PostScore,
                    as: 'scores',
                    where: { deleted: false },
                    required: false
                  },
                  {
                    model: db.Comment,
                    as: 'comments',
                    where: { deleted: false },
                    required: false,
                    include: [
                      {
                        model: db.User,
                        as: 'commenter',
                        attributes: ['id', 'username', 'avatar']
                      }
                    ]
                  },
                  {
                    model: db.Highlight,
                    as: 'highlights',
                    where: { deleted: false },
                    required: false,
                    include: [
                      {
                        model: db.User,
                        as: 'creator',
                        attributes: ['id', 'username', 'avatar']
                      },
                      {
                        model: db.HighlightComment,
                        as: 'comments',
                        where: { deleted: false },
                        required: false,
                        include: [
                          {
                            model: db.User,
                            as: 'commenter',
                            attributes: ['id', 'username', 'avatar']
                          }
                        ]
                      }
                    ]
                  }
                ]
              },
              {
                model: db.Highlight,
                as: 'highlights',
                where: { deleted: false },
                required: false,
                include: [
                  {
                    model: db.User,
                    as: 'creator',
                    attributes: ['id', 'username', 'avatar']
                  },
                  {
                    model: db.HighlightComment,
                    as: 'comments',
                    where: { deleted: false },
                    required: false,
                    include: [
                      {
                        model: db.User,
                        as: 'commenter',
                        attributes: ['id', 'username', 'avatar']
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      });

      if (!block) {
        throw new Error('Block not found');
      }

      return block;
    } catch (error) {
      console.error(`Error getting block ${blockId}:`, error);
      throw error;
    }
  }

  /**
   * Update block
   * @param {string} blockId - Block ID
   * @param {string} userId - User ID
   * @param {Object} updateData - Update data
   * @returns {Object} - Updated block
   */
  async updateBlock(blockId, userId, updateData) {
    try {
      const block = await db.Block.findOne({
        where: {
          id: blockId,
          deleted: false
        },
        include: [
          {
            model: db.Community,
            as: 'community'
          }
        ]
      });

      if (!block) {
        throw new Error('Block not found');
      }

      // Check if user is owner or moderator of the community
      const userMembership = await db.UserCommunity.findOne({
        where: {
          community_id: block.community_id,
          user_id: userId,
          role: { [Op.in]: ['moderator'] },
          deleted: false
        }
      });

      if (block.community.owner_id !== userId && !userMembership) {
        throw new Error('Unauthorized to update this block');
      }

      const { title, date } = updateData;

      if (title !== undefined) block.title = title;
      if (date !== undefined) block.date = new Date(date);

      await block.save();

      return block;
    } catch (error) {
      console.error(`Error updating block ${blockId}:`, error);
      throw error;
    }
  }

  /**
   * Delete block
   * @param {string} blockId - Block ID
   * @param {string} userId - User ID
   * @returns {boolean} - Success status
   */
  async deleteBlock(blockId, userId) {
    try {
      const block = await db.Block.findOne({
        where: {
          id: blockId,
          deleted: false
        },
        include: [
          {
            model: db.Community,
            as: 'community'
          }
        ]
      });

      if (!block) {
        throw new Error('Block not found');
      }

      // Check if user is owner or moderator of the community
      const userMembership = await db.UserCommunity.findOne({
        where: {
          community_id: block.community_id,
          user_id: userId,
          role: { [Op.in]: ['moderator'] },
          deleted: false
        }
      });

      if (block.community.owner_id !== userId && !userMembership) {
        throw new Error('Unauthorized to delete this block');
      }

      block.deleted = true;
      block.deleted_at = new Date();
      await block.save();

      return true;
    } catch (error) {
      console.error(`Error deleting block ${blockId}:`, error);
      throw error;
    }
  }

  /**
   * Run scheduled tasks for all communities
   * Creates blocks and posts based on schedules
   */
  async runScheduledTasks() {
    try {
      const schedules = await db.CommunitySchedule.findAll({
        where: { deleted: false },
        include: [
          {
            model: db.Community,
            as: 'community',
            where: { deleted: false }
          }
        ]
      });

      const now = new Date();
      
      for (const schedule of schedules) {
        // Parse schedule time
        const [hours, minutes] = schedule.time.split(':').map(Number);
        const scheduledTime = new Date();
        scheduledTime.setHours(hours, minutes, 0, 0);
        
        // Convert to timezone
        const userTimezone = schedule.timezone || 'UTC';
        const tzOffset = new Date().toLocaleString('en-US', { timeZone: userTimezone, hour: 'numeric' });
        const nowInTz = new Date(now.toLocaleString('en-US', { timeZone: userTimezone }));
        
        // Check if it's time to run the schedule
        const shouldRun = this.shouldRunSchedule(schedule.period, nowInTz, scheduledTime);
        
        if (shouldRun) {
          // Check if block already exists for this date
          const blockDate = new Date(nowInTz.getFullYear(), nowInTz.getMonth(), nowInTz.getDate());
          
          const existingBlock = await db.Block.findOne({
            where: {
              community_id: schedule.community_id,
              date: blockDate,
              deleted: false
            }
          });
          
          if (!existingBlock) {
            // Generate block title if needed
            let blockTitle = new Date().toLocaleDateString('en-US', { 
              day: '2-digit', 
              month: '2-digit', 
              year: 'numeric' 
            });
            
            if (schedule.auto_gen_title) {
              blockTitle = await generateBlockTitle(schedule.title_prompt, blockDate);
            }
            
            // Create new block
            const block = await db.Block.create({
              community_id: schedule.community_id,
              title: blockTitle,
              date: blockDate,
              is_auto_generated: true
            });
            
            // Generate post if needed
            if (schedule.auto_gen_post) {
              const languages = await db.Language.findAll({
                where: { is_active: true, deleted: false },
                limit: 1
              });
              
              if (languages.length > 0) {
                const content = await generatePostContent(
                  schedule.post_prompt,
                  schedule.word_limit_min,
                  schedule.word_limit_max
                );
                
                // Create auto-generated post
                await db.Post.create({
                  block_id: block.id,
                  user_id: schedule.community.owner_id,
                  title: `Auto-generated post for ${blockDate.toLocaleDateString()}`,
                  content,
                  language_id: languages[0].id,
                  word_count: content.split(/\s+/).length,
                  is_auto_generated: true
                });
              }
            }
            
            console.log(`Created new block for community ${schedule.community_id}`);
          }
        }
      }
      
      console.log('Scheduled tasks completed');
    } catch (error) {
      console.error('Error running scheduled tasks:', error);
      throw error;
    }
  }
  
  /**
   * Determine if a schedule should run based on period
   * @param {string} period - Schedule period (daily, weekly, etc.)
   * @param {Date} currentDate - Current date
   * @param {Date} scheduledTime - Scheduled time
   * @returns {boolean} - Whether the schedule should run
   */
  shouldRunSchedule(period, currentDate, scheduledTime) {
    const currentHours = currentDate.getHours();
    const currentMinutes = currentDate.getMinutes();
    const scheduledHours = scheduledTime.getHours();
    const scheduledMinutes = scheduledTime.getMinutes();
    
    // Within 5 minutes of scheduled time
    const isWithinTimeWindow = 
      (currentHours === scheduledHours && Math.abs(currentMinutes - scheduledMinutes) <= 5) ||
      (currentHours === scheduledHours + 1 && scheduledMinutes >= 55 && currentMinutes <= 5);
    
    if (!isWithinTimeWindow) {
      return false;
    }
    
    switch (period) {
      case 'daily':
        return true;
        
      case 'weekly':
        // Run on Mondays
        return currentDate.getDay() === 1;
        
      case 'monthly':
        // Run on the 1st of the month
        return currentDate.getDate() === 1;
        
      default:
        return false;
    }
  }
}

module.exports = new CommunityService(); 