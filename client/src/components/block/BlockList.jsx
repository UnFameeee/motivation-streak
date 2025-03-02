import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Button, Form, InputGroup, Modal, Spinner, Alert, Tabs, Tab } from 'react-bootstrap';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FaPlus, FaCalendarAlt, FaSearch, FaFilter, FaNewspaper, FaRegClock, FaCheck } from 'react-icons/fa';
import axios from 'axios';
import debounce from 'lodash.debounce';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

const BlockList = () => {
  const { communityId } = useParams();
  const navigate = useNavigate();
  const [community, setCommunity] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBlockTitle, setNewBlockTitle] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [generatePost, setGeneratePost] = useState(true);
  const [view, setView] = useState('list'); // 'list' or 'calendar'
  const [calendarBlocks, setCalendarBlocks] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Get user token from localStorage
  const token = localStorage.getItem('token');

  const fetchCommunity = useCallback(async () => {
    try {
      const res = await axios.get(`/api/communities/${communityId}`, {
        headers: token ? {
          Authorization: `Bearer ${token}`
        } : {}
      });
      
      setCommunity(res.data);
    } catch (err) {
      setError('Failed to fetch community details');
      console.error(err);
    }
  }, [communityId, token]);

  const fetchBlocks = useCallback(async (page = 1, search = '') => {
    try {
      setLoading(true);
      setError('');
      
      const res = await axios.get(`/api/communities/${communityId}/blocks`, {
        params: {
          page,
          limit: 9,
          search
        },
        headers: token ? {
          Authorization: `Bearer ${token}`
        } : {}
      });
      
      setBlocks(res.data.blocks);
      setTotalPages(res.data.pages);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch blocks');
      setLoading(false);
      console.error(err);
    }
  }, [communityId, token]);

  const fetchCalendarBlocks = useCallback(async (year, month) => {
    try {
      setCalendarLoading(true);
      
      // Create date range for the month
      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 0);
      
      const res = await axios.get(`/api/communities/${communityId}/blocks`, {
        params: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          limit: 100 // Get all blocks for the month
        },
        headers: token ? {
          Authorization: `Bearer ${token}`
        } : {}
      });
      
      setCalendarBlocks(res.data.blocks);
      setCalendarLoading(false);
    } catch (err) {
      console.error('Failed to fetch calendar blocks', err);
      setCalendarLoading(false);
    }
  }, [communityId, token]);

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((searchValue) => {
      fetchBlocks(1, searchValue);
    }, 500),
    [fetchBlocks]
  );

  useEffect(() => {
    fetchCommunity();
    fetchBlocks(currentPage, searchTerm);
  }, [fetchCommunity, fetchBlocks, currentPage]);

  useEffect(() => {
    if (view === 'calendar') {
      fetchCalendarBlocks(calendarMonth.getFullYear(), calendarMonth.getMonth());
    }
  }, [view, calendarMonth, fetchCalendarBlocks]);

  useEffect(() => {
    debouncedSearch(searchTerm);
    if (currentPage !== 1) setCurrentPage(1);
  }, [searchTerm, debouncedSearch]);

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
    
    // Check if block already exists for this date
    const existingBlock = calendarBlocks.find(block => 
      new Date(block.date).toDateString() === date.toDateString()
    );
    
    if (existingBlock) {
      // Navigate to existing block
      navigate(`/blocks/${existingBlock.id}`);
    } else {
      // Show create modal
      setNewBlockTitle(`Block for ${date.toLocaleDateString()}`);
      setShowCreateModal(true);
    }
  };

  const handleCalendarChange = (value) => {
    // Update calendar month when changing month view
    if (value.getMonth() !== calendarMonth.getMonth() || 
        value.getFullYear() !== calendarMonth.getFullYear()) {
      setCalendarMonth(value);
    }
  };

  const handleCreateBlock = async () => {
    if (!newBlockTitle.trim()) {
      setCreateError('Block title is required');
      return;
    }
    
    try {
      setCreateLoading(true);
      setCreateError('');
      
      const res = await axios.post(`/api/communities/${communityId}/blocks`, {
        title: newBlockTitle,
        date: selectedDate.toISOString().split('T')[0],
        generate_post: generatePost
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      setShowCreateModal(false);
      setCreateLoading(false);
      
      // Navigate to the new block
      navigate(`/blocks/${res.data.block.id}`);
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to create block');
      setCreateLoading(false);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const renderCalendarView = () => {
    // Create a mapping of dates to blocks for easy lookup
    const blockMap = {};
    calendarBlocks.forEach(block => {
      const dateStr = new Date(block.date).toDateString();
      blockMap[dateStr] = block;
    });
    
    // Custom tile content to show block info
    const tileContent = ({ date, view }) => {
      if (view !== 'month') return null;
      
      const dateStr = date.toDateString();
      const block = blockMap[dateStr];
      
      if (block) {
        return (
          <div className="text-center mt-1">
            <div className="small text-truncate" style={{ fontSize: '0.6rem' }}>
              {block.title}
            </div>
            <div className="d-flex justify-content-center align-items-center">
              <FaNewspaper className="me-1" style={{ fontSize: '0.6rem' }} />
              <span style={{ fontSize: '0.6rem' }}>{block.postCount || 0}</span>
            </div>
          </div>
        );
      }
      
      return null;
    };
    
    return (
      <div className="mb-4">
        {calendarLoading ? (
          <div className="text-center py-4">
            <Spinner animation="border" size="sm" />
            <span className="ms-2">Loading calendar...</span>
          </div>
        ) : (
          <Calendar
            onChange={handleDateChange}
            value={selectedDate}
            onActiveStartDateChange={({ activeStartDate }) => handleCalendarChange(activeStartDate)}
            tileContent={tileContent}
            className="border-0 shadow-sm"
          />
        )}
      </div>
    );
  };

  const renderListView = () => {
    if (loading && blocks.length === 0) {
      return (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Loading blocks...</p>
        </div>
      );
    }
    
    if (blocks.length === 0) {
      return (
        <div className="text-center py-5">
          <div className="mb-4">
            <FaCalendarAlt size={50} className="text-muted" />
          </div>
          <h3>No blocks found</h3>
          <p className="text-muted">
            {searchTerm 
              ? "Try adjusting your search" 
              : "This community doesn't have any blocks yet"}
          </p>
          {community?.memberStatus?.isMember && (community?.memberStatus?.role === 'moderator' || community?.owner?.id === (token ? JSON.parse(atob(token.split('.')[1])).id : null)) && (
            <Button 
              variant="primary" 
              onClick={() => {
                setSelectedDate(new Date());
                setNewBlockTitle(`Block for ${new Date().toLocaleDateString()}`);
                setShowCreateModal(true);
              }}
            >
              <FaPlus className="me-2" />
              Create First Block
            </Button>
          )}
        </div>
      );
    }
    
    return (
      <Row>
        {blocks.map(block => (
          <Col md={4} className="mb-4" key={block.id}>
            <Card className="h-100 shadow-sm">
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div>
                    <h5 className="mb-0">{block.title}</h5>
                    <div className="text-muted small">
                      <FaCalendarAlt className="me-1" />
                      {new Date(block.date).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge 
                    bg={block.is_auto_generated ? "info" : "primary"}
                    className="ms-2"
                  >
                    {block.is_auto_generated ? "Auto" : "Manual"}
                  </Badge>
                </div>
                
                <div className="d-flex align-items-center mb-2">
                  <div className="d-flex align-items-center me-3">
                    <FaNewspaper className="me-1 text-primary" />
                    <span>{block.postCount || 0} posts</span>
                  </div>
                  <div className="d-flex align-items-center text-muted small">
                    <FaRegClock className="me-1" />
                    <span>
                      {new Date(block.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              </Card.Body>
              <Card.Footer className="bg-white">
                <Link to={`/blocks/${block.id}`}>
                  <Button variant="outline-primary" className="w-100">
                    View Block
                  </Button>
                </Link>
              </Card.Footer>
            </Card>
          </Col>
        ))}
      </Row>
    );
  };

  if (!community && loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading community...</p>
      </div>
    );
  }

  if (error && !community) {
    return (
      <Container className="py-5">
        <Alert variant="danger">{error}</Alert>
        <Button 
          variant="outline-primary" 
          onClick={() => navigate('/communities')}
        >
          Back to Communities
        </Button>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      {/* Community Header */}
      <Row className="mb-4 align-items-center">
        <Col>
          <h1 className="mb-0">{community?.name}</h1>
          <p className="text-muted">Blocks and writing prompts</p>
        </Col>
        <Col md="auto">
          {community?.memberStatus?.isMember && (community?.memberStatus?.role === 'moderator' || community?.owner?.id === (token ? JSON.parse(atob(token.split('.')[1])).id : null)) && (
            <Button 
              variant="primary" 
              onClick={() => {
                setSelectedDate(new Date());
                setNewBlockTitle(`Block for ${new Date().toLocaleDateString()}`);
                setShowCreateModal(true);
              }}
            >
              <FaPlus className="me-2" />
              Create Block
            </Button>
          )}
        </Col>
      </Row>

      {error && <Alert variant="danger">{error}</Alert>}

      {/* View Controls */}
      <Tabs
        activeKey={view}
        onSelect={(k) => setView(k)}
        className="mb-4"
      >
        <Tab eventKey="list" title="List View">
          <div className="my-3">
            <InputGroup>
              <InputGroup.Text>
                <FaSearch />
              </InputGroup.Text>
              <Form.Control
                placeholder="Search blocks by title..."
                value={searchTerm}
                onChange={handleSearch}
              />
            </InputGroup>
          </div>
          {renderListView()}
        </Tab>
        <Tab eventKey="calendar" title="Calendar View">
          {renderCalendarView()}
        </Tab>
      </Tabs>

      {/* Create Block Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Create New Block</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {createError && <Alert variant="danger">{createError}</Alert>}
          
          <Form.Group className="mb-3">
            <Form.Label>Block Title</Form.Label>
            <Form.Control
              type="text"
              value={newBlockTitle}
              onChange={(e) => setNewBlockTitle(e.target.value)}
              placeholder="Enter block title"
            />
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Date</Form.Label>
            <Form.Control
              type="date"
              value={selectedDate.toISOString().split('T')[0]}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
            />
          </Form.Group>
          
          {community?.schedules?.length > 0 && community.schedules[0].auto_gen_post && (
            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Auto-generate a post for this block"
                checked={generatePost}
                onChange={(e) => setGeneratePost(e.target.checked)}
              />
              {generatePost && (
                <div className="text-muted small mt-1">
                  <FaCheck className="me-1 text-success" />
                  An AI-generated post will be created based on community settings
                </div>
              )}
            </Form.Group>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreateBlock}
            disabled={createLoading}
          >
            {createLoading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Creating...
              </>
            ) : (
              'Create Block'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default BlockList; 