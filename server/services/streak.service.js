const { 
  User, 
  Streak, 
  TranslationRank, 
  WritingRank,
  DangTier, 
  CanhConTier, 
  DaiCanhGioiTier,
  TranslationRankHistory,
  WritingRankHistory,
  RankConstant,
  UserActivity,
  sequelize
} = require('../database/models');
const moment = require('moment-timezone');
const { Op } = require('sequelize');
const { calculateRank } = require('../utils/rankCalculator');

/**
 * Check and update user streak
 * @param {String} userId - User ID
 * @param {String} activityType - 'translation' or 'writing'
 * @param {Date} activityDate - Activity date
 */
exports.updateStreak = async (userId, activityType, activityDate = new Date()) => {
  try {
    if (!['translation', 'writing'].includes(activityType)) {
      throw new Error('Invalid activity type');
    }

    // Get current date in user's timezone
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const userTimezone = user.timezone || 'UTC';
    const today = new Date();
    const userDate = new Date(today.toLocaleString('en-US', { timeZone: userTimezone }));
    const currentDate = new Date(userDate.getFullYear(), userDate.getMonth(), userDate.getDate());

    // Check if activity already recorded for today
    const activityExists = await UserActivity.findOne({
      where: {
        user_id: userId,
        activity_type: activityType,
        activity_date: currentDate,
        deleted: false
      }
    });

    if (activityExists) {
      // Activity already recorded for today
      return { message: 'Activity already recorded for today' };
    }

    // Record new activity
    await UserActivity.create({
      user_id: userId,
      activity_type: activityType,
      activity_date: currentDate,
      reference_id: null // Will be updated later when linked to specific content
    });

    // Get user's streak
    let streak = await Streak.findOne({
      where: {
        user_id: userId,
        type: activityType,
        deleted: false
      }
    });

    if (!streak) {
      // Create new streak
      streak = await Streak.create({
        user_id: userId,
        type: activityType,
        current_count: 1,
        max_count: 1,
        last_date: currentDate,
        freeze_until: null,
        recovery_tasks_completed: 0
      });
    } else {
      // Calculate days difference
      const lastDate = new Date(streak.last_date);
      const diffTime = Math.abs(currentDate - lastDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Continue streak
        streak.current_count += 1;
        streak.last_date = currentDate;
        
        // Update max count if current is higher
        if (streak.current_count > streak.max_count) {
          streak.max_count = streak.current_count;
        }

        // Reset freeze if active
        if (streak.freeze_until) {
          streak.freeze_until = null;
          streak.recovery_tasks_completed = 0;
        }
      } else if (diffDays > 1) {
        // Check if freeze is active
        if (streak.freeze_until && new Date(streak.freeze_until) >= currentDate) {
          // Increment recovery tasks
          streak.recovery_tasks_completed += 1;
          
          // If completed 3 recovery tasks, restore streak
          if (streak.recovery_tasks_completed >= 3) {
            streak.last_date = currentDate;
            streak.freeze_until = null;
            streak.recovery_tasks_completed = 0;
          }
        } else if (diffDays <= 3) {
          // Activate freeze protection (2 days)
          const freezeDate = new Date(currentDate);
          freezeDate.setDate(freezeDate.getDate() + 2);
          streak.freeze_until = freezeDate;
          streak.recovery_tasks_completed = 1;
          streak.last_date = currentDate;
        } else {
          // Reset streak
          streak.current_count = 1;
          streak.last_date = currentDate;
          streak.freeze_until = null;
          streak.recovery_tasks_completed = 0;
        }
      }
      
      await streak.save();
    }

    // Update rank based on streak
    await this.updateRank(userId, activityType);

    return {
      current_streak: streak.current_count,
      max_streak: streak.max_count,
      last_date: streak.last_date,
      freeze_status: streak.freeze_until ? {
        active: true,
        until: streak.freeze_until,
        recovery_tasks_completed: streak.recovery_tasks_completed,
        remaining_tasks: 3 - streak.recovery_tasks_completed
      } : null
    };
  } catch (error) {
    console.error('Error updating streak:', error);
    throw error;
  }
};

