const { 
  User, 
  TranslationRank, 
  WritingRank, 
  DangTier, 
  CanhConTier, 
  DaiCanhGioiTier, 
  RankConstant,
  sequelize,
  TranslationRankHistory,
  WritingRankHistory
} = require('../database/models');
const streakService = require('../services/streak.service');
const { Op } = require('sequelize');

/**
 * Get rank statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getRankStatistics = async (req, res) => {
  try {
    // Get total users
    const totalUsers = await User.count({ where: { deleted: false } });
    
    // Get rank constants
    const constants = await RankConstant.findAll();
    
    // Get tier counts
    const [translationStats] = await sequelize.query(`
      SELECT
        dcg.name as realm,
        dcg.color_code as color,
        COUNT(tr.id) as count
      FROM translation_rank tr
      JOIN dai_canh_gioi_tier dcg ON tr.dai_canh_gioi_tier_id = dcg.id
      WHERE tr.deleted = false
      GROUP BY dcg.name, dcg.color_code
      ORDER BY COUNT(tr.id) DESC
    `);
    
    const [writingStats] = await sequelize.query(`
      SELECT
        dcg.name as realm,
        dcg.color_code as color,
        COUNT(wr.id) as count
      FROM writing_rank wr
      JOIN dai_canh_gioi_tier dcg ON wr.dai_canh_gioi_tier_id = dcg.id
      WHERE wr.deleted = false
      GROUP BY dcg.name, dcg.color_code
      ORDER BY COUNT(wr.id) DESC
    `);
    
    // Get highest ranks
    const topTranslation = await TranslationRank.findOne({
      where: { deleted: false },
      order: [['days_count', 'DESC']],
      include: [
        { model: User, as: 'user', attributes: ['id', 'username', 'avatar'] },
        { model: DaiCanhGioiTier, as: 'daiCanhGioiTier', attributes: ['id', 'name', 'order', 'color_code', 'color_name'] },
        { model: CanhConTier, as: 'canhConTier' },
        { model: DangTier, as: 'dangTier' }
      ],
      limit: 1
    });
    
    const topWriting = await WritingRank.findOne({
      where: { deleted: false },
      order: [['days_count', 'DESC']],
      include: [
        { model: User, as: 'user', attributes: ['id', 'username', 'avatar'] },
        { model: DaiCanhGioiTier, as: 'daiCanhGioiTier', attributes: ['id', 'name', 'order', 'color_code', 'color_name'] },
        { model: CanhConTier, as: 'canhConTier' },
        { model: DangTier, as: 'dangTier' }
      ],
      limit: 1
    });
    
    res.json({
      totalUsers,
      constants,
      translationStats,
      writingStats,
      topTranslation,
      topWriting
    });
  } catch (error) {
    console.error('Error getting rank statistics:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get translation ranks leaderboard
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getTranslationRanks = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    const ranks = await TranslationRank.findAndCountAll({
      where: { deleted: false },
      order: [['days_count', 'DESC']],
      include: [
        { model: User, as: 'user', attributes: ['id', 'username', 'avatar'] },
        { model: DaiCanhGioiTier, as: 'daiCanhGioiTier', attributes: ['id', 'name', 'order', 'color_code', 'color_name'] },
        { model: CanhConTier, as: 'canhConTier' },
        { model: DangTier, as: 'dangTier' }
      ],
      limit,
      offset
    });
    
    // Get current user rank position if authenticated
    let userRankPosition = null;
    if (req.user) {
      const [position] = await sequelize.query(`
        SELECT position FROM (
          SELECT 
            user_id,
            RANK() OVER (ORDER BY days_count DESC) as position
          FROM translation_rank
          WHERE deleted = false
        ) as ranked
        WHERE user_id = :userId
      `, {
        replacements: { userId: req.user.id }
      });
      
      if (position && position.length > 0) {
        userRankPosition = position[0].position;
      }
    }
    
    res.json({
      ranks: ranks.rows,
      total: ranks.count,
      page,
      pages: Math.ceil(ranks.count / limit),
      userRankPosition
    });
  } catch (error) {
    console.error('Error getting translation ranks:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get writing ranks leaderboard
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getWritingRanks = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    const ranks = await WritingRank.findAndCountAll({
      where: { deleted: false },
      order: [['days_count', 'DESC']],
      include: [
        { model: User, as: 'user', attributes: ['id', 'username', 'avatar'] },
        { model: DaiCanhGioiTier, as: 'daiCanhGioiTier', attributes: ['id', 'name', 'order', 'color_code', 'color_name'] },
        { model: CanhConTier, as: 'canhConTier' },
        { model: DangTier, as: 'dangTier' }
      ],
      limit,
      offset
    });
    
    // Get current user rank position if authenticated
    let userRankPosition = null;
    if (req.user) {
      const [position] = await sequelize.query(`
        SELECT position FROM (
          SELECT 
            user_id,
            RANK() OVER (ORDER BY days_count DESC) as position
          FROM writing_rank
          WHERE deleted = false
        ) as ranked
        WHERE user_id = :userId
      `, {
        replacements: { userId: req.user.id }
      });
      
      if (position && position.length > 0) {
        userRankPosition = position[0].position;
      }
    }
    
    res.json({
      ranks: ranks.rows,
      total: ranks.count,
      page,
      pages: Math.ceil(ranks.count / limit),
      userRankPosition
    });
  } catch (error) {
    console.error('Error getting writing ranks:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get user ranks
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getUserRanks = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get user
    const user = await User.findByPk(id, {
      attributes: ['id', 'username', 'avatar']
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Get user streak info
    const streakInfo = await streakService.getUserStreakInfo(id);
    
    res.json({
      user,
      ...streakInfo
    });
  } catch (error) {
    console.error('Error getting user ranks:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get current user ranks
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getCurrentUserRanks = async (req, res) => {
  try {
    // Get user streak info
    const streakInfo = await streakService.getUserStreakInfo(req.user.id);
    
    // Get positions in leaderboards
    const [translationPosition] = await sequelize.query(`
      SELECT position FROM (
        SELECT 
          user_id,
          RANK() OVER (ORDER BY days_count DESC) as position
        FROM translation_rank
        WHERE deleted = false
      ) as ranked
      WHERE user_id = :userId
    `, {
      replacements: { userId: req.user.id }
    });
    
    const [writingPosition] = await sequelize.query(`
      SELECT position FROM (
        SELECT 
          user_id,
          RANK() OVER (ORDER BY days_count DESC) as position
        FROM writing_rank
        WHERE deleted = false
      ) as ranked
      WHERE user_id = :userId
    `, {
      replacements: { userId: req.user.id }
    });
    
    res.json({
      user: req.user,
      ...streakInfo,
      translationPosition: translationPosition.length > 0 ? translationPosition[0].position : null,
      writingPosition: writingPosition.length > 0 ? writingPosition[0].position : null
    });
  } catch (error) {
    console.error('Error getting current user ranks:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get rank calculation constants
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getRankConstants = async (req, res) => {
  try {
    const constants = await RankConstant.findAll();
    
    // Get tier counts
    const dangTiers = await DangTier.findAll({ order: [['order', 'ASC']] });
    const canhConTiers = await CanhConTier.findAll({ order: [['order', 'ASC']] });
    const daiCanhGioiTiers = await DaiCanhGioiTier.findAll({ 
      order: [['order', 'ASC']],
      attributes: ['id', 'name', 'order', 'color_code', 'color_name'] 
    });
    
    res.json({
      constants,
      dangTiers,
      canhConTiers,
      daiCanhGioiTiers
    });
  } catch (error) {
    console.error('Error getting rank constants:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Update rank calculation constant
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateRankConstant = async (req, res) => {
  try {
    const { type } = req.params;
    const { value, description } = req.body;
    
    if (!['X', 'Y'].includes(type)) {
      return res.status(400).json({ message: 'Invalid constant type' });
    }
    
    if (isNaN(value) || value <= 0) {
      return res.status(400).json({ message: 'Value must be a positive number' });
    }
    
    // Find or create constant
    const [constant, created] = await RankConstant.findOrCreate({
      where: { type },
      defaults: {
        value,
        description: description || `Constant ${type} for ${type === 'X' ? 'translation' : 'writing'} rank calculation`
      }
    });
    
    if (!created) {
      await constant.update({
        value,
        description: description || constant.description
      });
    }
    
    // Return updated constant
    res.json({
      message: `Constant ${type} updated successfully`,
      constant
    });
  } catch (error) {
    console.error('Error updating rank constant:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function to calculate rank based on days count
const calculateRank = async (daysCount, rankType) => {
  try {
    // Get all tiers
    const daiCanhGioiTiers = await DaiCanhGioiTier.findAll({
      order: [['order', 'ASC']],
      where: { deleted: false }
    });
    
    const canhConTiers = await CanhConTier.findAll({
      order: [['order', 'ASC']],
      where: { deleted: false }
    });
    
    const dangTiers = await DangTier.findAll({
      order: [['order', 'ASC']],
      where: { deleted: false }
    });
    
    // Get rank constant (X for translation, Y for writing)
    const constantType = rankType === 'translation' ? 'X' : 'Y';
    const rankConstant = await RankConstant.findOne({
      where: { type: constantType, deleted: false }
    });
    
    const X = rankConstant.value;
    const dangCount = dangTiers.length;
    const canhConCount = canhConTiers.length;
    const daiCanhGioiCount = daiCanhGioiTiers.length;
    
    // Calculate Đẳng tier
    // ([số ngày liên tục] / ([hằng số X] / [Tổng số lượng dòng của Đẳng])) mod [Tổng số lượng dòng của Đẳng]
    const dangIndex = Math.floor((daysCount / (X / dangCount)) % dangCount);
    
    // Calculate Cảnh Con tier
    // ([số ngày liên tục] / ([hằng số X] / [Tổng số lượng dòng của Đẳng])) mod ([hằng số X] / [Tổng số lượng dòng của Đẳng])
    const canhConIndex = Math.floor((daysCount / (X / dangCount)) % canhConCount);
    
    // Calculate Đại Cảnh Giới tier
    // [số ngày liên tục] / ([hằng số X] * [Tổng số lượng dòng của Đại Cảnh Giới] * [Tổng số lượng dòng của Cảnh Con]) 
    // mod ([hằng số X] * [Tổng số lượng dòng của Đại Cảnh Giới] * [Tổng số lượng dòng của Cảnh Con])
    const daiCanhGioiIndex = Math.floor(
      (daysCount / (X * daiCanhGioiCount * canhConCount)) % daiCanhGioiCount
    );
    
    // Get the actual tier objects
    const dangTier = dangTiers[dangIndex];
    const canhConTier = canhConTiers[canhConIndex];
    const daiCanhGioiTier = daiCanhGioiTiers[daiCanhGioiIndex];
    
    return {
      daiCanhGioiTierId: daiCanhGioiTier.id,
      canhConTierId: canhConTier.id,
      dangTierId: dangTier.id
    };
  } catch (err) {
    console.error('Error in calculateRank:', err);
    throw err;
  }
};

// Get user's translation rank
exports.getTranslationRank = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find the user's translation rank
    let rank = await TranslationRank.findOne({
      where: { user_id: userId, deleted: false },
      include: [
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
      ]
    });
    
    // If no rank exists, create a default one
    if (!rank) {
      // Calculate the initial rank (assuming 0 days)
      const initialRank = await calculateRank(0, 'translation');
      
      // Create a new rank record
      const newRank = await TranslationRank.create({
        user_id: userId,
        dai_canh_gioi_tier_id: initialRank.daiCanhGioiTierId,
        canh_con_tier_id: initialRank.canhConTierId,
        dang_tier_id: initialRank.dangTierId,
        days_count: 0,
        highest_dai_canh_gioi_tier_id: initialRank.daiCanhGioiTierId,
        highest_canh_con_tier_id: initialRank.canhConTierId,
        highest_dang_tier_id: initialRank.dangTierId,
        highest_days_count: 0,
        last_update: new Date()
      });
      
      // Fetch the newly created rank with tier info
      rank = await TranslationRank.findOne({
        where: { id: newRank.id },
        include: [
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
        ]
      });
    }
    
    res.json(rank);
  } catch (err) {
    console.error('Error in getTranslationRank:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user's writing rank
exports.getWritingRank = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find the user's writing rank
    let rank = await WritingRank.findOne({
      where: { user_id: userId, deleted: false },
      include: [
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
      ]
    });
    
    // If no rank exists, create a default one
    if (!rank) {
      // Calculate the initial rank (assuming 0 days)
      const initialRank = await calculateRank(0, 'writing');
      
      // Create a new rank record
      const newRank = await WritingRank.create({
        user_id: userId,
        dai_canh_gioi_tier_id: initialRank.daiCanhGioiTierId,
        canh_con_tier_id: initialRank.canhConTierId,
        dang_tier_id: initialRank.dangTierId,
        days_count: 0,
        highest_dai_canh_gioi_tier_id: initialRank.daiCanhGioiTierId,
        highest_canh_con_tier_id: initialRank.canhConTierId,
        highest_dang_tier_id: initialRank.dangTierId,
        highest_days_count: 0,
        last_update: new Date()
      });
      
      // Fetch the newly created rank with tier info
      rank = await WritingRank.findOne({
        where: { id: newRank.id },
        include: [
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
        ]
      });
    }
    
    res.json(rank);
  } catch (err) {
    console.error('Error in getWritingRank:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get tiers for Đại Cảnh Giới
exports.getDaiCanhGioiTiers = async (req, res) => {
  try {
    const tiers = await DaiCanhGioiTier.findAll({
      order: [['order', 'ASC']],
      where: { deleted: false }
    });
    
    res.json(tiers);
  } catch (err) {
    console.error('Error in getDaiCanhGioiTiers:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get tiers for Cảnh Con
exports.getCanhConTiers = async (req, res) => {
  try {
    const tiers = await CanhConTier.findAll({
      order: [['order', 'ASC']],
      where: { deleted: false }
    });
    
    res.json(tiers);
  } catch (err) {
    console.error('Error in getCanhConTiers:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get tiers for Đẳng
exports.getDangTiers = async (req, res) => {
  try {
    const tiers = await DangTier.findAll({
      order: [['order', 'ASC']],
      where: { deleted: false }
    });
    
    res.json(tiers);
  } catch (err) {
    console.error('Error in getDangTiers:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user's translation rank history
exports.getTranslationRankHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const history = await TranslationRankHistory.findAll({
      where: { user_id: userId, deleted: false },
      include: [
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
      order: [['change_date', 'DESC']],
      limit: 30
    });
    
    res.json(history);
  } catch (err) {
    console.error('Error in getTranslationRankHistory:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user's writing rank history
exports.getWritingRankHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const history = await WritingRankHistory.findAll({
      where: { user_id: userId, deleted: false },
      include: [
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
      order: [['change_date', 'DESC']],
      limit: 30
    });
    
    res.json(history);
  } catch (err) {
    console.error('Error in getWritingRankHistory:', err);
    res.status(500).json({ message: 'Server error' });
  }
}; 