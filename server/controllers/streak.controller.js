const streakService = require('../services/streak.service');
const { Streak, User, TranslationRank, WritingRank, DaiCanhGioiTier, CanhConTier, DangTier } = require('../database/models');
const { Op } = require('sequelize');

class StreakController {
  /**
   * Record user activity and update streak
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async recordActivity(req, res) {
    try {
      const userId = req.userId;
      const { activityType } = req.body;

      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      if (!activityType || !['translation', 'writing'].includes(activityType)) {
        return res.status(400).json({ message: 'Invalid activity type' });
      }

      const result = await streakService.updateStreak(userId, activityType);
      return res.status(200).json(result);
    } catch (error) {
      console.error('Error recording activity:', error);
      return res.status(500).json({ message: 'Failed to record activity', error: error.message });
    }
  }

  /**
   * Get user streak information
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async getUserStreaks(req, res) {
    try {
      const userId = req.params.userId || req.userId;

      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const streaks = await streakService.getUserStreaks(userId);
      return res.status(200).json(streaks);
    } catch (error) {
      console.error('Error getting user streaks:', error);
      return res.status(500).json({ message: 'Failed to get user streaks', error: error.message });
    }
  }

  /**
   * Get leaderboard for a specific activity type
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   */
  async getLeaderboard(req, res) {
    try {
      const { activityType } = req.params;
      const limit = parseInt(req.query.limit) || 10;

      if (!activityType || !['translation', 'writing'].includes(activityType)) {
        return res.status(400).json({ message: 'Invalid activity type' });
      }

      const leaderboard = await streakService.getLeaderboard(activityType, limit);
      return res.status(200).json(leaderboard);
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return res.status(500).json({ message: 'Failed to get leaderboard', error: error.message });
    }
  }

  // Get user's translation streak
  async getTranslationStreak(req, res) {
    try {
      const userId = req.user.id;
      
      // Find or create a streak record for this user
      let streak = await Streak.findOne({
        where: {
          user_id: userId,
          type: 'translation',
          deleted: false
        }
      });
      
      if (!streak) {
        streak = await Streak.create({
          user_id: userId,
          type: 'translation',
          current_count: 0,
          max_count: 0,
          last_date: null,
          freeze_until: null,
          recovery_tasks_completed: 0
        });
      }
      
      res.json(streak);
    } catch (err) {
      console.error('Error in getTranslationStreak:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // Get user's writing streak
  async getWritingStreak(req, res) {
    try {
      const userId = req.user.id;
      
      // Find or create a streak record for this user
      let streak = await Streak.findOne({
        where: {
          user_id: userId,
          type: 'writing',
          deleted: false
        }
      });
      
      if (!streak) {
        streak = await Streak.create({
          user_id: userId,
          type: 'writing',
          current_count: 0,
          max_count: 0,
          last_date: null,
          freeze_until: null,
          recovery_tasks_completed: 0
        });
      }
      
      res.json(streak);
    } catch (err) {
      console.error('Error in getWritingStreak:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // Complete a recovery task for translation streak
  async completeTranslationRecoveryTask(req, res) {
    try {
      const userId = req.user.id;
      
      // Get the user's streak
      const streak = await Streak.findOne({
        where: {
          user_id: userId,
          type: 'translation',
          deleted: false
        }
      });
      
      if (!streak) {
        return res.status(404).json({ message: 'Streak record not found' });
      }
      
      // Check if the streak is frozen
      if (!streak.freeze_until) {
        return res.status(400).json({ message: 'Your streak is not currently frozen' });
      }
      
      // Check if recovery tasks are already completed
      if (streak.recovery_tasks_completed >= 3) {
        return res.status(400).json({ message: 'You have already completed all recovery tasks' });
      }
      
      // Increment the recovery tasks completed
      streak.recovery_tasks_completed += 1;
      
      // If all recovery tasks are completed, unfreeze the streak
      if (streak.recovery_tasks_completed >= 3) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        streak.freeze_until = null;
        streak.last_date = today;
      }
      
      await streak.save();
      
      res.json({ message: 'Recovery task completed successfully', streak });
    } catch (err) {
      console.error('Error in completeTranslationRecoveryTask:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // Complete a recovery task for writing streak
  async completeWritingRecoveryTask(req, res) {
    try {
      const userId = req.user.id;
      
      // Get the user's streak
      const streak = await Streak.findOne({
        where: {
          user_id: userId,
          type: 'writing',
          deleted: false
        }
      });
      
      if (!streak) {
        return res.status(404).json({ message: 'Streak record not found' });
      }
      
      // Check if the streak is frozen
      if (!streak.freeze_until) {
        return res.status(400).json({ message: 'Your streak is not currently frozen' });
      }
      
      // Check if recovery tasks are already completed
      if (streak.recovery_tasks_completed >= 3) {
        return res.status(400).json({ message: 'You have already completed all recovery tasks' });
      }
      
      // Increment the recovery tasks completed
      streak.recovery_tasks_completed += 1;
      
      // If all recovery tasks are completed, unfreeze the streak
      if (streak.recovery_tasks_completed >= 3) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        streak.freeze_until = null;
        streak.last_date = today;
      }
      
      await streak.save();
      
      res.json({ message: 'Recovery task completed successfully', streak });
    } catch (err) {
      console.error('Error in completeWritingRecoveryTask:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // Get leaderboard for translation streaks (Diệu Thuật Bảng)
  async getTranslationLeaderboard(req, res) {
    try {
      const leaderboard = await TranslationRank.findAll({
        include: [
          {
            model: User,
            attributes: ['id', 'username', 'avatar'],
            where: { is_active: true, deleted: false }
          },
          {
            model: DaiCanhGioiTier,
            attributes: ['id', 'name', 'order', 'color_code', 'color_name']
          },
          {
            model: CanhConTier,
            attributes: ['id', 'name', 'order']
          },
          {
            model: DangTier,
            attributes: ['id', 'name', 'order']
          }
        ],
        order: [
          ['days_count', 'DESC'],
          ['last_update', 'DESC']
        ],
        limit: 100,
        where: { deleted: false }
      });
      
      res.json(leaderboard);
    } catch (err) {
      console.error('Error in getTranslationLeaderboard:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // Get leaderboard for writing streaks (Phong Vân Bảng)
  async getWritingLeaderboard(req, res) {
    try {
      const leaderboard = await WritingRank.findAll({
        include: [
          {
            model: User,
            attributes: ['id', 'username', 'avatar'],
            where: { is_active: true, deleted: false }
          },
          {
            model: DaiCanhGioiTier,
            attributes: ['id', 'name', 'order', 'color_code', 'color_name']
          },
          {
            model: CanhConTier,
            attributes: ['id', 'name', 'order']
          },
          {
            model: DangTier,
            attributes: ['id', 'name', 'order']
          }
        ],
        order: [
          ['days_count', 'DESC'],
          ['last_update', 'DESC']
        ],
        limit: 100,
        where: { deleted: false }
      });
      
      res.json(leaderboard);
    } catch (err) {
      console.error('Error in getWritingLeaderboard:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
}

module.exports = new StreakController(); 