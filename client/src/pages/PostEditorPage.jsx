import React, { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const PostEditorPage = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const isEditing = !!postId;

  // Get blockId from URL query params when creating new post
  const queryParams = new URLSearchParams(location.search);
  const blockId = queryParams.get('blockId');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [post, setPost] = useState({
    title: '',
    content: '',
    language: 'en',
    blockId: blockId || ''
  });

  useEffect(() => {
    if (isEditing) {
      fetchPost();
    }
  }, [postId]);

  const fetchPost = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/posts/${postId}`);
      setPost(response.data);
    } catch (error) {
      setError('Failed to fetch post. Please try again.');
      console.error('Error fetching post:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isEditing) {
        await axios.put(`/api/posts/${postId}`, post);
        navigate(`/posts/${postId}`);
      } else {
        const response = await axios.post('/api/posts', post);
        navigate(`/posts/${response.data.id}`);
      }
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to save post. Please try again.');
      console.error('Error saving post:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPost(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading && isEditing) {
    return (
      <Container className="py-4">
        <div className="text-center">Loading...</div>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Card>
        <Card.Body>
          <h1 className="mb-4">{isEditing ? 'Edit Post' : 'Create New Post'}</h1>

          {error && <Alert variant="danger">{error}</Alert>}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control
                type="text"
                name="title"
                value={post.title}
                onChange={handleChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Content</Form.Label>
              <Form.Control
                as="textarea"
                name="content"
                value={post.content}
                onChange={handleChange}
                rows={10}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Language</Form.Label>
              <Form.Select
                name="language"
                value={post.language}
                onChange={handleChange}
                required
              >
                <option value="en">English</option>
                <option value="vi">Vietnamese</option>
                {/* Add more language options as needed */}
              </Form.Select>
            </Form.Group>

            {!isEditing && (
              <Form.Group className="mb-3">
                <Form.Label>Block</Form.Label>
                <Form.Control
                  type="text"
                  name="blockId"
                  value={post.blockId}
                  onChange={handleChange}
                  required
                  readOnly={!!blockId}
                />
                <Form.Text className="text-muted">
                  The block ID this post belongs to
                </Form.Text>
              </Form.Group>
            )}

            <div className="d-flex justify-content-end gap-2">
              <Button
                variant="secondary"
                onClick={() => navigate(-1)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={loading}
              >
                {loading ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Post')}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default PostEditorPage; 