import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getModelos, deletarModelo } from '../services/api';
import { FiPlus, FiEdit2, FiTrash2, FiClipboard, FiList } from 'react-icons/fi';

export default function ModelosAnamnese() {
  const [modelos, setModelos] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadModelos();
  }, []);

  const loadModelos = async () => {
    setLoading(true);
    try {
      const res = await getModelos();
      setModelos(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, nome) => {
    if (!confirm(`Deseja deletar o modelo "${nome}"?`)) return;
    try {
      await deletarModelo(id);
      setModelos(modelos.filter(m => m.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-dark">Modelos de Anamnese</h1>
          <p className="text-dark/50 text-sm mt-1">Crie e gerencie fichas de procedimentos</p>
        </div>
        <button
          onClick={() => navigate('/modelos/novo')}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-accent to-accent-dark text-white font-heading font-semibold text-sm flex items-center gap-2 hover:shadow-lg hover:shadow-accent/25 transition-all active:scale-[0.98]"
        >
          <FiPlus size={18} />
          Novo Modelo
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-accent/30 border-t-accent rounded-full animate-spin" />
        </div>
      ) : modelos.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl shadow-card">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-primary flex items-center justify-center mb-4">
            <FiClipboard className="text-accent" size={32} />
          </div>
          <p className="text-dark/50 font-heading">Nenhum modelo criado</p>
          <p className="text-dark/30 text-sm mt-1">Crie um modelo para começar as anamneses</p>
          <button
            onClick={() => navigate('/modelos/novo')}
            className="mt-4 px-6 py-2.5 rounded-2xl bg-accent text-white text-sm font-medium hover:bg-accent-dark transition-colors"
          >
            Criar Primeiro Modelo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modelos.map((m, i) => (
            <div
              key={m.id}
              className="bg-white rounded-3xl p-6 shadow-card hover:shadow-hover transition-all duration-300 group animate-fadeIn"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent/20 to-secondary/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FiClipboard className="text-accent" size={22} />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => navigate(`/modelos/${m.id}/editar`)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-dark/30 hover:text-accent hover:bg-accent/10 transition-all"
                  >
                    <FiEdit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(m.id, m.nome_procedimento)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-dark/30 hover:text-red-400 hover:bg-red-50 transition-all"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>
              <h3 className="font-heading font-semibold text-dark mb-1">{m.nome_procedimento}</h3>
              {m.descricao && <p className="text-dark/40 text-sm line-clamp-2">{m.descricao}</p>}
              <div className="flex items-center gap-2 mt-3 text-dark/40">
                <FiList size={14} />
                <span className="text-xs">{m.total_campos} campo{m.total_campos !== 1 ? 's' : ''}</span>
              </div>
              <p className="text-dark/30 text-xs mt-2">
                {m.created_at ? new Date(m.created_at).toLocaleDateString('pt-BR') : ''}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
