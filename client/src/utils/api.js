import axios from 'axios';

// Create an instance of axios with custom config
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add a request interceptor to add auth token to every request
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    // If token exists, add to headers
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle token expiration
    if (error.response && error.response.status === 401) {
      // If unauthorized and we have a token, it's likely expired
      if (localStorage.getItem('token')) {
        // Remove token
        localStorage.removeItem('token');
        
        // Redirect to login page
        window.location.href = '/login?session=expired';
      }
    }
    
    // Log errors in development
    if (process.env.NODE_ENV === 'development') {
      console.error('API Error:', error);
    }
    
    return Promise.reject(error);
  }
);

// Auth API endpoints
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  googleLogin: (tokenId) => api.post('/auth/google', { tokenId }),
  getCurrentUser: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  validateResetToken: (token) => api.get(`/auth/reset-password/validate/${token}`),
  changePassword: (data) => api.put('/auth/change-password', data),
  logout: () => api.post('/auth/logout')
};

// User API endpoints
export const userAPI = {
  updateProfile: (data) => api.put('/users/me', data),
  getTranslationStats: () => api.get('/users/me/stats/translations'),
  getPostStats: () => api.get('/users/me/stats/posts'),
  getActivity: () => api.get('/users/me/activity')
};

// Community API endpoints
export const communityAPI = {
  getAllCommunities: (params) => api.get('/communities', { params }),
  getCommunity: (id) => api.get(`/communities/${id}`),
  createCommunity: (data) => api.post('/communities', data),
  updateCommunity: (id, data) => api.put(`/communities/${id}`, data),
  deleteCommunity: (id) => api.delete(`/communities/${id}`),
  joinCommunity: (id) => api.post(`/communities/${id}/join`),
  leaveCommunity: (id) => api.post(`/communities/${id}/leave`),
  getMembers: (id, params) => api.get(`/communities/${id}/members`, { params }),
  getMemberRole: (id) => api.get(`/communities/${id}/members/me`),
  
  // Community schedule endpoints
  getSchedule: (id) => api.get(`/communities/${id}/schedule`),
  updateSchedule: (id, data) => api.post(`/communities/${id}/schedule`, data),
  deleteSchedule: (id) => api.delete(`/communities/${id}/schedule`),
  executeSchedule: (id) => api.post(`/communities/${id}/schedule/execute`)
};

// Block API endpoints
export const blockAPI = {
  getBlock: (id) => api.get(`/blocks/${id}`),
  createBlock: (data) => api.post('/blocks', data),
  updateBlock: (id, data) => api.put(`/blocks/${id}`, data),
  deleteBlock: (id) => api.delete(`/blocks/${id}`)
};

// Post API endpoints
export const postAPI = {
  getAllPosts: (params) => api.get('/posts', { params }),
  getPost: (id) => api.get(`/posts/${id}`),
  createPost: (data) => api.post('/posts', data),
  updatePost: (id, data) => api.put(`/posts/${id}`, data),
  deletePost: (id) => api.delete(`/posts/${id}`),
  getComments: (id) => api.get(`/posts/${id}/comments`),
  addComment: (id, data) => api.post(`/posts/${id}/comments`, data)
};

// Translation API endpoints
export const translationAPI = {
  getTranslation: (id) => api.get(`/translations/${id}`),
  createTranslation: (data) => api.post('/translations', data),
  updateTranslation: (id, data) => api.put(`/translations/${id}`, data),
  deleteTranslation: (id) => api.delete(`/translations/${id}`),
  getComments: (id) => api.get(`/translations/${id}/comments`),
  addComment: (id, data) => api.post(`/translations/${id}/comments`, data),
  scoreTranslation: (id) => api.post(`/translations/${id}/score`)
};

// Highlight API endpoints
export const highlightAPI = {
  getHighlights: (postId) => api.get(`/highlights?post_id=${postId}`),
  createHighlight: (data) => api.post('/highlights', data),
  deleteHighlight: (id) => api.delete(`/highlights/${id}`),
  addComment: (id, data) => api.post(`/highlights/${id}/comments`, data),
  getComments: (id) => api.get(`/highlights/${id}/comments`)
};

// Vocabulary API endpoints
export const vocabularyAPI = {
  getAllVocabulary: (params) => api.get('/vocabulary', { params }),
  getVocabulary: (id) => api.get(`/vocabulary/${id}`),
  createVocabulary: (data) => api.post('/vocabulary', data),
  updateVocabulary: (id, data) => api.put(`/vocabulary/${id}`, data),
  deleteVocabulary: (id) => api.delete(`/vocabulary/${id}`),
  
  // User vocabulary management
  getUserVocabulary: () => api.get('/vocabulary/user'),
  addToUserVocabulary: (id) => api.post(`/vocabulary/${id}/add`),
  updateUserVocabularyStatus: (id, status) => api.put(`/vocabulary/${id}/status`, { status }),
  removeFromUserVocabulary: (id) => api.delete(`/vocabulary/user/${id}`)
};

// Language API endpoints
export const languageAPI = {
  getAllLanguages: () => api.get('/languages'),
  getLanguage: (id) => api.get(`/languages/${id}`)
};

// Streak and Rank API endpoints
export const streakAPI = {
  getTranslationStreak: () => api.get('/streaks/translation'),
  getWritingStreak: () => api.get('/streaks/writing'),
  completeTranslationRecovery: () => api.post('/streaks/translation/recovery'),
  completeWritingRecovery: () => api.post('/streaks/writing/recovery'),
  getTranslationLeaderboard: () => api.get('/streaks/translation/leaderboard'),
  getWritingLeaderboard: () => api.get('/streaks/writing/leaderboard')
};

export const rankAPI = {
  getTranslationRank: () => api.get('/ranks/translation'),
  getWritingRank: () => api.get('/ranks/writing'),
  getDaiCanhGioiTiers: () => api.get('/ranks/tiers/dai-canh-gioi'),
  getCanhConTiers: () => api.get('/ranks/tiers/canh-con'),
  getDangTiers: () => api.get('/ranks/tiers/dang'),
  getTranslationRankHistory: () => api.get('/ranks/translation/history'),
  getWritingRankHistory: () => api.get('/ranks/writing/history')
};

// Settings API (admin only)
export const settingsAPI = {
  getAllSettings: () => api.get('/settings'),
  getSetting: (key) => api.get(`/settings/${key}`),
  updateSetting: (key, value) => api.put(`/settings/${key}`, { value }),
  createSetting: (data) => api.post('/settings', data)
};

// Export the axios instance as default
export default api; 