import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Tab, Nav, Spinner } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import TimezoneSelect from 'react-timezone-select';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import CommunitySchedule from '../components/community/CommunitySchedule';
import './CommunityManagementPage.css';

const CommunityManagementPage = () => {
  const { communityId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isNewCommunity = !communityId;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Community basic info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Block generation settings
  const [blockSettings, setBlockSettings] = useState({
    autoGenerate: false,
    timezone: 'Asia/Ho_Chi_Minh',
    generateTime: '06:00',
    period: 'daily',
    autoGenTitle: false,
    titlePrompt: '',
    autoGenContent: false,
    contentPrompt: '',
    minWords: 50,
    maxWords: 1000
  });

  useEffect(() => {
    if (!isNewCommunity) {
      fetchCommunityDetails();
    }
  }, [communityId]);

  const fetchCommunityDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/communities/${communityId}`);
      const { name, description, blockSettings: settings } = response.data;
      
      setName(name);
      setDescription(description);
      if (settings) {
        setBlockSettings(prev => ({ ...prev, ...settings }));
      }
    } catch (error) {
      setError('Failed to fetch community details. Please try again.');
      console.error('Error fetching community:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const data = {
        name,
        description,
        blockSettings
      };

      if (isNewCommunity) {
        await axios.post('/api/communities', data);
        navigate('/communities');
      } else {
        await axios.put(`/api/communities/${communityId}`, data);
        setSuccess('Community settings updated successfully!');
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to save community settings.');
      console.error('Error saving community:', error);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = currentUser && (currentUser.role === 'admin' || (communityId && communityId.owner_id === currentUser.id));

  if (loading) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading community information...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Container className="py-4">
        <Alert variant="danger">{error}</Alert>
        <Button variant="secondary" onClick={() => navigate('/communities')}>
          Back to Communities
        </Button>
      </Container>
    );
  }

  if (!isAdmin) {
    return (
      <Container className="py-4">
        <Alert variant="warning">
          You don't have permission to manage this community.
        </Alert>
        <Button variant="secondary" onClick={() => navigate(`/communities/${communityId}`)}>
          View Community
        </Button>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <h1 className="mb-4">
        {isNewCommunity ? 'Create New Community' : 'Manage Community'}
      </h1>

      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <Form onSubmit={handleSubmit}>
        <Tab.Container defaultActiveKey="basic">
          <Row>
            <Col md={3}>
              <Nav variant="pills" className="flex-column">
                <Nav.Item>
                  <Nav.Link eventKey="basic">Basic Information</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="blocks">Block Generation</Nav.Link>
                </Nav.Item>
              </Nav>
            </Col>

            <Col md={9}>
              <Tab.Content>
                <Tab.Pane eventKey="basic">
                  <Card>
                    <Card.Body>
                      <Form.Group className="mb-3">
                        <Form.Label>Community Name</Form.Label>
                        <Form.Control
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                        />
                      </Form.Group>

                      <Form.Group className="mb-3">
                        <Form.Label>Description</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          required
                        />
                      </Form.Group>
                    </Card.Body>
                  </Card>
                </Tab.Pane>

                <Tab.Pane eventKey="blocks">
                  <Card>
                    <Card.Body>
                      <Form.Group className="mb-3">
                        <Form.Check
                          type="switch"
                          id="auto-generate"
                          label="Automatically generate blocks"
                          checked={blockSettings.autoGenerate}
                          onChange={(e) => setBlockSettings(prev => ({
                            ...prev,
                            autoGenerate: e.target.checked
                          }))}
                        />
                      </Form.Group>

                      {blockSettings.autoGenerate && (
                        <>
                          <Row className="mb-3">
                            <Col md={6}>
                              <Form.Group>
                                <Form.Label>Timezone</Form.Label>
                                <TimezoneSelect
                                  value={{ value: blockSettings.timezone, label: blockSettings.timezone }}
                                  onChange={(tz) => setBlockSettings(prev => ({
                                    ...prev,
                                    timezone: tz.value
                                  }))}
                                />
                              </Form.Group>
                            </Col>
                            <Col md={6}>
                              <Form.Group>
                                <Form.Label>Generation Time</Form.Label>
                                <Form.Control
                                  type="time"
                                  value={blockSettings.generateTime}
                                  onChange={(e) => setBlockSettings(prev => ({
                                    ...prev,
                                    generateTime: e.target.value
                                  }))}
                                />
                              </Form.Group>
                            </Col>
                          </Row>

                          <Form.Group className="mb-3">
                            <Form.Label>Generation Period</Form.Label>
                            <Form.Select
                              value={blockSettings.period}
                              onChange={(e) => setBlockSettings(prev => ({
                                ...prev,
                                period: e.target.value
                              }))}
                            >
                              <option value="daily">Daily</option>
                              <option value="weekly">Weekly</option>
                              <option value="monthly">Monthly</option>
                            </Form.Select>
                          </Form.Group>

                          <hr />

                          <Form.Group className="mb-3">
                            <Form.Check
                              type="switch"
                              id="auto-gen-title"
                              label="Auto-generate block titles"
                              checked={blockSettings.autoGenTitle}
                              onChange={(e) => setBlockSettings(prev => ({
                                ...prev,
                                autoGenTitle: e.target.checked
                              }))}
                            />
                          </Form.Group>

                          {blockSettings.autoGenTitle && (
                            <Form.Group className="mb-3">
                              <Form.Label>Title Generation Prompt</Form.Label>
                              <Form.Control
                                as="textarea"
                                rows={2}
                                value={blockSettings.titlePrompt}
                                onChange={(e) => setBlockSettings(prev => ({
                                  ...prev,
                                  titlePrompt: e.target.value
                                }))}
                                placeholder="Enter prompt for AI title generation..."
                              />
                            </Form.Group>
                          )}

                          <hr />

                          <Form.Group className="mb-3">
                            <Form.Check
                              type="switch"
                              id="auto-gen-content"
                              label="Auto-generate initial post content"
                              checked={blockSettings.autoGenContent}
                              onChange={(e) => setBlockSettings(prev => ({
                                ...prev,
                                autoGenContent: e.target.checked
                              }))}
                            />
                          </Form.Group>

                          {blockSettings.autoGenContent && (
                            <>
                              <Form.Group className="mb-3">
                                <Form.Label>Content Generation Prompt</Form.Label>
                                <Form.Control
                                  as="textarea"
                                  rows={3}
                                  value={blockSettings.contentPrompt}
                                  onChange={(e) => setBlockSettings(prev => ({
                                    ...prev,
                                    contentPrompt: e.target.value
                                  }))}
                                  placeholder="Enter prompt for AI content generation..."
                                />
                              </Form.Group>

                              <Row>
                                <Col md={6}>
                                  <Form.Group className="mb-3">
                                    <Form.Label>Minimum Words</Form.Label>
                                    <Form.Control
                                      type="number"
                                      min="50"
                                      max="1000"
                                      value={blockSettings.minWords}
                                      onChange={(e) => setBlockSettings(prev => ({
                                        ...prev,
                                        minWords: parseInt(e.target.value)
                                      }))}
                                    />
                                  </Form.Group>
                                </Col>
                                <Col md={6}>
                                  <Form.Group className="mb-3">
                                    <Form.Label>Maximum Words</Form.Label>
                                    <Form.Control
                                      type="number"
                                      min="50"
                                      max="1000"
                                      value={blockSettings.maxWords}
                                      onChange={(e) => setBlockSettings(prev => ({
                                        ...prev,
                                        maxWords: parseInt(e.target.value)
                                      }))}
                                    />
                                  </Form.Group>
                                </Col>
                              </Row>
                            </>
                          )}
                        </>
                      )}
                    </Card.Body>
                  </Card>
                </Tab.Pane>
              </Tab.Content>
            </Col>
          </Row>
        </Tab.Container>

        <div className="d-flex justify-content-end mt-4">
          <Button
            variant="primary"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Saving...' : (isNewCommunity ? 'Create Community' : 'Save Changes')}
          </Button>
        </div>
      </Form>
    </Container>
  );
};

export default CommunityManagementPage; 