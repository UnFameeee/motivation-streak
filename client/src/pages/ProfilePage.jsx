import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Tab, Nav, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { userAPI, authAPI } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';
import TimezoneSelect from 'react-timezone-select';
import './ProfilePage.css';

const ProfilePage = () => {
  const { currentUser, updateUserInfo, logout } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Profile information states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [timezone, setTimezone] = useState('');
  const [avatar, setAvatar] = useState('');
  
  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Activity stats
  const [activityStats, setActivityStats] = useState({
    translationsCount: 0,
    postsCount: 0,
    commentsCount: 0,
    translationStreak: 0,
    writingStreak: 0
  });
  
  useEffect(() => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    // Set initial user data
    setUsername(currentUser.username || '');
    setEmail(currentUser.email || '');
    setTimezone(currentUser.timezone || 'Asia/Ho_Chi_Minh');
    setAvatar(currentUser.avatar || '');
    
    // Fetch user activity stats
    fetchActivityStats();
  }, [currentUser, navigate]);
  
  const fetchActivityStats = async () => {
    try {
      const [translationRes, postsRes] = await Promise.all([
        userAPI.getTranslationStats(),
        userAPI.getPostStats(),
      ]);
      
      setActivityStats({
        translationsCount: translationRes.data.count || 0,
        postsCount: postsRes.data.count || 0,
        commentsCount: postsRes.data.commentCount || 0,
        translationStreak: translationRes.data.currentStreak || 0,
        writingStreak: postsRes.data.currentStreak || 0
      });
    } catch (err) {
      console.error('Error fetching activity stats:', err);
    }
  };
  
  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await userAPI.updateProfile({
        username,
        timezone
      });
      
      // Update user context
      updateUserInfo(response.data);
      
      setSuccess('Profile updated successfully');
      setLoading(false);
    } catch (err) {
      console.error('Error updating profile:', err);
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('An error occurred while updating your profile. Please try again later.');
      }
      setLoading(false);
    }
  };
  
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      await authAPI.changePassword({
        currentPassword,
        newPassword
      });
      
      setSuccess('Password changed successfully. Please log in again with your new password.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Log user out after 3 seconds
      setTimeout(() => {
        logout();
        navigate('/login');
      }, 3000);
      
      setLoading(false);
    } catch (err) {
      console.error('Error changing password:', err);
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('An error occurred while changing your password. Please try again later.');
      }
      setLoading(false);
    }
  };
  
  const handleTimezoneChange = (selectedTimezone) => {
    setTimezone(selectedTimezone.value);
  };
  
  return (
    <Container className="profile-page py-5">
      <h1 className="profile-title mb-4">Your Profile</h1>
      
      <Row>
        <Col lg={3} md={4} className="mb-4">
          <Card className="profile-sidebar">
            <Card.Body className="text-center">
              <div className="profile-avatar-container mb-3">
                {avatar ? (
                  <img src={avatar} alt={username} className="profile-avatar" />
                ) : (
                  <div className="profile-avatar-placeholder">
                    {username ? username.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
              </div>
              <h3 className="profile-name">{username}</h3>
              <p className="profile-email text-muted">{email}</p>
              
              <hr />
              
              <div className="profile-stats">
                <div className="stat-item">
                  <span className="stat-value">{activityStats.translationsCount}</span>
                  <span className="stat-label">Translations</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{activityStats.postsCount}</span>
                  <span className="stat-label">Posts</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{activityStats.commentsCount}</span>
                  <span className="stat-label">Comments</span>
                </div>
              </div>
              
              <hr />
              
              <div className="profile-streaks">
                <div className="streak-item">
                  <div className="streak-label">Translation Streak</div>
                  <div className="streak-value">{activityStats.translationStreak} days</div>
                </div>
                <div className="streak-item">
                  <div className="streak-label">Writing Streak</div>
                  <div className="streak-value">{activityStats.writingStreak} days</div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={9} md={8}>
          <Card className="profile-content">
            <Card.Header className="bg-white">
              <Nav 
                variant="tabs" 
                className="profile-tabs"
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
              >
                <Nav.Item>
                  <Nav.Link eventKey="profile">Profile Settings</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="password">Change Password</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="activity">Activity History</Nav.Link>
                </Nav.Item>
              </Nav>
            </Card.Header>
            
            <Card.Body>
              {error && <Alert variant="danger">{error}</Alert>}
              {success && <Alert variant="success">{success}</Alert>}
              
              <Tab.Content>
                {/* Profile Settings Tab */}
                <Tab.Pane active={activeTab === 'profile'}>
                  <h4 className="mb-4">Profile Settings</h4>
                  <Form onSubmit={handleProfileUpdate}>
                    <Form.Group className="mb-3">
                      <Form.Label>Username</Form.Label>
                      <Form.Control
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                      />
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                      <Form.Label>Email Address</Form.Label>
                      <Form.Control
                        type="email"
                        value={email}
                        disabled
                        readOnly
                      />
                      <Form.Text className="text-muted">
                        Email address cannot be changed as it's linked to your Google account.
                      </Form.Text>
                    </Form.Group>
                    
                    <Form.Group className="mb-4">
                      <Form.Label>Timezone</Form.Label>
                      <TimezoneSelect
                        value={{ value: timezone, label: timezone }}
                        onChange={handleTimezoneChange}
                      />
                      <Form.Text className="text-muted">
                        Set your timezone for community schedules and activity tracking.
                      </Form.Text>
                    </Form.Group>
                    
                    <Button 
                      type="submit" 
                      variant="primary" 
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Spinner 
                            as="span" 
                            animation="border" 
                            size="sm" 
                            role="status" 
                            aria-hidden="true" 
                            className="me-2"
                          />
                          Saving...
                        </>
                      ) : 'Save Changes'}
                    </Button>
                  </Form>
                </Tab.Pane>
                
                {/* Change Password Tab */}
                <Tab.Pane active={activeTab === 'password'}>
                  <h4 className="mb-4">Change Password</h4>
                  <Form onSubmit={handlePasswordChange}>
                    <Form.Group className="mb-3">
                      <Form.Label>Current Password</Form.Label>
                      <Form.Control
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                      />
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                      <Form.Label>New Password</Form.Label>
                      <Form.Control
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={8}
                      />
                      <Form.Text className="text-muted">
                        Password must be at least 8 characters long.
                      </Form.Text>
                    </Form.Group>
                    
                    <Form.Group className="mb-4">
                      <Form.Label>Confirm New Password</Form.Label>
                      <Form.Control
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={8}
                        isInvalid={confirmPassword && newPassword !== confirmPassword}
                      />
                      {confirmPassword && newPassword !== confirmPassword && (
                        <Form.Control.Feedback type="invalid">
                          Passwords do not match.
                        </Form.Control.Feedback>
                      )}
                    </Form.Group>
                    
                    <Button 
                      type="submit" 
                      variant="primary" 
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Spinner 
                            as="span" 
                            animation="border" 
                            size="sm" 
                            role="status" 
                            aria-hidden="true" 
                            className="me-2"
                          />
                          Changing Password...
                        </>
                      ) : 'Change Password'}
                    </Button>
                  </Form>
                </Tab.Pane>
                
                {/* Activity History Tab */}
                <Tab.Pane active={activeTab === 'activity'}>
                  <h4 className="mb-4">Activity History</h4>
                  <p className="text-center text-muted">
                    Detailed activity history will be implemented soon.
                    <br />
                    You can visit your posts and translations directly from the community pages.
                  </p>
                </Tab.Pane>
              </Tab.Content>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ProfilePage; 