require('dotenv').config({ path: '../../.env' });
const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Database connection
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    logging: console.log
  }
);

async function initDatabase() {
  try {
    // Test connection
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Drop database if it exists
    await sequelize.query(`DROP DATABASE IF EXISTS ${process.env.DB_NAME}`);
    console.log(`Database ${process.env.DB_NAME} dropped.`);

    // Create database
    await sequelize.query(`CREATE DATABASE ${process.env.DB_NAME}`);
    console.log(`Database ${process.env.DB_NAME} created.`);

    // Use the created database
    await sequelize.query(`USE ${process.env.DB_NAME}`);
    console.log(`Using database ${process.env.DB_NAME}.`);

    // Create tables
    await createTables();
    console.log('Tables created successfully.');

    // Seed initial data
    await seedData();
    console.log('Initial data seeded successfully.');

    console.log('Database initialization completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

async function createTables() {
  // Common timestamp and soft delete columns for all tables
  const commonColumns = `
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    deleted BOOLEAN DEFAULT false
  `;

  // Create user table
  await sequelize.query(`
    CREATE TABLE user (
      id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
      username VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255),
      role ENUM('admin', 'user') DEFAULT 'user',
      is_active BOOLEAN DEFAULT true,
      timezone VARCHAR(100) DEFAULT 'UTC',
      google_id VARCHAR(255),
      avatar VARCHAR(255),
      last_login DATETIME,
      ${commonColumns}
    )
  `);

  // Create language table
  await sequelize.query(`
    CREATE TABLE language (
      id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
      code VARCHAR(10) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL,
      is_active BOOLEAN DEFAULT true,
      ${commonColumns}
    )
  `);

  // Create community table
  await sequelize.query(`
    CREATE TABLE community (
      id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
      name VARCHAR(255) NOT NULL,
      description TEXT,
      image_url VARCHAR(255),
      owner_id CHAR(36),
      is_public BOOLEAN DEFAULT true,
      ${commonColumns},
      FOREIGN KEY (owner_id) REFERENCES user(id)
    )
  `);

  // Create community_schedule table
  await sequelize.query(`
    CREATE TABLE community_schedule (
      id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
      community_id CHAR(36) NOT NULL,
      time TIME NOT NULL,
      timezone VARCHAR(100) DEFAULT 'UTC',
      period ENUM('daily', 'weekly', 'monthly') DEFAULT 'daily',
      auto_gen_title BOOLEAN DEFAULT false,
      title_prompt TEXT,
      auto_gen_post BOOLEAN DEFAULT false,
      post_prompt TEXT,
      word_limit_min INT DEFAULT 50,
      word_limit_max INT DEFAULT 1000,
      ${commonColumns},
      FOREIGN KEY (community_id) REFERENCES community(id)
    )
  `);

  // Create block table
  await sequelize.query(`
    CREATE TABLE block (
      id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
      community_id CHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL,
      date DATE NOT NULL,
      is_auto_generated BOOLEAN DEFAULT false,
      ${commonColumns},
      FOREIGN KEY (community_id) REFERENCES community(id)
    )
  `);

  // Create post table
  await sequelize.query(`
    CREATE TABLE post (
      id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
      block_id CHAR(36) NOT NULL,
      user_id CHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      language_id CHAR(36) NOT NULL,
      word_count INT DEFAULT 0,
      is_auto_generated BOOLEAN DEFAULT false,
      ${commonColumns},
      FOREIGN KEY (block_id) REFERENCES block(id),
      FOREIGN KEY (user_id) REFERENCES user(id),
      FOREIGN KEY (language_id) REFERENCES language(id)
    )
  `);

  // Create post_translation table
  await sequelize.query(`
    CREATE TABLE post_translation (
      id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
      post_id CHAR(36) NOT NULL,
      user_id CHAR(36) NOT NULL,
      language_id CHAR(36) NOT NULL,
      content TEXT NOT NULL,
      word_count INT DEFAULT 0,
      ${commonColumns},
      FOREIGN KEY (post_id) REFERENCES post(id),
      FOREIGN KEY (user_id) REFERENCES user(id),
      FOREIGN KEY (language_id) REFERENCES language(id)
    )
  `);

  // Create post_score table
  await sequelize.query(`
    CREATE TABLE post_score (
      id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
      post_translation_id CHAR(36) NOT NULL,
      post_id CHAR(36) NOT NULL,
      score DECIMAL(5,2) NOT NULL,
      feedback TEXT,
      requested_by CHAR(36) NOT NULL,
      ${commonColumns},
      FOREIGN KEY (post_translation_id) REFERENCES post_translation(id),
      FOREIGN KEY (post_id) REFERENCES post(id),
      FOREIGN KEY (requested_by) REFERENCES user(id)
    )
  `);

  // Create comment table
  await sequelize.query(`
    CREATE TABLE comment (
      id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
      user_id CHAR(36) NOT NULL,
      post_translation_id CHAR(36) NOT NULL,
      content TEXT NOT NULL,
      ${commonColumns},
      FOREIGN KEY (user_id) REFERENCES user(id),
      FOREIGN KEY (post_translation_id) REFERENCES post_translation(id)
    )
  `);

  // Create highlight table
  await sequelize.query(`
    CREATE TABLE highlight (
      id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
      post_id CHAR(36),
      post_translation_id CHAR(36),
      user_id CHAR(36) NOT NULL,
      start_index INT NOT NULL,
      end_index INT NOT NULL,
      highlighted_text TEXT NOT NULL,
      ${commonColumns},
      FOREIGN KEY (post_id) REFERENCES post(id),
      FOREIGN KEY (post_translation_id) REFERENCES post_translation(id),
      FOREIGN KEY (user_id) REFERENCES user(id),
      CHECK (post_id IS NOT NULL OR post_translation_id IS NOT NULL)
    )
  `);

  // Create highlight_comment table
  await sequelize.query(`
    CREATE TABLE highlight_comment (
      id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
      highlight_id CHAR(36) NOT NULL,
      user_id CHAR(36) NOT NULL,
      content TEXT NOT NULL,
      ${commonColumns},
      FOREIGN KEY (highlight_id) REFERENCES highlight(id),
      FOREIGN KEY (user_id) REFERENCES user(id)
    )
  `);

  // Create setting table
  await sequelize.query(`
    CREATE TABLE setting (
      id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
      key VARCHAR(255) NOT NULL UNIQUE,
      value TEXT,
      description TEXT,
      type VARCHAR(50) DEFAULT 'string',
      ${commonColumns}
    )
  `);

  // Create vocabulary table
  await sequelize.query(`
    CREATE TABLE vocabulary (
      id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
      word VARCHAR(255) NOT NULL,
      language_id CHAR(36) NOT NULL,
      definition TEXT,
      example TEXT,
      user_id CHAR(36) NOT NULL,
      ${commonColumns},
      FOREIGN KEY (language_id) REFERENCES language(id),
      FOREIGN KEY (user_id) REFERENCES user(id)
    )
  `);

  // Create user_vocabulary table
  await sequelize.query(`
    CREATE TABLE user_vocabulary (
      id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
      user_id CHAR(36) NOT NULL,
      vocabulary_id CHAR(36) NOT NULL,
      status ENUM('new', 'learning', 'mastered') DEFAULT 'new',
      ${commonColumns},
      FOREIGN KEY (user_id) REFERENCES user(id),
      FOREIGN KEY (vocabulary_id) REFERENCES vocabulary(id)
    )
  `);

  // Create dang_tier table (Level Tiers)
  await sequelize.query(`
    CREATE TABLE dang_tier (
      id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
      name VARCHAR(100) NOT NULL,
      order INT NOT NULL,
      ${commonColumns}
    )
  `);

  // Create canh_con_tier table (Sub Realm Tiers)
  await sequelize.query(`
    CREATE TABLE canh_con_tier (
      id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
      name VARCHAR(100) NOT NULL,
      order INT NOT NULL,
      ${commonColumns}
    )
  `);

  // Create dai_canh_gioi_tier table (Great Realm Tiers)
  await sequelize.query(`
    CREATE TABLE dai_canh_gioi_tier (
      id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
      name VARCHAR(100) NOT NULL,
      order INT NOT NULL,
      color_code VARCHAR(10),
      color_name VARCHAR(100),
      ${commonColumns}
    )
  `);

  // Create streak table
  await sequelize.query(`
    CREATE TABLE streak (
      id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
      user_id CHAR(36) NOT NULL,
      type ENUM('translation', 'writing') NOT NULL,
      current_count INT DEFAULT 0,
      max_count INT DEFAULT 0,
      last_date DATE,
      freeze_until DATE,
      recovery_tasks_completed INT DEFAULT 0,
      ${commonColumns},
      FOREIGN KEY (user_id) REFERENCES user(id)
    )
  `);

  // Create translation_rank table
  await sequelize.query(`
    CREATE TABLE translation_rank (
      id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
      user_id CHAR(36) NOT NULL,
      dai_canh_gioi_tier_id CHAR(36) NOT NULL,
      canh_con_tier_id CHAR(36) NOT NULL,
      dang_tier_id CHAR(36) NOT NULL,
      days_count INT DEFAULT 0,
      highest_dai_canh_gioi_tier_id CHAR(36),
      highest_canh_con_tier_id CHAR(36),
      highest_dang_tier_id CHAR(36),
      highest_days_count INT DEFAULT 0,
      last_update DATETIME DEFAULT CURRENT_TIMESTAMP,
      ${commonColumns},
      FOREIGN KEY (user_id) REFERENCES user(id),
      FOREIGN KEY (dai_canh_gioi_tier_id) REFERENCES dai_canh_gioi_tier(id),
      FOREIGN KEY (canh_con_tier_id) REFERENCES canh_con_tier(id),
      FOREIGN KEY (dang_tier_id) REFERENCES dang_tier(id),
      FOREIGN KEY (highest_dai_canh_gioi_tier_id) REFERENCES dai_canh_gioi_tier(id),
      FOREIGN KEY (highest_canh_con_tier_id) REFERENCES canh_con_tier(id),
      FOREIGN KEY (highest_dang_tier_id) REFERENCES dang_tier(id)
    )
  `);

  // Create writing_rank table
  await sequelize.query(`
    CREATE TABLE writing_rank (
      id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
      user_id CHAR(36) NOT NULL,
      dai_canh_gioi_tier_id CHAR(36) NOT NULL,
      canh_con_tier_id CHAR(36) NOT NULL,
      dang_tier_id CHAR(36) NOT NULL,
      days_count INT DEFAULT 0,
      highest_dai_canh_gioi_tier_id CHAR(36),
      highest_canh_con_tier_id CHAR(36),
      highest_dang_tier_id CHAR(36),
      highest_days_count INT DEFAULT 0,
      last_update DATETIME DEFAULT CURRENT_TIMESTAMP,
      ${commonColumns},
      FOREIGN KEY (user_id) REFERENCES user(id),
      FOREIGN KEY (dai_canh_gioi_tier_id) REFERENCES dai_canh_gioi_tier(id),
      FOREIGN KEY (canh_con_tier_id) REFERENCES canh_con_tier(id),
      FOREIGN KEY (dang_tier_id) REFERENCES dang_tier(id),
      FOREIGN KEY (highest_dai_canh_gioi_tier_id) REFERENCES dai_canh_gioi_tier(id),
      FOREIGN KEY (highest_canh_con_tier_id) REFERENCES canh_con_tier(id),
      FOREIGN KEY (highest_dang_tier_id) REFERENCES dang_tier(id)
    )
  `);

  // Create rank_constant table
  await sequelize.query(`
    CREATE TABLE rank_constant (
      id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
      type ENUM('X', 'Y') NOT NULL,
      value DECIMAL(10,2) NOT NULL,
      description TEXT,
      ${commonColumns}
    )
  `);

  // Create user_activity table
  await sequelize.query(`
    CREATE TABLE user_activity (
      id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
      user_id CHAR(36) NOT NULL,
      activity_type ENUM('translation', 'writing', 'comment') NOT NULL,
      activity_date DATE NOT NULL,
      reference_id CHAR(36),
      ${commonColumns},
      FOREIGN KEY (user_id) REFERENCES user(id)
    )
  `);

  // Create notification table
  await sequelize.query(`
    CREATE TABLE notification (
      id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
      user_id CHAR(36) NOT NULL,
      type VARCHAR(100) NOT NULL,
      content TEXT NOT NULL,
      is_read BOOLEAN DEFAULT false,
      reference_id CHAR(36),
      ${commonColumns},
      FOREIGN KEY (user_id) REFERENCES user(id)
    )
  `);

  // Create user_community table
  await sequelize.query(`
    CREATE TABLE user_community (
      id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
      user_id CHAR(36) NOT NULL,
      community_id CHAR(36) NOT NULL,
      role ENUM('member', 'moderator') DEFAULT 'member',
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ${commonColumns},
      FOREIGN KEY (user_id) REFERENCES user(id),
      FOREIGN KEY (community_id) REFERENCES community(id)
    )
  `);

  // Create translation_rank_history table
  await sequelize.query(`
    CREATE TABLE translation_rank_history (
      id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
      user_id CHAR(36) NOT NULL,
      dai_canh_gioi_tier_id CHAR(36) NOT NULL,
      canh_con_tier_id CHAR(36) NOT NULL,
      dang_tier_id CHAR(36) NOT NULL,
      days_count INT NOT NULL,
      change_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      change_type ENUM('increase', 'decrease') NOT NULL,
      ${commonColumns},
      FOREIGN KEY (user_id) REFERENCES user(id),
      FOREIGN KEY (dai_canh_gioi_tier_id) REFERENCES dai_canh_gioi_tier(id),
      FOREIGN KEY (canh_con_tier_id) REFERENCES canh_con_tier(id),
      FOREIGN KEY (dang_tier_id) REFERENCES dang_tier(id)
    )
  `);

  // Create writing_rank_history table
  await sequelize.query(`
    CREATE TABLE writing_rank_history (
      id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
      user_id CHAR(36) NOT NULL,
      dai_canh_gioi_tier_id CHAR(36) NOT NULL,
      canh_con_tier_id CHAR(36) NOT NULL,
      dang_tier_id CHAR(36) NOT NULL,
      days_count INT NOT NULL,
      change_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      change_type ENUM('increase', 'decrease') NOT NULL,
      ${commonColumns},
      FOREIGN KEY (user_id) REFERENCES user(id),
      FOREIGN KEY (dai_canh_gioi_tier_id) REFERENCES dai_canh_gioi_tier(id),
      FOREIGN KEY (canh_con_tier_id) REFERENCES canh_con_tier(id),
      FOREIGN KEY (dang_tier_id) REFERENCES dang_tier(id)
    )
  `);
}

async function seedData() {
  // Seed admin user
  await sequelize.query(`
    INSERT INTO user (id, username, email, password, role, is_active, timezone, created_at, updated_at, deleted)
    VALUES (
      UUID(),
      'admin',
      'admin@example.com',
      '$2a$10$0NjR0fTZV.zyOLrS2N2GcOQvtlCaDJ0.Zs8kDC5saTFpWluYLzPZm', -- 'password123'
      'admin',
      true,
      'UTC',
      NOW(),
      NOW(),
      false
    )
  `);

  // Seed test user
  await sequelize.query(`
    INSERT INTO user (id, username, email, password, role, is_active, timezone, created_at, updated_at, deleted)
    VALUES (
      UUID(),
      'testuser',
      'user@example.com',
      '$2a$10$0NjR0fTZV.zyOLrS2N2GcOQvtlCaDJ0.Zs8kDC5saTFpWluYLzPZm', -- 'password123'
      'user',
      true,
      'UTC',
      NOW(),
      NOW(),
      false
    )
  `);

  // Seed languages
  await sequelize.query(`
    INSERT INTO language (id, code, name, is_active, created_at, updated_at, deleted)
    VALUES
      (UUID(), 'en', 'English', true, NOW(), NOW(), false),
      (UUID(), 'vi', 'Vietnamese', true, NOW(), NOW(), false),
      (UUID(), 'fr', 'French', true, NOW(), NOW(), false),
      (UUID(), 'es', 'Spanish', true, NOW(), NOW(), false),
      (UUID(), 'de', 'German', true, NOW(), NOW(), false),
      (UUID(), 'ja', 'Japanese', true, NOW(), NOW(), false),
      (UUID(), 'ko', 'Korean', true, NOW(), NOW(), false),
      (UUID(), 'zh', 'Chinese', true, NOW(), NOW(), false)
  `);

  // Seed Đại Cảnh Giới (Great Realm) Tiers with color codes
  await sequelize.query(`
    INSERT INTO dai_canh_gioi_tier (id, name, order, color_code, color_name, created_at, updated_at, deleted)
    VALUES 
      (UUID(), '✥ Võ Sĩ', 1, '#C8A250', 'Nâu vàng', NOW(), NOW(), false),
      (UUID(), '✯ Võ Sư', 2, '#B0C4DE', 'Bạc xanh biển trắng', NOW(), NOW(), false),
      (UUID(), '✯✯ Đại Võ Sư', 3, '#FFA500', 'Cam', NOW(), NOW(), false),
      (UUID(), '✪ Võ Quân', 4, '#FFD700', 'Vàng', NOW(), NOW(), false),
      (UUID(), '♕ Võ Vương', 5, '#0000CD', 'Xanh biển', NOW(), NOW(), false),
      (UUID(), '❂ Võ Tông', 6, '#800080', 'Tím', NOW(), NOW(), false),
      (UUID(), '߷ Võ Hoàng', 7, '#FF0000', 'Đỏ', NOW(), NOW(), false),
      (UUID(), '༒ Võ Tôn', 8, '#A52A2A', 'Đỏ nâu vàng', NOW(), NOW(), false),
      (UUID(), '☭ Võ Đế', 9, '#008000', 'Xanh lá', NOW(), NOW(), false)
  `);

  // Seed Cảnh Con (Sub Realm) Tiers
  await sequelize.query(`
    INSERT INTO canh_con_tier (id, name, order, created_at, updated_at, deleted)
    VALUES 
      (UUID(), 'Nhất Tinh', 1, NOW(), NOW(), false),
      (UUID(), 'Nhị Tinh', 2, NOW(), NOW(), false),
      (UUID(), 'Tam Tinh', 3, NOW(), NOW(), false),
      (UUID(), 'Tứ Tinh', 4, NOW(), NOW(), false),
      (UUID(), 'Ngũ Tinh', 5, NOW(), NOW(), false),
      (UUID(), 'Lục Tinh', 6, NOW(), NOW(), false),
      (UUID(), 'Thất Tinh', 7, NOW(), NOW(), false),
      (UUID(), 'Bát Tinh', 8, NOW(), NOW(), false),
      (UUID(), 'Cửu Tinh', 9, NOW(), NOW(), false)
  `);

  // Seed Đẳng (Level) Tiers
  await sequelize.query(`
    INSERT INTO dang_tier (id, name, order, created_at, updated_at, deleted)
    VALUES 
      (UUID(), 'Sơ Cấp', 1, NOW(), NOW(), false),
      (UUID(), 'Trung Cấp', 2, NOW(), NOW(), false),
      (UUID(), 'Đỉnh Cấp', 3, NOW(), NOW(), false)
  `);

  // Seed Rank Constants
  await sequelize.query(`
    INSERT INTO rank_constant (id, type, value, description, created_at, updated_at, deleted)
    VALUES 
      (UUID(), 'X', 3.00, 'Constant X for translation rank calculation', NOW(), NOW(), false),
      (UUID(), 'Y', 3.00, 'Constant Y for writing rank calculation', NOW(), NOW(), false)
  `);

  // Seed Settings
  await sequelize.query(`
    INSERT INTO setting (id, key, value, description, type, created_at, updated_at, deleted)
    VALUES 
      (UUID(), 'site_name', 'Daily Translation Practice', 'Site name', 'string', NOW(), NOW(), false),
      (UUID(), 'site_description', 'Practice translation daily to improve your language skills', 'Site description', 'string', NOW(), NOW(), false),
      (UUID(), 'primary_color', '#72d1a8', 'Primary color theme', 'string', NOW(), NOW(), false),
      (UUID(), 'allow_registration', 'true', 'Allow user registration', 'boolean', NOW(), NOW(), false),
      (UUID(), 'max_post_word_count', '1000', 'Maximum word count for posts', 'number', NOW(), NOW(), false),
      (UUID(), 'streak_freeze_days', '2', 'Number of days a streak can be frozen', 'number', NOW(), NOW(), false),
      (UUID(), 'recovery_tasks_required', '3', 'Number of tasks required to recover a frozen streak', 'number', NOW(), NOW(), false)
  `);
}

// Run the initialization
initDatabase(); 