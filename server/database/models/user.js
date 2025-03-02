'use strict';

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true // Null for OAuth users
    },
    role: {
      type: DataTypes.ENUM('admin', 'user'),
      defaultValue: 'user'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    timezone: {
      type: DataTypes.STRING,
      defaultValue: 'UTC'
    },
    google_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    avatar: {
      type: DataTypes.STRING,
      allowNull: true
    },
    last_login: {
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
    tableName: 'user',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    paranoid: true // Enable soft deletes
  });
  
  User.associate = function(models) {
    // Associations
    User.hasMany(models.Post, { 
      foreignKey: 'user_id', 
      as: 'posts' 
    });
    
    User.hasMany(models.PostTranslation, { 
      foreignKey: 'user_id', 
      as: 'translations' 
    });
    
    User.hasMany(models.Comment, { 
      foreignKey: 'user_id', 
      as: 'comments' 
    });
    
    User.hasMany(models.Highlight, { 
      foreignKey: 'user_id', 
      as: 'highlights' 
    });
    
    User.hasMany(models.HighlightComment, { 
      foreignKey: 'user_id', 
      as: 'highlightComments' 
    });
    
    User.hasMany(models.Vocabulary, { 
      foreignKey: 'user_id', 
      as: 'vocabulary' 
    });
    
    User.belongsToMany(models.Vocabulary, { 
      through: models.UserVocabulary,
      foreignKey: 'user_id',
      as: 'learningVocabulary'
    });
    
    User.hasMany(models.Streak, { 
      foreignKey: 'user_id', 
      as: 'streaks' 
    });
    
    User.hasOne(models.TranslationRank, { 
      foreignKey: 'user_id', 
      as: 'translationRank' 
    });
    
    User.hasOne(models.WritingRank, { 
      foreignKey: 'user_id', 
      as: 'writingRank' 
    });
    
    User.hasMany(models.UserActivity, { 
      foreignKey: 'user_id', 
      as: 'activities' 
    });
    
    User.hasMany(models.Notification, { 
      foreignKey: 'user_id', 
      as: 'notifications' 
    });
    
    User.belongsToMany(models.Community, { 
      through: models.UserCommunity,
      foreignKey: 'user_id',
      as: 'communities'
    });
    
    User.hasMany(models.Community, { 
      foreignKey: 'owner_id', 
      as: 'ownedCommunities' 
    });
    
    User.hasMany(models.TranslationRankHistory, { 
      foreignKey: 'user_id', 
      as: 'translationRankHistory' 
    });
    
    User.hasMany(models.WritingRankHistory, { 
      foreignKey: 'user_id', 
      as: 'writingRankHistory' 
    });
  };
  
  return User;
}; 