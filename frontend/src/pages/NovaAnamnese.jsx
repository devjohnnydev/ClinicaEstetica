import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPacientes, criarPaciente, getModelos, getModelo, criarAnamnese } from '../services/api';
import SignatureCanvas from '../components/SignatureCanvas';
import FacePaintModal from '../components/FacePaintModal';
import { FiUser, FiPlus, FiSearch, FiCheck, FiArrowRight, FiArrowLeft } from 'react-icons/fi';

const STEPS = [
  { num: 1, title: 'Paciente' },
  { num: 2, title: 'Procedimento' },
  { num: 3, title: 'Preenchimento' },
  { num: 4, title: 'Assinatura' },
];

export default function NovaAnamnese() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1: Patient
  const [mode, setMode] = useState('select'); // select or create
  const [pacientes, setPacientes] = useState([]);
  const [busca, setBusca] = useState('');
  const [selectedPaciente, setSelectedPaciente] = useState(null);
  const [newPaciente, setNewPaciente] = useState({
    nome: '', cpf: '', telefone: '', data_nascimento: '',
    genero: 'feminino', historico_saude: '', email: '',
  });

  // Step 2: Template
  const [modelos, setModelos] = useState([]);
  const [selectedModelo, setSelectedModelo] = useState(null);
  const [modeloCompleto, setModeloCompleto] = useState(null);

  // Step 3: Responses
  const [respostas, setRespostas] = useState({});
  const [faceImageEdited, setFaceImageEdited] = useState(null);
  const [faceEditorOpen, setFaceEditorOpen] = useState(false);

  // Step 4: Signature
  const [assinatura, setAssinatura] = useState(null);

  useEffect(() => {
    loadPacientes();
    getModelos().then(res => setModelos(res.data)).catch(console.error);
  }, []);

  const loadPacientes = async (search) => {
    try {
      const res = await getPacientes(search || undefined);
      setPacientes(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearchPaciente = (value) => {
    setBusca(value);
    clearTimeout(window._searchPacTimeout);
    window._searchPacTimeout = setTimeout(() => loadPacientes(value), 300);
  };

  const selectModelo = async (modelo) => {
    setSelectedModelo(modelo);
    try {
      const res = await getModelo(modelo.id);
      setModeloCompleto(res.data);
      setFaceImageEdited(null);
      // Initialize responses
      const initial = {};
      res.data.campos.forEach(c => {
        if (c.tipo === 'multipla_escolha' || c.tipo === 'checkbox') {
          initial[c.id] = [];
        } else {
          initial[c.id] = '';
        }
      });
      setRespostas(initial);
    } catch (err) {
      console.error(err);
    }
  };

  const updateResposta = (campoId, value) => {
    setRespostas({ ...respostas, [campoId]: value });
  };

  const toggleMultipleChoice = (campoId, option) => {
    const current = respostas[campoId] || [];
    if (current.includes(option)) {
      updateResposta(campoId, current.filter(o => o !== option));
    } else {
      updateResposta(campoId, [...current, option]);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        if (mode === 'select') return !!selectedPaciente;
        return newPaciente.nome && newPaciente.cpf && newPaciente.telefone && newPaciente.data_nascimento;
      case 2:
        return !!selectedModelo;
      case 3:
        if (!modeloCompleto) return false;
        return modeloCompleto.campos
          .filter(c => c.obrigatorio)
          .every(c => {
            const val = respostas[c.id];
            if (Array.isArray(val)) return val.length > 0;
            return val && val.toString().trim() !== '';
          });
      case 4:
        return !!assinatura;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (step === 1 && mode === 'create') {
      try {
        const res = await criarPaciente({
          ...newPaciente,
          historico_saude: newPaciente.historico_saude || null,
          email: newPaciente.email || null,
        });
        setSelectedPaciente(res.data);
        setMode('select');
      } catch (err) {
        alert(err.response?.data?.detail || 'Erro ao criar paciente');
        return;
      }
    }
    if (step < 4) {
      setStep(step + 1);
    } else {
      await handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload = {
        paciente_id: selectedPaciente.id,
        modelo_id: selectedModelo.id,
        respostas: Object.entries(respostas).map(([campoId, valor]) => ({
          campo_id: parseInt(campoId),
          valor: valor,
        })),
        assinatura_base64: assinatura,
        rosto_editado_base64: faceImageEdited || null,
      };
      const res = await criarAnamnese(payload);
      navigate(`/pacientes/${selectedPaciente.id}`);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || 'Erro ao salvar anamnese');
    } finally {
      setSaving(false);
    }
  };

  const renderField = (campo) => {
    const value = respostas[campo.id];

    switch (campo.tipo) {
      case 'input':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => updateResposta(campo.id, e.target.value)}
            placeholder={campo.placeholder || ''}
            className="w-full px-4 py-3 rounded-2xl border border-secondary/50 bg-soft/30 focus:bg-white focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all text-dark text-sm placeholder:text-dark/30"
          />
        );

      case 'texto':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => updateResposta(campo.id, e.target.value)}
            placeholder={campo.placeholder || ''}
            rows={3}
            className="w-full px-4 py-3 rounded-2xl border border-secondary/50 bg-soft/30 focus:bg-white focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all text-dark text-sm placeholder:text-dark/30 resize-none"
          />
        );

      case 'escolha_unica':
        return (
          <div className="space-y-2">
            {(campo.opcoes || []).map((opt, i) => (
              <label key={i} className="flex items-center gap-3 p-3 rounded-xl border border-secondary/30 hover:border-accent/30 cursor-pointer transition-all">
                <input
                  type="radio"
                  name={`campo_${campo.id}`}
                  value={opt}
                  checked={value === opt}
                  onChange={() => updateResposta(campo.id, opt)}
                  className="w-4 h-4 text-accent border-secondary focus:ring-accent/20"
                />
                <span className="text-sm text-dark">{opt}</span>
              </label>
            ))}
          </div>
        );

      case 'multipla_escolha':
        return (
          <div className="space-y-2">
            {(campo.opcoes || []).map((opt, i) => (
              <label key={i} className="flex items-center gap-3 p-3 rounded-xl border border-secondary/30 hover:border-accent/30 cursor-pointer transition-all">
                <input
                  type="checkbox"
                  checked={(value || []).includes(opt)}
                  onChange={() => toggleMultipleChoice(campo.id, opt)}
                  className="w-4 h-4 rounded text-accent border-secondary focus:ring-accent/20"
                />
                <span className="text-sm text-dark">{opt}</span>
              </label>
            ))}
          </div>
        );

      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => updateResposta(campo.id, e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-secondary/50 bg-soft/30 focus:bg-white focus:border-accent focus:outline-none text-dark text-sm"
          >
            <option value="">Selecione...</option>
            {(campo.opcoes || []).map((opt, i) => (
              <option key={i} value={opt}>{opt}</option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={value === true || value === 'true'}
              onChange={(e) => updateResposta(campo.id, e.target.checked)}
              className="w-5 h-5 rounded text-accent border-secondary focus:ring-accent/20"
            />
            <span className="text-sm text-dark">Sim</span>
          </label>
        );

      case 'data':
        return (
          <input
            type="date"
            value={value || ''}
            onChange={(e) => updateResposta(campo.id, e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-secondary/50 bg-soft/30 focus:bg-white focus:border-accent focus:outline-none text-dark text-sm"
          />
        );

      case 'upload_imagem':
        return (
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (ev) => updateResposta(campo.id, ev.target.result);
                  reader.readAsDataURL(file);
                }
              }}
              className="w-full text-sm text-dark/60 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-accent/10 file:text-accent hover:file:bg-accent/20 transition-all"
            />
            {value && typeof value === 'string' && value.startsWith('data:') && (
              <img src={value} alt="Preview" className="mt-2 max-h-32 rounded-xl" />
            )}
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => updateResposta(campo.id, e.target.value)}
            className="w-full px-4 py-3 rounded-2xl border border-secondary/50 bg-soft/30 focus:bg-white focus:border-accent focus:outline-none text-dark text-sm"
          />
        );
    }
  };

  const resolveFaceModelImage = () => {
    if (!modeloCompleto?.rosto_modelo_tipo) return null;
    if (modeloCompleto.rosto_modelo_tipo === 'positionsfem') {
      return '/anamnese-modelos/positionsfem.png';
    }
    const genero = (selectedPaciente?.genero || newPaciente.genero || '').toLowerCase();
    return genero === 'masculino'
      ? '/anamnese-modelos/rostomasc.png'
      : '/anamnese-modelos/rostofem.png';
  };

  const activeFaceImage = faceImageEdited || resolveFaceModelImage();

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-white shadow-card flex items-center justify-center text-dark/50 hover:text-accent transition-colors">
          <FiArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-display text-2xl font-semibold text-dark">Nova Anamnese</h1>
          <p className="text-dark/50 text-sm mt-0.5">Preencha a ficha do procedimento</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="bg-white rounded-3xl p-4 shadow-card">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => (
            <div key={s.num} className="flex items-center flex-1">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  step >= s.num
                    ? 'bg-gradient-to-r from-accent to-accent-dark text-white'
                    : 'bg-soft text-dark/30'
                }`}>
                  {step > s.num ? <FiCheck size={16} /> : s.num}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${
                  step >= s.num ? 'text-accent' : 'text-dark/30'
                }`}>
                  {s.title}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-3 rounded ${
                  step > s.num ? 'bg-accent' : 'bg-soft'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="bg-white rounded-3xl p-6 shadow-card animate-fadeIn" key={step}>
        {/* STEP 1: Select/Create Patient */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="font-heading font-semibold text-dark text-lg">Paciente</h2>

            {/* Mode toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setMode('select')}
                className={`flex-1 py-3 rounded-2xl text-sm font-medium transition-all ${
                  mode === 'select'
                    ? 'bg-accent text-white'
                    : 'bg-soft text-dark/50 hover:bg-primary'
                }`}
              >
                Selecionar Existente
              </button>
              <button
                onClick={() => setMode('create')}
                className={`flex-1 py-3 rounded-2xl text-sm font-medium transition-all ${
                  mode === 'create'
                    ? 'bg-accent text-white'
                    : 'bg-soft text-dark/50 hover:bg-primary'
                }`}
              >
                <FiPlus className="inline mr-1" size={14} />
                Novo Paciente
              </button>
            </div>

            {mode === 'select' ? (
              <div className="space-y-3">
                <div className="relative">
                  <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-accent" size={16} />
                  <input
                    type="text"
                    value={busca}
                    onChange={(e) => handleSearchPaciente(e.target.value)}
                    placeholder="Buscar paciente..."
                    className="w-full pl-10 pr-4 py-3 rounded-2xl border border-secondary/50 bg-soft/30 focus:bg-white focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all text-dark text-sm placeholder:text-dark/30"
                  />
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {pacientes.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPaciente(p)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 ${
                        selectedPaciente?.id === p.id
                          ? 'border-accent bg-accent/5'
                          : 'border-secondary/30 hover:border-accent/30'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent/20 to-secondary/30 flex items-center justify-center">
                        <span className="text-accent font-bold text-sm">{p.nome?.charAt(0)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-dark text-sm truncate">{p.nome}</p>
                        <p className="text-dark/40 text-xs">CPF: {p.cpf}</p>
                      </div>
                      {selectedPaciente?.id === p.id && (
                        <FiCheck className="text-accent" size={18} />
                      )}
                    </button>
                  ))}
                  {pacientes.length === 0 && (
                    <p className="text-center text-dark/40 text-sm py-4">Nenhum paciente encontrado</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-dark/60 mb-1">Nome completo *</label>
                  <input
                    type="text"
                    value={newPaciente.nome}
                    onChange={(e) => setNewPaciente({ ...newPaciente, nome: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl border border-secondary/50 bg-soft/30 focus:bg-white focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all text-dark text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark/60 mb-1">Gênero *</label>
                  <select
                    value={newPaciente.genero}
                    onChange={(e) => setNewPaciente({ ...newPaciente, genero: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl border border-secondary/50 bg-soft/30 focus:bg-white focus:border-accent focus:outline-none text-dark text-sm"
                  >
                    <option value="feminino">Feminino</option>
                    <option value="masculino">Masculino</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark/60 mb-1">CPF *</label>
                  <input
                    type="text"
                    value={newPaciente.cpf}
                    onChange={(e) => setNewPaciente({ ...newPaciente, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                    className="w-full px-4 py-3 rounded-2xl border border-secondary/50 bg-soft/30 focus:bg-white focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all text-dark text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark/60 mb-1">Telefone *</label>
                  <input
                    type="text"
                    value={newPaciente.telefone}
                    onChange={(e) => setNewPaciente({ ...newPaciente, telefone: e.target.value })}
                    placeholder="(00) 00000-0000"
                    className="w-full px-4 py-3 rounded-2xl border border-secondary/50 bg-soft/30 focus:bg-white focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all text-dark text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark/60 mb-1">Data de Nascimento *</label>
                  <input
                    type="date"
                    value={newPaciente.data_nascimento}
                    onChange={(e) => setNewPaciente({ ...newPaciente, data_nascimento: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl border border-secondary/50 bg-soft/30 focus:bg-white focus:border-accent focus:outline-none text-dark text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark/60 mb-1">Email</label>
                  <input
                    type="email"
                    value={newPaciente.email}
                    onChange={(e) => setNewPaciente({ ...newPaciente, email: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl border border-secondary/50 bg-soft/30 focus:bg-white focus:border-accent focus:outline-none text-dark text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-dark/60 mb-1">Histórico de Saúde</label>
                  <textarea
                    value={newPaciente.historico_saude}
                    onChange={(e) => setNewPaciente({ ...newPaciente, historico_saude: e.target.value })}
                    placeholder="Alergias, medicamentos em uso, doenças crônicas..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-2xl border border-secondary/50 bg-soft/30 focus:bg-white focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all text-dark text-sm resize-none"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Select Template */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="font-heading font-semibold text-dark text-lg">Selecione o Procedimento</h2>
            {modelos.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-dark/50">Nenhum modelo criado</p>
                <button
                  onClick={() => navigate('/modelos/novo')}
                  className="mt-3 px-5 py-2 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-dark"
                >
                  Criar Modelo
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {modelos.map(m => (
                  <button
                    key={m.id}
                    onClick={() => selectModelo(m)}
                    className={`text-left p-4 rounded-2xl border transition-all ${
                      selectedModelo?.id === m.id
                        ? 'border-accent bg-accent/5 shadow-sm'
                        : 'border-secondary/30 hover:border-accent/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-heading font-medium text-dark">{m.nome_procedimento}</p>
                      {selectedModelo?.id === m.id && <FiCheck className="text-accent" size={18} />}
                    </div>
                    {m.descricao && <p className="text-dark/40 text-xs mt-1">{m.descricao}</p>}
                    <p className="text-dark/30 text-xs mt-2">{m.total_campos} campo(s)</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Fill Form */}
        {step === 3 && modeloCompleto && (
          <div className="space-y-5">
            <h2 className="font-heading font-semibold text-dark text-lg">
              Preenchimento — {modeloCompleto.nome_procedimento}
            </h2>
            <div className="space-y-5">
              {modeloCompleto.rosto_modelo_tipo && activeFaceImage && (
                <div>
                  <label className="block text-sm font-medium text-dark/70 mb-2">
                    Mapa Facial (toque para editar)
                  </label>
                  <button
                    type="button"
                    onClick={() => setFaceEditorOpen(true)}
                    className="w-full rounded-2xl border border-secondary/40 bg-soft/20 p-3 hover:border-accent/50 transition-all"
                  >
                    <img
                      src={activeFaceImage}
                      alt="Mapa facial"
                      className="mx-auto max-h-[420px] w-auto object-contain rounded-xl"
                    />
                  </button>
                  <p className="text-xs text-dark/40 mt-2">
                    Clique para abrir em tela cheia e desenhar com mouse, touch ou caneta.
                  </p>
                </div>
              )}
              {modeloCompleto.campos.map(campo => (
                <div key={campo.id}>
                  <label className="block text-sm font-medium text-dark/70 mb-2">
                    {campo.label}
                    {campo.obrigatorio && <span className="text-red-400 ml-1">*</span>}
                  </label>
                  {renderField(campo)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4: Signature */}
        {step === 4 && (
          <div className="space-y-5">
            <h2 className="font-heading font-semibold text-dark text-lg">Assinatura do Paciente</h2>
            <p className="text-dark/50 text-sm">
              O paciente deve assinar abaixo confirmando as informações preenchidas.
            </p>
            <SignatureCanvas
              label="Assinatura — Use mouse, touch ou caneta digital"
              onSave={setAssinatura}
            />
          </div>
        )}
      </div>

      <FacePaintModal
        open={faceEditorOpen}
        baseImageSrc={resolveFaceModelImage()}
        initialImage={faceImageEdited}
        onClose={() => setFaceEditorOpen(false)}
        onSave={setFaceImageEdited}
      />

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => step > 1 && setStep(step - 1)}
          disabled={step === 1}
          className="px-5 py-3 rounded-2xl bg-white shadow-card text-dark/60 font-heading font-medium text-sm hover:text-dark hover:shadow-hover transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <FiArrowLeft size={16} />
          Voltar
        </button>

        <button
          onClick={handleNext}
          disabled={!canProceed() || saving}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-accent to-accent-dark text-white font-heading font-semibold text-sm flex items-center gap-2 hover:shadow-lg hover:shadow-accent/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : step === 4 ? (
            <>
              Salvar Anamnese
              <FiCheck size={16} />
            </>
          ) : (
            <>
              Próximo
              <FiArrowRight size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
