import axios from 'axios';

// API base:
// - Default: `/api` (works with Vite dev proxy and same-origin deployments)
// - Production (Vercel): set `VITE_API_BASE_URL` to your Render backend, e.g. `https://your-render.com/api`
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `/api`; 

// Admin token for import/template endpoints (set after login on Admin page)
let adminToken = typeof window !== 'undefined' ? window.localStorage.getItem('megaglow_admin_token') : null;

export function setAdminToken(token) {
  adminToken = token;
  if (typeof window !== 'undefined' && token) {
    window.localStorage.setItem('megaglow_admin_token', token);
  } else if (typeof window !== 'undefined') {
    window.localStorage.removeItem('megaglow_admin_token');
  }
}

export function getAdminToken() {
  return adminToken;
}

export function clearAdminToken() {
  setAdminToken(null);
}

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  if (adminToken) {
    config.headers.Authorization = `Token ${adminToken}`;
  }
  return config;
});

// Products API
export const productsAPI = {
  getAll: (params = {}) => api.get('/products/', { params }),
  getById: (id) => api.get(`/products/${id}/`),
  create: (data) => api.post('/products/', data),
  update: (id, data) => api.put(`/products/${id}/`, data),
  delete: (id) => api.delete(`/products/${id}/`),
  getCategories: () => api.get('/products/categories/'),
  getLowStock: () => api.get('/products/low_stock/'),
  importExcel: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/products/import-excel/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getExcelTemplateUrl: () => `${api.defaults.baseURL}/products/excel-template/`,
  downloadExcelTemplate: async () => {
    const res = await api.get('/products/excel-template/', { responseType: 'blob' });
    return res.data;
  },
};

// Auth API (admin login)
export const authAPI = {
  login: (username, password) =>
    api.post('/auth/login/', { username, password }),
};

// Sales API
export const salesAPI = {
  getAll: (params = {}) => api.get('/sales/', { params }),
  getById: (id) => api.get(`/sales/${id}/`),
  create: (data) => api.post('/sales/', data),
  getToday: () => api.get('/sales/today/'),
  getStats: () => api.get('/sales/stats/'),
};

// Reporting API
export const reportingAPI = {
  getDashboardSummary: () => api.get('/reporting/dashboard/'),
  getMonthlyTrend: () => api.get('/reporting/monthly-trend/'),
  getTopProducts: () => api.get('/reporting/top-products/'),
  getDeadStock: () => api.get('/reporting/dead-stock/'),
  getDailySales: (date) => api.get('/reporting/daily-sales/', { params: { date } }),
};

// Todos API
export const todosAPI = {
  getAll: () => api.get('/todos/'),
  getById: (id) => api.get(`/todos/${id}/`),
  create: (data) => api.post('/todos/', data),
  update: (id, data) => api.put(`/todos/${id}/`, data),
  partial_update: (id, data) => api.patch(`/todos/${id}/`, data),
  delete: (id) => api.delete(`/todos/${id}/`),
  updateStatus: (id, status) => api.patch(`/todos/${id}/update_status/`, { status }),
  getByStatus: (status) => api.get('/todos/by_status/', { params: { status } }),
};

export default api;
