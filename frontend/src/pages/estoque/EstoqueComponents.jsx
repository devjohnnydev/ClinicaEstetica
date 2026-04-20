import { useState, useEffect, useRef } from 'react';
import {
  FiX, FiPlus, FiMinus, FiSave, FiPackage, FiTruck, FiEdit2,
  FiArrowDownCircle, FiArrowUpCircle, FiAlertTriangle,
} from 'react-icons/fi';
import {
  criarProdutoEstoque, atualizarProdutoEstoque,
  criarMovimentacao,
  criarFornecedor, atualizarFornecedor,
  getFornecedores,
} from '../../services/api';

// ═══════════════════════════════════════════════════════════════════
// CATEGORIAS DE PRODUTO
// ═══════════════════════════════════════════════════════════════════
export const CATEGORIAS_PRODUTO = [
  { value: 'injetaveis', label: 'Injetáveis', icon: '💉' },
  { value: 'cosmeticos', label: 'Cosméticos', icon: '🧴' },
  { value: 'descartaveis', label: 'Descartáveis', icon: '🧤' },
  { value: 'equipamentos', label: 'Equipamentos', icon: '🛠️' },
  { value: 'medicamentos', label: 'Medicamentos', icon: '💊' },
  { value: 'outros', label: 'Outros', icon: '📦' },
];

export const UNIDADES = [
  { value: 'un', label: 'Unidade (un)' },
  { value: 'ml', label: 'Mililitro (ml)' },
  { value: 'g', label: 'Grama (g)' },
  { value: 'cx', label: 'Caixa (cx)' },
  { value: 'pct', label: 'Pacote (pct)' },
  { value: 'fr', label: 'Frasco (fr)' },
  { value: 'amp', label: 'Ampola (amp)' },
  { value: 'kit', label: 'Kit' },
];

export const MOTIVOS_ENTRADA = [
  { value: 'compra', label: 'Compra' },
  { value: 'devolucao', label: 'Devolução' },
  { value: 'ajuste', label: 'Ajuste de estoque' },
  { value: 'bonificacao', label: 'Bonificação' },
  { value: 'outro', label: 'Outro' },
];

export const MOTIVOS_SAIDA = [
  { value: 'uso_procedimento', label: 'Uso em procedimento' },
  { value: 'venda', label: 'Venda' },
  { value: 'perda', label: 'Perda / Vencimento' },
  { value: 'ajuste', label: 'Ajuste de estoque' },
  { value: 'outro', label: 'Outro' },
];

function getCategoriaIcon(cat) {
  const found = CATEGORIAS_PRODUTO.find(c => c.value === cat);
  return found ? found.icon : '📦';
}


