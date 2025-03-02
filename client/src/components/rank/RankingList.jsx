import React, { useState, useEffect } from 'react';
import { Table, Badge, Pagination, Card, Spinner, Alert, Container, Row, Col, Form } from 'react-bootstrap';
import { FaTrophy, FaMedal, FaStar, FaFire, FaFilter, FaSearch } from 'react-icons/fa';
import axios from 'axios';

const RankingList = ({ rankType = 'translation' }) => {
  const [ranks, setRanks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [userPosition, setUserPosition] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredRanks, setFilteredRanks] = useState([]);
  
  // Top 3 medal colors
  const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32']; // Gold, Silver, Bronze

  useEffect(() => {
    fetchRanks();
  }, [rankType, currentPage]);
  
  useEffect(() => {
    // Filter ranks based on search term
    if (searchTerm.trim() === '') {
      setFilteredRanks(ranks);
    } else {
      const filtered = ranks.filter(rank => 
        rank.user.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredRanks(filtered);
    }
  }, [searchTerm, ranks]);

  const fetchRanks = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`/api/ranks/${rankType}`, {
        params: { page: currentPage, limit: 10 },
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      
      setRanks(res.data.ranks);
      setFilteredRanks(res.data.ranks);
      setTotalPages(res.data.pages);
      setUserPosition(res.data.userRankPosition);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch rankings');
      setLoading(false);
    }
  };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    const items = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    if (startPage > 1) {
      items.push(
        <Pagination.Item key={1} onClick={() => handlePageChange(1)}>
          1
        </Pagination.Item>
      );
      if (startPage > 2) {
        items.push(<Pagination.Ellipsis key="ellipsis-start" />);
      }
    }
    
    for (let i = startPage; i <= endPage; i++) {
      items.push(
        <Pagination.Item 
          key={i} 
          active={i === currentPage}
          onClick={() => handlePageChange(i)}
        >
          {i}
        </Pagination.Item>
      );
    }
    
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        items.push(<Pagination.Ellipsis key="ellipsis-end" />);
      }
      items.push(
        <Pagination.Item 
          key={totalPages} 
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

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading rankings...</p>
      </div>
    );
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  return (
    <Container>
      <h2 className="mb-4">
        {rankType === 'translation' ? 'Diệu Thuật Bảng' : 'Phong Vân Bảng'}{' '}
        <Badge bg="primary">Top Rankings</Badge>
      </h2>
      
      {userPosition && (
        <Alert variant="info">
          <FaStar className="me-2" />
          Your current position: <strong>#{userPosition}</strong>
        </Alert>
      )}
      
      <Row className="mb-4">
        <Col>
          <Form.Group className="d-flex align-items-center">
            <FaSearch className="me-2 text-muted" />
            <Form.Control
              type="text"
              placeholder="Search by username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Form.Group>
        </Col>
      </Row>
      
      <Card className="shadow-sm">
        <Table hover responsive className="mb-0">
          <thead>
            <tr>
              <th width="80">Rank</th>
              <th>User</th>
              <th>Tier</th>
              <th width="120">Days</th>
              <th width="120">Best</th>
            </tr>
          </thead>
          <tbody>
            {filteredRanks.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center py-5">
                  <FaTrophy className="me-2 text-muted" />
                  No rankings found.
                </td>
              </tr>
            ) : (
              filteredRanks.map((rank, index) => {
                const rankPosition = (currentPage - 1) * 10 + index + 1;
                const isMedalist = rankPosition <= 3;
                const rankColor = rank.daiCanhGioiTier.color_code || '#72d1a8';
                
                return (
                  <tr key={rank.id} className={userPosition === rankPosition ? 'table-primary' : ''}>
                    <td className="text-center">
                      {isMedalist ? (
                        <FaMedal 
                          size={24} 
                          color={medalColors[rankPosition - 1]} 
                          className="me-1" 
                        />
                      ) : (
                        `#${rankPosition}`
                      )}
                    </td>
                    <td>
                      <div className="d-flex align-items-center">
                        {rank.user.avatar ? (
                          <img 
                            src={rank.user.avatar} 
                            alt={rank.user.username} 
                            className="rounded-circle me-2"
                            width="32"
                            height="32"
                          />
                        ) : (
                          <div 
                            className="rounded-circle me-2 d-flex align-items-center justify-content-center"
                            style={{ 
                              width: 32, 
                              height: 32, 
                              backgroundColor: rankColor,
                              color: '#fff'
                            }}
                          >
                            {rank.user.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span>{rank.user.username}</span>
                      </div>
                    </td>
                    <td>
                      <div 
                        style={{ 
                          color: rankColor,
                          fontWeight: 'bold'
                        }}
                      >
                        {`${rank.daiCanhGioiTier.name} - ${rank.canhConTier.name} - ${rank.dangTier.name}`}
                        {rank.daiCanhGioiTier.color_name && (
                          <span className="ms-1 small text-muted">
                            ({rank.daiCanhGioiTier.color_name})
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <Badge
                        className="d-flex align-items-center" 
                        bg="light" 
                        text="dark"
                        style={{ borderLeft: `3px solid ${rankColor}` }}
                      >
                        <FaFire className="me-1" style={{ color: rankColor }} />
                        {rank.days_count} days
                      </Badge>
                    </td>
                    <td>
                      <Badge bg="secondary">
                        <FaStar className="me-1" />
                        {rank.highest_days_count} days
                      </Badge>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </Table>
      </Card>
      
      {renderPagination()}
    </Container>
  );
};

export default RankingList; 