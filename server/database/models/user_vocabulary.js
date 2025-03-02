'use strict';

module.exports = (sequelize, DataTypes) => {
  const UserVocabulary = sequelize.define('UserVocabulary', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'user',
        key: 'id'
      }
    },
    vocabulary_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'vocabulary',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('new', 'learning', 'mastered'),
      defaultValue: 'new'
    },
    personal_note: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    last_reviewed: {
      type: DataTypes.DATE,
      allowNull: true
    },
    next_review: {
      type: DataTypes.DATE,
      allowNull: true
    },
    review_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    mastery_level: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 5
      },
      comment: 'Mastery level from 0-5'
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
    tableName: 'user_vocabulary',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    paranoid: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'vocabulary_id'],
        where: {
          deleted: false
        }
      }
    ]
  });
  
  UserVocabulary.associate = function(models) {
    // Associations
    UserVocabulary.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user'
    });
    
    UserVocabulary.belongsTo(models.Vocabulary, {
      foreignKey: 'vocabulary_id',
      as: 'vocabulary'
    });
  };
  
  // Helper methods
  UserVocabulary.prototype.incrementReview = async function() {
    // Implement spaced repetition algorithm
    const reviewCount = this.review_count + 1;
    const masteryLevel = Math.min(5, this.mastery_level + 1);
    
    // Calculate next review date using spaced repetition
    // Simple implementation: next review after 1, 3, 7, 14, 30, 90 days depending on mastery level
    const daysUntilNextReview = [1, 3, 7, 14, 30, 90][masteryLevel];
    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + daysUntilNextReview);
    
    await this.update({
      review_count: reviewCount,
      mastery_level: masteryLevel,
      last_reviewed: new Date(),
      next_review: nextReview,
      status: masteryLevel >= 5 ? 'mastered' : 'learning'
    });
    
    return this;
  };
  
  UserVocabulary.prototype.resetProgress = async function() {
    await this.update({
      review_count: 0,
      mastery_level: 0,
      last_reviewed: new Date(),
      next_review: new Date(),
      status: 'new'
    });
    
    return this;
  };
  
  return UserVocabulary;
}; 