/**
 * Calculate rank tier based on streak days
 * @param {Number} days - Streak days
 * @param {Number} constant - X or Y constant
 * @param {Array} dangTiers - Đẳng tiers
 * @param {Array} canhConTiers - Cảnh Con tiers
 * @param {Array} daiCanhGioiTiers - Đại Cảnh Giới tiers
 * @returns {Object} Calculated tiers
 */
exports.calculateRankTiers = async (days, constant, dangTiers, canhConTiers, daiCanhGioiTiers) => {
  // Get total number of tiers for each category
  const dangTotal = dangTiers.length;
  const canhConTotal = canhConTiers.length;
  const daiCanhGioiTotal = daiCanhGioiTiers.length;

  // Calculate Đẳng tier
  const dangDivisor = constant / dangTotal;
  const dangIndex = Math.floor((days / dangDivisor) % dangTotal);
  const dangTier = dangTiers[dangIndex] || dangTiers[0];

  // Calculate Cảnh Con tier
  const canhConDivisor = constant / dangTotal;
  const canhConIndex = Math.floor((days / canhConDivisor) % canhConTotal);
  const canhConTier = canhConTiers[canhConIndex] || canhConTiers[0];

  // Calculate Đại Cảnh Giới tier
  const daiCanhGioiDivisor = constant * daiCanhGioiTotal * canhConTotal;
  const daiCanhGioiIndex = Math.floor((days / daiCanhGioiDivisor) % daiCanhGioiTotal);
  const daiCanhGioiTier = daiCanhGioiTiers[daiCanhGioiIndex] || daiCanhGioiTiers[0];

  return {
    dangTier,
    canhConTier,
    daiCanhGioiTier
  };
};

/**
 * Update user's translation rank
 * @param {String} userId - User ID
 * @param {Number} days - Streak days
 */
exports.updateTranslationRank = async (userId, days) => {
  try {
    // Get all tiers
    const dangTiers = await DangTier.findAll({ order: [['order', 'ASC']] });
    const canhConTiers = await CanhConTier.findAll({ order: [['order', 'ASC']] });
    const daiCanhGioiTiers = await DaiCanhGioiTier.findAll({ order: [['order', 'ASC']] });
    
    // Get X constant
    const constantRecord = await RankConstant.findOne({ where: { type: 'X' } });
    const constant = constantRecord ? constantRecord.value : 3.0;
    
    // Calculate tiers
    const { dangTier, canhConTier, daiCanhGioiTier } = await this.calculateRankTiers(
      days, 
      constant, 
      dangTiers, 
      canhConTiers, 
      daiCanhGioiTiers
    );
    
    // Find or create rank
    const [rank, created] = await TranslationRank.findOrCreate({
      where: { user_id: userId },
      defaults: {
        dai_canh_gioi_tier_id: daiCanhGioiTier.id,
        canh_con_tier_id: canhConTier.id,
        dang_tier_id: dangTier.id,
        days_count: days,
        highest_dai_canh_gioi_tier_id: daiCanhGioiTier.id,
        highest_canh_con_tier_id: canhConTier.id,
        highest_dang_tier_id: dangTier.id,
        highest_days_count: days,
        last_update: new Date()
      }
    });
    
    if (!created) {
      const oldDaiCanhGioiTier = await DaiCanhGioiTier.findByPk(rank.dai_canh_gioi_tier_id);
      const oldCanhConTier = await CanhConTier.findByPk(rank.canh_con_tier_id);
      const oldDangTier = await DangTier.findByPk(rank.dang_tier_id);
      
      // Check if rank changed
      const rankChanged = (
        rank.dai_canh_gioi_tier_id !== daiCanhGioiTier.id ||
        rank.canh_con_tier_id !== canhConTier.id ||
        rank.dang_tier_id !== dangTier.id
      );
      
      // Determine if rank increased or decreased
      let changeType = null;
      if (rankChanged) {
        if (
          daiCanhGioiTier.order > oldDaiCanhGioiTier.order ||
          (daiCanhGioiTier.order === oldDaiCanhGioiTier.order && canhConTier.order > oldCanhConTier.order) ||
          (daiCanhGioiTier.order === oldDaiCanhGioiTier.order && canhConTier.order === oldCanhConTier.order && dangTier.order > oldDangTier.order)
        ) {
          changeType = 'increase';
        } else {
          changeType = 'decrease';
        }
      }
      
      // Update rank
      await rank.update({
        dai_canh_gioi_tier_id: daiCanhGioiTier.id,
        canh_con_tier_id: canhConTier.id,
        dang_tier_id: dangTier.id,
        days_count: days,
        highest_dai_canh_gioi_tier_id: 
          daiCanhGioiTier.order > rank.highest_dai_canh_gioi_tier_id.order ? 
          daiCanhGioiTier.id : rank.highest_dai_canh_gioi_tier_id,
        highest_canh_con_tier_id: 
          canhConTier.order > rank.highest_canh_con_tier_id.order ? 
          canhConTier.id : rank.highest_canh_con_tier_id,
        highest_dang_tier_id: 
          dangTier.order > rank.highest_dang_tier_id.order ? 
          dangTier.id : rank.highest_dang_tier_id,
        highest_days_count: Math.max(days, rank.highest_days_count),
        last_update: new Date()
      });
      
      // Add rank history if rank changed
      if (rankChanged && changeType) {
        await TranslationRankHistory.create({
          user_id: userId,
          dai_canh_gioi_tier_id: daiCanhGioiTier.id,
          canh_con_tier_id: canhConTier.id,
          dang_tier_id: dangTier.id,
          days_count: days,
          change_date: new Date(),
          change_type: changeType
        });
      }
    }
    
    return rank;
  } catch (error) {
    console.error('Error updating translation rank:', error);
    throw error;
  }
};

