import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPaciente, getAnamneses, downloadPdf } from '../services/api';
import api from '../services/api';
import { FiArrowLeft, FiUser, FiPhone, FiCalendar, FiHeart, FiEye, FiDownload, FiPlay, FiFileText, FiEdit2, FiSave, FiX, FiMail, FiMapPin } from 'react-icons/fi';

export default function PastaPaciente() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [paciente, setPaciente] = useState(null);
  const [anamneses, setAnamneses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

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

  const startEdit = () => {
    setEditForm({
      nome: paciente.nome || '',
      telefone: paciente.telefone || '',
      genero: paciente.genero || 'feminino',
      data_nascimento: paciente.data_nascimento || '',
      email: paciente.email || '',
      endereco: paciente.endereco || '',
      historico_saude: paciente.historico_saude || '',
    });
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setEditForm({});
  };

  const saveEdit = async () => {
    setSavingEdit(true);
    try {
      const payload = {};
      if (editForm.nome !== paciente.nome) payload.nome = editForm.nome;
      if (editForm.telefone !== paciente.telefone) payload.telefone = editForm.telefone;
      if (editForm.genero !== paciente.genero) payload.genero = editForm.genero;
      if (editForm.email !== (paciente.email || '')) payload.email = editForm.email || null;
      if (editForm.endereco !== (paciente.endereco || '')) payload.endereco = editForm.endereco || null;
      if (editForm.historico_saude !== (paciente.historico_saude || '')) payload.historico_saude = editForm.historico_saude || null;

      if (Object.keys(payload).length > 0) {
        const res = await api.put(`/api/pacientes/${id}`, payload);
        setPaciente(res.data);
      }
      setEditMode(false);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Erro ao salvar alterações');
    }
    setSavingEdit(false);
  };

  if (loading && !paciente) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="bg-white rounded-3xl p-6 shadow-card h-[200px]">
          <div className="h-6 w-32 bg-dark/10 rounded-lg mb-6"></div>
          <div className="flex gap-6">
            <div className="h-24 w-24 bg-dark/5 rounded-3xl shrink-0"></div>
            <div className="flex-1 space-y-3">
              <div className="h-8 w-1/2 bg-dark/10 rounded-lg"></div>
              <div className="h-4 w-1/4 bg-dark/5 rounded-lg"></div>
              <div className="h-4 w-1/3 bg-dark/5 rounded-lg"></div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-3xl shadow-card h-[300px]"></div>
      </div>
    );
  }

  if (!paciente) {
    return <div className="text-center py-20 text-dark/50">Paciente não encontrado</div>;
  }

  const emAndamento = anamneses.filter(a => a.status === 'em_andamento');
  const finalizadas = anamneses.filter(a => a.status === 'finalizada');

  const inputClass = "w-full px-3 py-2.5 rounded-xl border border-secondary/50 bg-soft/30 focus:bg-white focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all text-dark text-sm";

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/pacientes')} className="w-10 h-10 rounded-xl bg-white shadow-card flex items-center justify-center text-dark/50 hover:text-accent transition-colors">
          <FiArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-semibold text-dark">Pasta do Paciente</h1>
          <p className="text-dark/50 text-sm mt-0.5">{paciente.nome}</p>
        </div>
      </div>

      {/* Patient info card — View / Edit mode */}
      <div className="bg-white rounded-3xl p-6 shadow-card">
        {!editMode ? (
          <>
            {/* VIEW MODE */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-secondary flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-display text-2xl font-bold">{paciente.nome?.charAt(0)}</span>
                </div>
                <div>
                  <h2 className="font-heading font-semibold text-dark text-lg">{paciente.nome}</h2>
                  <p className="text-dark/40 text-xs">CPF: {paciente.cpf}</p>
                </div>
              </div>
              <button
                onClick={startEdit}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent/10 text-accent text-xs font-medium hover:bg-accent/20 transition-all"
              >
                <FiEdit2 size={13} />
                Editar
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <div className="flex items-center gap-2">
                <FiUser className="text-accent" size={16} />
                <div>
                  <p className="text-xs text-dark/40">Gênero</p>
                  <p className="text-sm font-medium text-dark capitalize">{paciente.genero}</p>
                </div>
              </div>
              {paciente.email && (
                <div className="flex items-center gap-2">
                  <FiMail className="text-accent" size={16} />
                  <div>
                    <p className="text-xs text-dark/40">E-mail</p>
                    <p className="text-sm font-medium text-dark">{paciente.email}</p>
                  </div>
                </div>
              )}
              {paciente.endereco && (
                <div className="flex items-center gap-2 sm:col-span-2">
                  <FiMapPin className="text-accent" size={16} />
                  <div>
                    <p className="text-xs text-dark/40">Endereço</p>
                    <p className="text-sm text-dark">{paciente.endereco}</p>
                  </div>
                </div>
              )}
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
          </>
        ) : (
          <>
            {/* EDIT MODE */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-heading font-semibold text-dark flex items-center gap-2">
                <FiEdit2 size={16} className="text-accent" />
                Editar Informações
              </h3>
              <div className="flex gap-2">
                <button onClick={cancelEdit} className="flex items-center gap-1 px-3 py-2 rounded-xl border border-secondary/50 text-dark/50 text-xs font-medium hover:bg-soft transition">
                  <FiX size={13} /> Cancelar
                </button>
                <button
                  onClick={saveEdit}
                  disabled={savingEdit || !editForm.nome?.trim() || !editForm.telefone?.trim()}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl bg-gradient-to-r from-accent to-accent-dark text-white text-xs font-medium hover:shadow-lg transition disabled:opacity-50"
                >
                  <FiSave size={13} />
                  {savingEdit ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-dark/50 mb-1">Nome completo</label>
                <input type="text" value={editForm.nome} onChange={e => setEditForm({ ...editForm, nome: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-dark/50 mb-1">CPF</label>
                <input type="text" value={paciente.cpf} disabled className={`${inputClass} opacity-50 cursor-not-allowed`} />
                <p className="text-[10px] text-dark/30 mt-0.5">CPF não pode ser alterado</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-dark/50 mb-1">Telefone</label>
                <input type="text" value={editForm.telefone} onChange={e => setEditForm({ ...editForm, telefone: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-dark/50 mb-1">Gênero</label>
                <select value={editForm.genero} onChange={e => setEditForm({ ...editForm, genero: e.target.value })} className={inputClass}>
                  <option value="feminino">Feminino</option>
                  <option value="masculino">Masculino</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-dark/50 mb-1">Data de Nascimento</label>
                <input type="text" value={paciente.data_nascimento} disabled className={`${inputClass} opacity-50 cursor-not-allowed`} />
                <p className="text-[10px] text-dark/30 mt-0.5">Data de nascimento não pode ser alterada</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-dark/50 mb-1">E-mail</label>
                <input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className={inputClass} placeholder="email@exemplo.com" />
              </div>
              <div>
                <label className="block text-xs font-medium text-dark/50 mb-1">Endereço</label>
                <input type="text" value={editForm.endereco} onChange={e => setEditForm({ ...editForm, endereco: e.target.value })} className={inputClass} placeholder="Endereço completo" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-dark/50 mb-1">Histórico de Saúde</label>
                <textarea
                  value={editForm.historico_saude}
                  onChange={e => setEditForm({ ...editForm, historico_saude: e.target.value })}
                  rows={3}
                  className={`${inputClass} resize-none`}
                  placeholder="Alergias, medicamentos em uso, doenças crônicas..."
                />
              </div>
            </div>
          </>
        )}
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
