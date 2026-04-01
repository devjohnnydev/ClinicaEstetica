import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { login, getMe } from '../services/api';
import { FiMail, FiLock, FiArrowRight } from 'react-icons/fi';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(email, password);
      const token = res.data.access_token;
      localStorage.setItem('token', token);
      const userRes = await getMe();
      loginUser(token, userRes.data);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-primary via-white to-secondary/30 p-4 overflow-hidden relative">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
      
      <div className="relative w-full max-w-md animate-scaleIn">
        {/* Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-elegant p-8 md:p-10 border border-white/50">
          {/* Logo */}
          <div className="text-center mb-8">
            <img src="/logo-oficial.png" alt="Dra. Gisele Santos" className="h-24 w-auto mx-auto mb-4 drop-shadow-lg object-contain" />
            <h1 className="font-display text-2xl font-semibold text-dark">Dra. Gisele Santos</h1>
            <p className="text-[11px] text-[#C4956A] tracking-[0.25em] uppercase font-heading mt-1">Estética e Saúde</p>
            <p className="text-dark/30 text-xs mt-2 font-heading">Acesse o sistema</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-100 animate-fadeIn">
              <p className="text-red-500 text-sm text-center">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-dark/60 mb-2">Email</label>
              <div className="relative">
                <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-accent" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-secondary/50 bg-soft/50 focus:bg-white focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all text-dark placeholder:text-dark/30"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark/60 mb-2">Senha</label>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-accent" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-secondary/50 bg-soft/50 focus:bg-white focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all text-dark placeholder:text-dark/30"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-accent to-accent-dark text-white font-heading font-semibold text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-accent/25 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Entrar
                  <FiArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-dark/30 text-xs mt-6 font-heading">
          Sistema interno — Uso exclusivo da clínica
        </p>
      </div>
    </div>
  );
}