/**
 * Update user's writing rank
 * @param {String} userId - User ID
 * @param {Number} days - Streak days
 */
exports.updateWritingRank = async (userId, days) => {
  try {
    // Get all tiers
    const dangTiers = await DangTier.findAll({ order: [['order', 'ASC']] });
    const canhConTiers = await CanhConTier.findAll({ order: [['order', 'ASC']] });
    const daiCanhGioiTiers = await DaiCanhGioiTier.findAll({ order: [['order', 'ASC']] });
    
    // Get Y constant
    const constantRecord = await RankConstant.findOne({ where: { type: 'Y' } });
    const constant = constantRecord ? constantRecord.value : 3.0;
    
    // Calculate tiers
    const { dangTier, canhConTier, daiCanhGioiTier } = await this.calculateRankTiers(
      days, 
      constant, 
      dangTiers, 
      canhConTiers, 
      daiCanhGioiTiers
    );
    
    // Find or create rank
    const [rank, created] = await WritingRank.findOrCreate({
      where: { user_id: userId },
      defaults: {
        dai_canh_gioi_tier_id: daiCanhGioiTier.id,
        canh_con_tier_id: canhConTier.id,
        dang_tier_id: dangTier.id,
        days_count: days,
        highest_dai_canh_gioi_tier_id: daiCanhGioiTier.id,
        highest_canh_con_tier_id: canhConTier.id,
        highest_dang_tier_id: dangTier.id,
        highest_days_count: days,
        last_update: new Date()
      }
    });
    
    if (!created) {
      const oldDaiCanhGioiTier = await DaiCanhGioiTier.findByPk(rank.dai_canh_gioi_tier_id);
      const oldCanhConTier = await CanhConTier.findByPk(rank.canh_con_tier_id);
      const oldDangTier = await DangTier.findByPk(rank.dang_tier_id);
      
      // Check if rank changed
      const rankChanged = (
        rank.dai_canh_gioi_tier_id !== daiCanhGioiTier.id ||
        rank.canh_con_tier_id !== canhConTier.id ||
        rank.dang_tier_id !== dangTier.id
      );
      
      // Determine if rank increased or decreased
      let changeType = null;
      if (rankChanged) {
        if (
          daiCanhGioiTier.order > oldDaiCanhGioiTier.order ||
          (daiCanhGioiTier.order === oldDaiCanhGioiTier.order && canhConTier.order > oldCanhConTier.order) ||
          (daiCanhGioiTier.order === oldDaiCanhGioiTier.order && canhConTier.order === oldCanhConTier.order && dangTier.order > oldDangTier.order)
        ) {
          changeType = 'increase';
        } else {
          changeType = 'decrease';
        }
      }
      
      // Update rank
      await rank.update({
        dai_canh_gioi_tier_id: daiCanhGioiTier.id,
        canh_con_tier_id: canhConTier.id,
        dang_tier_id: dangTier.id,
        days_count: days,
        highest_dai_canh_gioi_tier_id: 
          daiCanhGioiTier.order > rank.highest_dai_canh_gioi_tier_id.order ? 
          daiCanhGioiTier.id : rank.highest_dai_canh_gioi_tier_id,
        highest_canh_con_tier_id: 
          canhConTier.order > rank.highest_canh_con_tier_id.order ? 
          canhConTier.id : rank.highest_canh_con_tier_id,
        highest_dang_tier_id: 
          dangTier.order > rank.highest_dang_tier_id.order ? 
          dangTier.id : rank.highest_dang_tier_id,
        highest_days_count: Math.max(days, rank.highest_days_count),
        last_update: new Date()
      });
      
      // Add rank history if rank changed
      if (rankChanged && changeType) {
        await WritingRankHistory.create({
          user_id: userId,
          dai_canh_gioi_tier_id: daiCanhGioiTier.id,
          canh_con_tier_id: canhConTier.id,
          dang_tier_id: dangTier.id,
          days_count: days,
          change_date: new Date(),
          change_type: changeType
        });
      }
    }
    
    return rank;
  } catch (error) {
    console.error('Error updating writing rank:', error);
    throw error;
  }
};