// ═══════════════════════════════════════════════════════════════════
// STOCK LEVEL BAR — Indicador visual de estoque
// ═══════════════════════════════════════════════════════════════════
export function StockLevelBar({ atual, minimo }) {
  const max = Math.max(minimo * 3, atual, 1);
  const pct = Math.min((atual / max) * 100, 100);
  let color = 'bg-emerald-500';
  let bgColor = 'bg-emerald-100';
  if (minimo > 0 && atual <= minimo) {
    color = 'bg-red-500';
    bgColor = 'bg-red-100';
  } else if (minimo > 0 && atual <= minimo * 2) {
    color = 'bg-yellow-500';
    bgColor = 'bg-yellow-100';
  }

  return (
    <div className={`w-full h-2 rounded-full ${bgColor} overflow-hidden`}>
      <div
        className={`h-full rounded-full ${color} transition-all duration-500`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
// STATUS BADGE
// ═══════════════════════════════════════════════════════════════════
export function StatusBadge({ status }) {
  const config = {
    normal: { label: 'Normal', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    atencao: { label: 'Atenção', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    critico: { label: 'Crítico', color: 'bg-red-100 text-red-600 border-red-200' },
  };
  const c = config[status] || config.normal;
  return (
    <span className={`inline-block text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium border ${c.color}`}>
      {c.label}
    </span>
  );
}


// ═══════════════════════════════════════════════════════════════════
// GRÁFICO DE BARRAS — Entradas vs Saídas (Canvas)
// ═══════════════════════════════════════════════════════════════════
export function EstoqueBarChart({ data }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!data || data.length === 0 || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const padding = { top: 20, right: 20, bottom: 40, left: 45 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    ctx.clearRect(0, 0, w, h);

    const maxVal = Math.max(...data.flatMap(d => [d.entradas, d.saidas]), 1);
    const barGroupW = chartW / data.length;
    const barW = Math.min(barGroupW * 0.3, 28);
    const gap = 4;

    // Grid lines
    ctx.strokeStyle = '#F5EDE6';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(w - padding.right, y);
      ctx.stroke();

      // Y axis labels
      ctx.fillStyle = '#3A3A3A80';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'right';
      const val = Math.round(maxVal - (maxVal / 4) * i);
      ctx.fillText(val.toString(), padding.left - 8, y + 4);
    }

    // Draw bars
    data.forEach((d, i) => {
      const x = padding.left + barGroupW * i + (barGroupW - barW * 2 - gap) / 2;

      // Entradas bar (green)
      const entH = (d.entradas / maxVal) * chartH;
      const grad1 = ctx.createLinearGradient(0, padding.top + chartH - entH, 0, padding.top + chartH);
      grad1.addColorStop(0, '#34D399');
      grad1.addColorStop(1, '#059669');
      ctx.fillStyle = grad1;
      ctx.beginPath();
      ctx.roundRect(x, padding.top + chartH - entH, barW, entH, [4, 4, 0, 0]);
      ctx.fill();

      // Saídas bar (red/orange)
      const saiH = (d.saidas / maxVal) * chartH;
      const grad2 = ctx.createLinearGradient(0, padding.top + chartH - saiH, 0, padding.top + chartH);
      grad2.addColorStop(0, '#FB923C');
      grad2.addColorStop(1, '#EA580C');
      ctx.fillStyle = grad2;
      ctx.beginPath();
      ctx.roundRect(x + barW + gap, padding.top + chartH - saiH, barW, saiH, [4, 4, 0, 0]);
      ctx.fill();

      // X axis label
      ctx.fillStyle = '#3A3A3A80';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(d.mes, x + barW + gap / 2, h - padding.bottom + 16);
    });

    // Legend
    const legY = 8;
    ctx.fillStyle = '#34D399';
    ctx.beginPath();
    ctx.roundRect(w - 160, legY, 10, 10, 2);
    ctx.fill();
    ctx.fillStyle = '#3A3A3A99';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Entradas', w - 146, legY + 9);

    ctx.fillStyle = '#FB923C';
    ctx.beginPath();
    ctx.roundRect(w - 86, legY, 10, 10, 2);
    ctx.fill();
    ctx.fillStyle = '#3A3A3A99';
    ctx.fillText('Saídas', w - 72, legY + 9);

  }, [data]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full"
      style={{ height: '220px' }}
    />
  );
}


// ═══════════════════════════════════════════════════════════════════
// STAT CARD
// ═══════════════════════════════════════════════════════════════════
export function EstoqueStatCard({ icon: Icon, label, value, color = 'accent', subtitle }) {
  const colorClasses = {
    accent: 'bg-accent/10 text-accent',
    green: 'bg-emerald-100 text-emerald-600',
    red: 'bg-red-100 text-red-500',
    yellow: 'bg-yellow-100 text-yellow-600',
    blue: 'bg-blue-100 text-blue-600',
  };

  return (
    <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-card border border-primary/40">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${colorClasses[color] || colorClasses.accent}`}>
          <Icon size={15} />
        </div>
      </div>
      <p className="text-lg sm:text-xl font-bold text-dark">{value}</p>
      <p className="text-[10px] sm:text-xs text-dark/50 mt-0.5">{label}</p>
      {subtitle && <p className="text-[10px] text-dark/40 mt-0.5">{subtitle}</p>}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
// MODAL BASE
// ═══════════════════════════════════════════════════════════════════
function ModalBase({ title, onClose, children, maxW = 'max-w-lg' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3" onClick={onClose}>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className={`relative bg-white rounded-2xl shadow-hover ${maxW} w-full max-h-[85vh] overflow-y-auto animate-scaleIn`}
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-4 sm:p-5 border-b border-primary/50 rounded-t-2xl">
          <h3 className="font-heading text-sm sm:text-base font-semibold text-dark">{title}</h3>
          <button onClick={onClose} className="text-dark/30 hover:text-dark transition">
            <FiX size={20} />
          </button>
        </div>
        <div className="p-4 sm:p-5">
          {children}
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
// PRODUCT MODAL — Criar / Editar Produto
// ═══════════════════════════════════════════════════════════════════
export function ProductModal({ produto, onClose, onSaved }) {
  const isEdit = !!produto;
  const [form, setForm] = useState({
    nome: produto?.nome || '',
    descricao: produto?.descricao || '',
    categoria: produto?.categoria || 'outros',
    unidade_medida: produto?.unidade_medida || 'un',
    quantidade_atual: produto?.quantidade_atual || 0,
    quantidade_minima: produto?.quantidade_minima || 0,
    preco_custo: produto?.preco_custo || 0,
    preco_venda: produto?.preco_venda || 0,
    fornecedor_id: produto?.fornecedor_id || '',
  });
  const [fornecedores, setFornecedores] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getFornecedores({}).then(r => setFornecedores(r.data)).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) return alert('Nome é obrigatório');
    setSaving(true);
    try {
      const payload = {
        ...form,
        quantidade_atual: parseFloat(form.quantidade_atual) || 0,
        quantidade_minima: parseFloat(form.quantidade_minima) || 0,
        preco_custo: parseFloat(form.preco_custo) || 0,
        preco_venda: parseFloat(form.preco_venda) || 0,
        fornecedor_id: form.fornecedor_id ? parseInt(form.fornecedor_id) : null,
      };
      if (isEdit) {
        // Don't send quantidade_atual on edit (use movimentacao instead)
        const { quantidade_atual, ...updatePayload } = payload;
        await atualizarProdutoEstoque(produto.id, updatePayload);
      } else {
        await criarProdutoEstoque(payload);
      }
      onSaved?.();
      onClose();
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao salvar produto');
    }
    setSaving(false);
  };

  const inputClass = "w-full px-3 py-2.5 rounded-xl border border-primary focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none text-sm";

  return (
    <ModalBase title={isEdit ? '✏️ Editar Produto' : '📦 Novo Produto'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Nome */}
        <div>
          <label className="block text-xs font-medium text-dark/60 mb-1">Nome do Produto *</label>
          <input type="text" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className={inputClass} placeholder="Ex: Ácido Hialurônico 1ml" />
        </div>

        {/* Descrição */}
        <div>
          <label className="block text-xs font-medium text-dark/60 mb-1">Descrição</label>
          <textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} className={`${inputClass} resize-none`} rows={2} placeholder="Detalhes do produto..." />
        </div>

        {/* Categoria + Unidade */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-dark/60 mb-1">Categoria</label>
            <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} className={inputClass}>
              {CATEGORIAS_PRODUTO.map(c => (
                <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-dark/60 mb-1">Unidade de Medida</label>
            <select value={form.unidade_medida} onChange={e => setForm({ ...form, unidade_medida: e.target.value })} className={inputClass}>
              {UNIDADES.map(u => (
                <option key={u.value} value={u.value}>{u.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Quantidade inicial (só no create) + Quantidade mínima */}
        <div className="grid grid-cols-2 gap-3">
          {!isEdit && (
            <div>
              <label className="block text-xs font-medium text-dark/60 mb-1">Quantidade Inicial</label>
              <input type="number" step="0.01" min="0" value={form.quantidade_atual} onChange={e => setForm({ ...form, quantidade_atual: e.target.value })} className={inputClass} />
            </div>
          )}
          <div className={isEdit ? 'col-span-2' : ''}>
            <label className="block text-xs font-medium text-dark/60 mb-1">
              Quantidade Mínima
              <span className="text-dark/40 ml-1">(alerta)</span>
            </label>
            <input type="number" step="0.01" min="0" value={form.quantidade_minima} onChange={e => setForm({ ...form, quantidade_minima: e.target.value })} className={inputClass} />
          </div>
        </div>

        {/* Preços */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-dark/60 mb-1">Preço de Custo (R$)</label>
            <input type="number" step="0.01" min="0" value={form.preco_custo} onChange={e => setForm({ ...form, preco_custo: e.target.value })} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs font-medium text-dark/60 mb-1">Preço de Venda (R$)</label>
            <input type="number" step="0.01" min="0" value={form.preco_venda} onChange={e => setForm({ ...form, preco_venda: e.target.value })} className={inputClass} />
          </div>
        </div>

        {/* Fornecedor */}
        <div>
          <label className="block text-xs font-medium text-dark/60 mb-1">Fornecedor</label>
          <select value={form.fornecedor_id} onChange={e => setForm({ ...form, fornecedor_id: e.target.value })} className={inputClass}>
            <option value="">Nenhum</option>
            {fornecedores.map(f => (
              <option key={f.id} value={f.id}>{f.nome}</option>
            ))}
          </select>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-accent to-accent-dark text-white text-sm font-medium hover:shadow-lg transition disabled:opacity-50"
        >
          <FiSave size={15} />
          {saving ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Cadastrar Produto'}
        </button>
      </form>
    </ModalBase>
  );
}


// ═══════════════════════════════════════════════════════════════════
// MOVIMENTAÇÃO MODAL — Entrada / Saída
// ═══════════════════════════════════════════════════════════════════
export function MovimentacaoModal({ produto, tipoInicial, onClose, onSaved }) {
  const [form, setForm] = useState({
    tipo: tipoInicial || 'entrada',
    quantidade: '',
    preco_unitario: produto?.preco_custo || 0,
    motivo: tipoInicial === 'saida' ? 'uso_procedimento' : 'compra',
    observacoes: '',
  });
  const [saving, setSaving] = useState(false);

  const motivos = form.tipo === 'entrada' ? MOTIVOS_ENTRADA : MOTIVOS_SAIDA;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const qtd = parseFloat(form.quantidade);
    if (!qtd || qtd <= 0) return alert('Quantidade deve ser maior que zero');
    setSaving(true);
    try {
      await criarMovimentacao({
        produto_id: produto.id,
        tipo: form.tipo,
        quantidade: qtd,
        preco_unitario: parseFloat(form.preco_unitario) || 0,
        motivo: form.motivo,
        observacoes: form.observacoes || null,
      });
      onSaved?.();
      onClose();
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao registrar movimentação');
    }
    setSaving(false);
  };

  const inputClass = "w-full px-3 py-2.5 rounded-xl border border-primary focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none text-sm";

  return (
    <ModalBase title={form.tipo === 'entrada' ? '📥 Registrar Entrada' : '📤 Registrar Saída'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Produto info */}
        <div className="bg-soft rounded-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-lg">
            {getCategoriaIcon(produto?.categoria)}
          </div>
          <div>
            <p className="text-sm font-medium text-dark">{produto?.nome}</p>
            <p className="text-xs text-dark/50">
              Estoque atual: <span className="font-semibold">{produto?.quantidade_atual} {produto?.unidade_medida}</span>
            </p>
          </div>
        </div>

        {/* Tipo toggle */}
        <div className="flex gap-2 bg-soft rounded-xl p-1.5">
          <button
            type="button"
            onClick={() => setForm({ ...form, tipo: 'entrada', motivo: 'compra' })}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              form.tipo === 'entrada'
                ? 'bg-emerald-100 text-emerald-700 shadow-sm'
                : 'text-dark/50 hover:bg-white/50'
            }`}
          >
            <FiArrowDownCircle size={15} /> Entrada
          </button>
          <button
            type="button"
            onClick={() => setForm({ ...form, tipo: 'saida', motivo: 'uso_procedimento' })}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              form.tipo === 'saida'
                ? 'bg-orange-100 text-orange-700 shadow-sm'
                : 'text-dark/50 hover:bg-white/50'
            }`}
          >
            <FiArrowUpCircle size={15} /> Saída
          </button>
        </div>

        {/* Quantidade */}
        <div>
          <label className="block text-xs font-medium text-dark/60 mb-1">
            Quantidade ({produto?.unidade_medida}) *
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={form.quantidade}
            onChange={e => setForm({ ...form, quantidade: e.target.value })}
            className={`${inputClass} text-lg font-semibold text-center`}
            placeholder="0"
            autoFocus
          />
          {form.tipo === 'saida' && parseFloat(form.quantidade) > produto?.quantidade_atual && (
            <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
              <FiAlertTriangle size={12} /> Quantidade maior que o estoque disponível
            </p>
          )}
        </div>

        {/* Preço unitário */}
        <div>
          <label className="block text-xs font-medium text-dark/60 mb-1">Preço Unitário (R$)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.preco_unitario}
            onChange={e => setForm({ ...form, preco_unitario: e.target.value })}
            className={inputClass}
          />
        </div>

        {/* Motivo */}
        <div>
          <label className="block text-xs font-medium text-dark/60 mb-1">Motivo</label>
          <select value={form.motivo} onChange={e => setForm({ ...form, motivo: e.target.value })} className={inputClass}>
            {motivos.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* Observações */}
        <div>
          <label className="block text-xs font-medium text-dark/60 mb-1">Observações</label>
          <textarea
            value={form.observacoes}
            onChange={e => setForm({ ...form, observacoes: e.target.value })}
            className={`${inputClass} resize-none`}
            rows={2}
            placeholder="Observações opcionais..."
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={saving}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white text-sm font-medium hover:shadow-lg transition disabled:opacity-50 ${
            form.tipo === 'entrada'
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
              : 'bg-gradient-to-r from-orange-500 to-orange-600'
          }`}
        >
          {form.tipo === 'entrada' ? <FiPlus size={15} /> : <FiMinus size={15} />}
          {saving ? 'Registrando...' : form.tipo === 'entrada' ? 'Registrar Entrada' : 'Registrar Saída'}
        </button>
      </form>
    </ModalBase>
  );
}


// ═══════════════════════════════════════════════════════════════════
// FORNECEDOR MODAL — Criar / Editar
// ═══════════════════════════════════════════════════════════════════
export function FornecedorModal({ fornecedor, onClose, onSaved }) {
  const isEdit = !!fornecedor;
  const [form, setForm] = useState({
    nome: fornecedor?.nome || '',
    contato: fornecedor?.contato || '',
    telefone: fornecedor?.telefone || '',
    email: fornecedor?.email || '',
    endereco: fornecedor?.endereco || '',
    cnpj: fornecedor?.cnpj || '',
    observacoes: fornecedor?.observacoes || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) return alert('Nome é obrigatório');
    setSaving(true);
    try {
      const payload = { ...form };
      // Clean empty strings to null
      Object.keys(payload).forEach(k => {
        if (payload[k] === '') payload[k] = null;
      });
      payload.nome = form.nome; // keep nome as string
      if (isEdit) {
        await atualizarFornecedor(fornecedor.id, payload);
      } else {
        await criarFornecedor(payload);
      }
      onSaved?.();
      onClose();
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao salvar fornecedor');
    }
    setSaving(false);
  };

  const inputClass = "w-full px-3 py-2.5 rounded-xl border border-primary focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none text-sm";

  return (
    <ModalBase title={isEdit ? '✏️ Editar Fornecedor' : '🏭 Novo Fornecedor'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-dark/60 mb-1">Nome / Empresa *</label>
          <input type="text" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} className={inputClass} placeholder="Nome do fornecedor" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-dark/60 mb-1">Pessoa de Contato</label>
            <input type="text" value={form.contato} onChange={e => setForm({ ...form, contato: e.target.value })} className={inputClass} placeholder="Nome do contato" />
          </div>
          <div>
            <label className="block text-xs font-medium text-dark/60 mb-1">CNPJ</label>
            <input type="text" value={form.cnpj} onChange={e => setForm({ ...form, cnpj: e.target.value })} className={inputClass} placeholder="00.000.000/0000-00" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-dark/60 mb-1">Telefone</label>
            <input type="text" value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} className={inputClass} placeholder="(00) 00000-0000" />
          </div>
          <div>
            <label className="block text-xs font-medium text-dark/60 mb-1">E-mail</label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className={inputClass} placeholder="email@exemplo.com" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-dark/60 mb-1">Endereço</label>
          <input type="text" value={form.endereco} onChange={e => setForm({ ...form, endereco: e.target.value })} className={inputClass} placeholder="Endereço completo" />
        </div>

        <div>
          <label className="block text-xs font-medium text-dark/60 mb-1">Observações</label>
          <textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} className={`${inputClass} resize-none`} rows={2} placeholder="Observações..." />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-accent to-accent-dark text-white text-sm font-medium hover:shadow-lg transition disabled:opacity-50"
        >
          <FiSave size={15} />
          {saving ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Cadastrar Fornecedor'}
        </button>
      </form>
    </ModalBase>
  );
}


// ═══════════════════════════════════════════════════════════════════
// CONFIRM MODAL
// ═══════════════════════════════════════════════════════════════════
export function ConfirmModal({ title, message, confirmLabel, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-hover max-w-sm w-full p-5 animate-scaleIn" onClick={e => e.stopPropagation()}>
        <h3 className="font-heading text-sm font-semibold text-dark mb-2">{title}</h3>
        <p className="text-xs sm:text-sm text-dark/60 mb-4">{message}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 rounded-xl border border-primary text-xs sm:text-sm text-dark/60 hover:bg-primary/30 transition">
            Cancelar
          </button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-xs sm:text-sm font-medium hover:bg-red-600 transition">
            {confirmLabel || 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
