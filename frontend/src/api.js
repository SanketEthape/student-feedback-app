import axios from 'axios';

let BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
// Normalize BASE URL: strip trailing slash and append /api if missing
BASE = BASE.trim().replace(/\/+$/, '');
if (!BASE.endsWith('/api')) {
  BASE = BASE + '/api';
}

const api = axios.create({ baseURL: BASE });
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export const studentApi = axios.create({ baseURL: BASE });
studentApi.interceptors.request.use(cfg => {
  const token = localStorage.getItem('studentToken');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export default api;