/**
 * Record user activity
 * @param {String} userId - User ID
 * @param {String} activityType - 'translation', 'writing', or 'comment'
 * @param {String} referenceId - Reference ID (post_id, post_translation_id, etc.)
 */
exports.recordActivity = async (userId, activityType, referenceId = null) => {
  try {
    const today = new Date();
    
    // Check if activity already recorded today
    const existingActivity = await UserActivity.findOne({
      where: {
        user_id: userId,
        activity_type: activityType,
        activity_date: sequelize.fn('DATE', today)
      }
    });
    
    if (!existingActivity) {
      // Create new activity record
      const activity = await UserActivity.create({
        user_id: userId,
        activity_type: activityType,
        activity_date: today,
        reference_id: referenceId
      });
      
      // Update streak
      await this.updateStreak(userId, activityType, today);
      
      return activity;
    }
    
    return existingActivity;
  } catch (error) {
    console.error('Error recording user activity:', error);
    throw error;
  }
};

/**
 * Get user streak and rank information
 * @param {String} userId - User ID
 */
exports.getUserStreakInfo = async (userId) => {
  try {
    const translationStreak = await Streak.findOne({
      where: { user_id: userId, type: 'translation' }
    });
    
    const writingStreak = await Streak.findOne({
      where: { user_id: userId, type: 'writing' }
    });
    
    const translationRank = await TranslationRank.findOne({
      where: { user_id: userId },
      include: [
        { 
          model: DaiCanhGioiTier, 
          as: 'daiCanhGioiTier',
          attributes: ['id', 'name', 'order', 'color_code', 'color_name'] 
        },
        { model: CanhConTier, as: 'canhConTier' },
        { model: DangTier, as: 'dangTier' },
        { 
          model: DaiCanhGioiTier, 
          as: 'highestDaiCanhGioiTier',
          attributes: ['id', 'name', 'order', 'color_code', 'color_name'] 
        },
        { model: CanhConTier, as: 'highestCanhConTier' },
        { model: DangTier, as: 'highestDangTier' }
      ]
    });
    
    const writingRank = await WritingRank.findOne({
      where: { user_id: userId },
      include: [
        { 
          model: DaiCanhGioiTier, 
          as: 'daiCanhGioiTier',
          attributes: ['id', 'name', 'order', 'color_code', 'color_name'] 
        },
        { model: CanhConTier, as: 'canhConTier' },
        { model: DangTier, as: 'dangTier' },
        { 
          model: DaiCanhGioiTier, 
          as: 'highestDaiCanhGioiTier',
          attributes: ['id', 'name', 'order', 'color_code', 'color_name'] 
        },
        { model: CanhConTier, as: 'highestCanhConTier' },
        { model: DangTier, as: 'highestDangTier' }
      ]
    });
    
    return {
      translationStreak: translationStreak || null,
      writingStreak: writingStreak || null,
      translationRank: translationRank || null,
      writingRank: writingRank || null
    };
  } catch (error) {
    console.error('Error getting user streak info:', error);
    throw error;
  }
};

