import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, InputGroup, Table, Pagination } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import axios from 'axios';

const CommunityListPage = () => {
  const [communities, setCommunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(10);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    fetchCommunities();
  }, [currentPage, searchTerm, sortField, sortOrder]);

  const fetchCommunities = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/communities', {
        params: {
          page: currentPage,
          limit: pageSize,
          search: searchTerm,
          sortBy: sortField,
          order: sortOrder
        }
      });

      setCommunities(response.data.communities);
      setTotalPages(Math.ceil(response.data.total / pageSize));
    } catch (error) {
      setError('Failed to fetch communities. Please try again.');
      console.error('Error fetching communities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchCommunities();
  };

  const handleSort = (field) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>Communities</h1>
        <Link to="/communities/new" className="btn btn-primary">
          Create Community
        </Link>
      </div>

      {/* Search and Filter */}
      <Card className="mb-4">
        <Card.Body>
          <Form onSubmit={handleSearch}>
            <Row className="align-items-end">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Search Communities</Form.Label>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      placeholder="Search by name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Button type="submit" variant="outline-secondary">
                      Search
                    </Button>
                  </InputGroup>
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      {/* Communities Table */}
      <Card>
        <Card.Body>
          <Table responsive hover>
            <thead>
              <tr>
                <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>
                  Name {sortField === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th>Description</th>
                <th onClick={() => handleSort('member_count')} style={{ cursor: 'pointer' }}>
                  Members {sortField === 'member_count' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th onClick={() => handleSort('created_at')} style={{ cursor: 'pointer' }}>
                  Created At {sortField === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center">Loading...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="5" className="text-center text-danger">{error}</td>
                </tr>
              ) : communities.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center">No communities found</td>
                </tr>
              ) : (
                communities.map((community) => (
                  <tr key={community.id}>
                    <td>
                      <Link to={`/communities/${community.id}`}>
                        {community.name}
                      </Link>
                    </td>
                    <td>{community.description}</td>
                    <td>{community.memberCount}</td>
                    <td>{new Date(community.createdAt).toLocaleDateString()}</td>
                    <td>
                      <Link
                        to={`/communities/${community.id}`}
                        className="btn btn-sm btn-outline-primary me-2"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-center mt-4">
              <Pagination>
                <Pagination.First
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                />
                <Pagination.Prev
                  onClick={() => setCurrentPage(prev => prev - 1)}
                  disabled={currentPage === 1}
                />
                
                {[...Array(totalPages)].map((_, index) => (
                  <Pagination.Item
                    key={index + 1}
                    active={currentPage === index + 1}
                    onClick={() => setCurrentPage(index + 1)}
                  >
                    {index + 1}
                  </Pagination.Item>
                ))}
                
                <Pagination.Next
                  onClick={() => setCurrentPage(prev => prev + 1)}
                  disabled={currentPage === totalPages}
                />
                <Pagination.Last
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                />
              </Pagination>
            </div>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default CommunityListPage; 