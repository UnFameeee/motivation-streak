# Database Schema for "Dịch thuật mỗi ngày với tiếng anh" Project

## Common Fields
All tables will include the following columns:
- `created_at` (datetime) - Creation timestamp
- `updated_at` (datetime) - Last update timestamp
- `deleted_at` (datetime) - Soft delete timestamp
- `deleted` (boolean) - Soft delete flag

## Tables

### 1. `user`
- `id` (GUID) - Primary key
- `username` (varchar) - Username
- `email` (varchar) - User email
- `password` (varchar) - Encrypted password
- `role` (enum) - Role (admin or user)
- `is_active` (boolean) - Active status
- `timezone` (varchar) - User timezone
- `google_id` (varchar) - Google OAuth ID
- `avatar` (varchar) - Avatar URL
- `last_login` (datetime) - Last login timestamp

### 2. `community`
- `id` (GUID) - Primary key
- `name` (varchar) - Community name
- `description` (text) - Description
- `image_url` (varchar) - URL to community image/banner
- `owner_id` (GUID) - Creator ID (references `user.id`)
- `is_public` (boolean) - Public flag

### 3. `community_schedule`
- `id` (GUID) - Primary key
- `community_id` (GUID) - References `community.id`
- `time` (time) - Block creation time
- `timezone` (varchar) - Timezone
- `period` (enum) - Period (daily, weekly, monthly, etc.)
- `auto_gen_title` (boolean) - Auto-generate title flag
- `title_prompt` (text) - Title prompt
- `auto_gen_post` (boolean) - Auto-generate post flag
- `post_prompt` (text) - Post prompt
- `word_limit_min` (int) - Minimum word limit
- `word_limit_max` (int) - Maximum word limit

### 4. `block`
- `id` (GUID) - Primary key
- `community_id` (GUID) - References `community.id`
- `title` (varchar) - Block title
- `date` (date) - Representative date
- `is_auto_generated` (boolean) - Auto-generated flag

### 5. `language`
- `id` (GUID) - Primary key
- `code` (varchar) - Language code (e.g., 'en', 'vi')
- `name` (varchar) - Language name
- `is_active` (boolean) - Active status

### 6. `post`
- `id` (GUID) - Primary key
- `block_id` (GUID) - References `block.id`
- `user_id` (GUID) - Creator, references `user.id`
- `title` (varchar) - Post title
- `content` (text) - Original post content
- `language_id` (GUID) - References `language.id`
- `word_count` (int) - Word count
- `is_auto_generated` (boolean) - Auto-generated flag

### 7. `post_translation`
- `id` (GUID) - Primary key
- `post_id` (GUID) - References `post.id`
- `user_id` (GUID) - Translator, references `user.id`
- `language_id` (GUID) - References `language.id`
- `content` (text) - Translation content
- `word_count` (int) - Word count

### 8. `post_score`
- `id` (GUID) - Primary key
- `post_translation_id` (GUID) - References `post_translation.id`
- `post_id` (GUID) - References `post.id`
- `score` (decimal) - Score
- `feedback` (text) - AI feedback/explanation
- `requested_by` (GUID) - User who requested scoring, references `user.id`

### 9. `comment`
- `id` (GUID) - Primary key
- `user_id` (GUID) - Commenter, references `user.id`
- `post_translation_id` (GUID) - References `post_translation.id`
- `content` (text) - Comment content

### 10. `highlight`
- `id` (GUID) - Primary key
- `post_id` (GUID) - References `post.id` (if highlighting original)
- `post_translation_id` (GUID) - References `post_translation.id` (if highlighting translation)
- `user_id` (GUID) - Creator, references `user.id`
- `start_index` (int) - Start position
- `end_index` (int) - End position
- `highlighted_text` (text) - Highlighted text

### 11. `highlight_comment`
- `id` (GUID) - Primary key
- `highlight_id` (GUID) - References `highlight.id`
- `user_id` (GUID) - Commenter, references `user.id`
- `content` (text) - Comment content

### 12. `setting`
- `id` (GUID) - Primary key
- `key` (varchar) - Setting key
- `value` (text) - Value
- `description` (text) - Description
- `type` (varchar) - Data type (string, number, boolean, etc.)

### 13. `vocabulary`
- `id` (GUID) - Primary key
- `word` (varchar) - Vocabulary word
- `language_id` (GUID) - References `language.id`
- `definition` (text) - Definition
- `example` (text) - Example
- `user_id` (GUID) - Added by, references `user.id`