/**
 * Update user rank based on streak
 * @param {string} userId - User ID
 * @param {string} activityType - 'translation' or 'writing'
 */
exports.updateRank = async (userId, activityType) => {
  try {
    // Get current streak
    const streak = await Streak.findOne({
      where: {
        user_id: userId,
        type: activityType,
        deleted: false
      }
    });

    if (!streak) {
      throw new Error('Streak not found');
    }

    // Get constants for rank calculation
    const constantType = activityType === 'translation' ? 'X' : 'Y';
    const rankConstant = await RankConstant.findOne({
      where: {
        type: constantType,
        deleted: false
      }
    });

    if (!rankConstant) {
      throw new Error('Rank constant not found');
    }

    // Get all tiers
    const daiCanhGioiTiers = await DaiCanhGioiTier.findAll({
      where: { deleted: false },
      order: [['order', 'ASC']]
    });
    
    const canhConTiers = await CanhConTier.findAll({
      where: { deleted: false },
      order: [['order', 'ASC']]
    });
    
    const dangTiers = await DangTier.findAll({
      where: { deleted: false },
      order: [['order', 'ASC']]
    });

    // Calculate rank
    const { daiCanhGioiTier, canhConTier, dangTier } = calculateRank(
      streak.current_count,
      rankConstant.value,
      daiCanhGioiTiers.length,
      canhConTiers.length,
      dangTiers.length
    );

    // Get tier IDs
    const daiCanhGioiTierId = daiCanhGioiTiers[daiCanhGioiTier - 1].id;
    const canhConTierId = canhConTiers[canhConTier - 1].id;
    const dangTierId = dangTiers[dangTier - 1].id;

    // Update rank in database
    const rankTableName = activityType === 'translation' ? 'TranslationRank' : 'WritingRank';
    const rankHistoryTableName = activityType === 'translation' ? 'TranslationRankHistory' : 'WritingRankHistory';

    // Find existing rank
    let rank = await sequelize[rankTableName].findOne({
      where: {
        user_id: userId,
        deleted: false
      }
    });

    let changeType = null;

    if (!rank) {
      // Create new rank
      rank = await sequelize[rankTableName].create({
        user_id: userId,
        dai_canh_gioi_tier_id: daiCanhGioiTierId,
        canh_con_tier_id: canhConTierId,
        dang_tier_id: dangTierId,
        days_count: streak.current_count,
        highest_dai_canh_gioi_tier_id: daiCanhGioiTierId,
        highest_canh_con_tier_id: canhConTierId,
        highest_dang_tier_id: dangTierId,
        highest_days_count: streak.current_count,
        last_update: new Date()
      });
      
      changeType = 'increase';
    } else {
      // Check if rank changed
      const oldDaiCanhGioiTierId = rank.dai_canh_gioi_tier_id;
      const oldCanhConTierId = rank.canh_con_tier_id;
      const oldDangTierId = rank.dang_tier_id;

      // Update current rank
      rank.dai_canh_gioi_tier_id = daiCanhGioiTierId;
      rank.canh_con_tier_id = canhConTierId;
      rank.dang_tier_id = dangTierId;
      rank.days_count = streak.current_count;
      rank.last_update = new Date();

      // Update highest achieved if current is higher
      const oldDaiCanhGioiTier = daiCanhGioiTiers.find(t => t.id === oldDaiCanhGioiTierId);
      const oldCanhConTier = canhConTiers.find(t => t.id === oldCanhConTierId);
      const oldDangTier = dangTiers.find(t => t.id === oldDangTierId);
      
      const newDaiCanhGioiTier = daiCanhGioiTiers.find(t => t.id === daiCanhGioiTierId);
      const newCanhConTier = canhConTiers.find(t => t.id === canhConTierId);
      const newDangTier = dangTiers.find(t => t.id === dangTierId);

      if (newDaiCanhGioiTier.order > oldDaiCanhGioiTier.order) {
        rank.highest_dai_canh_gioi_tier_id = daiCanhGioiTierId;
        changeType = 'increase';
      } else if (newDaiCanhGioiTier.order < oldDaiCanhGioiTier.order) {
        changeType = 'decrease';
      } else if (newCanhConTier.order > oldCanhConTier.order) {
        rank.highest_canh_con_tier_id = canhConTierId;
        changeType = 'increase';
      } else if (newCanhConTier.order < oldCanhConTier.order) {
        changeType = 'decrease';
      } else if (newDangTier.order > oldDangTier.order) {
        rank.highest_dang_tier_id = dangTierId;
        changeType = 'increase';
      } else if (newDangTier.order < oldDangTier.order) {
        changeType = 'decrease';
      }

      if (streak.current_count > rank.highest_days_count) {
        rank.highest_days_count = streak.current_count;
      }

      await rank.save();
    }

    // Create rank history entry if rank changed
    if (changeType) {
      await sequelize[rankHistoryTableName].create({
        user_id: userId,
        dai_canh_gioi_tier_id: daiCanhGioiTierId,
        canh_con_tier_id: canhConTierId,
        dang_tier_id: dangTierId,
        days_count: streak.current_count,
        change_date: new Date(),
        change_type: changeType
      });

      // Create notification for rank change
      if (changeType === 'increase') {
        const daiCanhGioiTierName = daiCanhGioiTiers.find(t => t.id === daiCanhGioiTierId).name;
        const canhConTierName = canhConTiers.find(t => t.id === canhConTierId).name;
        const dangTierName = dangTiers.find(t => t.id === dangTierId).name;
        
        const rankType = activityType === 'translation' ? 'Luyện Thuật Sư' : 'Võ Sư';
        const boardType = activityType === 'translation' ? 'Diệu Thuật Bảng' : 'Phong Vân Bảng';
        
        await sequelize.query(`
          INSERT INTO Notifications (user_id, type, content, is_read, reference_id)
          VALUES (${userId}, 'rank_increase', 'Chúc mừng! Bạn đã đạt level ${daiCanhGioiTierName} ${canhConTierName} ${dangTierName} trong bảng xếp hạng ${rankType} (${boardType}).', false, ${rank.id});
        `);
      }
    }

    return {
      rank_type: activityType === 'translation' ? 'Luyện Thuật Sư' : 'Võ Sư',
      dai_canh_gioi: daiCanhGioiTiers.find(t => t.id === daiCanhGioiTierId).name,
      canh_con: canhConTiers.find(t => t.id === canhConTierId).name,
      dang: dangTiers.find(t => t.id === dangTierId).name,
      days_count: streak.current_count
    };
  } catch (error) {
    console.error('Error updating rank:', error);
    throw error;
  }
};

