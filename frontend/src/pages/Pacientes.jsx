import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPacientes } from '../services/api';
import { FiSearch, FiFolder, FiPhone, FiUser } from 'react-icons/fi';

export default function Pacientes() {
  const [pacientes, setPacientes] = useState([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadPacientes();
  }, []);

  const loadPacientes = async (search) => {
    setLoading(true);
    try {
      const res = await getPacientes(search || undefined);
      setPacientes(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    const value = e.target.value;
    setBusca(value);
    clearTimeout(window._searchTimeout);
    window._searchTimeout = setTimeout(() => loadPacientes(value), 300);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-dark">Pacientes</h1>
          <p className="text-dark/50 text-sm mt-1">Gerencie as pastas dos pacientes</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-accent" size={18} />
        <input
          type="text"
          value={busca}
          onChange={handleSearch}
          placeholder="Buscar por nome..."
          className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-secondary/50 bg-white focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all text-dark placeholder:text-dark/30"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="bg-white/60 rounded-3xl p-5 h-[100px] animate-pulse flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-dark/10 shrink-0"></div>
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-dark/10 rounded w-3/4"></div>
                <div className="h-3 bg-dark/5 rounded w-1/2"></div>
                <div className="h-3 bg-dark/5 rounded w-1/3"></div>
              </div>
            </div>
          ))}
        </div>
      ) : pacientes.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-primary flex items-center justify-center mb-4">
            <FiUser className="text-accent" size={32} />
          </div>
          <p className="text-dark/50 font-heading">Nenhum paciente encontrado</p>
          <p className="text-dark/30 text-sm mt-1">Os pacientes serão criados ao iniciar uma anamnese</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pacientes.map((p, i) => (
            <button
              key={p.id}
              onClick={() => navigate(`/pacientes/${p.id}`)}
              className="bg-white rounded-3xl p-5 shadow-card hover:shadow-hover transition-all duration-300 text-left group hover:-translate-y-1 animate-fadeIn"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent/20 to-secondary/30 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <span className="text-accent font-bold text-lg">{p.nome?.charAt(0)}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-heading font-semibold text-dark truncate">{p.nome}</p>
                  <p className="text-dark/40 text-xs mt-0.5">CPF: {p.cpf}</p>
                  <div className="flex items-center gap-1 mt-2 text-dark/40">
                    <FiPhone size={12} />
                    <span className="text-xs">{p.telefone}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="px-2.5 py-1 rounded-xl bg-accent/10 text-accent text-xs font-medium">
                    {p.total_anamneses} ficha{p.total_anamneses !== 1 ? 's' : ''}
                  </span>
                  <FiFolder className="text-dark/20 group-hover:text-accent transition-colors" size={16} />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
