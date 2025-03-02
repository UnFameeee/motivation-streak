import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Badge, Form, InputGroup, Alert, Pagination, Spinner } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { FaSearch, FaPlus, FaUsers, FaCalendarAlt, FaLock, FaGlobe, FaCog, FaFilter } from 'react-icons/fa';
import axios from 'axios';
import debounce from 'lodash.debounce';

const CommunityList = () => {
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const navigate = useNavigate();

  // Get user token from localStorage
  const token = localStorage.getItem('token');

  const fetchCommunities = useCallback(async (page = 1, search = '', filter = 'all') => {
    try {
      setLoading(true);
      setError('');
      
      const res = await axios.get('/api/communities', {
        params: {
          page,
          limit: 9, // Show 9 communities per page (3x3 grid)
          search,
          filter
        },
        headers: token ? {
          Authorization: `Bearer ${token}`
        } : {}
      });
      
      setCommunities(res.data.communities);
      setTotalPages(res.data.pages);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch communities');
      setLoading(false);
    }
  }, [token]);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((searchValue, filterValue, page) => {
      fetchCommunities(page, searchValue, filterValue);
    }, 500),
    []
  );

  useEffect(() => {
    fetchCommunities(currentPage, searchTerm, filter);
  }, [currentPage, filter]);

  useEffect(() => {
    debouncedSearch(searchTerm, filter, 1);
    if (currentPage !== 1) setCurrentPage(1);
  }, [searchTerm, debouncedSearch]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterChange = (e) => {
    setFilter(e.target.value);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    let items = [];
    const ellipsis = <Pagination.Ellipsis disabled />;
    const maxVisiblePages = 5;
    
    // Always show first page
    items.push(
      <Pagination.Item
        key={1}
        active={currentPage === 1}
        onClick={() => handlePageChange(1)}
      >
        1
      </Pagination.Item>
    );

    // Calculate range of pages to show
    let startPage = Math.max(2, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages - 1, startPage + maxVisiblePages - 2);
    
    if (endPage - startPage < maxVisiblePages - 2) {
      startPage = Math.max(2, endPage - (maxVisiblePages - 3));
    }

    // Add ellipsis if needed
    if (startPage > 2) {
      items.push(ellipsis);
    }

    // Add pages in range
    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <Pagination.Item
          key={i}
          active={currentPage === i}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </Pagination.Item>
      );
    }

    // Add ellipsis if needed
    if (endPage < totalPages - 1) {
      items.push(ellipsis);
    }

    // Always show last page
    if (totalPages > 1) {
      items.push(
        <Pagination.Item
          key={totalPages}
          active={currentPage === totalPages}
          onClick={() => handlePageChange(totalPages)}
        >
          {totalPages}
        </Pagination.Item>
      );
    }

    return (
      <Pagination className="justify-content-center mt-4">
        <Pagination.Prev
          onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        />
        {items}
        <Pagination.Next
          onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        />
      </Pagination>
    );
  };

  const joinCommunity = async (communityId) => {
    try {
      if (!token) {
        // Redirect to login if not authenticated
        navigate('/login', { state: { from: `/communities/${communityId}` } });
        return;
      }

      await axios.post(`/api/communities/${communityId}/join`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      // Update the communities list to reflect the change
      setCommunities(communities.map(community => 
        community.id === communityId ? { ...community, isMember: true } : community
      ));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join community');
    }
  };

  const leaveCommunity = async (communityId) => {
    try {
      await axios.post(`/api/communities/${communityId}/leave`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      // Update the communities list to reflect the change
      setCommunities(communities.map(community => 
        community.id === communityId ? { ...community, isMember: false } : community
      ));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to leave community');
    }
  };

  if (loading && communities.length === 0) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading communities...</p>
      </div>
    );
  }

  return (
    <Container className="py-5">
      <Row className="mb-4 align-items-center">
        <Col>
          <h1 className="mb-0">Communities</h1>
          <p className="text-muted">Join translation communities and practice daily</p>
        </Col>
        <Col md="auto">
          {token ? (
            <Link to="/communities/create">
              <Button variant="primary">
                <FaPlus className="me-2" />
                Create Community
              </Button>
            </Link>
          ) : (
            <Link to="/login">
              <Button variant="outline-primary">
                Log in to create or join communities
              </Button>
            </Link>
          )}
        </Col>
      </Row>

      {error && <Alert variant="danger">{error}</Alert>}

      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <Row>
            <Col md={8}>
              <InputGroup>
                <InputGroup.Text>
                  <FaSearch />
                </InputGroup.Text>
                <Form.Control
                  placeholder="Search communities..."
                  value={searchTerm}
                  onChange={handleSearch}
                />
              </InputGroup>
            </Col>
            <Col md={4}>
              <InputGroup>
                <InputGroup.Text>
                  <FaFilter />
                </InputGroup.Text>
                <Form.Select 
                  value={filter}
                  onChange={handleFilterChange}
                >
                  <option value="all">All Communities</option>
                  <option value="public">Public Only</option>
                  <option value="private">Private Only</option>
                  {token && <option value="member">My Communities</option>}
                </Form.Select>
              </InputGroup>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {communities.length === 0 ? (
        <div className="text-center py-5">
          <div className="mb-4">
            <FaUsers size={50} className="text-muted" />
          </div>
          <h3>No communities found</h3>
          <p className="text-muted">Try adjusting your search or create a new community</p>
          {token ? (
            <Link to="/communities/create">
              <Button variant="primary">Create Community</Button>
            </Link>
          ) : (
            <Link to="/login">
              <Button variant="outline-primary">
                Log in to create a community
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <Row>
          {communities.map(community => (
            <Col md={4} className="mb-4" key={community.id}>
              <Card className="h-100 shadow-sm community-card">
                <div className="position-relative">
                  {community.image_url ? (
                    <Card.Img 
                      variant="top" 
                      src={community.image_url} 
                      alt={community.name}
                      style={{ height: '140px', objectFit: 'cover' }}
                    />
                  ) : (
                    <div 
                      className="bg-light d-flex align-items-center justify-content-center"
                      style={{ height: '140px' }}
                    >
                      <FaUsers size={48} className="text-muted" />
                    </div>
                  )}
                  <div 
                    className="position-absolute" 
                    style={{ top: '10px', right: '10px' }}
                  >
                    <Badge 
                      bg={community.is_public ? "primary" : "secondary"}
                      className="d-flex align-items-center"
                    >
                      {community.is_public ? (
                        <>
                          <FaGlobe className="me-1" /> Public
                        </>
                      ) : (
                        <>
                          <FaLock className="me-1" /> Private
                        </>
                      )}
                    </Badge>
                  </div>
                </div>
                <Card.Body>
                  <Card.Title as="h5">{community.name}</Card.Title>
                  <Card.Text className="text-muted small" style={{ height: '60px', overflow: 'hidden' }}>
                    {community.description || "No description available"}
                  </Card.Text>
                  <div className="d-flex align-items-center text-muted small mb-3">
                    <FaUsers className="me-1" />
                    <span className="me-3">{community.memberCount || 0} members</span>
                    <FaCalendarAlt className="me-1" />
                    <span>Created {new Date(community.created_at).toLocaleDateString()}</span>
                  </div>
                </Card.Body>
                <Card.Footer className="bg-white d-flex gap-2">
                  <Link to={`/communities/${community.id}`} className="flex-grow-1">
                    <Button variant="outline-primary" className="w-100">
                      View
                    </Button>
                  </Link>
                  
                  {token && !community.isMember && (
                    <Button 
                      variant="primary" 
                      onClick={() => joinCommunity(community.id)}
                      disabled={!community.is_public}
                      title={!community.is_public ? "This is a private community" : ""}
                    >
                      Join
                    </Button>
                  )}
                  
                  {token && community.isMember && (
                    <Button 
                      variant="outline-danger" 
                      onClick={() => leaveCommunity(community.id)}
                    >
                      Leave
                    </Button>
                  )}
                  
                  {token && community.owner?.id === JSON.parse(atob(token.split('.')[1])).id && (
                    <Link to={`/communities/${community.id}/settings`}>
                      <Button variant="outline-secondary" title="Manage community">
                        <FaCog />
                      </Button>
                    </Link>
                  )}
                </Card.Footer>
              </Card>
            </Col>
          ))}
        </Row>
      )}
      
      {renderPagination()}
    </Container>
  );
};

export default CommunityList; 