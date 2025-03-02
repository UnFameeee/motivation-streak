'use strict';

module.exports = (sequelize, DataTypes) => {
  const Community = sequelize.define('Community', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    image_url: {
      type: DataTypes.STRING,
      allowNull: true
    },
    owner_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'user',
        key: 'id'
      }
    },
    is_public: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
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
    tableName: 'community',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    paranoid: true
  });
  
  Community.associate = function(models) {
    // Associations
    Community.belongsTo(models.User, {
      foreignKey: 'owner_id',
      as: 'owner'
    });
    
    Community.hasMany(models.Block, {
      foreignKey: 'community_id',
      as: 'blocks'
    });
    
    Community.hasMany(models.CommunitySchedule, {
      foreignKey: 'community_id',
      as: 'schedules'
    });
    
    Community.belongsToMany(models.User, {
      through: models.UserCommunity,
      foreignKey: 'community_id',
      as: 'members'
    });
  };
  
  return Community;
}; 