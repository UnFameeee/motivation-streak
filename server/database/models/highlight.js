'use strict';

module.exports = (sequelize, DataTypes) => {
  const Highlight = sequelize.define('Highlight', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    post_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'post',
        key: 'id'
      }
    },
    post_translation_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'post_translation',
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
    start_index: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    end_index: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    highlighted_text: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    color: {
      type: DataTypes.STRING(7),
      defaultValue: '#FFFF00' // Default yellow
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
    tableName: 'highlight',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    paranoid: true,
    validate: {
      eitherPostOrTranslation() {
        if (!this.post_id && !this.post_translation_id) {
          throw new Error('Either post_id or post_translation_id must be provided');
        }
        if (this.post_id && this.post_translation_id) {
          throw new Error('Only one of post_id or post_translation_id should be provided');
        }
      }
    }
  });
  
  Highlight.associate = function(models) {
    // Associations
    Highlight.belongsTo(models.Post, {
      foreignKey: 'post_id',
      as: 'post'
    });
    
    Highlight.belongsTo(models.PostTranslation, {
      foreignKey: 'post_translation_id',
      as: 'translation'
    });
    
    Highlight.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'creator'
    });
    
    Highlight.hasMany(models.HighlightComment, {
      foreignKey: 'highlight_id',
      as: 'comments'
    });
  };
  
  return Highlight;
}; 