import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Alert, Tab, Nav } from 'react-bootstrap';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const BlockDetailPage = () => {
  const { blockId } = useParams();
  const { currentUser } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [block, setBlock] = useState(null);
  const [posts, setPosts] = useState([]);
  const [translations, setTranslations] = useState([]);

  useEffect(() => {
    fetchBlockDetails();
  }, [blockId]);

  const fetchBlockDetails = async () => {
    try {
      setLoading(true);
      const [blockRes, postsRes, translationsRes] = await Promise.all([
        axios.get(`/api/blocks/${blockId}`),
        axios.get(`/api/blocks/${blockId}/posts`),
        axios.get(`/api/blocks/${blockId}/translations`)
      ]);

      setBlock(blockRes.data);
      setPosts(postsRes.data);
      setTranslations(translationsRes.data);
    } catch (error) {
      setError('Failed to fetch block details. Please try again.');
      console.error('Error fetching block:', error);
    } finally {
      setLoading(false);
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

  if (!block) {
    return (
      <Container className="py-4">
        <Alert variant="warning">Block not found.</Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      {/* Block Header */}
      <Card className="mb-4">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <h1 className="mb-2">{block.title}</h1>
              <p className="text-muted mb-2">
                {new Date(block.date).toLocaleDateString()}
              </p>
              <div>
                <Badge bg="primary" className="me-2">
                  {posts.length} Posts
                </Badge>
                <Badge bg="info">
                  {translations.length} Translations
                </Badge>
              </div>
            </div>
            <div>
              <Link
                to={`/posts/new?blockId=${blockId}`}
                className="btn btn-primary"
              >
                Create Post
              </Link>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Content Tabs */}
      <Tab.Container defaultActiveKey="posts">
        <Card>
          <Card.Header>
            <Nav variant="tabs">
              <Nav.Item>
                <Nav.Link eventKey="posts">Posts</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="translations">Translations</Nav.Link>
              </Nav.Item>
            </Nav>
          </Card.Header>

          <Card.Body>
            <Tab.Content>
              {/* Posts Tab */}
              <Tab.Pane eventKey="posts">
                {posts.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="mb-3">No posts yet in this block.</p>
                    <Link
                      to={`/posts/new?blockId=${blockId}`}
                      className="btn btn-primary"
                    >
                      Create the First Post
                    </Link>
                  </div>
                ) : (
                  <Row xs={1} className="g-4">
                    {posts.map((post) => (
                      <Col key={post.id}>
                        <Card>
                          <Card.Body>
                            <div className="d-flex justify-content-between align-items-start">
                              <div>
                                <h5 className="mb-1">
                                  <Link
                                    to={`/posts/${post.id}`}
                                    className="text-decoration-none"
                                  >
                                    {post.title}
                                  </Link>
                                </h5>
                                <p className="text-muted mb-2">
                                  by {post.author.name} • {new Date(post.createdAt).toLocaleDateString()}
                                </p>
                                <p className="mb-2">{post.excerpt}</p>
                                <div>
                                  <Badge bg="secondary" className="me-2">
                                    {post.language}
                                  </Badge>
                                  <Badge bg="info">
                                    {post.translationCount} Translations
                                  </Badge>
                                </div>
                              </div>
                              <div>
                                <Link
                                  to={`/posts/${post.id}/translate`}
                                  className="btn btn-outline-primary btn-sm"
                                >
                                  Translate
                                </Link>
                              </div>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                )}
              </Tab.Pane>

              {/* Translations Tab */}
              <Tab.Pane eventKey="translations">
                {translations.length === 0 ? (
                  <div className="text-center py-4">
                    <p>No translations yet. Select a post to translate.</p>
                  </div>
                ) : (
                  <Row xs={1} className="g-4">
                    {translations.map((translation) => (
                      <Col key={translation.id}>
                        <Card>
                          <Card.Body>
                            <div className="d-flex justify-content-between align-items-start">
                              <div>
                                <h5 className="mb-1">
                                  Translation of{' '}
                                  <Link
                                    to={`/posts/${translation.postId}`}
                                    className="text-decoration-none"
                                  >
                                    {translation.postTitle}
                                  </Link>
                                </h5>
                                <p className="text-muted mb-2">
                                  by {translation.translator.name} • {new Date(translation.createdAt).toLocaleDateString()}
                                </p>
                                <p className="mb-2">{translation.excerpt}</p>
                                <div>
                                  <Badge bg="secondary" className="me-2">
                                    {translation.language}
                                  </Badge>
                                  <Badge bg="info">
                                    {translation.commentCount} Comments
                                  </Badge>
                                  {translation.aiScore && (
                                    <Badge bg="success" className="ms-2">
                                      AI Score: {translation.aiScore}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div>
                                <Link
                                  to={`/translations/${translation.id}/edit`}
                                  className="btn btn-outline-primary btn-sm"
                                >
                                  View
                                </Link>
                              </div>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                )}
              </Tab.Pane>
            </Tab.Content>
          </Card.Body>
        </Card>
      </Tab.Container>
    </Container>
  );
};

export default BlockDetailPage; 