require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize } = require('./database/models');
const streakRoutes = require('./routes/streak.routes');
const schedulerService = require('./services/scheduler.service');

// Create Express app
const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/communities', require('./routes/community.routes'));
app.use('/api/communities', require('./routes/community-schedule.routes'));
app.use('/api/blocks', require('./routes/block.routes'));
app.use('/api/posts', require('./routes/post.routes'));
app.use('/api/translations', require('./routes/translation.routes'));
app.use('/api/comments', require('./routes/comment.routes'));
app.use('/api/highlights', require('./routes/highlight.routes'));
app.use('/api/vocabulary', require('./routes/vocabulary.routes'));
app.use('/api/settings', require('./routes/setting.routes'));
app.use('/api/languages', require('./routes/language.routes'));
app.use('/api/streaks', streakRoutes);
app.use('/api/ranks', require('./routes/rank.routes'));
app.use('/api/ai', require('./routes/ai.routes'));

// API status route
app.get('/api/status', (req, res) => {
  res.json({ status: 'API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
    
    // Initialize scheduler service
    await schedulerService.initialize();
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
});

module.exports = app; 