/**
 * Get user streak information
 * @param {string} userId - User ID
 * @returns {Object} - Streak information for both activity types
 */
exports.getUserStreaks = async (userId) => {
  try {
    const translationStreak = await Streak.findOne({
      where: {
        user_id: userId,
        type: 'translation',
        deleted: false
      }
    });

    const writingStreak = await Streak.findOne({
      where: {
        user_id: userId,
        type: 'writing',
        deleted: false
      }
    });

    const translationRank = await TranslationRank.findOne({
      where: {
        user_id: userId,
        deleted: false
      },
      include: [
        { model: DaiCanhGioiTier, as: 'daiCanhGioiTier' },
        { model: CanhConTier, as: 'canhConTier' },
        { model: DangTier, as: 'dangTier' }
      ]
    });

    const writingRank = await WritingRank.findOne({
      where: {
        user_id: userId,
        deleted: false
      },
      include: [
        { model: DaiCanhGioiTier, as: 'daiCanhGioiTier' },
        { model: CanhConTier, as: 'canhConTier' },
        { model: DangTier, as: 'dangTier' }
      ]
    });

    return {
      translation: {
        current_streak: translationStreak?.current_count || 0,
        max_streak: translationStreak?.max_count || 0,
        last_date: translationStreak?.last_date || null,
        freeze_status: translationStreak?.freeze_until ? {
          active: true,
          until: translationStreak.freeze_until,
          recovery_tasks_completed: translationStreak.recovery_tasks_completed,
          remaining_tasks: 3 - translationStreak.recovery_tasks_completed
        } : null,
        rank: translationRank ? {
          dai_canh_gioi: translationRank.daiCanhGioiTier.name,
          canh_con: translationRank.canhConTier.name,
          dang: translationRank.dangTier.name,
          full_rank: `${translationRank.daiCanhGioiTier.name} ${translationRank.canhConTier.name} ${translationRank.dangTier.name}`
        } : null
      },
      writing: {
        current_streak: writingStreak?.current_count || 0,
        max_streak: writingStreak?.max_count || 0,
        last_date: writingStreak?.last_date || null,
        freeze_status: writingStreak?.freeze_until ? {
          active: true,
          until: writingStreak.freeze_until,
          recovery_tasks_completed: writingStreak.recovery_tasks_completed,
          remaining_tasks: 3 - writingStreak.recovery_tasks_completed
        } : null,
        rank: writingRank ? {
          dai_canh_gioi: writingRank.daiCanhGioiTier.name,
          canh_con: writingRank.canhConTier.name,
          dang: writingRank.dangTier.name,
          full_rank: `${writingRank.daiCanhGioiTier.name} ${writingRank.canhConTier.name} ${writingRank.dangTier.name}`
        } : null
      }
    };
  } catch (error) {
    console.error('Error getting user streaks:', error);
    throw error;
  }
};

