import React, { useState, useEffect } from 'react';
import { Container, Card, Button, Badge, Alert, Tab, Nav, Row, Col } from 'react-bootstrap';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const PostDetailPage = () => {
  const { postId } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [post, setPost] = useState(null);
  const [translations, setTranslations] = useState([]);
  const [selectedText, setSelectedText] = useState('');
  const [comments, setComments] = useState([]);

  useEffect(() => {
    fetchPostDetails();
  }, [postId]);

  const fetchPostDetails = async () => {
    try {
      setLoading(true);
      const [postRes, translationsRes] = await Promise.all([
        axios.get(`/api/posts/${postId}`),
        axios.get(`/api/posts/${postId}/translations`)
      ]);

      setPost(postRes.data);
      setTranslations(translationsRes.data);
    } catch (error) {
      setError('Failed to fetch post details. Please try again.');
      console.error('Error fetching post:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    const selectedText = selection.toString().trim();
    if (selectedText) {
      setSelectedText(selectedText);
    }
  };

  const handleAddComment = async (text, translationId = null) => {
    try {
      const response = await axios.post('/api/comments', {
        postId: translationId ? null : postId,
        translationId,
        text,
        highlightedText: selectedText || null
      });

      // Update comments list
      setComments(prev => [...prev, response.data]);
      setSelectedText('');
    } catch (error) {
      console.error('Error adding comment:', error);
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

  if (!post) {
    return (
      <Container className="py-4">
        <Alert variant="warning">Post not found.</Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      {/* Post Header */}
      <Card className="mb-4">
        <Card.Body>
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <h1 className="mb-2">{post.title}</h1>
              <p className="text-muted mb-2">
                by {post.author.name} • {new Date(post.createdAt).toLocaleDateString()}
              </p>
              <div>
                <Badge bg="secondary" className="me-2">
                  {post.language}
                </Badge>
                <Badge bg="info">
                  {translations.length} Translations
                </Badge>
              </div>
            </div>
            <div>
              {currentUser?.id === post.author.id && (
                <Link
                  to={`/posts/${postId}/edit`}
                  className="btn btn-outline-primary me-2"
                >
                  Edit Post
                </Link>
              )}
              <Link
                to={`/posts/${postId}/translate`}
                className="btn btn-primary"
              >
                Translate
              </Link>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Content Tabs */}
      <Tab.Container defaultActiveKey="content">
        <Card>
          <Card.Header>
            <Nav variant="tabs">
              <Nav.Item>
                <Nav.Link eventKey="content">Content</Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="translations">
                  Translations ({translations.length})
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="comments">
                  Comments ({comments.length})
                </Nav.Link>
              </Nav.Item>
            </Nav>
          </Card.Header>

          <Card.Body>
            <Tab.Content>
              {/* Original Content Tab */}
              <Tab.Pane eventKey="content">
                <div 
                  className="post-content"
                  onMouseUp={handleTextSelection}
                >
                  {post.content}
                </div>
                
                {selectedText && (
                  <Card className="mt-3">
                    <Card.Body>
                      <h6>Selected Text:</h6>
                      <p className="mb-2">{selectedText}</p>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => handleAddComment(selectedText)}
                      >
                        Add Comment
                      </Button>
                    </Card.Body>
                  </Card>
                )}
              </Tab.Pane>

              {/* Translations Tab */}
              <Tab.Pane eventKey="translations">
                {translations.length === 0 ? (
                  <div className="text-center py-4">
                    <p>No translations yet.</p>
                    <Link
                      to={`/posts/${postId}/translate`}
                      className="btn btn-primary"
                    >
                      Create First Translation
                    </Link>
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
                                  Translation to {translation.language}
                                </h5>
                                <p className="text-muted mb-2">
                                  by {translation.translator.name} • {new Date(translation.createdAt).toLocaleDateString()}
                                </p>
                                <p className="mb-2">{translation.excerpt}</p>
                                <div>
                                  <Badge bg="info" className="me-2">
                                    {translation.commentCount} Comments
                                  </Badge>
                                  {translation.aiScore && (
                                    <Badge bg="success">
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

              {/* Comments Tab */}
              <Tab.Pane eventKey="comments">
                {comments.length === 0 ? (
                  <div className="text-center py-4">
                    <p>No comments yet. Select some text to add a comment.</p>
                  </div>
                ) : (
                  <div className="comments-list">
                    {comments.map((comment) => (
                      <Card key={comment.id} className="mb-3">
                        <Card.Body>
                          {comment.highlightedText && (
                            <div className="highlighted-text mb-2 p-2 bg-light">
                              "{comment.highlightedText}"
                            </div>
                          )}
                          <p className="mb-1">{comment.text}</p>
                          <small className="text-muted">
                            by {comment.author.name} • {new Date(comment.createdAt).toLocaleDateString()}
                          </small>
                        </Card.Body>
                      </Card>
                    ))}
                  </div>
                )}
              </Tab.Pane>
            </Tab.Content>
          </Card.Body>
        </Card>
      </Tab.Container>
    </Container>
  );
};

export default PostDetailPage; 