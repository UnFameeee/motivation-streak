import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Tabs, Tab, Alert, Spinner } from 'react-bootstrap';
import axios from 'axios';
import UserRankCard from '../profile/UserRankCard';
import RankingList from '../rank/RankingList';
import { FaTrophy, FaChartLine, FaUserFriends } from 'react-icons/fa';

const Dashboard = () => {
  const [userRanks, setUserRanks] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('my-ranks');

  useEffect(() => {
    fetchUserRanks();
  }, []);

  const fetchUserRanks = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('You must be logged in to view your ranks');
        setLoading(false);
        return;
      }

      const res = await axios.get('/api/ranks/me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setUserRanks(res.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch rank information');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading your rank information...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-5">
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <h1 className="mb-4">
        <FaChartLine className="me-2" />
        Dashboard
      </h1>
      
      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className="mb-4"
      >
        <Tab 
          eventKey="my-ranks" 
          title={
            <span>
              <FaTrophy className="me-2" />
              My Ranks
            </span>
          }
        >
          <div className="py-3">
            <h2 className="mb-4">Your Current Ranks</h2>
            <Row>
              <Col md={6} className="mb-4">
                <UserRankCard 
                  rankType="translation"
                  rankData={userRanks.translationRank}
                  streakData={userRanks.translationStreak}
                  position={userRanks.translationPosition}
                />
              </Col>
              <Col md={6} className="mb-4">
                <UserRankCard 
                  rankType="writing"
                  rankData={userRanks.writingRank}
                  streakData={userRanks.writingStreak}
                  position={userRanks.writingPosition}
                />
              </Col>
            </Row>
          </div>
        </Tab>
        <Tab 
          eventKey="translation-leaderboard" 
          title={
            <span>
              <FaUserFriends className="me-2" />
              Translation Leaderboard
            </span>
          }
        >
          <div className="py-3">
            <RankingList rankType="translation" />
          </div>
        </Tab>
        <Tab 
          eventKey="writing-leaderboard" 
          title={
            <span>
              <FaUserFriends className="me-2" />
              Writing Leaderboard
            </span>
          }
        >
          <div className="py-3">
            <RankingList rankType="writing" />
          </div>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default Dashboard; 