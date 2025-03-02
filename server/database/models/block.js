'use strict';

module.exports = (sequelize, DataTypes) => {
  const Block = sequelize.define('Block', {
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
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    is_auto_generated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    schedule_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'community_schedule',
        key: 'id'
      }
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
    tableName: 'block',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    paranoid: true
  });
  
  Block.associate = function(models) {
    // Associations
    Block.belongsTo(models.Community, {
      foreignKey: 'community_id',
      as: 'community'
    });
    
    Block.belongsTo(models.CommunitySchedule, {
      foreignKey: 'schedule_id',
      as: 'schedule'
    });
    
    Block.hasMany(models.Post, {
      foreignKey: 'block_id',
      as: 'posts'
    });
  };
  
  return Block;
}; 