/**
 * Get leaderboard for a specific activity type
 * @param {string} activityType - 'translation' or 'writing'
 * @param {number} limit - Number of users to return
 * @returns {Array} - Leaderboard data
 */
exports.getLeaderboard = async (activityType, limit = 10) => {
  try {
    if (!['translation', 'writing'].includes(activityType)) {
      throw new Error('Invalid activity type');
    }

    const rankTableName = activityType === 'translation' ? 'TranslationRank' : 'WritingRank';
    const boardName = activityType === 'translation' ? 'Diệu Thuật Bảng' : 'Phong Vân Bảng';

    const leaderboard = await sequelize[rankTableName].findAll({
      where: { deleted: false },
      include: [
        { 
          model: User, 
          as: 'user',
          attributes: ['id', 'username', 'avatar']
        },
        { model: DaiCanhGioiTier, as: 'daiCanhGioiTier' },
        { model: CanhConTier, as: 'canhConTier' },
        { model: DangTier, as: 'dangTier' }
      ],
      order: [
        [sequelize.col('daiCanhGioiTier.order'), 'DESC'],
        [sequelize.col('canhConTier.order'), 'DESC'],
        [sequelize.col('dangTier.order'), 'DESC'],
        ['days_count', 'DESC']
      ],
      limit
    });

    return {
      board_name: boardName,
      activity_type: activityType,
      users: leaderboard.map((entry, index) => ({
        rank: index + 1,
        user_id: entry.user.id,
        username: entry.user.username,
        avatar: entry.user.avatar,
        days_count: entry.days_count,
        rank_display: `${entry.daiCanhGioiTier.name} ${entry.canhConTier.name} ${entry.dangTier.name}`,
        rank_color: entry.daiCanhGioiTier.color_code
      }))
    };
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    throw error;
  }
}; 