import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAnamnese, finalizarAnamnese, salvarProgresso, uploadAnexo, deletarAnexo, downloadPdf, UPLOAD_URL } from '../services/api';
import SignatureCanvas from '../components/SignatureCanvas';
import { FiArrowLeft, FiEye, FiDownload, FiTrash2, FiUpload, FiCheckCircle, FiImage, FiEdit3, FiX, FiCamera, FiSave } from 'react-icons/fi';

export default function VisualizarAnamnese() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [anamnese, setAnamnese] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFinalize, setShowFinalize] = useState(false);

  // Finalization
  const [observacoes, setObservacoes] = useState('');
  const [assinaturaFinal, setAssinaturaFinal] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAnamnese();
  }, [id]);

  const loadAnamnese = async () => {
    setLoading(true);
    try {
      const res = await getAnamnese(id);
      setAnamnese(res.data);
      // Pre-populate observations if they exist
      if (res.data.observacoes) {
        setObservacoes(res.data.observacoes);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadFoto = async (tipo) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('arquivo', file);
        formData.append('tipo', tipo);
        formData.append('descricao', '');
        await uploadAnexo(id, formData);
        await loadAnamnese();
      } catch (err) {
        console.error(err);
        alert('Erro ao enviar foto');
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  const handleCaptureFoto = async (tipo) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.setAttribute('capture', 'environment');
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('arquivo', file);
        formData.append('tipo', tipo);
        formData.append('descricao', '');
        await uploadAnexo(id, formData);
        await loadAnamnese();
      } catch (err) {
        console.error(err);
        alert('Erro ao capturar foto');
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  const handleDeleteAnexo = async (anexoId) => {
    if (!confirm('Remover este anexo?')) return;
    try {
      await deletarAnexo(id, anexoId);
      await loadAnamnese();
    } catch (err) {
      console.error(err);
    }
  };

  const handleFinalizar = async () => {
    if (!assinaturaFinal) {
      alert('É necessária a assinatura final do paciente');
      return;
    }
    setSaving(true);
    try {
      await finalizarAnamnese(id, {
        observacoes: observacoes || null,
        assinatura_final_base64: assinaturaFinal,
      });
      if (anamnese?.paciente_id) {
        navigate(`/pacientes/${anamnese.paciente_id}`);
      } else {
        navigate('/pacientes');
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Erro ao finalizar');
    } finally {
      setSaving(false);
    }
  };

  const handleSalvarProgresso = async () => {
    setSaving(true);
    try {
      const payload = {
        observacoes: observacoes || null,
      };
      if (assinaturaFinal) {
        payload.assinatura_final_base64 = assinaturaFinal;
      }
      await salvarProgresso(id, payload);
      await loadAnamnese();
      alert('Progresso salvo com sucesso!');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Erro ao salvar progresso');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const res = await downloadPdf(id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `anamnese_${id}.pdf`);
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

  if (!anamnese) {
    return <div className="text-center py-20 text-dark/50">Anamnese não encontrada</div>;
  }

  const isFinalizada = anamnese.status === 'finalizada';
  const assinaturaInicial = anamnese.assinaturas?.find(a => a.tipo === 'inicial');
  const assinaturaFinalExistente = anamnese.assinaturas?.find(a => a.tipo === 'final');

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(anamnese.paciente_id ? `/pacientes/${anamnese.paciente_id}` : '/pacientes')} className="w-10 h-10 rounded-xl bg-white shadow-card flex items-center justify-center text-dark/50 hover:text-accent transition-colors">
            <FiArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-display text-2xl font-semibold text-dark">
              {showFinalize ? 'Finalizar Anamnese' : 'Visualizar Anamnese'}
            </h1>
            <p className="text-dark/50 text-sm mt-0.5">
              {anamnese.nome_procedimento} — {anamnese.paciente_nome}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${
            isFinalizada
              ? 'bg-green-50 text-green-600'
              : 'bg-yellow-50 text-yellow-600'
          }`}>
            {isFinalizada ? '🟢 Finalizada' : '🟡 Em andamento'}
          </span>
          {isFinalizada && (
            <button onClick={handleDownloadPdf} className="px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-dark transition-colors flex items-center gap-1.5">
              <FiDownload size={14} />
              Baixar PDF
            </button>
          )}
        </div>
      </div>

      {/* Patient info */}
      <div className="bg-white rounded-3xl p-5 shadow-card">
        <h3 className="font-heading font-semibold text-dark mb-3">Dados do Paciente</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div><span className="text-dark/40">Nome:</span> <span className="font-medium text-dark">{anamnese.paciente_nome}</span></div>
          <div><span className="text-dark/40">Procedimento:</span> <span className="font-medium text-dark">{anamnese.nome_procedimento}</span></div>
          <div><span className="text-dark/40">Criada:</span> <span className="text-dark">{anamnese.created_at ? new Date(anamnese.created_at).toLocaleString('pt-BR') : '—'}</span></div>
          {anamnese.finalizada_at && (
            <div><span className="text-dark/40">Finalizada:</span> <span className="text-dark">{new Date(anamnese.finalizada_at).toLocaleString('pt-BR')}</span></div>
          )}
        </div>
      </div>

      {/* Responses */}
      <div className="bg-white rounded-3xl p-5 shadow-card">
        <h3 className="font-heading font-semibold text-dark mb-4">Respostas da Anamnese</h3>
        <div className="space-y-4">
          {anamnese.respostas?.map(r => (
            <div key={r.id} className="p-3 rounded-2xl bg-soft/50">
              <p className="text-xs text-dark/40 font-medium mb-1">{r.campo_label}</p>
              <p className="text-sm text-dark">
                {Array.isArray(r.valor)
                  ? r.valor.join(', ')
                  : r.valor === true || r.valor === 'true'
                    ? 'Sim'
                    : r.valor === false || r.valor === 'false'
                      ? 'Não'
                      : r.valor?.toString().startsWith('data:')
                        ? <img src={r.valor} alt="Upload" className="max-h-32 rounded-xl mt-1" />
                        : r.valor || '—'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Initial signature */}
      {assinaturaInicial && (
        <div className="bg-white rounded-3xl p-5 shadow-card">
          <h3 className="font-heading font-semibold text-dark mb-3">Assinatura Inicial</h3>
          <img src={`${UPLOAD_URL}/${assinaturaInicial.imagem_path}`} alt="Assinatura inicial" className="max-h-32 border rounded-xl" />
          <p className="text-dark/30 text-xs mt-2">
            Assinada em: {assinaturaInicial.created_at ? new Date(assinaturaInicial.created_at).toLocaleString('pt-BR') : '—'}
          </p>
        </div>
      )}

      {/* Observations (if finalized) */}
      {isFinalizada && anamnese.observacoes && (
        <div className="bg-white rounded-3xl p-5 shadow-card">
          <h3 className="font-heading font-semibold text-dark mb-3">Observações do Procedimento</h3>
          <p className="text-dark text-sm whitespace-pre-wrap">{anamnese.observacoes}</p>
        </div>
      )}

      {/* Attachments (if finalized) */}
      {isFinalizada && anamnese.anexos?.length > 0 && (
        <div className="bg-white rounded-3xl p-5 shadow-card">
          <h3 className="font-heading font-semibold text-dark mb-3">Fotos Anexadas</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {anamnese.anexos.map(a => (
              <div key={a.id} className="rounded-2xl overflow-hidden border border-secondary/30">
                <img src={`${UPLOAD_URL}/${a.arquivo_path}`} alt={a.descricao || a.tipo} className="w-full h-48 object-cover" />
                <div className="p-3">
                  <span className="px-2 py-0.5 rounded-lg bg-accent/10 text-accent text-xs font-medium">
                    {a.tipo === 'bancada' ? 'Bancada' : 'Antes/Depois'}
                  </span>
                  {a.descricao && <p className="text-dark/50 text-xs mt-1">{a.descricao}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Final signature (if finalized) */}
      {assinaturaFinalExistente && (
        <div className="bg-white rounded-3xl p-5 shadow-card">
          <h3 className="font-heading font-semibold text-dark mb-3">Assinatura Final — Confirmação</h3>
          <p className="text-dark/50 text-sm mb-3">O paciente confirmou que o procedimento foi realizado corretamente.</p>
          <img src={`${UPLOAD_URL}/${assinaturaFinalExistente.imagem_path}`} alt="Assinatura final" className="max-h-32 border rounded-xl" />
          <p className="text-dark/30 text-xs mt-2">
            Assinada em: {assinaturaFinalExistente.created_at ? new Date(assinaturaFinalExistente.created_at).toLocaleString('pt-BR') : '—'}
          </p>
        </div>
      )}

      {/* FINALIZATION SECTION — Only for "em_andamento" */}
      {!isFinalizada && !showFinalize && (
        <div className="flex justify-center gap-4 pt-4">
          <button
            onClick={() => navigate(anamnese.paciente_id ? `/pacientes/${anamnese.paciente_id}` : '/pacientes')}
            className="px-6 py-3 rounded-2xl bg-white shadow-card text-dark/60 font-heading font-medium text-sm hover:shadow-hover transition-all flex items-center gap-2"
          >
            <FiX size={16} />
            Fechar
          </button>
          <button
            onClick={() => setShowFinalize(true)}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-accent to-accent-dark text-white font-heading font-semibold text-sm flex items-center gap-2 hover:shadow-lg hover:shadow-accent/25 transition-all active:scale-[0.98]"
          >
            Prosseguir para Finalização
            <FiCheckCircle size={16} />
          </button>
        </div>
      )}

      {/* FINALIZATION FORM */}
      {!isFinalizada && showFinalize && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-gradient-to-r from-accent/10 to-secondary/20 rounded-3xl p-5">
            <h2 className="font-display text-xl font-semibold text-dark">Finalização do Procedimento</h2>
            <p className="text-dark/50 text-sm mt-1">Etapa final — Observações, fotos e assinatura de confirmação</p>
          </div>

          {/* Observations */}
          <div className="bg-white rounded-3xl p-5 shadow-card">
            <h3 className="font-heading font-semibold text-dark mb-3 flex items-center gap-2">
              <FiEdit3 className="text-accent" size={18} />
              Observações do Procedimento
            </h3>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Descreva como foi o procedimento, anotações importantes..."
              rows={4}
              className="w-full px-4 py-3 rounded-2xl border border-secondary/50 bg-soft/30 focus:bg-white focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all text-dark text-sm placeholder:text-dark/30 resize-none"
            />
          </div>

          {/* ─── FOTO DA BANCADA ─── */}
          <div className="bg-white rounded-3xl p-5 shadow-card">
            <h3 className="font-heading font-semibold text-dark mb-2 flex items-center gap-2">
              <FiImage className="text-accent" size={18} />
              Foto da Bancada
            </h3>
            <p className="text-dark/40 text-xs mb-4">Registre a bancada preparada para o procedimento</p>

            <div className="flex gap-3 mb-4">
              <button
                onClick={() => handleUploadFoto('bancada')}
                disabled={uploading}
                className="flex-1 p-4 rounded-2xl border-2 border-dashed border-secondary/50 hover:border-accent/50 text-center transition-all hover:bg-accent/5"
              >
                <FiUpload className="mx-auto text-accent/50 mb-1.5" size={20} />
                <p className="text-xs font-medium text-dark/60">Enviar Foto</p>
              </button>

              <button
                onClick={() => handleCaptureFoto('bancada')}
                disabled={uploading}
                className="flex-1 p-4 rounded-2xl border-2 border-dashed border-accent/30 hover:border-accent/50 text-center transition-all hover:bg-accent/5 bg-accent/5"
              >
                <FiCamera className="mx-auto text-accent mb-1.5" size={20} />
                <p className="text-xs font-medium text-dark/60">Tirar Foto</p>
              </button>
            </div>

            {/* Bancada photos */}
            {anamnese.anexos?.filter(a => a.tipo === 'bancada').length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {anamnese.anexos.filter(a => a.tipo === 'bancada').map(a => (
                  <div key={a.id} className="relative rounded-xl overflow-hidden group">
                    <img src={`${UPLOAD_URL}/${a.arquivo_path}`} alt="Bancada" className="w-full h-28 object-cover" />
                    <button
                      onClick={() => handleDeleteAnexo(a.id)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <FiTrash2 size={12} />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1">
                      <span className="text-white text-xs">Bancada</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ─── ANTES / DEPOIS ─── */}
          <div className="bg-white rounded-3xl p-5 shadow-card">
            <h3 className="font-heading font-semibold text-dark mb-2 flex items-center gap-2">
              <FiEye className="text-accent" size={18} />
              Fotos Antes / Depois
            </h3>
            <p className="text-dark/40 text-xs mb-4">Registre o resultado visual do procedimento</p>

            <div className="flex gap-3 mb-4">
              <button
                onClick={() => handleUploadFoto('antes_depois')}
                disabled={uploading}
                className="flex-1 p-4 rounded-2xl border-2 border-dashed border-secondary/50 hover:border-accent/50 text-center transition-all hover:bg-accent/5"
              >
                <FiUpload className="mx-auto text-accent/50 mb-1.5" size={20} />
                <p className="text-xs font-medium text-dark/60">Enviar Foto</p>
              </button>

              <button
                onClick={() => handleCaptureFoto('antes_depois')}
                disabled={uploading}
                className="flex-1 p-4 rounded-2xl border-2 border-dashed border-accent/30 hover:border-accent/50 text-center transition-all hover:bg-accent/5 bg-accent/5"
              >
                <FiCamera className="mx-auto text-accent mb-1.5" size={20} />
                <p className="text-xs font-medium text-dark/60">Tirar Foto</p>
              </button>
            </div>

            {/* Antes/Depois photos */}
            {anamnese.anexos?.filter(a => a.tipo === 'antes_depois').length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {anamnese.anexos.filter(a => a.tipo === 'antes_depois').map(a => (
                  <div key={a.id} className="relative rounded-xl overflow-hidden group">
                    <img src={`${UPLOAD_URL}/${a.arquivo_path}`} alt="Antes/Depois" className="w-full h-28 object-cover" />
                    <button
                      onClick={() => handleDeleteAnexo(a.id)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <FiTrash2 size={12} />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1">
                      <span className="text-white text-xs">Antes/Depois</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {uploading && (
            <div className="flex items-center justify-center py-4">
              <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin mr-2" />
              <span className="text-sm text-dark/50">Enviando...</span>
            </div>
          )}

          {/* Final signature */}
          <div className="bg-white rounded-3xl p-5 shadow-card">
            <h3 className="font-heading font-semibold text-dark mb-2">Assinatura Final do Paciente</h3>
            <p className="text-dark/50 text-sm mb-4">
              O paciente confirma que o procedimento foi realizado corretamente e está de acordo com tudo que foi descrito.
            </p>
            <SignatureCanvas
              label="Assinatura de Confirmação"
              onSave={setAssinaturaFinal}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-2">
            <button
              onClick={() => setShowFinalize(false)}
              className="px-5 py-3 rounded-2xl bg-white shadow-card text-dark/60 font-heading font-medium text-sm hover:text-dark hover:shadow-hover transition-all flex items-center gap-2"
            >
              <FiArrowLeft size={16} />
              Voltar
            </button>
            <div className="flex gap-3">
              <button
                onClick={handleSalvarProgresso}
                disabled={saving}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-accent to-accent-dark text-white font-heading font-semibold text-sm flex items-center gap-2 hover:shadow-lg hover:shadow-accent/25 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <FiSave size={16} />
                    Salvar Progresso
                  </>
                )}
              </button>
              <button
                onClick={handleFinalizar}
                disabled={!assinaturaFinal || saving}
                className="px-8 py-3 rounded-2xl bg-gradient-to-r from-green-500 to-green-600 text-white font-heading font-semibold text-sm flex items-center gap-2 hover:shadow-lg hover:shadow-green-500/25 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <FiCheckCircle size={16} />
                    Finalizar Anamnese
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
