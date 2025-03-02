import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Alert } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import StreakStatus from '../components/streak/StreakStatus';
import Leaderboard from '../components/leaderboard/Leaderboard';
import axios from 'axios';
import './MotivationPage.css';

const MotivationPage = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [stats, setStats] = useState({
    translationStreak: {
      current: 0,
      longest: 0,
      rank: {
        grandRealm: '',
        realm: '',
        tier: 0
      }
    },
    writingStreak: {
      current: 0,
      longest: 0,
      rank: {
        grandRealm: '',
        realm: '',
        tier: 0
      }
    },
    rankings: {
      translationRank: 0,
      writingRank: 0,
      totalUsers: 0
    }
  });

  // Array of motivational quotes related to learning and consistency
  const motivationalQuotes = [
    "The more you learn, the more you earn.",
    "Consistency is the key to mastery.",
    "The best way to predict your future is to create it.",
    "Learning is not a spectator sport.",
    "A journey of a thousand miles begins with a single step.",
    "The expert in anything was once a beginner.",
    "Practice makes progress.",
    "You don't have to be great to start, but you have to start to be great.",
    "The secret of getting ahead is getting started.",
    "Success is the sum of small efforts, repeated day in and day out.",
    "Continuous learning is the minimum requirement for success in any field."
  ];

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/users/motivation-stats');
      setStats(response.data);
    } catch (error) {
      setError('Failed to fetch motivation stats. Please try again.');
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankColor = (grandRealm) => {
    const colors = {
      'Luyện Thuật Sư': 'primary',
      'Võ Sư': 'danger'
    };
    return colors[grandRealm] || 'secondary';
  };

  if (loading) {
    return (
      <Container className="py-4">
        <div className="text-center">Loading...</div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-4">
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container className="motivation-page py-4">
      <Row className="mb-4">
        <Col>
          <div className="motivation-banner text-center p-4">
            <h1 className="display-4">Cultivation Journey</h1>
            <p className="lead">{motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]}</p>
            {!currentUser && (
              <div className="mt-4">
                <Link to="/login">
                  <Button variant="primary" size="lg" className="me-3">Sign In</Button>
                </Link>
                <Link to="/register">
                  <Button variant="outline-primary" size="lg">Sign Up</Button>
                </Link>
              </div>
            )}
          </div>
        </Col>
      </Row>

      {currentUser && (
        <Row className="mb-4">
          <Col>
            <StreakStatus />
          </Col>
        </Row>
      )}

      <Row className="g-4">
        {/* Translation Streak Card */}
        <Col md={6}>
          <Card className="h-100">
            <Card.Header className="bg-primary text-white">
              <h4 className="mb-0">Translation Streaks</h4>
            </Card.Header>
            <Card.Body>
              <div className="text-center mb-4">
                <div className="display-1 fw-bold text-primary">
                  {stats.translationStreak.current}
                </div>
                <div className="text-muted">Current Streak Days</div>
              </div>

              <div className="streak-stats mb-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span>Longest Streak:</span>
                  <Badge bg="primary" className="px-3 py-2">
                    {stats.translationStreak.longest} Days
                  </Badge>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span>Ranking:</span>
                  <Badge bg="info" className="px-3 py-2">
                    #{stats.rankings.translationRank} / {stats.rankings.totalUsers}
                  </Badge>
                </div>
              </div>

              <div className="rank-display">
                <h5 className="text-center mb-3">Current Rank</h5>
                <div className="rank-badge" style={{ backgroundColor: '#72d1a8' }}>
                  <div className="rank-title">
                    {stats.translationStreak.rank.grandRealm}
                  </div>
                  <div className="rank-details">
                    {stats.translationStreak.rank.realm} - Tier {stats.translationStreak.rank.tier}
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Writing Streak Card */}
        <Col md={6}>
          <Card className="h-100">
            <Card.Header className="bg-danger text-white">
              <h4 className="mb-0">Writing Streaks</h4>
            </Card.Header>
            <Card.Body>
              <div className="text-center mb-4">
                <div className="display-1 fw-bold text-danger">
                  {stats.writingStreak.current}
                </div>
                <div className="text-muted">Current Streak Days</div>
              </div>

              <div className="streak-stats mb-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span>Longest Streak:</span>
                  <Badge bg="danger" className="px-3 py-2">
                    {stats.writingStreak.longest} Days
                  </Badge>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span>Ranking:</span>
                  <Badge bg="info" className="px-3 py-2">
                    #{stats.rankings.writingRank} / {stats.rankings.totalUsers}
                  </Badge>
                </div>
              </div>

              <div className="rank-display">
                <h5 className="text-center mb-3">Current Rank</h5>
                <div className="rank-badge" style={{ backgroundColor: '#72d1a8' }}>
                  <div className="rank-title">
                    {stats.writingStreak.rank.grandRealm}
                  </div>
                  <div className="rank-details">
                    {stats.writingStreak.rank.realm} - Tier {stats.writingStreak.rank.tier}
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Streak Recovery Notice */}
      {(stats.translationStreak.current === 0 || stats.writingStreak.current === 0) && (
        <Card className="mt-4">
          <Card.Body>
            <h5 className="text-warning">🔔 Streak Recovery Available!</h5>
            <p className="mb-0">
              You can recover your streak by completing 3 translations or posts within the next 48 hours.
              Don't let your progress slip away!
            </p>
          </Card.Body>
        </Card>
      )}

      <Row className="mb-4">
        <Col md={12}>
          <Card className="daily-challenges-card">
            <Card.Header>
              <h3>Daily Cultivation Tasks</h3>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6} className="mb-3 mb-md-0">
                  <div className="challenge-card translation-challenge">
                    <h4>
                      <Badge bg="primary" className="me-2">1</Badge>
                      Translation Challenge
                    </h4>
                    <p>Translate at least one post today to maintain your streak and improve your skills.</p>
                    <Link to="/communities">
                      <Button variant="outline-primary">Find Posts to Translate</Button>
                    </Link>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="challenge-card writing-challenge">
                    <h4>
                      <Badge bg="success" className="me-2">2</Badge>
                      Writing Challenge
                    </h4>
                    <p>Write at least one post today to maintain your streak and share your knowledge.</p>
                    <Link to="/posts/new">
                      <Button variant="outline-success">Create a New Post</Button>
                    </Link>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col>
          <Leaderboard />
        </Col>
      </Row>

      <Row>
        <Col md={12}>
          <Card className="cultivation-info-card">
            <Card.Header>
              <h3>About the Cultivation System</h3>
            </Card.Header>
            <Card.Body>
              <p>
                Our cultivation system is inspired by Chinese cultivation novels, where practitioners 
                advance through various realms and stages by consistently practicing their skills.
              </p>
              
              <Row className="mt-4">
                <Col md={6}>
                  <h4 className="mb-3">Luyện Thuật Sư Path (Translation)</h4>
                  <ul>
                    <li>
                      <strong>What counts?</strong> Translating posts from one language to another.
                    </li>
                    <li>
                      <strong>How to advance?</strong> Translate at least one post every day to maintain your streak.
                    </li>
                    <li>
                      <strong>Benefits:</strong> Improve your language skills, gain recognition on the Diệu Thuật Bảng.
                    </li>
                  </ul>
                </Col>
                
                <Col md={6}>
                  <h4 className="mb-3">Võ Sư Path (Writing)</h4>
                  <ul>
                    <li>
                      <strong>What counts?</strong> Creating original posts in any language.
                    </li>
                    <li>
                      <strong>How to advance?</strong> Write at least one post every day to maintain your streak.
                    </li>
                    <li>
                      <strong>Benefits:</strong> Improve your writing skills, gain recognition on the Phong Vân Bảng.
                    </li>
                  </ul>
                </Col>
              </Row>
              
              <div className="cultivation-tiers mt-4">
                <h4 className="mb-3">Cultivation Rankings</h4>
                <p>
                  Each cultivation path has three tiers of advancement:
                </p>
                <ul>
                  <li>
                    <strong>Đẳng:</strong> Your basic level (Sơ Cấp → Trung Cấp → Đỉnh Cấp)
                  </li>
                  <li>
                    <strong>Cảnh Con:</strong> Your sub-realm (Nhất Tinh → Cửu Tinh)
                  </li>
                  <li>
                    <strong>Đại Cảnh Giới:</strong> Your major realm (Võ Sĩ → Võ Đế)
                  </li>
                </ul>
                <p>
                  The longer your streak, the higher your rank will be. If you miss a day, your streak will be 
                  frozen for 2 days, during which you can complete 3 recovery tasks to maintain your progress.
                </p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default MotivationPage; 