import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { criarModelo, getModelo, atualizarModelo } from '../services/api';
import { FiArrowLeft, FiPlus, FiTrash2, FiMoreVertical, FiSave, FiType, FiAlignLeft, FiList, FiCheckSquare, FiChevronDown, FiCalendar, FiImage, FiTarget } from 'react-icons/fi';

const FIELD_TYPES = [
  { value: 'input', label: 'Texto Curto', icon: FiType, description: 'Resposta curta de uma linha' },
  { value: 'texto', label: 'Texto Longo', icon: FiAlignLeft, description: 'Resposta dissertativa' },
  { value: 'multipla_escolha', label: 'Múltipla Escolha', icon: FiCheckSquare, description: 'Selecionar várias opções' },
  { value: 'escolha_unica', label: 'Escolha Única', icon: FiTarget, description: 'Selecionar uma opção (radio)' },
  { value: 'select', label: 'Select (Dropdown)', icon: FiChevronDown, description: 'Selecionar de uma lista' },
  { value: 'checkbox', label: 'Checkbox', icon: FiCheckSquare, description: 'Sim ou Não' },
  { value: 'data', label: 'Data', icon: FiCalendar, description: 'Campo de data' },
  { value: 'upload_imagem', label: 'Upload de Imagem', icon: FiImage, description: 'Enviar imagem' },
];

const emptyField = () => ({
  _id: Date.now() + Math.random(),
  tipo: 'input',
  label: '',
  placeholder: '',
  opcoes: [],
  obrigatorio: false,
});

