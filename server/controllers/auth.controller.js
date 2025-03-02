const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const { User } = require('../database/models');
const { generateToken } = require('../utils/jwt.utils');
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');
const { Op } = require('sequelize');

// Initialize Google OAuth client
const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_CALLBACK_URL
);

/**
 * Register a new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.register = async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password } = req.body;

  try {
    // Check if user already exists
    let user = await User.findOne({ where: { email } });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    user = await User.create({
      username,
      email,
      password: await bcrypt.hash(password, 10), // Hash password
      role: 'user', // Default role
      is_active: true,
      timezone: req.body.timezone || 'UTC'
    });

    // Generate JWT token
    const token = generateToken(user);

    // Return user data without password
    const userData = user.get({ plain: true });
    delete userData.password;

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: userData
    });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Login a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.login = async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(400).json({ message: 'Account is inactive' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Update last login time
    await user.update({ last_login: new Date() });

    // Generate JWT token
    const token = generateToken(user);

    // Return user data without password
    const userData = user.get({ plain: true });
    delete userData.password;

    res.json({
      message: 'Login successful',
      token,
      user: userData
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get current user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getCurrentUser = async (req, res) => {
  try {
    // User is already attached to req by auth middleware
    res.json({
      user: req.user
    });
  } catch (err) {
    console.error('Get current user error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Logout user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.logout = async (req, res) => {
  try {
    // In a proper implementation, you might want to invalidate the token
    // or add it to a blacklist. For JWT, this often requires additional
    // server-side storage.
    
    // For now, just send a success response
    // The client should remove the token from local storage
    res.json({ message: 'Logout successful' });
  } catch (err) {
    console.error('Logout error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Google OAuth authentication
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.googleAuth = (req, res) => {
  try {
    // Generate OAuth URL
    const authUrl = googleClient.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
      ],
      prompt: 'consent'
    });

    // Redirect to Google OAuth URL
    res.redirect(authUrl);
  } catch (err) {
    console.error('Google auth error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Google OAuth callback
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.googleCallback = async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ message: 'Authorization code required' });
  }

  try {
    // Exchange code for tokens
    const { tokens } = await googleClient.getToken(code);
    googleClient.setCredentials(tokens);

    // Get user info
    const oauth2 = require('googleapis').google.oauth2({
      version: 'v2',
      auth: googleClient
    });

    const userInfo = await oauth2.userinfo.get();

    if (!userInfo.data.email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check if user exists
    let user = await User.findOne({
      where: { email: userInfo.data.email }
    });

    if (user) {
      // User exists, update Google ID and last login
      await user.update({
        google_id: userInfo.data.id,
        avatar: userInfo.data.picture || user.avatar,
        last_login: new Date()
      });
    } else {
      // Create new user
      user = await User.create({
        username: userInfo.data.name,
        email: userInfo.data.email,
        google_id: userInfo.data.id,
        avatar: userInfo.data.picture,
        is_active: true,
        role: 'user',
        last_login: new Date()
      });
    }

    // Generate JWT token
    const token = generateToken(user);

    // Redirect to frontend with token
    res.redirect(`${process.env.CLIENT_URL}/auth/callback?token=${token}`);
  } catch (err) {
    console.error('Google callback error:', err.message);
    res.redirect(`${process.env.CLIENT_URL}/login?error=authentication_failed`);
  }
};

/**
 * Change user password
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.changePassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Get user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if current password is correct
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await user.update({
      password: hashedPassword,
      updated_at: new Date()
    });

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Error in changePassword:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Forgot password - send reset email
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.forgotPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ where: { email, deleted: false } });
    if (!user) {
      // For security reasons, we'll still return a success response
      // even if the email doesn't exist in our database
      return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    // Save token to database
    await user.update({
      reset_token: resetToken,
      reset_token_expiry: resetTokenExpiry,
      updated_at: new Date()
    });

    // Send email with reset link
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}?email=${encodeURIComponent(email)}`;

    // Here you would integrate with your email service to send the reset link
    // For demonstration, we'll just log it
    console.log('Password reset link:', resetUrl);

    // If using a mail service like Nodemailer, SendGrid, etc.
    // await sendPasswordResetEmail(user.email, resetUrl);

    res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
  } catch (err) {
    console.error('Error in forgotPassword:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Validate reset token
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.validateResetToken = async (req, res) => {
  try {
    const { token } = req.params;

    // Find user with this token
    const user = await User.findOne({
      where: {
        reset_token: token,
        reset_token_expiry: { [Op.gt]: new Date() },
        deleted: false
      }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    res.json({ message: 'Reset token is valid' });
  } catch (err) {
    console.error('Error in validateResetToken:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Reset password with token
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.resetPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { token, email, password } = req.body;

    // Find user with this token and email
    const user = await User.findOne({
      where: {
        reset_token: token,
        email,
        reset_token_expiry: { [Op.gt]: new Date() },
        deleted: false
      }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update user
    await user.update({
      password: hashedPassword,
      reset_token: null,
      reset_token_expiry: null,
      updated_at: new Date()
    });

    res.json({ message: 'Password has been reset successfully' });
  } catch (err) {
    console.error('Error in resetPassword:', err);
    res.status(500).json({ message: 'Server error' });
  }
}; 