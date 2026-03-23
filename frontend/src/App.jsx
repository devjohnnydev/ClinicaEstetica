import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Pacientes from './pages/Pacientes';
import PastaPaciente from './pages/PastaPaciente';
import ModelosAnamnese from './pages/ModelosAnamnese';
import BuilderModelo from './pages/BuilderModelo';
import NovaAnamnese from './pages/NovaAnamnese';
import VisualizarAnamnese from './pages/VisualizarAnamnese';
import Agenda from './pages/Agenda';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <div className="animate-pulse text-accent font-heading text-xl">Carregando...</div>
      </div>
    );
  }
  return user ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <div className="animate-pulse text-accent font-heading text-xl">Carregando...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="pacientes" element={<Pacientes />} />
        <Route path="pacientes/:id" element={<PastaPaciente />} />
        <Route path="modelos" element={<ModelosAnamnese />} />
        <Route path="modelos/novo" element={<BuilderModelo />} />
        <Route path="modelos/:id/editar" element={<BuilderModelo />} />
        <Route path="anamnese/nova" element={<NovaAnamnese />} />
        <Route path="anamneses/:id" element={<VisualizarAnamnese />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