### 14. `user_vocabulary`
- `id` (GUID) - Primary key
- `user_id` (GUID) - References `user.id`
- `vocabulary_id` (GUID) - References `vocabulary.id`
- `status` (enum) - Learning status (new, learning, mastered)

### 15. `dang_tier`
- `id` (GUID) - Primary key
- `name` (varchar) - "Đẳng" name
- `order` (int) - Order

### 16. `canh_con_tier`
- `id` (GUID) - Primary key
- `name` (varchar) - "Cảnh Con" name
- `order` (int) - Order

### 17. `dai_canh_gioi_tier`
- `id` (GUID) - Primary key
- `name` (varchar) - "Đại Cảnh Giới" name
- `order` (int) - Order
- `color_code` (varchar) - Hex color code
- `color_name` (varchar) - Color name in Vietnamese

### 18. `streak`
- `id` (GUID) - Primary key
- `user_id` (GUID) - References `user.id`
- `type` (enum) - Streak type (translation, writing)
- `current_count` (int) - Current day count
- `max_count` (int) - Maximum day count achieved
- `last_date` (date) - Last activity date
- `freeze_until` (date) - Freeze expiration date (if applicable)
- `recovery_tasks_completed` (int) - Number of recovery tasks completed

### 19. `translation_rank`
- `id` (GUID) - Primary key
- `user_id` (GUID) - References `user.id`
- `dai_canh_gioi_tier_id` (GUID) - References `dai_canh_gioi_tier.id`
- `canh_con_tier_id` (GUID) - References `canh_con_tier.id`
- `dang_tier_id` (GUID) - References `dang_tier.id`
- `days_count` (int) - Consecutive translation days
- `highest_dai_canh_gioi_tier_id` (GUID) - References `dai_canh_gioi_tier.id` (highest achieved)
- `highest_canh_con_tier_id` (GUID) - References `canh_con_tier.id` (highest achieved)
- `highest_dang_tier_id` (GUID) - References `dang_tier.id` (highest achieved)
- `highest_days_count` (int) - Highest consecutive translation days ever achieved
- `last_update` (datetime) - Last update timestamp

### 20. `writing_rank`
- `id` (GUID) - Primary key
- `user_id` (GUID) - References `user.id`
- `dai_canh_gioi_tier_id` (GUID) - References `dai_canh_gioi_tier.id`
- `canh_con_tier_id` (GUID) - References `canh_con_tier.id`
- `dang_tier_id` (GUID) - References `dang_tier.id`
- `days_count` (int) - Consecutive writing days
- `highest_dai_canh_gioi_tier_id` (GUID) - References `dai_canh_gioi_tier.id` (highest achieved)
- `highest_canh_con_tier_id` (GUID) - References `canh_con_tier.id` (highest achieved)
- `highest_dang_tier_id` (GUID) - References `dang_tier.id` (highest achieved)
- `highest_days_count` (int) - Highest consecutive writing days ever achieved
- `last_update` (datetime) - Last update timestamp

### 21. `rank_constant`
- `id` (GUID) - Primary key
- `type` (enum) - Constant type (X for translation, Y for writing)
- `value` (decimal) - Value
- `description` (text) - Description

### 22. `user_activity`
- `id` (GUID) - Primary key
- `user_id` (GUID) - References `user.id`
- `activity_type` (enum) - Activity type (translation, writing, comment)
- `activity_date` (date) - Activity date
- `reference_id` (GUID) - Reference ID (post_id, post_translation_id, etc.)

### 23. `notification`
- `id` (GUID) - Primary key
- `user_id` (GUID) - References `user.id`
- `type` (enum) - Notification type
- `content` (text) - Notification content
- `is_read` (boolean) - Read status
- `reference_id` (GUID) - Reference ID (if applicable)

### 24. `user_community`
- `id` (GUID) - Primary key
- `user_id` (GUID) - References `user.id`
- `community_id` (GUID) - References `community.id`
- `role` (enum) - Role in community (member, moderator, etc.)
- `joined_at` (datetime) - Join timestamp

### 25. `translation_rank_history`
- `id` (GUID) - Primary key
- `user_id` (GUID) - References `user.id`
- `dai_canh_gioi_tier_id` (GUID) - References `dai_canh_gioi_tier.id`
- `canh_con_tier_id` (GUID) - References `canh_con_tier.id`
- `dang_tier_id` (GUID) - References `dang_tier.id`
- `days_count` (int) - Consecutive translation days at time of record
- `change_date` (datetime) - When the rank changed
- `change_type` (enum) - Type of change (increase, decrease)

