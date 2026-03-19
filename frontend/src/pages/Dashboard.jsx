import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats } from '../services/api';
import { FiUsers, FiFileText, FiClipboard, FiPlusCircle, FiClock, FiCheckCircle } from 'react-icons/fi';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getDashboardStats()
      .then(res => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  const cards = [
    {
      title: 'Pacientes',
      value: stats?.total_pacientes || 0,
      icon: FiUsers,
      color: 'from-accent to-secondary',
      onClick: () => navigate('/pacientes'),
    },
    {
      title: 'Anamneses',
      value: stats?.total_anamneses || 0,
      icon: FiFileText,
      color: 'from-secondary to-primary',
      onClick: () => navigate('/pacientes'),
    },
    {
      title: 'Modelos',
      value: stats?.total_modelos || 0,
      icon: FiClipboard,
      color: 'from-accent/80 to-accent',
      onClick: () => navigate('/modelos'),
    },
    {
      title: 'Nova Anamnese',
      value: '+',
      icon: FiPlusCircle,
      color: 'from-accent-dark to-accent',
      onClick: () => navigate('/anamnese/nova'),
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Welcome */}
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-semibold text-dark">
          Bem-vinda de volta ✨
        </h1>
        <p className="text-dark/50 mt-1 font-heading text-sm">
          Painel de controle da clínica
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((card, i) => (
          <button
            key={i}
            onClick={card.onClick}
            className="bg-white rounded-3xl p-6 shadow-card hover:shadow-hover transition-all duration-300 text-left group hover:-translate-y-1"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
              <card.icon className="text-white" size={22} />
            </div>
            <p className="text-2xl font-heading font-bold text-dark">{card.value}</p>
            <p className="text-dark/50 text-sm mt-1">{card.title}</p>
          </button>
        ))}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="bg-white rounded-3xl p-6 shadow-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center">
              <FiClock className="text-yellow-500" size={20} />
            </div>
            <h3 className="font-heading font-semibold text-dark">Em Andamento</h3>
          </div>
          <p className="text-3xl font-heading font-bold text-yellow-500">{stats?.em_andamento || 0}</p>
          <p className="text-dark/40 text-sm mt-1">anamneses pendentes</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <FiCheckCircle className="text-green-500" size={20} />
            </div>
            <h3 className="font-heading font-semibold text-dark">Finalizadas</h3>
          </div>
          <p className="text-3xl font-heading font-bold text-green-500">{stats?.finalizadas || 0}</p>
          <p className="text-dark/40 text-sm mt-1">anamneses completas</p>
        </div>
      </div>

      {/* Recent */}
      {stats?.recentes?.length > 0 && (
        <div className="bg-white rounded-3xl p-6 shadow-card">
          <h3 className="font-heading font-semibold text-dark mb-4">Últimos Atendimentos</h3>
          <div className="space-y-3">
            {stats.recentes.map((r, i) => (
              <div
                key={i}
                onClick={() => navigate(`/anamneses/${r.id}`)}
                className="flex items-center justify-between p-4 rounded-2xl bg-soft hover:bg-primary/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-secondary/30 flex items-center justify-center">
                    <span className="text-accent font-bold text-sm">{r.paciente_nome?.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-medium text-dark text-sm">{r.paciente_nome}</p>
                    <p className="text-dark/40 text-xs">{r.procedimento}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  r.status === 'finalizada'
                    ? 'bg-green-50 text-green-600'
                    : 'bg-yellow-50 text-yellow-600'
                }`}>
                  {r.status === 'finalizada' ? 'Finalizada' : 'Em andamento'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
