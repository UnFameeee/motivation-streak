'use strict';

module.exports = (sequelize, DataTypes) => {
  const DaiCanhGioiTier = sequelize.define('DaiCanhGioiTier', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    order: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    color_code: {
      type: DataTypes.STRING,
      allowNull: true
    },
    color_name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'dai_canh_gioi_tier',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    paranoid: true
  });
  
  DaiCanhGioiTier.associate = function(models) {
    // Associations
    DaiCanhGioiTier.hasMany(models.TranslationRank, {
      foreignKey: 'dai_canh_gioi_tier_id',
      as: 'translationRanks'
    });
    
    DaiCanhGioiTier.hasMany(models.TranslationRank, {
      foreignKey: 'highest_dai_canh_gioi_tier_id',
      as: 'highestTranslationRanks'
    });
    
    DaiCanhGioiTier.hasMany(models.WritingRank, {
      foreignKey: 'dai_canh_gioi_tier_id',
      as: 'writingRanks'
    });
    
    DaiCanhGioiTier.hasMany(models.WritingRank, {
      foreignKey: 'highest_dai_canh_gioi_tier_id',
      as: 'highestWritingRanks'
    });
    
    DaiCanhGioiTier.hasMany(models.TranslationRankHistory, {
      foreignKey: 'dai_canh_gioi_tier_id',
      as: 'translationRankHistories'
    });
    
    DaiCanhGioiTier.hasMany(models.WritingRankHistory, {
      foreignKey: 'dai_canh_gioi_tier_id',
      as: 'writingRankHistories'
    });
  };
  
  return DaiCanhGioiTier;
}; 