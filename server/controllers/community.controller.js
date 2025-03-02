const { validationResult } = require('express-validator');
const { 
  Community, 
  User, 
  UserCommunity, 
  CommunitySchedule, 
  Block, 
  sequelize 
} = require('../database/models');

/**
 * Get all communities
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getAllCommunities = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', filter = 'all' } = req.query;
    const offset = (page - 1) * limit;
    
    // Build query conditions
    const whereConditions = { deleted: false };
    
    // Filter by public/private
    if (filter === 'public') {
      whereConditions.is_public = true;
    } else if (filter === 'private') {
      whereConditions.is_public = false;
      
      // For private communities, only show those the user is a member of
      if (req.user) {
        whereConditions.id = {
          [Op.in]: sequelize.literal(`(
            SELECT community_id 
            FROM user_community 
            WHERE user_id = '${req.user.id}' AND deleted = false
          )`)
        };
      } else {
        // Non-authenticated users can't see private communities
        return res.json({
          communities: [],
          total: 0,
          page: parseInt(page),
          pages: 0
        });
      }
    }
    
    // Search by name or description
    if (search) {
      whereConditions[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    
    // Get communities with member count
    const { count, rows } = await Community.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'username', 'avatar']
        }
      ],
      attributes: {
        include: [
          [
            sequelize.literal(`(
              SELECT COUNT(*) 
              FROM user_community 
              WHERE community_id = Community.id AND deleted = false
            )`),
            'memberCount'
          ]
        ]
      },
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    // For each community, check if the current user is a member
    const communitiesWithMemberStatus = await Promise.all(rows.map(async (community) => {
      const communityData = community.get({ plain: true });
      
      if (req.user) {
        const membership = await UserCommunity.findOne({
          where: {
            user_id: req.user.id,
            community_id: community.id,
            deleted: false
          }
        });
        
        communityData.isMember = !!membership;
        communityData.memberRole = membership ? membership.role : null;
      } else {
        communityData.isMember = false;
        communityData.memberRole = null;
      }
      
      return communityData;
    }));
    
    res.json({
      communities: communitiesWithMemberStatus,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Error getting communities:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get a community by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getCommunityById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const community = await Community.findOne({
      where: { id, deleted: false },
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'username', 'avatar']
        },
        {
          model: CommunitySchedule,
          as: 'schedules',
          where: { deleted: false },
          required: false
        }
      ],
      attributes: {
        include: [
          [
            sequelize.literal(`(
              SELECT COUNT(*) 
              FROM user_community 
              WHERE community_id = '${id}' AND deleted = false
            )`),
            'memberCount'
          ]
        ]
      }
    });
    
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }
    
    // Check if community is private and if the user has access
    if (!community.is_public && req.user) {
      const membership = await UserCommunity.findOne({
        where: {
          user_id: req.user.id,
          community_id: id,
          deleted: false
        }
      });
      
      if (!membership && req.user.id !== community.owner_id) {
        return res.status(403).json({ message: 'This is a private community. You do not have access.' });
      }
    } else if (!community.is_public && !req.user) {
      return res.status(403).json({ message: 'This is a private community. Please log in to access.' });
    }
    
    // Get user membership status
    let memberStatus = {
      isMember: false,
      role: null
    };
    
    if (req.user) {
      const membership = await UserCommunity.findOne({
        where: {
          user_id: req.user.id,
          community_id: id,
          deleted: false
        }
      });
      
      if (membership) {
        memberStatus = {
          isMember: true,
          role: membership.role,
          joinedAt: membership.joined_at
        };
      }
    }
    
    // Get recent blocks
    const recentBlocks = await Block.findAll({
      where: { 
        community_id: id, 
        deleted: false 
      },
      order: [['date', 'DESC']],
      limit: 5,
      include: [
        {
          model: sequelize.models.Post,
          as: 'posts',
          attributes: ['id'],
          where: { deleted: false },
          required: false
        }
      ]
    });
    
    // Format response data
    const responseData = {
      ...community.get({ plain: true }),
      memberStatus,
      recentBlocks: recentBlocks.map(block => ({
        ...block.get({ plain: true }),
        postCount: block.posts ? block.posts.length : 0
      }))
    };
    
    res.json(responseData);
  } catch (error) {
    console.error('Error getting community:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Create a new community
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.createCommunity = async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { name, description, is_public } = req.body;
  
  const transaction = await sequelize.transaction();
  
  try {
    // Create the community
    const community = await Community.create({
      name,
      description,
      image_url: req.body.image_url || null,
      owner_id: req.user.id,
      is_public: is_public !== undefined ? is_public : true
    }, { transaction });
    
    // Add creator as a member with moderator role
    await UserCommunity.create({
      user_id: req.user.id,
      community_id: community.id,
      role: 'moderator',
      joined_at: new Date()
    }, { transaction });
    
    // Create default schedule if provided
    if (req.body.schedule) {
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
      } = req.body.schedule;
      
      await CommunitySchedule.create({
        community_id: community.id,
        time: time || '06:00:00',
        timezone: timezone || 'UTC',
        period: period || 'daily',
        auto_gen_title: auto_gen_title || false,
        title_prompt: title_prompt || null,
        auto_gen_post: auto_gen_post || false,
        post_prompt: post_prompt || null,
        word_limit_min: word_limit_min || 50,
        word_limit_max: word_limit_max || 1000,
        is_active: true
      }, { transaction });
    }
    
    await transaction.commit();
    
    // Get full community data with owner info
    const createdCommunity = await Community.findByPk(community.id, {
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'username', 'avatar']
        },
        {
          model: CommunitySchedule,
          as: 'schedules'
        }
      ]
    });
    
    res.status(201).json({
      message: 'Community created successfully',
      community: createdCommunity
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating community:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update a community
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateCommunity = async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { id } = req.params;
  const { name, description, image_url, is_public } = req.body;
  
  try {
    // Find the community
    const community = await Community.findByPk(id);
    
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }
    
    // Check if user has permission (owner or moderator)
    if (community.owner_id !== req.user.id) {
      const membership = await UserCommunity.findOne({
        where: {
          user_id: req.user.id,
          community_id: id,
          role: 'moderator',
          deleted: false
        }
      });
      
      if (!membership) {
        return res.status(403).json({ message: 'You do not have permission to update this community' });
      }
    }
    
    // Update the community
    await community.update({
      name: name || community.name,
      description: description !== undefined ? description : community.description,
      image_url: image_url !== undefined ? image_url : community.image_url,
      is_public: is_public !== undefined ? is_public : community.is_public
    });
    
    // Get updated community with owner info
    const updatedCommunity = await Community.findByPk(id, {
      include: [
        {
          model: User,
          as: 'owner',
          attributes: ['id', 'username', 'avatar']
        }
      ]
    });
    
    res.json({
      message: 'Community updated successfully',
      community: updatedCommunity
    });
  } catch (error) {
    console.error('Error updating community:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Delete a community
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteCommunity = async (req, res) => {
  const { id } = req.params;
  
  const transaction = await sequelize.transaction();
  
  try {
    // Find the community
    const community = await Community.findByPk(id);
    
    if (!community) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Community not found' });
    }
    
    // Check if user is the owner
    if (community.owner_id !== req.user.id) {
      await transaction.rollback();
      return res.status(403).json({ message: 'Only the owner can delete a community' });
    }
    
    // Soft delete the community
    await community.update({ deleted: true, deleted_at: new Date() }, { transaction });
    
    // Soft delete all related records
    await UserCommunity.update(
      { deleted: true, deleted_at: new Date() },
      { where: { community_id: id }, transaction }
    );
    
    await CommunitySchedule.update(
      { deleted: true, deleted_at: new Date() },
      { where: { community_id: id }, transaction }
    );
    
    // Soft delete blocks and related content would be handled by a separate cleanup job
    
    await transaction.commit();
    
    res.json({ message: 'Community deleted successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error('Error deleting community:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Join a community
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.joinCommunity = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Find the community
    const community = await Community.findByPk(id);
    
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }
    
    // Check if already a member
    const existingMembership = await UserCommunity.findOne({
      where: {
        user_id: req.user.id,
        community_id: id
      }
    });
    
    if (existingMembership) {
      if (existingMembership.deleted) {
        // Reactivate membership
        await existingMembership.update({
          deleted: false,
          deleted_at: null,
          joined_at: new Date()
        });
        
        return res.json({ message: 'Rejoined community successfully' });
      } else {
        return res.status(400).json({ message: 'You are already a member of this community' });
      }
    }
    
    // Check if community is private
    if (!community.is_public) {
      // For private communities, store as pending (would require approval)
      // This would need additional UI and API for approval workflow
      return res.status(403).json({ 
        message: 'This is a private community. Membership requests must be approved by a moderator.' 
      });
    }
    
    // Add user as a member
    await UserCommunity.create({
      user_id: req.user.id,
      community_id: id,
      role: 'member',
      joined_at: new Date()
    });
    
    res.json({ message: 'Joined community successfully' });
  } catch (error) {
    console.error('Error joining community:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Leave a community
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.leaveCommunity = async (req, res) => {
  const { id } = req.params;
  
  try {
    // Find the community
    const community = await Community.findByPk(id);
    
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }
    
    // Check if user is the owner
    if (community.owner_id === req.user.id) {
      return res.status(400).json({ message: 'Community owner cannot leave. Transfer ownership or delete the community instead.' });
    }
    
    // Find membership
    const membership = await UserCommunity.findOne({
      where: {
        user_id: req.user.id,
        community_id: id,
        deleted: false
      }
    });
    
    if (!membership) {
      return res.status(400).json({ message: 'You are not a member of this community' });
    }
    
    // Soft delete the membership
    await membership.update({
      deleted: true,
      deleted_at: new Date()
    });
    
    res.json({ message: 'Left community successfully' });
  } catch (error) {
    console.error('Error leaving community:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Create or update a community schedule
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateSchedule = async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { id } = req.params;
  const { 
    time, 
    timezone, 
    period, 
    auto_gen_title, 
    title_prompt, 
    auto_gen_post,
    post_prompt,
    word_limit_min,
    word_limit_max,
    is_active
  } = req.body;
  
  try {
    // Find the community
    const community = await Community.findByPk(id);
    
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }
    
    // Check permissions
    if (community.owner_id !== req.user.id) {
      const membership = await UserCommunity.findOne({
        where: {
          user_id: req.user.id,
          community_id: id,
          role: 'moderator',
          deleted: false
        }
      });
      
      if (!membership) {
        return res.status(403).json({ message: 'You do not have permission to update community schedules' });
      }
    }
    
    // Find existing schedule or create new one
    const [schedule, created] = await CommunitySchedule.findOrCreate({
      where: { 
        community_id: id,
        deleted: false
      },
      defaults: {
        time: time || '06:00:00',
        timezone: timezone || 'UTC',
        period: period || 'daily',
        auto_gen_title: auto_gen_title || false,
        title_prompt: title_prompt || null,
        auto_gen_post: auto_gen_post || false,
        post_prompt: post_prompt || null,
        word_limit_min: word_limit_min || 50,
        word_limit_max: word_limit_max || 1000,
        is_active: is_active !== undefined ? is_active : true
      }
    });
    
    if (!created) {
      // Update existing schedule
      await schedule.update({
        time: time || schedule.time,
        timezone: timezone || schedule.timezone,
        period: period || schedule.period,
        auto_gen_title: auto_gen_title !== undefined ? auto_gen_title : schedule.auto_gen_title,
        title_prompt: title_prompt !== undefined ? title_prompt : schedule.title_prompt,
        auto_gen_post: auto_gen_post !== undefined ? auto_gen_post : schedule.auto_gen_post,
        post_prompt: post_prompt !== undefined ? post_prompt : schedule.post_prompt,
        word_limit_min: word_limit_min || schedule.word_limit_min,
        word_limit_max: word_limit_max || schedule.word_limit_max,
        is_active: is_active !== undefined ? is_active : schedule.is_active
      });
    }
    
    res.json({
      message: created ? 'Schedule created successfully' : 'Schedule updated successfully',
      schedule: await CommunitySchedule.findByPk(schedule.id)
    });
  } catch (error) {
    console.error('Error updating community schedule:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get community members
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getCommunityMembers = async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 20, role } = req.query;
  const offset = (page - 1) * limit;
  
  try {
    // Find the community
    const community = await Community.findByPk(id);
    
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }
    
    // Check if community is private and user has access
    if (!community.is_public && req.user) {
      const membership = await UserCommunity.findOne({
        where: {
          user_id: req.user.id,
          community_id: id,
          deleted: false
        }
      });
      
      if (!membership && req.user.id !== community.owner_id) {
        return res.status(403).json({ message: 'This is a private community. You do not have access.' });
      }
    } else if (!community.is_public && !req.user) {
      return res.status(403).json({ message: 'This is a private community. Please log in to access.' });
    }
    
    // Build query conditions
    const whereConditions = { 
      community_id: id,
      deleted: false
    };
    
    if (role) {
      whereConditions.role = role;
    }
    
    // Get members with pagination
    const { count, rows } = await UserCommunity.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'avatar']
        }
      ],
      order: [
        ['role', 'ASC'], // Moderators first
        ['joined_at', 'ASC'] // Then by join date
      ],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    // Format response
    const members = rows.map(membership => ({
      id: membership.user.id,
      username: membership.user.username,
      avatar: membership.user.avatar,
      role: membership.role,
      joined_at: membership.joined_at,
      isOwner: membership.user.id === community.owner_id
    }));
    
    res.json({
      members,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Error getting community members:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 