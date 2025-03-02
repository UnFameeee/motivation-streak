import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Badge } from 'react-bootstrap';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const TranslationEditorPage = () => {
  const { translationId, postId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isEditing = !!translationId;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [originalPost, setOriginalPost] = useState(null);
  
  const [translation, setTranslation] = useState({
    content: '',
    language: 'vi',
    postId: postId || ''
  });

  const [aiScore, setAiScore] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  useEffect(() => {
    if (isEditing) {
      fetchTranslation();
    } else if (postId) {
      fetchOriginalPost();
    }
  }, [translationId, postId]);

  const fetchTranslation = async () => {
    try {
      setLoading(true);
      const [translationRes, postRes] = await Promise.all([
        axios.get(`/api/translations/${translationId}`),
        axios.get(`/api/posts/${translation.postId}`)
      ]);

      setTranslation(translationRes.data);
      setOriginalPost(postRes.data);
      setAiScore(translationRes.data.aiScore);
    } catch (error) {
      setError('Failed to fetch translation. Please try again.');
      console.error('Error fetching translation:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOriginalPost = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/posts/${postId}`);
      setOriginalPost(response.data);
    } catch (error) {
      setError('Failed to fetch original post. Please try again.');
      console.error('Error fetching post:', error);
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
      if (isEditing) {
        await axios.put(`/api/translations/${translationId}`, translation);
        setSuccess('Translation updated successfully!');
      } else {
        const response = await axios.post('/api/translations', translation);
        navigate(`/translations/${response.data.id}/edit`);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to save translation. Please try again.');
      console.error('Error saving translation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async () => {
    try {
      setIsEvaluating(true);
      setError('');
      
      const response = await axios.post(`/api/translations/${translationId}/evaluate`);
      setAiScore(response.data.score);
      setSuccess('Translation evaluated successfully!');
    } catch (error) {
      setError('Failed to evaluate translation. Please try again.');
      console.error('Error evaluating translation:', error);
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setTranslation(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) {
    return (
      <Container className="py-4">
        <div className="text-center">Loading...</div>
      </Container>
    );
  }

  if (!originalPost) {
    return (
      <Container className="py-4">
        <Alert variant="warning">Original post not found.</Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Row>
        {/* Original Post */}
        <Col md={6}>
          <Card className="mb-4 mb-md-0">
            <Card.Header>
              <h5 className="mb-0">Original Post</h5>
            </Card.Header>
            <Card.Body>
              <h2>{originalPost.title}</h2>
              <p className="text-muted mb-3">
                by {originalPost.author.name} • {new Date(originalPost.createdAt).toLocaleDateString()}
              </p>
              <Badge bg="secondary" className="mb-3">
                {originalPost.language}
              </Badge>
              <div className="original-content">
                {originalPost.content}
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Translation Editor */}
        <Col md={6}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">
                {isEditing ? 'Edit Translation' : 'Create Translation'}
              </h5>
            </Card.Header>
            <Card.Body>
              {error && <Alert variant="danger">{error}</Alert>}
              {success && <Alert variant="success">{success}</Alert>}

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Translation Language</Form.Label>
                  <Form.Select
                    name="language"
                    value={translation.language}
                    onChange={handleChange}
                    required
                  >
                    <option value="vi">Vietnamese</option>
                    <option value="en">English</option>
                    {/* Add more language options as needed */}
                  </Form.Select>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Translation Content</Form.Label>
                  <Form.Control
                    as="textarea"
                    name="content"
                    value={translation.content}
                    onChange={handleChange}
                    rows={15}
                    required
                  />
                </Form.Group>

                {aiScore !== null && (
                  <div className="mb-3">
                    <h6>AI Evaluation Score</h6>
                    <Badge 
                      bg={aiScore >= 8 ? 'success' : aiScore >= 6 ? 'warning' : 'danger'}
                      className="p-2"
                    >
                      {aiScore}/10
                    </Badge>
                  </div>
                )}

                <div className="d-flex justify-content-between">
                  <div>
                    {isEditing && (
                      <Button
                        variant="outline-primary"
                        onClick={handleEvaluate}
                        disabled={isEvaluating}
                        className="me-2"
                      >
                        {isEvaluating ? 'Evaluating...' : 'Evaluate Translation'}
                      </Button>
                    )}
                  </div>
                  <div>
                    <Button
                      variant="secondary"
                      onClick={() => navigate(-1)}
                      className="me-2"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={loading}
                    >
                      {loading ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Translation')}
                    </Button>
                  </div>
                </div>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default TranslationEditorPage; 