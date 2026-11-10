import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api' });
api.interceptors.request.use((request) => {
  const token = localStorage.getItem('connectsphere-token');
  if (token) request.headers.Authorization = `Bearer ${token}`;
  return request;
});

export default api;
