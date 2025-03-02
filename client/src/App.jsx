import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Container } from 'react-bootstrap';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/routing/PrivateRoute';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ProfilePage from './pages/ProfilePage';
import CommunityListPage from './pages/CommunityListPage';
import CommunityDetailPage from './pages/CommunityDetailPage';
import CommunityManagementPage from './pages/CommunityManagementPage';
import BlockDetailPage from './pages/BlockDetailPage';
import PostDetailPage from './pages/PostDetailPage';
import PostEditorPage from './pages/PostEditorPage';
import TranslationEditorPage from './pages/TranslationEditorPage';
import MotivationPage from './pages/MotivationPage';
import NotFoundPage from './pages/NotFoundPage';
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="app-container">
          <Header />
          <main className="app-main">
            <Container fluid="xl" className="px-xl-5">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
                
                {/* Protected routes */}
                <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
                <Route path="/communities" element={<PrivateRoute><CommunityListPage /></PrivateRoute>} />
                <Route path="/communities/new" element={<PrivateRoute><CommunityManagementPage /></PrivateRoute>} />
                <Route path="/communities/:communityId" element={<PrivateRoute><CommunityDetailPage /></PrivateRoute>} />
                <Route path="/communities/:communityId/manage" element={<PrivateRoute><CommunityManagementPage /></PrivateRoute>} />
                <Route path="/blocks/:blockId" element={<PrivateRoute><BlockDetailPage /></PrivateRoute>} />
                <Route path="/posts/new" element={<PrivateRoute><PostEditorPage /></PrivateRoute>} />
                <Route path="/posts/:postId" element={<PrivateRoute><PostDetailPage /></PrivateRoute>} />
                <Route path="/posts/:postId/edit" element={<PrivateRoute><PostEditorPage /></PrivateRoute>} />
                <Route path="/posts/:postId/translate" element={<PrivateRoute><TranslationEditorPage /></PrivateRoute>} />
                <Route path="/translations/:translationId/edit" element={<PrivateRoute><TranslationEditorPage /></PrivateRoute>} />
                <Route path="/motivation" element={<PrivateRoute><MotivationPage /></PrivateRoute>} />
                
                {/* 404 route */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Container>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App; 