export default function BuilderModelo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [nomeProcedimento, setNomeProcedimento] = useState('');
  const [descricao, setDescricao] = useState('');
  const [rostoModeloTipo, setRostoModeloTipo] = useState('');
  const [campos, setCampos] = useState([emptyField()]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);

  useEffect(() => {
    if (isEditing) {
      setLoading(true);
      getModelo(id)
        .then(res => {
          const m = res.data;
          setNomeProcedimento(m.nome_procedimento);
          setDescricao(m.descricao || '');
          setRostoModeloTipo(m.rosto_modelo_tipo || '');
          setCampos(m.campos.map(c => ({ ...c, _id: c.id || Date.now() + Math.random() })));
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [id]);

  const addField = () => {
    setCampos([...campos, emptyField()]);
  };

  const removeField = (index) => {
    if (campos.length <= 1) return;
    setCampos(campos.filter((_, i) => i !== index));
  };

  const updateField = (index, key, value) => {
    const updated = [...campos];
    updated[index] = { ...updated[index], [key]: value };
    setCampos(updated);
  };

  const updateOption = (fieldIndex, optIndex, value) => {
    const updated = [...campos];
    const opts = [...(updated[fieldIndex].opcoes || [])];
    opts[optIndex] = value;
    updated[fieldIndex] = { ...updated[fieldIndex], opcoes: opts };
    setCampos(updated);
  };

  const addOption = (fieldIndex) => {
    const updated = [...campos];
    const opts = [...(updated[fieldIndex].opcoes || []), ''];
    updated[fieldIndex] = { ...updated[fieldIndex], opcoes: opts };
    setCampos(updated);
  };

  const removeOption = (fieldIndex, optIndex) => {
    const updated = [...campos];
    const opts = (updated[fieldIndex].opcoes || []).filter((_, i) => i !== optIndex);
    updated[fieldIndex] = { ...updated[fieldIndex], opcoes: opts };
    setCampos(updated);
  };

  const moveField = (from, to) => {
    if (to < 0 || to >= campos.length) return;
    const updated = [...campos];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    setCampos(updated);
  };

  // Drag and drop handlers
  const handleDragStart = (index) => {
    setDragIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    moveField(dragIndex, index);
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  const handleSave = async () => {
    if (!nomeProcedimento.trim()) {
      alert('Informe o nome do procedimento');
      return;
    }
    if (campos.some(c => !c.label.trim())) {
      alert('Todos os campos devem ter um rótulo');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        nome_procedimento: nomeProcedimento,
        descricao: descricao || null,
        rosto_modelo_tipo: rostoModeloTipo || null,
        campos: campos.map((c, i) => ({
          tipo: c.tipo,
          label: c.label,
          placeholder: c.placeholder || null,
          opcoes: ['multipla_escolha', 'escolha_unica', 'select'].includes(c.tipo) ? (c.opcoes || []) : null,
          ordem: i,
          obrigatorio: c.obrigatorio,
        })),
      };

      if (isEditing) {
        await atualizarModelo(id, payload);
      } else {
        await criarModelo(payload);
      }
      navigate('/modelos');
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar modelo');
    } finally {
      setSaving(false);
    }
  };

  const needsOptions = (tipo) => ['multipla_escolha', 'escolha_unica', 'select'].includes(tipo);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-3 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/modelos')} className="w-10 h-10 rounded-xl bg-white shadow-card flex items-center justify-center text-dark/50 hover:text-accent transition-colors">
          <FiArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-semibold text-dark">
            {isEditing ? 'Editar Modelo' : 'Novo Modelo de Anamnese'}
          </h1>
          <p className="text-dark/50 text-sm mt-0.5">Monte a ficha personalizada do procedimento</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-accent to-accent-dark text-white font-heading font-semibold text-sm flex items-center gap-2 hover:shadow-lg hover:shadow-accent/25 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          <FiSave size={16} />
          {saving ? 'Salvando...' : 'Salvar Modelo'}
        </button>
      </div>

      {/* Basic info */}
      <div className="bg-white rounded-3xl p-6 shadow-card space-y-4">
        <div>
          <label className="block text-sm font-medium text-dark/60 mb-2">Nome do Procedimento *</label>
          <input
            type="text"
            value={nomeProcedimento}
            onChange={(e) => setNomeProcedimento(e.target.value)}
            placeholder="Ex: Botox, Lábios, Limpeza de Pele..."
            className="w-full px-4 py-3 rounded-2xl border border-secondary/50 bg-soft/50 focus:bg-white focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all text-dark placeholder:text-dark/30"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-dark/60 mb-2">Descrição (opcional)</label>
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Descrição do procedimento..."
            rows={2}
            className="w-full px-4 py-3 rounded-2xl border border-secondary/50 bg-soft/50 focus:bg-white focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all text-dark placeholder:text-dark/30 resize-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-card space-y-4">
        <h2 className="font-heading font-semibold text-dark">Rosto de Exemplo (opcional)</h2>
        <p className="text-sm text-dark/50">
          Selecione o tipo de modelo facial que deve aparecer no início do preenchimento da anamnese.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => setRostoModeloTipo(rostoModeloTipo === 'muscular' ? '' : 'muscular')}
            className={`text-left rounded-2xl border p-3 transition-all ${
              rostoModeloTipo === 'muscular' ? 'border-accent bg-accent/5' : 'border-secondary/30 hover:border-accent/30'
            }`}
          >
            <p className="font-medium text-dark mb-2">Modelo Muscular (masc/fem automático)</p>
            <div className="grid grid-cols-2 gap-2">
              <img src="/anamnese-modelos/rostomasc.png" alt="Rosto muscular masculino" className="w-full h-36 object-cover rounded-xl bg-soft/40" />
              <img src="/anamnese-modelos/rostofem.png" alt="Rosto muscular feminino" className="w-full h-36 object-cover rounded-xl bg-soft/40" />
            </div>
          </button>
          <button
            onClick={() => setRostoModeloTipo(rostoModeloTipo === 'positionsfem' ? '' : 'positionsfem')}
            className={`text-left rounded-2xl border p-3 transition-all ${
              rostoModeloTipo === 'positionsfem' ? 'border-accent bg-accent/5' : 'border-secondary/30 hover:border-accent/30'
            }`}
          >
            <p className="font-medium text-dark mb-2">Modelo Positions Feminino (fixo)</p>
            <img src="/anamnese-modelos/positionsfem.png" alt="Positions feminino" className="w-full h-36 object-cover rounded-xl bg-soft/40" />
          </button>
        </div>
      </div>

      {/* Fields builder */}
      <div className="space-y-3">
        <h2 className="font-heading font-semibold text-dark">Campos da Ficha</h2>

        {campos.map((campo, index) => (
          <div
            key={campo._id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className={`bg-white rounded-3xl p-5 shadow-card transition-all duration-200 animate-fadeIn ${
              dragIndex === index ? 'opacity-50 scale-[0.98]' : ''
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Drag handle */}
              <div className="cursor-grab active:cursor-grabbing text-dark/20 hover:text-dark/40 pt-3">
                <FiMoreVertical size={18} />
              </div>

              <div className="flex-1 space-y-3">
                {/* Field header */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={campo.label}
                      onChange={(e) => updateField(index, 'label', e.target.value)}
                      placeholder="Rótulo do campo *"
                      className="w-full px-4 py-2.5 rounded-xl border border-secondary/50 bg-soft/30 focus:bg-white focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all text-dark text-sm placeholder:text-dark/30"
                    />
                  </div>
                  <select
                    value={campo.tipo}
                    onChange={(e) => updateField(index, 'tipo', e.target.value)}
                    className="px-3 py-2.5 rounded-xl border border-secondary/50 bg-soft/30 focus:bg-white focus:border-accent focus:outline-none text-dark text-sm min-w-[160px]"
                  >
                    {FIELD_TYPES.map(ft => (
                      <option key={ft.value} value={ft.value}>{ft.label}</option>
                    ))}
                  </select>
                </div>

                {/* Placeholder */}
                {['input', 'texto'].includes(campo.tipo) && (
                  <input
                    type="text"
                    value={campo.placeholder || ''}
                    onChange={(e) => updateField(index, 'placeholder', e.target.value)}
                    placeholder="Texto de exemplo (placeholder)"
                    className="w-full px-4 py-2 rounded-xl border border-secondary/30 bg-soft/20 focus:bg-white focus:border-accent focus:outline-none text-dark text-xs placeholder:text-dark/30"
                  />
                )}

                {/* Options for multiple choice, radio, select */}
                {needsOptions(campo.tipo) && (
                  <div className="pl-4 border-l-2 border-accent/20 space-y-2">
                    <p className="text-xs text-dark/40 font-medium">Opções:</p>
                    {(campo.opcoes || []).map((opt, optIndex) => (
                      <div key={optIndex} className="flex items-center gap-2">
                        <span className="w-5 text-dark/30 text-xs">{optIndex + 1}.</span>
                        <input
                          type="text"
                          value={opt}
                          onChange={(e) => updateOption(index, optIndex, e.target.value)}
                          placeholder={`Opção ${optIndex + 1}`}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-secondary/30 bg-soft/20 focus:bg-white focus:border-accent focus:outline-none text-dark text-sm placeholder:text-dark/30"
                        />
                        <button
                          onClick={() => removeOption(index, optIndex)}
                          className="text-dark/20 hover:text-red-400 transition-colors"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addOption(index)}
                      className="text-accent text-xs font-medium hover:text-accent-dark transition-colors flex items-center gap-1"
                    >
                      <FiPlus size={12} />
                      Adicionar opção
                    </button>
                  </div>
                )}

                {/* Footer actions */}
                <div className="flex items-center justify-between pt-2 border-t border-soft">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={campo.obrigatorio}
                      onChange={(e) => updateField(index, 'obrigatorio', e.target.checked)}
                      className="w-4 h-4 rounded border-secondary/50 text-accent focus:ring-accent/20"
                    />
                    <span className="text-xs text-dark/50">Obrigatório</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveField(index, index - 1)}
                      disabled={index === 0}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-dark/30 hover:text-dark hover:bg-soft transition-all disabled:opacity-30 text-xs"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => moveField(index, index + 1)}
                      disabled={index === campos.length - 1}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-dark/30 hover:text-dark hover:bg-soft transition-all disabled:opacity-30 text-xs"
                    >
                      ▼
                    </button>
                    <button
                      onClick={() => removeField(index)}
                      disabled={campos.length <= 1}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-dark/30 hover:text-red-400 hover:bg-red-50 transition-all disabled:opacity-30"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Add field button */}
        <button
          onClick={addField}
          className="w-full p-4 rounded-3xl border-2 border-dashed border-secondary/50 text-accent font-heading font-medium text-sm flex items-center justify-center gap-2 hover:border-accent/50 hover:bg-accent/5 transition-all"
        >
          <FiPlus size={18} />
          Adicionar Campo
        </button>
      </div>
    </div>
  );
}
