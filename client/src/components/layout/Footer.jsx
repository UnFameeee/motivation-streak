import React from 'react';
import { Container } from 'react-bootstrap';

const Footer = () => {
  return (
    <footer className="bg-light py-4 mt-auto">
      <Container fluid="xl" className="px-xl-5">
        <div className="text-center">
          <p className="mb-0">&copy; {new Date().getFullYear()} Motivation Streak. All rights reserved.</p>
        </div>
      </Container>
    </footer>
  );
};

export default Footer; 