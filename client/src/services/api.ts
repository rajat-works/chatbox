import axios from 'axios';

const API_BASE = 'http://localhost:3001/api/v1';



const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const { data } = await axios.post(`${API_BASE}/auth/refresh`, {
          refreshToken,
        });

        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);

        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

export default api;

// ===== Auth API =====
export const authAPI = {
  register: (data: { name: string; email?: string; phone?: string; password: string; confirmPassword: string }) =>
    api.post('/auth/register', data),

  login: (data: { email?: string; phone?: string; password: string }) =>
    api.post('/auth/login', data),

  verifyOtp: (data: { email?: string; phone?: string; otp: string }) =>
    api.post('/auth/verify-otp', data),

  sendOtp: (data: { email?: string; phone?: string }) =>
    api.post('/auth/send-otp', data),

  forgotPassword: (data: { email?: string; phone?: string }) =>
    api.post('/auth/forgot-password', data),

  resetPassword: (data: { email?: string; phone?: string; otp: string; newPassword: string }) =>
    api.post('/auth/reset-password', data),

  refreshTokens: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),

  logout: () => api.post('/auth/logout'),
};

// ===== Users API =====
export const usersAPI = {
  getProfile: () => api.get('/users/me'),

  updateProfile: (data: any) => api.put('/users/me', data),

  updateAvatar: (file: File) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.patch('/users/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  updatePrivacy: (data: any) => api.patch('/users/me/privacy', data),

  deleteAccount: (password: string) => api.delete('/users/me', { data: { password } }),

  searchUsers: (query: string) => api.get(`/users/search?q=${query}`),

  getUserProfile: (id: string) => api.get(`/users/${id}`),

  getFriends: () => api.get('/users/friends'),

  getContacts: () => api.get('/users/contacts'),

  addFriend: (id: string) => api.patch(`/users/${id}/friend`),

  removeFriend: (id: string) => api.delete(`/users/${id}/friend`),

  blockUser: (id: string) => api.patch(`/users/${id}/block`),

  unblockUser: (id: string) => api.delete(`/users/${id}/block`),
};

// ===== Chat API =====
export const chatAPI = {
  getConversations: () => api.get('/chat/conversations'),

  createConversation: (participantId: string) =>
    api.post('/chat/conversations', { participantIds: [participantId] }),

  createGroup: (data: { groupName: string; groupDescription?: string; participantIds: string[]; tags?: string[] }) =>
    api.post('/chat/conversations/group', data),

  getConversation: (id: string) => api.get(`/chat/conversations/${id}`),

  getMessages: (conversationId: string, page = 1, limit = 50) =>
    api.get(`/chat/conversations/${conversationId}/messages?page=${page}&limit=${limit}`),

  sendMessage: (data: { conversationId: string; content: string; type?: string; replyTo?: string }) =>
    api.post('/chat/messages', data),

  sendFileMessage: (conversationId: string, file: File, type: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('conversationId', conversationId);
    formData.append('type', type);
    return api.post('/chat/messages/file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deleteMessage: (id: string) => api.delete(`/chat/messages/${id}`),

  markAsRead: (conversationId: string) => api.post(`/chat/conversations/${conversationId}/read`),
};

// ===== Groups API =====
export const groupsAPI = {
  getGroup: (id: string) => api.get(`/groups/${id}`),

  updateGroup: (id: string, data: any) => api.put(`/groups/${id}`, data),

  addMember: (groupId: string, memberId: string) =>
    api.post(`/groups/${groupId}/members/${memberId}`),

  removeMember: (groupId: string, memberId: string) =>
    api.delete(`/groups/${groupId}/members/${memberId}`),

  makeAdmin: (groupId: string, memberId: string) =>
    api.post(`/groups/${groupId}/admins/${memberId}`),

  leaveGroup: (groupId: string) => api.post(`/groups/${groupId}/leave`),
};

// ===== Notifications API =====
export const notificationsAPI = {
  getNotifications: (page = 1) => api.get(`/notifications?page=${page}`),

  markAsRead: (id: string) => api.patch(`/notifications/${id}/read`),

  markAllAsRead: () => api.patch('/notifications/read-all'),

  deleteNotification: (id: string) => api.delete(`/notifications/${id}`),
};

// ===== Calls API =====
export const callsAPI = {
  getIceConfig: () => api.get('/calls/config'),
};

// ===== Upload API =====
export const uploadAPI = {
  uploadFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ===== Settings API =====
export const settingsAPI = {
  getAppSettings: () => api.get('/settings/app'),
};
