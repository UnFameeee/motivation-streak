import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize axios defaults
  axios.defaults.baseURL = process.env.REACT_APP_API_URL;

  useEffect(() => {
    // Check if there's a token in localStorage
    const token = localStorage.getItem('accessToken');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Verify token and get user info
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await axios.get('/api/users/me');
      setCurrentUser(response.data);
    } catch (error) {
      console.error('Error fetching user:', error);
      // If token is invalid, clear it
      logout();
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    // Open Google OAuth popup
    const googleWindow = window.open(
      `${process.env.REACT_APP_API_URL}/auth/google`,
      '_blank',
      'width=500,height=600'
    );

    return new Promise((resolve, reject) => {
      window.addEventListener('message', async (event) => {
        if (event.origin !== process.env.REACT_APP_API_URL) return;

        if (event.data.token) {
          try {
            // Store token
            localStorage.setItem('accessToken', event.data.token);
            axios.defaults.headers.common['Authorization'] = `Bearer ${event.data.token}`;
            
            // Fetch user info
            await fetchCurrentUser();
            resolve();
          } catch (error) {
            reject(error);
          }
        } else if (event.data.error) {
          reject(new Error(event.data.error));
        }
      });
    });
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    delete axios.defaults.headers.common['Authorization'];
    setCurrentUser(null);
  };

  const value = {
    currentUser,
    loginWithGoogle,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 