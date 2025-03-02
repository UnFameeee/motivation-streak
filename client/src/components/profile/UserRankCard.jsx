import React from 'react';
import { Card, Row, Col, Badge, ProgressBar, Button } from 'react-bootstrap';
import { FaFire, FaTrophy, FaMedal, FaStar, FaArrowUp, FaHistory, FaUnlock } from 'react-icons/fa';

const UserRankCard = ({ rankType, rankData, streakData, position }) => {
  // Early return if no data
  if (!rankData) {
    return (
      <Card className="shadow-sm mb-4">
        <Card.Body className="text-center py-5">
          <FaMedal size={40} className="text-muted mb-3" />
          <h5>No {rankType} rank yet</h5>
          <p className="text-muted">
            Start {rankType === 'translation' ? 'translating' : 'writing'} daily to earn your rank!
          </p>
          <Button variant="primary">
            {rankType === 'translation' ? 'Find Posts to Translate' : 'Create a New Post'}
          </Button>
        </Card.Body>
      </Card>
    );
  }

  // Calculate streak status and progress
  const isStreakActive = streakData && 
    (new Date().getTime() - new Date(streakData.last_date).getTime()) / (1000 * 60 * 60 * 24) < 1;
  
  const isFrozen = streakData && streakData.freeze_until && 
    new Date(streakData.freeze_until) > new Date();
  
  const recoveryProgress = streakData ? 
    (streakData.recovery_tasks_completed / 3) * 100 : 0;

  // Get rank tier information including colors
  const rankColor = rankData.daiCanhGioiTier.color_code || '#72d1a8'; // Default color if not set
  const rankColorName = rankData.daiCanhGioiTier.color_name || '';

  // Format the rank display
  const rankDisplay = 
    `${rankData.daiCanhGioiTier.name} - ${rankData.canhConTier.name} - ${rankData.dangTier.name}`;
  
  // Calculate days until next rank
  const calculateNextRankDays = () => {
    // This would be calculated based on the rank formula
    // For simplicity, we're using a placeholder calculation
    const currentTier = rankData.daiCanhGioiTier.order * 100 + 
                       rankData.canhConTier.order * 10 + 
                       rankData.dangTier.order;
    
    const nextTier = currentTier + 1;
    const daysNeeded = nextTier * 3 - rankData.days_count;
    
    return Math.max(1, daysNeeded);
  };

  return (
    <Card className="shadow-sm mb-4 h-100">
      <Card.Header className={`text-white`} style={{ backgroundColor: rankColor }}>
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            {rankType === 'translation' ? 'Luyện Thuật Sư' : 'Võ Sư'} Rank
            {rankColorName && <small className="ms-2">({rankColorName})</small>}
          </h5>
          {position && (
            <Badge bg="light" text="dark">
              <FaTrophy className="me-1 text-warning" />
              Rank #{position}
            </Badge>
          )}
        </div>
      </Card.Header>
      
      <Card.Body>
        <div className="text-center mb-4">
          <h3 className="mb-1" style={{ color: rankColor }}>
            {rankDisplay}
          </h3>
          <p className="text-muted">
            {rankType === 'translation' ? 'Diệu Thuật Bảng' : 'Phong Vân Bảng'}
          </p>
        </div>
        
        <Row className="text-center mb-3">
          <Col>
            <div className="border rounded p-3">
              <h2 className="mb-0">
                <FaFire className={`me-2 ${isStreakActive ? 'text-danger' : 'text-muted'}`} />
                {streakData ? streakData.current_count : 0}
              </h2>
              <div className="text-muted small">Current Streak</div>
            </div>
          </Col>
          
          <Col>
            <div className="border rounded p-3">
              <h2 className="mb-0">
                <FaStar className="me-2 text-warning" />
                {rankData.highest_days_count}
              </h2>
              <div className="text-muted small">Best Streak</div>
            </div>
          </Col>
        </Row>
        
        {isFrozen && (
          <div className="alert alert-warning">
            <div className="d-flex align-items-center mb-2">
              <FaHistory className="me-2" />
              <strong>Streak Frozen</strong>
            </div>
            <p className="small mb-2">
              Complete {3 - streakData.recovery_tasks_completed} more {rankType === 'translation' ? 'translations' : 'posts'} to restore your streak!
            </p>
            <ProgressBar 
              variant="warning" 
              now={recoveryProgress} 
              label={`${streakData.recovery_tasks_completed}/3`} 
            />
          </div>
        )}
        
        <div className="mt-4">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div>
              <FaArrowUp className="me-2 text-primary" />
              <span>Next Rank Progress</span>
            </div>
            <Badge bg="light" text="dark">
              {calculateNextRankDays()} days needed
            </Badge>
          </div>
          
          <ProgressBar 
            now={(rankData.days_count % 30) / 30 * 100} 
            style={{ backgroundColor: '#f0f0f0' }}
          >
            <ProgressBar 
              now={(rankData.days_count % 30) / 30 * 100} 
              style={{ backgroundColor: rankColor }} 
            />
          </ProgressBar>
        </div>
        
        <div className="mt-4">
          <div className="d-flex align-items-center mb-2">
            <FaUnlock className="me-2 text-secondary" />
            <span>Highest Rank Achieved</span>
          </div>
          <div className="p-2 border rounded">
            <h6 className="mb-0">
              {`${rankData.highestDaiCanhGioiTier.name} - ${rankData.highestCanhConTier.name} - ${rankData.highestDangTier.name}`}
            </h6>
          </div>
        </div>
      </Card.Body>
      
      <Card.Footer className="bg-white">
        <Button 
          variant="outline-primary"
          className="w-100"
          style={{ borderColor: rankColor, color: rankColor }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = rankColor;
            e.currentTarget.style.color = '#fff';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = rankColor;
          }}
        >
          View {rankType === 'translation' ? 'Translation' : 'Writing'} History
        </Button>
      </Card.Footer>
    </Card>
  );
};

export default UserRankCard; 