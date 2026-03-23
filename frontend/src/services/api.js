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

// ─── Agenda ─────────────────────────────────────────────────────
// Agendamentos
export const getAgendamentos = (params) => api.get('/api/agenda/agendamentos', { params });
export const getAgendamento = (id) => api.get(`/api/agenda/agendamentos/${id}`);
export const criarAgendamento = (data) => api.post('/api/agenda/agendamentos', data);
export const atualizarAgendamento = (id, data) => api.put(`/api/agenda/agendamentos/${id}`, data);
export const cancelarAgendamento = (id) => api.post(`/api/agenda/agendamentos/${id}/cancelar`);
export const naoCompareceu = (id) => api.post(`/api/agenda/agendamentos/${id}/nao-compareceu`);
export const concluirAgendamento = (id) => api.post(`/api/agenda/agendamentos/${id}/concluir`);
export const confirmarAgendamento = (id) => api.post(`/api/agenda/agendamentos/${id}/confirmar`);
export const autoConcluir = () => api.post('/api/agenda/agendamentos/auto-concluir');

// Clientes da Agenda
export const getAgendaClientes = (busca) => api.get('/api/agenda/clientes', { params: { busca } });
export const criarAgendaCliente = (data) => api.post('/api/agenda/clientes', data);
export const getAgendaCliente = (id) => api.get(`/api/agenda/clientes/${id}`);
export const atualizarAgendaCliente = (id, data) => api.put(`/api/agenda/clientes/${id}`, data);
export const getClienteAgendamentos = (id) => api.get(`/api/agenda/clientes/${id}/agendamentos`);
export const getPacientesDisponiveis = (busca) => api.get('/api/agenda/pacientes-disponiveis', { params: { busca } });

// Serviços
export const getServicos = (params) => api.get('/api/agenda/servicos', { params });
export const criarServico = (data) => api.post('/api/agenda/servicos', data);
export const atualizarServico = (id, data) => api.put(`/api/agenda/servicos/${id}`, data);
export const deletarServico = (id) => api.delete(`/api/agenda/servicos/${id}`);

// Profissionais
export const getProfissionais = (params) => api.get('/api/agenda/profissionais', { params });
export const criarProfissional = (data) => api.post('/api/agenda/profissionais', data);
export const atualizarProfissional = (id, data) => api.put(`/api/agenda/profissionais/${id}`, data);
export const vincularServicos = (id, data) => api.post(`/api/agenda/profissionais/${id}/servicos`, data);

// Bloqueios
export const getBloqueios = (params) => api.get('/api/agenda/bloqueios', { params });
export const criarBloqueio = (data) => api.post('/api/agenda/bloqueios', data);
export const deletarBloqueio = (id) => api.delete(`/api/agenda/bloqueios/${id}`);

// Lista de Espera
export const getListaEspera = (params) => api.get('/api/agenda/lista-espera', { params });
export const criarListaEspera = (data) => api.post('/api/agenda/lista-espera', data);
export const atualizarListaEspera = (id, data) => api.put(`/api/agenda/lista-espera/${id}`, data);
export const deletarListaEspera = (id) => api.delete(`/api/agenda/lista-espera/${id}`);
export const agendarDaListaEspera = (id, data) => api.post(`/api/agenda/lista-espera/${id}/agendar`, data);

// Dashboard & Aniversariantes
export const getAgendaDashboard = () => api.get('/api/agenda/dashboard');
export const getAniversariantes = (mes) => api.get('/api/agenda/aniversariantes', { params: { mes } });
export const getPendentesConfirmacao = () => api.get('/api/agenda/pendentes-confirmacao');

export default api;
