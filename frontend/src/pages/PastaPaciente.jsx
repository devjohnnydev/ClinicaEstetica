import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPaciente, getAnamneses, downloadPdf } from '../services/api';
import { FiArrowLeft, FiUser, FiPhone, FiCalendar, FiHeart, FiEye, FiDownload, FiPlay, FiFileText } from 'react-icons/fi';

export default function PastaPaciente() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [paciente, setPaciente] = useState(null);
  const [anamneses, setAnamneses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pacRes, anaRes] = await Promise.all([
        getPaciente(id),
        getAnamneses({ paciente_id: id }),
      ]);
      setPaciente(pacRes.data);
      setAnamneses(anaRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async (anamneseId) => {
    try {
      const res = await downloadPdf(anamneseId);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `anamnese_${anamneseId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-3 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!paciente) {
    return <div className="text-center py-20 text-dark/50">Paciente não encontrado</div>;
  }

  const emAndamento = anamneses.filter(a => a.status === 'em_andamento');
  const finalizadas = anamneses.filter(a => a.status === 'finalizada');

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/pacientes')} className="w-10 h-10 rounded-xl bg-white shadow-card flex items-center justify-center text-dark/50 hover:text-accent transition-colors">
          <FiArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-display text-2xl font-semibold text-dark">Pasta do Paciente</h1>
          <p className="text-dark/50 text-sm mt-0.5">{paciente.nome}</p>
        </div>
      </div>

      {/* Patient info card */}
      <div className="bg-white rounded-3xl p-6 shadow-card">
        <div className="flex flex-col md:flex-row md:items-start gap-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-secondary flex items-center justify-center flex-shrink-0">
            <span className="text-white font-display text-2xl font-bold">{paciente.nome?.charAt(0)}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
            <div className="flex items-center gap-2">
              <FiUser className="text-accent" size={16} />
              <div>
                <p className="text-xs text-dark/40">Nome</p>
                <p className="text-sm font-medium text-dark">{paciente.nome}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-accent text-xs font-bold">CPF</span>
              <div>
                <p className="text-xs text-dark/40">Documento</p>
                <p className="text-sm font-medium text-dark">{paciente.cpf}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FiPhone className="text-accent" size={16} />
              <div>
                <p className="text-xs text-dark/40">Telefone</p>
                <p className="text-sm font-medium text-dark">{paciente.telefone}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FiCalendar className="text-accent" size={16} />
              <div>
                <p className="text-xs text-dark/40">Nascimento</p>
                <p className="text-sm font-medium text-dark">{paciente.data_nascimento}</p>
              </div>
            </div>
            {paciente.historico_saude && (
              <div className="sm:col-span-2 flex items-start gap-2">
                <FiHeart className="text-accent mt-0.5" size={16} />
                <div>
                  <p className="text-xs text-dark/40">Histórico de Saúde</p>
                  <p className="text-sm text-dark">{paciente.historico_saude}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Em andamento */}
      {emAndamento.length > 0 && (
        <div>
          <h2 className="font-heading font-semibold text-dark mb-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            Em Andamento
          </h2>
          <div className="space-y-3">
            {emAndamento.map(a => (
              <div key={a.id} className="bg-white rounded-2xl p-5 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="font-heading font-medium text-dark">{a.nome_procedimento || 'Procedimento'}</p>
                  <p className="text-dark/40 text-xs mt-1">
                    Criada em: {a.created_at ? new Date(a.created_at).toLocaleString('pt-BR') : '—'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-full bg-yellow-50 text-yellow-600 text-xs font-medium">
                    🟡 Em andamento
                  </span>
                  <button
                    onClick={() => navigate(`/anamneses/${a.id}`)}
                    className="px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-dark transition-colors flex items-center gap-1.5"
                  >
                    <FiPlay size={14} />
                    Continuar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Finalizadas */}
      {finalizadas.length > 0 && (
        <div>
          <h2 className="font-heading font-semibold text-dark mb-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
            Finalizadas
          </h2>
          <div className="space-y-3">
            {finalizadas.map(a => (
              <div key={a.id} className="bg-white rounded-2xl p-5 shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="font-heading font-medium text-dark">{a.nome_procedimento || 'Procedimento'}</p>
                  <p className="text-dark/40 text-xs mt-1">
                    Finalizada em: {a.finalizada_at ? new Date(a.finalizada_at).toLocaleString('pt-BR') : '—'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-full bg-green-50 text-green-600 text-xs font-medium">
                    🟢 Finalizada
                  </span>
                  <button
                    onClick={() => navigate(`/anamneses/${a.id}`)}
                    className="px-4 py-2 rounded-xl bg-white border border-accent/30 text-accent text-sm font-medium hover:bg-accent/5 transition-colors flex items-center gap-1.5"
                  >
                    <FiEye size={14} />
                    Visualizar
                  </button>
                  <button
                    onClick={() => handleDownloadPdf(a.id)}
                    className="px-4 py-2 rounded-xl bg-white border border-accent/30 text-accent text-sm font-medium hover:bg-accent/5 transition-colors flex items-center gap-1.5"
                  >
                    <FiDownload size={14} />
                    PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {anamneses.length === 0 && (
        <div className="text-center py-12 bg-white rounded-3xl shadow-card">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary flex items-center justify-center mb-4">
            <FiFileText className="text-accent" size={28} />
          </div>
          <p className="text-dark/50 font-heading">Nenhuma anamnese registrada</p>
          <button
            onClick={() => navigate('/anamnese/nova')}
            className="mt-4 px-6 py-2.5 rounded-2xl bg-accent text-white text-sm font-medium hover:bg-accent-dark transition-colors"
          >
            Criar Nova Anamnese
          </button>
        </div>
      )}
    </div>
  );
}
