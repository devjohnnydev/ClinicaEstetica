import axios from 'axios';

// In production, frontend is served by the backend (same origin)
// In development, backend runs on port 8000
const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const login = (email, password) => api.post('/api/auth/login', { email, password });
export const getMe = () => api.get('/api/auth/me');

// Dashboard
export const getDashboardStats = () => api.get('/api/dashboard/stats');

// Pacientes
export const getPacientes = (busca) => api.get('/api/pacientes', { params: { busca } });
export const getPaciente = (id) => api.get(`/api/pacientes/${id}`);
export const criarPaciente = (data) => api.post('/api/pacientes', data);
export const atualizarPaciente = (id, data) => api.put(`/api/pacientes/${id}`, data);

// Modelos
export const getModelos = () => api.get('/api/modelos');
export const getModelo = (id) => api.get(`/api/modelos/${id}`);
export const criarModelo = (data) => api.post('/api/modelos', data);
export const atualizarModelo = (id, data) => api.put(`/api/modelos/${id}`, data);
export const deletarModelo = (id) => api.delete(`/api/modelos/${id}`);

// Anamneses
export const getAnamneses = (params) => api.get('/api/anamneses', { params });
export const getAnamnese = (id) => api.get(`/api/anamneses/${id}`);
export const criarAnamnese = (data) => api.post('/api/anamneses', data);
export const finalizarAnamnese = (id, data) => api.put(`/api/anamneses/${id}/finalizar`, data);
export const salvarProgresso = (id, data) => api.put(`/api/anamneses/${id}/salvar-progresso`, data);
export const uploadAnexo = (anamneseId, formData) => api.post(`/api/anamneses/${anamneseId}/anexos`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
export const deletarAnexo = (anamneseId, anexoId) => api.delete(`/api/anamneses/${anamneseId}/anexos/${anexoId}`);

// PDF
export const downloadPdf = (anamneseId) => api.get(`/api/anamneses/${anamneseId}/pdf`, { responseType: 'blob' });

// Upload base URL for images  
export const UPLOAD_URL = `${API_BASE}/uploads`;

export default api;
