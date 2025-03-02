import React, { useState, useEffect } from 'react';
import { Form, Button, Alert, Card, Spinner, Row, Col } from 'react-bootstrap';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const PostEditor = ({ 
  isEdit = false, 
  initialData = null, 
  onSuccess = null,
  blockId = null
}) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [languageId, setLanguageId] = useState('');
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEdit);
  const [error, setError] = useState('');
  const [wordCount, setWordCount] = useState(0);
  
  const postId = isEdit ? id : null;
  const targetBlockId = blockId || (initialData && initialData.block_id);

  useEffect(() => {
    // Fetch available languages
    const fetchLanguages = async () => {
      try {
        const res = await axios.get('/api/languages');
        setLanguages(res.data);
        
        // Set default language if no language selected yet
        if (!languageId && res.data.length > 0) {
          const defaultLang = res.data.find(lang => lang.code === 'en') || res.data[0];
          setLanguageId(defaultLang.id);
        }
      } catch (err) {
        console.error('Error fetching languages:', err);
        setError('Failed to load languages');
      }
    };
    
    fetchLanguages();
  }, [languageId]);

  useEffect(() => {
    // Load post data if editing
    const fetchPostData = async () => {
      if (!isEdit || !postId) return;
      
      try {
        setInitialLoading(true);
        const res = await axios.get(`/api/posts/${postId}`);
        const { post } = res.data;
        
        setTitle(post.title);
        setContent(post.content);
        setLanguageId(post.language_id);
        
        setInitialLoading(false);
      } catch (err) {
        setError('Failed to load post data');
        setInitialLoading(false);
        console.error('Error fetching post:', err);
      }
    };
    
    if (initialData) {
      // Use provided initial data
      setTitle(initialData.title || '');
      setContent(initialData.content || '');
      setLanguageId(initialData.language_id || '');
    } else {
      // Fetch data if needed
      fetchPostData();
    }
  }, [isEdit, postId, initialData]);

  useEffect(() => {
    // Calculate word count
    if (content) {
      // Strip HTML tags and count words
      const text = content.replace(/<[^>]*>/g, ' ');
      const words = text.trim().split(/\s+/).filter(word => word.length > 0);
      setWordCount(words.length);
    } else {
      setWordCount(0);
    }
  }, [content]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    
    if (!content.trim()) {
      setError('Content is required');
      return;
    }
    
    if (!languageId) {
      setError('Please select a language');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      if (!token) {
        setError('You must be logged in to create or edit posts');
        setLoading(false);
        return;
      }
      
      const headers = {
        Authorization: `Bearer ${token}`
      };
      
      let response;
      
      if (isEdit) {
        // Update existing post
        response = await axios.put(
          `/api/posts/${postId}`,
          { title, content },
          { headers }
        );
      } else {
        // Create new post
        if (!targetBlockId) {
          setError('Block ID is required');
          setLoading(false);
          return;
        }
        
        response = await axios.post(
          `/api/blocks/${targetBlockId}/posts`,
          { title, content, language_id: languageId },
          { headers }
        );
      }
      
      setLoading(false);
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess(response.data.post);
      } else {
        // Navigate to the post
        navigate(`/posts/${response.data.post.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save post');
      setLoading(false);
      console.error('Error saving post:', err);
    }
  };

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'indent': '-1' }, { 'indent': '+1' }],
      [{ 'color': [] }, { 'background': [] }],
      ['link'],
      ['clean']
    ],
  };

  const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'indent',
    'link', 'color', 'background'
  ];

  if (initialLoading) {
    return (
      <Card className="shadow-sm mb-4">
        <Card.Body className="p-4">
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3">Loading post data...</p>
          </div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm mb-4">
      <Card.Header className="bg-primary text-white">
        <h5 className="mb-0">{isEdit ? 'Edit Post' : 'Create New Post'}</h5>
      </Card.Header>
      <Card.Body className="p-4">
        {error && <Alert variant="danger">{error}</Alert>}
        
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Title</Form.Label>
            <Form.Control
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter post title"
              required
            />
          </Form.Group>
          
          {!isEdit && (
            <Form.Group className="mb-3">
              <Form.Label>Language</Form.Label>
              <Form.Select
                value={languageId}
                onChange={(e) => setLanguageId(e.target.value)}
                required
                disabled={isEdit}
              >
                <option value="">Select language</option>
                {languages.map(lang => (
                  <option key={lang.id} value={lang.id}>
                    {lang.name} ({lang.code})
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          )}
          
          <Form.Group className="mb-3">
            <Form.Label>Content</Form.Label>
            <ReactQuill
              theme="snow"
              value={content}
              onChange={setContent}
              modules={quillModules}
              formats={quillFormats}
              placeholder="Write your post content here..."
              style={{ height: '300px', marginBottom: '50px' }}
            />
          </Form.Group>
          
          <Row className="align-items-center mt-5">
            <Col>
              <div className="text-muted">
                Word count: <strong>{wordCount}</strong>
              </div>
            </Col>
            <Col className="text-end">
              <Button
                variant="secondary"
                className="me-2"
                onClick={() => navigate(-1)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                      className="me-2"
                    />
                    {isEdit ? 'Saving...' : 'Creating...'}
                  </>
                ) : (
                  isEdit ? 'Save Changes' : 'Create Post'
                )}
              </Button>
            </Col>
          </Row>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default PostEditor; 