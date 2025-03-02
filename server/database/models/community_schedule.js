'use strict';

module.exports = (sequelize, DataTypes) => {
  const CommunitySchedule = sequelize.define('CommunitySchedule', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    community_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'community',
        key: 'id'
      }
    },
    time: {
      type: DataTypes.TIME,
      allowNull: false
    },
    timezone: {
      type: DataTypes.STRING,
      defaultValue: 'UTC'
    },
    period: {
      type: DataTypes.ENUM('daily', 'weekly', 'monthly'),
      defaultValue: 'daily'
    },
    auto_gen_title: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    title_prompt: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    auto_gen_post: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    post_prompt: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    word_limit_min: {
      type: DataTypes.INTEGER,
      defaultValue: 50
    },
    word_limit_max: {
      type: DataTypes.INTEGER,
      defaultValue: 1000
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    last_execution: {
      type: DataTypes.DATE,
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
    tableName: 'community_schedule',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    paranoid: true
  });
  
  CommunitySchedule.associate = function(models) {
    // Associations
    CommunitySchedule.belongsTo(models.Community, {
      foreignKey: 'community_id',
      as: 'community'
    });
  };
  
  return CommunitySchedule;
}; 