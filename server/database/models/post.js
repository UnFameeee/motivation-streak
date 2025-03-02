'use strict';

module.exports = (sequelize, DataTypes) => {
  const Post = sequelize.define('Post', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    block_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'block',
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
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    language_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'language',
        key: 'id'
      }
    },
    word_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    is_auto_generated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
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
    tableName: 'post',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    paranoid: true,
    hooks: {
      beforeCreate: (post) => {
        // Count words in content
        if (post.content) {
          const wordCount = post.content.trim().split(/\s+/).length;
          post.word_count = wordCount;
        }
      },
      beforeUpdate: (post) => {
        // Update word count if content changed
        if (post.changed('content')) {
          const wordCount = post.content.trim().split(/\s+/).length;
          post.word_count = wordCount;
        }
      }
    }
  });
  
  Post.associate = function(models) {
    // Associations
    Post.belongsTo(models.Block, {
      foreignKey: 'block_id',
      as: 'block'
    });
    
    Post.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'author'
    });
    
    Post.belongsTo(models.Language, {
      foreignKey: 'language_id',
      as: 'language'
    });
    
    Post.hasMany(models.PostTranslation, {
      foreignKey: 'post_id',
      as: 'translations'
    });
    
    Post.hasMany(models.PostScore, {
      foreignKey: 'post_id',
      as: 'scores'
    });
    
    Post.hasMany(models.Highlight, {
      foreignKey: 'post_id',
      as: 'highlights'
    });
  };
  
  return Post;
}; 