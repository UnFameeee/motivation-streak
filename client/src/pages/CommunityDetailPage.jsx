import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Nav, Alert, Badge } from 'react-bootstrap';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const CommunityDetailPage = () => {
  const { communityId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [community, setCommunity] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
    fetchCommunityDetails();
  }, [communityId]);

  const fetchCommunityDetails = async () => {
    try {
      setLoading(true);
      const [communityRes, blocksRes, membershipRes] = await Promise.all([
        axios.get(`/api/communities/${communityId}`),
        axios.get(`/api/communities/${communityId}/blocks`),
        axios.get(`/api/communities/${communityId}/membership`)
      ]);

      setCommunity(communityRes.data);
      setBlocks(blocksRes.data);
      setIsMember(membershipRes.data.isMember);
    } catch (error) {
      setError('Failed to fetch community details. Please try again.');
      console.error('Error fetching community details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCommunity = async () => {
    try {
      await axios.post(`/api/communities/${communityId}/join`);
      setIsMember(true);
    } catch (error) {
      setError('Failed to join community. Please try again.');
      console.error('Error joining community:', error);
    }
  };

  const handleLeaveCommunity = async () => {
    try {
      await axios.post(`/api/communities/${communityId}/leave`);
      setIsMember(false);
    } catch (error) {
      setError('Failed to leave community. Please try again.');
      console.error('Error leaving community:', error);
    }
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

  if (!community) {
    return (
      <Container className="py-4">
        <Alert variant="warning">Community not found.</Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      {/* Community Header */}
      <Card className="mb-4">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <h1 className="mb-2">{community.name}</h1>
              <p className="text-muted mb-2">{community.description}</p>
              <div>
                <Badge bg="primary" className="me-2">
                  {community.memberCount} Members
                </Badge>
                <Badge bg="info">
                  {community.blockCount} Blocks
                </Badge>
              </div>
            </div>
            <div>
              {currentUser && (
                <>
                  {isMember ? (
                    <Button
                      variant="outline-danger"
                      onClick={handleLeaveCommunity}
                    >
                      Leave Community
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      onClick={handleJoinCommunity}
                    >
                      Join Community
                    </Button>
                  )}
                </>
              )}
              {community.isAdmin && (
                <Link
                  to={`/communities/${communityId}/manage`}
                  className="btn btn-outline-secondary ms-2"
                >
                  Manage Community
                </Link>
              )}
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Blocks Grid */}
      <h2 className="mb-4">Blocks</h2>
      <Row xs={1} md={2} lg={3} className="g-4">
        {blocks.map((block) => (
          <Col key={block.id}>
            <Card className="h-100">
              <Card.Body>
                <Card.Title>{block.title}</Card.Title>
                <Card.Text className="text-muted">
                  {new Date(block.date).toLocaleDateString()}
                </Card.Text>
                <div className="mb-3">
                  <Badge bg="secondary" className="me-2">
                    {block.postCount} Posts
                  </Badge>
                  <Badge bg="secondary">
                    {block.translationCount} Translations
                  </Badge>
                </div>
                <Link
                  to={`/blocks/${block.id}`}
                  className="btn btn-outline-primary"
                >
                  View Block
                </Link>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      {blocks.length === 0 && (
        <Card>
          <Card.Body className="text-center">
            <p className="mb-0">No blocks available in this community yet.</p>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
};

export default CommunityDetailPage; 