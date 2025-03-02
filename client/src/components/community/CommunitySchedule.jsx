import React, { useState, useEffect } from 'react';
import { Form, Button, Card, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import TimezoneSelect from 'react-timezone-select';
import './CommunitySchedule.css';

const CommunitySchedule = () => {
  const { communityId } = useParams();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [community, setCommunity] = useState(null);
  const [schedule, setSchedule] = useState({
    time: '06:00',
    timezone: 'Asia/Ho_Chi_Minh',
    period: 'daily',
    auto_gen_title: false,
    title_prompt: '',
    auto_gen_post: false,
    post_prompt: '',
    word_limit_min: 50,
    word_limit_max: 500
  });
  const [timezones, setTimezones] = useState([]);
  const [userIsAdmin, setUserIsAdmin] = useState(false);

  useEffect(() => {
    const fetchCommunityData = async () => {
      try {
        setLoading(true);
        
        // Fetch community data
        const communityResponse = await axios.get(`/api/communities/${communityId}`);
        setCommunity(communityResponse.data);
        
        // Check if user is owner or has admin role in this community
        const userCommunityResponse = await axios.get(`/api/communities/${communityId}/members/me`);
        setUserIsAdmin(
          userCommunityResponse.data.role === 'admin' || 
          communityResponse.data.owner_id === currentUser.id
        );
        
        // Fetch existing schedule if any
        const scheduleResponse = await axios.get(`/api/communities/${communityId}/schedule`);
        if (scheduleResponse.data) {
          setSchedule(scheduleResponse.data);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching community data:', err);
        setError('Failed to load community information. Please try again later.');
        setLoading(false);
      }
    };

    if (communityId && currentUser) {
      fetchCommunityData();
    }
  }, [communityId, currentUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Validate input
      if (schedule.auto_gen_title && !schedule.title_prompt.trim()) {
        setError('Please provide a prompt for auto-generated titles.');
        setSaving(false);
        return;
      }
      
      if (schedule.auto_gen_post && !schedule.post_prompt.trim()) {
        setError('Please provide a prompt for auto-generated posts.');
        setSaving(false);
        return;
      }
      
      if (
        schedule.word_limit_min < 50 || 
        schedule.word_limit_max > 1000 || 
        schedule.word_limit_min > schedule.word_limit_max
      ) {
        setError('Word limit must be between 50 and 1000, and minimum should be less than maximum.');
        setSaving(false);
        return;
      }
      
      // Save the schedule
      await axios.post(`/api/communities/${communityId}/schedule`, schedule);
      
      setSuccess('Schedule updated successfully!');
      setSaving(false);
    } catch (err) {
      console.error('Error saving schedule:', err);
      setError('Failed to save schedule. Please try again later.');
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSchedule(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const handleTimezoneChange = (selectedTimezone) => {
    setSchedule(prev => ({
      ...prev,
      timezone: selectedTimezone.value
    }));
  };

  if (loading) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading community schedule...</p>
      </div>
    );
  }

  if (!userIsAdmin) {
    return (
      <Alert variant="warning">
        You don't have permission to manage schedules for this community.
      </Alert>
    );
  }

  return (
    <div className="community-schedule-container">
      <Card>
        <Card.Header className="bg-primary text-white">
          <h4 className="mb-0">Manage Automatic Block Creation</h4>
        </Card.Header>
        <Card.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}
          
          <Form onSubmit={handleSubmit}>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Schedule Time</Form.Label>
                  <Form.Control 
                    type="time" 
                    name="time" 
                    value={schedule.time} 
                    onChange={handleChange} 
                    required 
                  />
                  <Form.Text className="text-muted">
                    The time when new blocks will be created
                  </Form.Text>
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Timezone</Form.Label>
                  <TimezoneSelect
                    value={{ value: schedule.timezone, label: schedule.timezone }}
                    onChange={handleTimezoneChange}
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Form.Group className="mb-3">
              <Form.Label>Creation Period</Form.Label>
              <Form.Select 
                name="period" 
                value={schedule.period} 
                onChange={handleChange}
                required
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </Form.Select>
              <Form.Text className="text-muted">
                How often new blocks will be created
              </Form.Text>
            </Form.Group>
            
            <hr className="my-4" />
            
            <Form.Group className="mb-3">
              <Form.Check 
                type="switch"
                id="auto-gen-title"
                label="Auto-generate block titles" 
                name="auto_gen_title"
                checked={schedule.auto_gen_title}
                onChange={handleChange}
              />
              <Form.Text className="text-muted">
                If disabled, block titles will use the format "DD-MM-YYYY"
              </Form.Text>
            </Form.Group>
            
            {schedule.auto_gen_title && (
              <Form.Group className="mb-3">
                <Form.Label>Title Generation Prompt</Form.Label>
                <Form.Control 
                  as="textarea" 
                  rows={2} 
                  name="title_prompt" 
                  value={schedule.title_prompt} 
                  onChange={handleChange} 
                  placeholder="Enter a prompt for AI to generate block titles..." 
                />
                <Form.Text className="text-muted">
                  The AI will use this prompt to generate titles for new blocks
                </Form.Text>
              </Form.Group>
            )}
            
            <hr className="my-4" />
            
            <Form.Group className="mb-3">
              <Form.Check 
                type="switch"
                id="auto-gen-post"
                label="Auto-generate posts" 
                name="auto_gen_post"
                checked={schedule.auto_gen_post}
                onChange={handleChange}
              />
              <Form.Text className="text-muted">
                Automatically create posts in each new block
              </Form.Text>
            </Form.Group>
            
            {schedule.auto_gen_post && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Post Generation Prompt</Form.Label>
                  <Form.Control 
                    as="textarea" 
                    rows={3} 
                    name="post_prompt" 
                    value={schedule.post_prompt} 
                    onChange={handleChange} 
                    placeholder="Enter a prompt for AI to generate posts..." 
                  />
                  <Form.Text className="text-muted">
                    The AI will use this prompt to generate posts for new blocks
                  </Form.Text>
                </Form.Group>
                
                <Row className="mb-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Minimum Word Count</Form.Label>
                      <Form.Control 
                        type="number" 
                        name="word_limit_min" 
                        value={schedule.word_limit_min} 
                        onChange={handleChange} 
                        min="50" 
                        max="1000"
                        required 
                      />
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Maximum Word Count</Form.Label>
                      <Form.Control 
                        type="number" 
                        name="word_limit_max" 
                        value={schedule.word_limit_max} 
                        onChange={handleChange}
                        min="50" 
                        max="1000" 
                        required 
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </>
            )}
            
            <div className="d-flex justify-content-end mt-4">
              <Button 
                type="submit" 
                variant="primary" 
                className="px-4" 
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Schedule'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </div>
  );
};

export default CommunitySchedule; 