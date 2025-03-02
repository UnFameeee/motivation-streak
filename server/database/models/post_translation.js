'use strict';

module.exports = (sequelize, DataTypes) => {
  const PostTranslation = sequelize.define('PostTranslation', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    post_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'post',
        key: 'id'
      }
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'user',
        key: 'id'
      }
    },
    language_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'language',
        key: 'id'
      }
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    word_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
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
    tableName: 'post_translation',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    paranoid: true,
    hooks: {
      beforeCreate: (translation) => {
        // Count words in content
        if (translation.content) {
          const wordCount = translation.content.trim().split(/\s+/).length;
          translation.word_count = wordCount;
        }
      },
      beforeUpdate: (translation) => {
        // Update word count if content changed
        if (translation.changed('content')) {
          const wordCount = translation.content.trim().split(/\s+/).length;
          translation.word_count = wordCount;
        }
      },
      afterCreate: async (translation, options) => {
        // Record user activity for streak tracking
        try {
          const { UserActivity, Streak } = require('../models');
          const streakService = require('../../services/streak.service');
          
          // Create activity record
          await UserActivity.create({
            user_id: translation.user_id,
            activity_type: 'translation',
            activity_date: new Date(),
            reference_id: translation.id
          }, { transaction: options.transaction });
          
          // Update user streak
          await streakService.recordActivity(
            translation.user_id, 
            'translation', 
            translation.id
          );
        } catch (error) {
          console.error('Error recording translation activity:', error);
          // Don't throw error to prevent transaction failure
        }
      }
    }
  });
  
  PostTranslation.associate = function(models) {
    // Associations
    PostTranslation.belongsTo(models.Post, {
      foreignKey: 'post_id',
      as: 'post'
    });
    
    PostTranslation.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'translator'
    });
    
    PostTranslation.belongsTo(models.Language, {
      foreignKey: 'language_id',
      as: 'language'
    });
    
    PostTranslation.hasMany(models.Comment, {
      foreignKey: 'post_translation_id',
      as: 'comments'
    });
    
    PostTranslation.hasMany(models.PostScore, {
      foreignKey: 'post_translation_id',
      as: 'scores'
    });
    
    PostTranslation.hasMany(models.Highlight, {
      foreignKey: 'post_translation_id',
      as: 'highlights'
    });
  };
  
  return PostTranslation;
}; 