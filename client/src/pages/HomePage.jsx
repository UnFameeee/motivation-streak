import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const HomePage = () => {
  const { currentUser } = useAuth();

  return (
    <Container>
      <Row className="mb-4">
        <Col>
          <h1 className="text-center mb-4">Welcome to Motivation Streak</h1>
          <p className="text-center lead">
            Join our community to improve your language skills through daily translation practice.
          </p>
        </Col>
      </Row>

      {!currentUser && (
        <Row className="mb-4">
          <Col className="text-center">
            <Link to="/register" className="btn btn-primary me-2">Get Started</Link>
            <Link to="/login" className="btn btn-outline-primary">Login</Link>
          </Col>
        </Row>
      )}

      <Row>
        <Col>
          <Card>
            <Card.Body>
              <Card.Title>Featured Communities</Card.Title>
              <Card.Text>
                Explore our featured translation communities and start your learning journey today.
              </Card.Text>
              <Link to="/communities" className="btn btn-primary">
                Browse Communities
              </Link>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default HomePage; 