import axios from 'axios';
import { secureStore } from './storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await secureStore.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Error getting token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      secureStore.removeItem('token');
      // You might want to dispatch a logout action here
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authService = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  verifyOTP: (otpData) => api.post('/auth/verify-otp', otpData),
  verify2FA: (data) => api.post('/auth/verify-2fa', data),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.patch(`/auth/reset-password/${token}`, { password }),
  logout: () => api.post('/auth/logout'),
  updateProfile: (profileData) => api.patch('/auth/profile', profileData),
  enable2FA: (enabled) => api.patch('/auth/2fa', { enabled }),
};

// Feed API
export const feedService = {
  getFeed: (filters = {}) => api.get('/feed', { params: filters }),
  createPost: (postData) => api.post('/posts', postData),
  likePost: (postId) => api.post(`/posts/${postId}/like`),
  savePost: (postId) => api.post(`/posts/${postId}/save`),
  reportPost: (postId, reason) => api.post(`/posts/${postId}/report`, { reason }),
  getPost: (postId) => api.get(`/posts/${postId}`),
  deletePost: (postId) => api.delete(`/posts/${postId}`),
};

// Programs API
export const programsService = {
  getPrograms: (filters = {}) => api.get('/programs', { params: filters }),
  getProgram: (programId) => api.get(`/programs/${programId}`),
  enrollProgram: (programId) => api.post(`/programs/${programId}/enroll`),
  completeModule: (programId, moduleId) => api.post(`/programs/${programId}/modules/${moduleId}/complete`),
  getMyPrograms: () => api.get('/programs/my-programs'),
};

// Community API
export const communityService = {
  getGroups: () => api.get('/community/groups'),
  getGroup: (groupId) => api.get(`/community/groups/${groupId}`),
  joinGroup: (groupId) => api.post(`/community/groups/${groupId}/join`),
  leaveGroup: (groupId) => api.post(`/community/groups/${groupId}/leave`),
  getConversations: () => api.get('/chat/conversations'),
  getMessages: (conversationId) => api.get(`/chat/conversations/${conversationId}/messages`),
  sendMessage: (conversationId, message) => api.post(`/chat/conversations/${conversationId}/messages`, { message }),
};

// Savings API
export const savingsService = {
  getPods: () => api.get('/savings/pods'),
  createPod: (podData) => api.post('/savings/pods', podData),
  joinPod: (podId) => api.post(`/savings/pods/${podId}/join`),
  makeContribution: (podId, amount) => api.post(`/savings/pods/${podId}/contribute`, { amount }),
  getMyContributions: (podId) => api.get(`/savings/pods/${podId}/contributions`),
};

// Upload API
export const uploadService = {
  uploadImage: (formData) => api.post('/upload/image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
  uploadFile: (formData) => api.post('/upload/file', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),
};

export default api;