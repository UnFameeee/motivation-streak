'use strict';

module.exports = (sequelize, DataTypes) => {
  const Vocabulary = sequelize.define('Vocabulary', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    word: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true
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
    definition: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    example: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'user',
        key: 'id'
      }
    },
    pronunciation: {
      type: DataTypes.STRING,
      allowNull: true
    },
    part_of_speech: {
      type: DataTypes.STRING,
      allowNull: true
    },
    difficulty_level: {
      type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
      defaultValue: 'intermediate'
    },
    tags: {
      type: DataTypes.STRING,
      allowNull: true,
      get() {
        const value = this.getDataValue('tags');
        return value ? value.split(',') : [];
      },
      set(val) {
        if (Array.isArray(val)) {
          this.setDataValue('tags', val.join(','));
        } else {
          this.setDataValue('tags', val);
        }
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
    tableName: 'vocabulary',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    paranoid: true
  });
  
  Vocabulary.associate = function(models) {
    // Associations
    Vocabulary.belongsTo(models.Language, {
      foreignKey: 'language_id',
      as: 'language'
    });
    
    Vocabulary.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'creator'
    });
    
    Vocabulary.belongsToMany(models.User, {
      through: models.UserVocabulary,
      foreignKey: 'vocabulary_id',
      as: 'learners'
    });
  };
  
  return Vocabulary;
}; 