### 26. `writing_rank_history`
- `id` (GUID) - Primary key
- `user_id` (GUID) - References `user.id`
- `dai_canh_gioi_tier_id` (GUID) - References `dai_canh_gioi_tier.id`
- `canh_con_tier_id` (GUID) - References `canh_con_tier.id`
- `dang_tier_id` (GUID) - References `dang_tier.id`
- `days_count` (int) - Consecutive writing days at time of record
- `change_date` (datetime) - When the rank changed
- `change_type` (enum) - Type of change (increase, decrease)

## Default Data

### Default Tiers Data

#### Đại Cảnh Giới (Great Realm) Tiers - dai_canh_gioi_tier
```sql
-- Đại Cảnh Giới default data (in ascending order)
INSERT INTO dai_canh_gioi_tier (id, name, order, color_code, color_name, created_at, updated_at, deleted) VALUES 
(UUID(), '✥ Võ Sĩ', 1, '#C8A250', 'Nâu vàng', NOW(), NOW(), false),
(UUID(), '✯ Võ Sư', 2, '#B0C4DE', 'Bạc xanh biển trắng', NOW(), NOW(), false),
(UUID(), '✯✯ Đại Võ Sư', 3, '#FFA500', 'Cam', NOW(), NOW(), false),
(UUID(), '✪ Võ Quân', 4, '#FFD700', 'Vàng', NOW(), NOW(), false),
(UUID(), '♕ Võ Vương', 5, '#0000CD', 'Xanh biển', NOW(), NOW(), false),
(UUID(), '❂ Võ Tông', 6, '#800080', 'Tím', NOW(), NOW(), false),
(UUID(), '߷ Võ Hoàng', 7, '#FF0000', 'Đỏ', NOW(), NOW(), false),
(UUID(), '༒ Võ Tôn', 8, '#A52A2A', 'Đỏ nâu vàng', NOW(), NOW(), false),
(UUID(), '☭ Võ Đế', 9, '#008000', 'Xanh lá', NOW(), NOW(), false);
```

#### Cảnh Con (Sub Realm) Tiers - canh_con_tier
```sql
-- Cảnh Con default data (in ascending order)
INSERT INTO canh_con_tier (id, name, order, created_at, updated_at, deleted) VALUES 
(UUID(), 'Nhất Tinh', 1, NOW(), NOW(), false),
(UUID(), 'Nhị Tinh', 2, NOW(), NOW(), false),
(UUID(), 'Tam Tinh', 3, NOW(), NOW(), false),
(UUID(), 'Tứ Tinh', 4, NOW(), NOW(), false),
(UUID(), 'Ngũ Tinh', 5, NOW(), NOW(), false),
(UUID(), 'Lục Tinh', 6, NOW(), NOW(), false),
(UUID(), 'Thất Tinh', 7, NOW(), NOW(), false),
(UUID(), 'Bát Tinh', 8, NOW(), NOW(), false),
(UUID(), 'Cửu Tinh', 9, NOW(), NOW(), false);
```

#### Đẳng (Level) Tiers - dang_tier
```sql
-- Đẳng default data (in ascending order)
INSERT INTO dang_tier (id, name, order, created_at, updated_at, deleted) VALUES 
(UUID(), 'Sơ Cấp', 1, NOW(), NOW(), false),
(UUID(), 'Trung Cấp', 2, NOW(), NOW(), false),
(UUID(), 'Đỉnh Cấp', 3, NOW(), NOW(), false);
```

## Key Relationships

1. User-Community: Many-to-Many (via user_community)
   - Users can join multiple communities
   - Communities can have multiple users

2. Community-Block: One-to-Many
   - A community has many blocks
   - Each block belongs to one community

3. Block-Post: One-to-Many
   - A block has many posts
   - Each post belongs to one block

4. Post-PostTranslation: One-to-Many
   - A post can have many translations
   - Each translation belongs to one post

5. User-Streak: One-to-Many
   - A user has separate streaks for writing and translation activities

6. User-Rank: One-to-Many
   - A user has translation and writing ranks based on streaks

7. Rank-Tier: Many-to-Many
   - Ranks are calculated based on various tiers (Dang, Canh Con, Dai Canh Gioi)

8. User-RankHistory: One-to-Many
   - A user has a history of rank changes for both translation and writing activities
   - Each rank history entry belongs to one user

This database schema covers all the functional requirements specified in the project requirements document. 