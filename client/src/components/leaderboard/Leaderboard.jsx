import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, Table, Nav, Tab, Badge, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import './Leaderboard.css';

const Leaderboard = () => {
  const { currentUser } = useAuth();
  const [translationLeaderboard, setTranslationLeaderboard] = useState([]);
  const [writingLeaderboard, setWritingLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeKey, setActiveKey] = useState('translation');

  useEffect(() => {
    const fetchLeaderboards = async () => {
      try {
        setLoading(true);
        
        // Fetch translation leaderboard
        const translationResponse = await axios.get('/api/streaks/translation/leaderboard');
        setTranslationLeaderboard(translationResponse.data);
        
        // Fetch writing leaderboard
        const writingResponse = await axios.get('/api/streaks/writing/leaderboard');
        setWritingLeaderboard(writingResponse.data);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching leaderboards:', err);
        setError('Failed to load leaderboard data. Please try again later.');
        setLoading(false);
      }
    };

    fetchLeaderboards();
  }, []);

  const getRankDisplay = (user) => {
    if (!user || !user.dai_canh_gioi_tier || !user.canh_con_tier || !user.dang_tier) {
      return 'N/A';
    }
    
    return (
      <span className="rank-display">
        <span 
          className={`dai-canh-gioi rank-tier-${user.dai_canh_gioi_tier.order}`} 
          style={{ color: user.dai_canh_gioi_tier.color_code }}
        >
          {user.dai_canh_gioi_tier.name}
        </span>
        {' - '}
        <span className="canh-con">
          {user.canh_con_tier.name}
        </span>
        {' - '}
        <span className="dang">
          {user.dang_tier.name}
        </span>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="text-center p-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading leaderboards...</p>
      </div>
    );
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  return (
    <div className="leaderboard-container">
      <h2 className="text-center mb-4">Cultivation Rankings</h2>
      
      <Tab.Container activeKey={activeKey} onSelect={setActiveKey}>
        <Nav variant="tabs" className="mb-3 leaderboard-nav">
          <Nav.Item>
            <Nav.Link eventKey="translation" className="translation-tab">
              <span className="tab-title">Diệu Thuật Bảng</span>
              <small className="d-block">Translation Leaderboard</small>
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="writing" className="writing-tab">
              <span className="tab-title">Phong Vân Bảng</span>
              <small className="d-block">Writing Leaderboard</small>
            </Nav.Link>
          </Nav.Item>
        </Nav>
        
        <Tab.Content>
          <Tab.Pane eventKey="translation">
            <Card className="leaderboard-card">
              <Card.Header>
                <h4>Top Translation Streaks</h4>
                <small>Updated every 2 hours</small>
              </Card.Header>
              <Card.Body>
                <Table striped hover responsive className="leaderboard-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>User</th>
                      <th>Rank</th>
                      <th>Streak</th>
                      <th>Highest Streak</th>
                    </tr>
                  </thead>
                  <tbody>
                    {translationLeaderboard.length > 0 ? (
                      translationLeaderboard.map((entry, index) => (
                        <tr key={entry.id} className={currentUser && entry.user.id === currentUser.id ? 'current-user-row' : ''}>
                          <td>{index + 1}</td>
                          <td>
                            <div className="user-info">
                              {entry.user.avatar && (
                                <img 
                                  src={entry.user.avatar} 
                                  alt={entry.user.username} 
                                  className="user-avatar"
                                />
                              )}
                              <span>{entry.user.username}</span>
                              {currentUser && entry.user.id === currentUser.id && (
                                <Badge bg="info" className="ms-2">You</Badge>
                              )}
                            </div>
                          </td>
                          <td>{getRankDisplay(entry)}</td>
                          <td>{entry.days_count} days</td>
                          <td>{entry.highest_days_count} days</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="text-center">No data available</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Tab.Pane>
          
          <Tab.Pane eventKey="writing">
            <Card className="leaderboard-card">
              <Card.Header>
                <h4>Top Writing Streaks</h4>
                <small>Updated every 2 hours</small>
              </Card.Header>
              <Card.Body>
                <Table striped hover responsive className="leaderboard-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>User</th>
                      <th>Rank</th>
                      <th>Streak</th>
                      <th>Highest Streak</th>
                    </tr>
                  </thead>
                  <tbody>
                    {writingLeaderboard.length > 0 ? (
                      writingLeaderboard.map((entry, index) => (
                        <tr key={entry.id} className={currentUser && entry.user.id === currentUser.id ? 'current-user-row' : ''}>
                          <td>{index + 1}</td>
                          <td>
                            <div className="user-info">
                              {entry.user.avatar && (
                                <img 
                                  src={entry.user.avatar} 
                                  alt={entry.user.username} 
                                  className="user-avatar"
                                />
                              )}
                              <span>{entry.user.username}</span>
                              {currentUser && entry.user.id === currentUser.id && (
                                <Badge bg="info" className="ms-2">You</Badge>
                              )}
                            </div>
                          </td>
                          <td>{getRankDisplay(entry)}</td>
                          <td>{entry.days_count} days</td>
                          <td>{entry.highest_days_count} days</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="text-center">No data available</td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>
      
      <div className="leaderboard-info mt-4">
        <h5>How Rankings Work</h5>
        <Row>
          <Col md={6}>
            <Card className="info-card">
              <Card.Header>Diệu Thuật Bảng (Translation)</Card.Header>
              <Card.Body>
                <ul>
                  <li>Ranks are based on consecutive days of translation activity</li>
                  <li>Users advance through ranks: Đẳng → Cảnh Con → Đại Cảnh Giới</li>
                  <li>Each day of activity contributes to your streak and rank</li>
                  <li>Missing a day can freeze your streak for 2 days</li>
                  <li>Complete 3 recovery tasks to maintain your streak</li>
                </ul>
              </Card.Body>
            </Card>
          </Col>
          <Col md={6}>
            <Card className="info-card">
              <Card.Header>Phong Vân Bảng (Writing)</Card.Header>
              <Card.Body>
                <ul>
                  <li>Ranks are based on consecutive days of writing activity</li>
                  <li>Users advance through ranks: Đẳng → Cảnh Con → Đại Cảnh Giới</li>
                  <li>Each day of activity contributes to your streak and rank</li>
                  <li>Missing a day can freeze your streak for 2 days</li>
                  <li>Complete 3 recovery tasks to maintain your streak</li>
                </ul>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

export default Leaderboard; 