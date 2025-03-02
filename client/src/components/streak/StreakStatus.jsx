import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, Row, Col, Badge, ProgressBar, Button, Alert } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import './StreakStatus.css';

const StreakStatus = () => {
  const { currentUser } = useAuth();
  const [translationStreak, setTranslationStreak] = useState(null);
  const [writingStreak, setWritingStreak] = useState(null);
  const [translationRank, setTranslationRank] = useState(null);
  const [writingRank, setWritingRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStreakData = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        // Fetch translation streak data
        const translationResponse = await axios.get('/api/streaks/translation');
        setTranslationStreak(translationResponse.data);
        
        // Fetch writing streak data
        const writingResponse = await axios.get('/api/streaks/writing');
        setWritingStreak(writingResponse.data);
        
        // Fetch translation rank data
        const translationRankResponse = await axios.get('/api/ranks/translation');
        setTranslationRank(translationRankResponse.data);
        
        // Fetch writing rank data
        const writingRankResponse = await axios.get('/api/ranks/writing');
        setWritingRank(writingRankResponse.data);
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching streak data:', err);
        setError('Failed to load streak information. Please try again later.');
        setLoading(false);
      }
    };

    fetchStreakData();
  }, [currentUser]);

  const handleRecoveryTask = async (type) => {
    try {
      await axios.post(`/api/streaks/${type}/recovery`);
      // Refresh streak data after completing a recovery task
      const response = await axios.get(`/api/streaks/${type}`);
      if (type === 'translation') {
        setTranslationStreak(response.data);
      } else {
        setWritingStreak(response.data);
      }
    } catch (err) {
      console.error(`Error completing ${type} recovery task:`, err);
      setError(`Failed to complete recovery task. Please try again later.`);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getRankDisplay = (rank) => {
    if (!rank) return 'Loading...';
    
    return (
      <span className="rank-display">
        <span className={`dai-canh-gioi rank-tier-${rank.dai_canh_gioi_tier.order}`} 
              style={{ color: rank.dai_canh_gioi_tier.color_code }}>
          {rank.dai_canh_gioi_tier.name}
        </span>
        {' - '}
        <span className="canh-con">
          {rank.canh_con_tier.name}
        </span>
        {' - '}
        <span className="dang">
          {rank.dang_tier.name}
        </span>
      </span>
    );
  };
  
  if (loading) {
    return <div className="text-center p-4">Loading streak information...</div>;
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  return (
    <div className="streak-status-container mb-4">
      <h2 className="text-center mb-4">Cultivation Journey</h2>
      
      <Row>
        <Col md={6} className="mb-4">
          <Card className="streak-card translation-streak">
            <Card.Header className="text-center">
              <h3>Luyện Thuật Sư</h3>
              <small className="text-muted">Translation Cultivation</small>
            </Card.Header>
            <Card.Body>
              {translationStreak ? (
                <>
                  <div className="streak-info mb-3">
                    <Row>
                      <Col>
                        <Badge bg="primary" className="streak-badge">
                          Current Streak: {translationStreak.current_count} days
                        </Badge>
                      </Col>
                      <Col>
                        <Badge bg="success" className="streak-badge">
                          Highest: {translationStreak.max_count} days
                        </Badge>
                      </Col>
                    </Row>
                  </div>
                  
                  <div className="rank-info mb-3">
                    <h5>Current Rank:</h5>
                    <div className="current-rank">
                      {getRankDisplay(translationRank)}
                    </div>
                  </div>
                  
                  <div className="streak-progress mb-3">
                    <p className="mb-1">Progress to next rank:</p>
                    <ProgressBar 
                      now={translationRank?.days_count % 3 * 33} 
                      label={`${translationRank?.days_count % 3 * 33}%`} 
                    />
                  </div>
                  
                  <div className="last-activity mb-3">
                    <p className="mb-1">Last Translation: {formatDate(translationStreak.last_date)}</p>
                  </div>
                  
                  {translationStreak.freeze_until && (
                    <div className="freeze-info alert alert-warning">
                      <p>Your streak is frozen until: {formatDate(translationStreak.freeze_until)}</p>
                      <p>Recovery tasks completed: {translationStreak.recovery_tasks_completed}/3</p>
                      <Button 
                        variant="outline-primary" 
                        onClick={() => handleRecoveryTask('translation')}
                        disabled={translationStreak.recovery_tasks_completed >= 3}
                      >
                        Complete Recovery Task
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <p>Start translating to begin your journey!</p>
              )}
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6} className="mb-4">
          <Card className="streak-card writing-streak">
            <Card.Header className="text-center">
              <h3>Võ Sư</h3>
              <small className="text-muted">Writing Cultivation</small>
            </Card.Header>
            <Card.Body>
              {writingStreak ? (
                <>
                  <div className="streak-info mb-3">
                    <Row>
                      <Col>
                        <Badge bg="primary" className="streak-badge">
                          Current Streak: {writingStreak.current_count} days
                        </Badge>
                      </Col>
                      <Col>
                        <Badge bg="success" className="streak-badge">
                          Highest: {writingStreak.max_count} days
                        </Badge>
                      </Col>
                    </Row>
                  </div>
                  
                  <div className="rank-info mb-3">
                    <h5>Current Rank:</h5>
                    <div className="current-rank">
                      {getRankDisplay(writingRank)}
                    </div>
                  </div>
                  
                  <div className="streak-progress mb-3">
                    <p className="mb-1">Progress to next rank:</p>
                    <ProgressBar 
                      now={writingRank?.days_count % 3 * 33} 
                      label={`${writingRank?.days_count % 3 * 33}%`} 
                    />
                  </div>
                  
                  <div className="last-activity mb-3">
                    <p className="mb-1">Last Writing: {formatDate(writingStreak.last_date)}</p>
                  </div>
                  
                  {writingStreak.freeze_until && (
                    <div className="freeze-info alert alert-warning">
                      <p>Your streak is frozen until: {formatDate(writingStreak.freeze_until)}</p>
                      <p>Recovery tasks completed: {writingStreak.recovery_tasks_completed}/3</p>
                      <Button 
                        variant="outline-primary" 
                        onClick={() => handleRecoveryTask('writing')}
                        disabled={writingStreak.recovery_tasks_completed >= 3}
                      >
                        Complete Recovery Task
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <p>Start writing to begin your journey!</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
      
      <Row>
        <Col md={12}>
          <Card className="streak-tips-card">
            <Card.Header>Cultivation Tips</Card.Header>
            <Card.Body>
              <ul>
                <li>Complete daily translations to increase your Luyện Thuật Sư rank</li>
                <li>Write posts regularly to advance in the Võ Sư path</li>
                <li>If you miss a day, your streak will be frozen for 2 days</li>
                <li>Complete 3 recovery tasks during the freeze period to maintain your streak</li>
                <li>Higher streaks lead to higher ranks in the Diệu Thuật Bảng and Phong Vân Bảng</li>
              </ul>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default StreakStatus; 