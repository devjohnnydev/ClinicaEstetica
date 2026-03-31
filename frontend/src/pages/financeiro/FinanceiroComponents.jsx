import { useState, useEffect } from 'react';
import { FiX, FiDollarSign, FiCreditCard, FiSmartphone, FiCheck, FiAlertTriangle, FiTag, FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import {
  atualizarPagamento,
  criarDespesa,
  getHistoricoCliente,
  getCategoriasDespesa,
  criarCategoriaDespesa,
  atualizarCategoriaDespesa,
  deletarCategoriaDespesa,
} from '../../services/api';

// ═══════════════════════════════════════════════════════════════════
// SVG CHARTS
// ═══════════════════════════════════════════════════════════════════

const CHART_COLORS = ['#C6A77D', '#E8D5C4', '#A8874F', '#D4B896', '#8B7355', '#F5EDE6', '#b8956a', '#d4c4b0'];
const MESES_NOMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function BarChart({ data, width = 500, height = 250 }) {
  if (!data || data.length === 0) return <div className="text-dark/40 text-sm text-center py-8">Sem dados</div>;

  const maxVal = Math.max(...data.flatMap(d => [d.receita || 0, d.gastos || 0]), 1);
  const barW = Math.min(24, (width - 60) / (data.length * 2.5));
  const gap = barW * 0.5;
  const chartH = height - 40;
  const chartW = width - 50;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {/* Y axis labels */}
      {[0, 0.25, 0.5, 0.75, 1].map(pct => {
        const y = 10 + chartH * (1 - pct);
        const val = maxVal * pct;
        return (
          <g key={pct}>
            <line x1="48" y1={y} x2={width - 5} y2={y} stroke="#E8D5C4" strokeWidth="0.5" strokeDasharray="4,4" />
            <text x="44" y={y + 4} textAnchor="end" fill="#999" fontSize="9">
              {val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toFixed(0)}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {data.map((d, i) => {
        const x = 55 + i * (barW * 2 + gap * 2 + 8);
        const hRec = (d.receita / maxVal) * chartH;
        const hGas = (d.gastos / maxVal) * chartH;
        return (
          <g key={i}>
            <rect x={x} y={10 + chartH - hRec} width={barW} height={hRec} rx="3" fill="#C6A77D" opacity="0.9">
              <animate attributeName="height" from="0" to={hRec} dur="0.6s" fill="freeze" />
              <animate attributeName="y" from={10 + chartH} to={10 + chartH - hRec} dur="0.6s" fill="freeze" />
            </rect>
            <rect x={x + barW + gap} y={10 + chartH - hGas} width={barW} height={hGas} rx="3" fill="#E8D5C4" opacity="0.9">
              <animate attributeName="height" from="0" to={hGas} dur="0.6s" fill="freeze" />
              <animate attributeName="y" from={10 + chartH} to={10 + chartH - hGas} dur="0.6s" fill="freeze" />
            </rect>
            <text x={x + barW + gap / 2} y={height - 5} textAnchor="middle" fill="#999" fontSize="9">
              {MESES_NOMES[(d.mes || i + 1) - 1]}
            </text>
          </g>
        );
      })}

      {/* Legend */}
      <rect x={width - 130} y="2" width="10" height="10" rx="2" fill="#C6A77D" />
      <text x={width - 116} y="11" fill="#666" fontSize="9">Receita</text>
      <rect x={width - 65} y="2" width="10" height="10" rx="2" fill="#E8D5C4" />
      <text x={width - 51} y="11" fill="#666" fontSize="9">Gastos</text>
    </svg>
  );
}

export function LineChart({ data, width = 500, height = 200 }) {
  if (!data || data.length === 0) return <div className="text-dark/40 text-sm text-center py-8">Sem dados</div>;

  const allVals = data.flatMap(d => [d.receita || 0, d.gastos || 0, d.lucro || 0]);
  const maxVal = Math.max(...allVals, 1);
  const minVal = Math.min(...allVals, 0);
  const range = maxVal - minVal || 1;
  const chartH = height - 40;
  const chartW = width - 60;

  const getY = v => 15 + chartH - ((v - minVal) / range) * chartH;
  const getX = i => 55 + (i / Math.max(data.length - 1, 1)) * chartW;

  const makePath = (key) =>
    data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d[key] || 0)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map(pct => {
        const y = 15 + chartH * (1 - pct);
        const val = minVal + range * pct;
        return (
          <g key={pct}>
            <line x1="50" y1={y} x2={width - 5} y2={y} stroke="#E8D5C4" strokeWidth="0.5" strokeDasharray="4,4" />
            <text x="46" y={y + 4} textAnchor="end" fill="#999" fontSize="9">
              {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(0)}
            </text>
          </g>
        );
      })}

      {/* Lines */}
      <path d={makePath('receita')} fill="none" stroke="#C6A77D" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d={makePath('lucro')} fill="none" stroke="#A8874F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6,3" />
      <path d={makePath('gastos')} fill="none" stroke="#E8D5C4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots */}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={getX(i)} cy={getY(d.receita || 0)} r="3.5" fill="#C6A77D" stroke="white" strokeWidth="1.5" />
          <circle cx={getX(i)} cy={getY(d.lucro || 0)} r="3" fill="#A8874F" stroke="white" strokeWidth="1.5" />
          <text x={getX(i)} y={height - 5} textAnchor="middle" fill="#999" fontSize="9">
            {MESES_NOMES[(d.mes || i + 1) - 1]}
          </text>
        </g>
      ))}

      {/* Legend */}
      <line x1={width - 180} y1="7" x2={width - 165} y2="7" stroke="#C6A77D" strokeWidth="2.5" />
      <text x={width - 161} y="10" fill="#666" fontSize="9">Receita</text>
      <line x1={width - 115} y1="7" x2={width - 100} y2="7" stroke="#A8874F" strokeWidth="2" strokeDasharray="4,2" />
      <text x={width - 96} y="10" fill="#666" fontSize="9">Lucro</text>
      <line x1={width - 60} y1="7" x2={width - 45} y2="7" stroke="#E8D5C4" strokeWidth="2" />
      <text x={width - 41} y="10" fill="#666" fontSize="9">Gastos</text>
    </svg>
  );
}

export function DonutChart({ data, width = 260, height = 260 }) {
  if (!data || data.length === 0) return <div className="text-dark/40 text-sm text-center py-8">Sem dados</div>;

  const total = data.reduce((s, d) => s + d.valor, 0) || 1;
  const cx = width / 2, cy = height / 2 - 10, r = 80, innerR = 50;
  let cumAngle = -Math.PI / 2;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox={`0 0 ${width} ${height - 20}`} className="w-full h-auto" style={{ maxWidth: 260 }}>
        {data.map((d, i) => {
          const angle = (d.valor / total) * 2 * Math.PI;
          const startAngle = cumAngle;
          cumAngle += angle;
          const endAngle = cumAngle;
          const largeArc = angle > Math.PI ? 1 : 0;

          const x1 = cx + r * Math.cos(startAngle);
          const y1 = cy + r * Math.sin(startAngle);
          const x2 = cx + r * Math.cos(endAngle);
          const y2 = cy + r * Math.sin(endAngle);
          const ix1 = cx + innerR * Math.cos(endAngle);
          const iy1 = cy + innerR * Math.sin(endAngle);
          const ix2 = cx + innerR * Math.cos(startAngle);
          const iy2 = cy + innerR * Math.sin(startAngle);

          const path = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2} Z`;

          return <path key={i} d={path} fill={CHART_COLORS[i % CHART_COLORS.length]} opacity="0.85" />;
        })}
        <text x={cx} y={cy - 4} textAnchor="middle" fill="#3A3A3A" fontSize="13" fontWeight="600">
          R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#999" fontSize="9">Total</text>
      </svg>

      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
            <span className="text-xs text-dark/60">{d.categoria}</span>
          </div>
        ))}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
// STAT CARD
// ═══════════════════════════════════════════════════════════════════

export function StatCard({ icon: Icon, label, value, variacao, color = 'accent', prefix = 'R$ ' }) {
  const isUp = variacao > 0;
  const isDown = variacao < 0;

  return (
    <div className="bg-white rounded-2xl p-5 shadow-card border border-primary/40 hover:shadow-hover transition-all duration-300">
      <div className="flex items-start justify-between">
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color === 'red' ? 'from-red-100 to-red-50' : color === 'green' ? 'from-emerald-100 to-emerald-50' : 'from-accent/15 to-secondary/20'} flex items-center justify-center`}>
          <Icon size={20} className={color === 'red' ? 'text-red-500' : color === 'green' ? 'text-emerald-600' : 'text-accent'} />
        </div>
        {variacao !== undefined && variacao !== null && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${isUp ? 'bg-emerald-50 text-emerald-600' : isDown ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-500'}`}>
            {isUp ? '↑' : isDown ? '↓' : '–'} {Math.abs(variacao)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-dark mt-3">{prefix}{typeof value === 'number' ? value.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : value}</p>
      <p className="text-xs text-dark/50 mt-1 font-medium">{label}</p>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
// PAYMENT MODAL
// ═══════════════════════════════════════════════════════════════════

export function PaymentModal({ pagamento, onClose, onSaved }) {
  const [valorPago, setValorPago] = useState('');
  const [forma, setForma] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (pagamento) {
      setValorPago(pagamento.valor_pago > 0 ? pagamento.valor_pago.toString() : '');
      setForma(pagamento.forma_pagamento || '');
    }
  }, [pagamento]);

  if (!pagamento) return null;

  const restante = pagamento.valor_total - pagamento.valor_pago;

  const handleSave = async (payFull) => {
    setSaving(true);
    try {
      const val = payFull ? pagamento.valor_total : parseFloat(valorPago) || 0;
      await atualizarPagamento(pagamento.id, {
        valor_pago: val,
        forma_pagamento: forma || undefined,
      });
      onSaved?.();
      onClose();
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const statusColor = {
    pendente: 'bg-yellow-100 text-yellow-700',
    parcial: 'bg-blue-100 text-blue-700',
    pago: 'bg-emerald-100 text-emerald-700',
    atrasado: 'bg-red-100 text-red-600',
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-elegant max-w-md w-full animate-scaleIn" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-primary">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-lg font-semibold text-dark">Registrar Pagamento</h3>
            <button onClick={onClose} className="text-dark/40 hover:text-dark"><FiX size={20} /></button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-soft rounded-2xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-dark/50">Procedimento</span>
              <span className="font-medium text-dark">{pagamento.descricao}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-dark/50">Data</span>
              <span className="font-medium text-dark">{new Date(pagamento.data_atendimento + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-dark/50">Valor Total</span>
              <span className="font-bold text-accent text-lg">R$ {pagamento.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            {pagamento.valor_pago > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-dark/50">Já Pago</span>
                <span className="font-medium text-emerald-600">R$ {pagamento.valor_pago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-dark/50">Restante</span>
              <span className="font-bold text-dark">R$ {restante.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-end">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[pagamento.status] || 'bg-gray-100 text-gray-600'}`}>
                {pagamento.status.toUpperCase()}
              </span>
            </div>
          </div>

          {pagamento.status !== 'pago' && (
            <>
              <div>
                <label className="block text-sm font-medium text-dark/60 mb-1">Forma de Pagamento</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { val: 'dinheiro', icon: FiDollarSign, label: 'Dinheiro' },
                    { val: 'pix', icon: FiSmartphone, label: 'Pix' },
                    { val: 'cartao', icon: FiCreditCard, label: 'Cartão' },
                    { val: 'outro', icon: FiTag, label: 'Outro' },
                  ].map(f => (
                    <button
                      key={f.val}
                      onClick={() => setForma(f.val)}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 text-xs font-medium transition-all ${forma === f.val ? 'border-accent bg-accent/5 text-accent' : 'border-primary text-dark/50 hover:border-secondary'}`}
                    >
                      <f.icon size={18} />
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark/60 mb-1">Valor a Pagar (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={pagamento.valor_total}
                  value={valorPago}
                  onChange={e => setValorPago(e.target.value)}
                  placeholder={`Restante: R$ ${restante.toFixed(2)}`}
                  className="w-full px-4 py-3 rounded-xl border border-primary focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none text-dark"
                />
              </div>
            </>
          )}
        </div>

        {pagamento.status !== 'pago' && (
          <div className="p-6 pt-0 flex gap-3">
            <button
              onClick={() => handleSave(false)}
              disabled={saving || !valorPago}
              className="flex-1 px-4 py-3 rounded-xl border-2 border-accent text-accent font-medium hover:bg-accent/5 transition-all disabled:opacity-40"
            >
              Pagar Parcial
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-accent to-accent-dark text-white font-medium hover:shadow-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <FiCheck size={16} /> Pagar Total
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
// EXPENSE MODAL
// ═══════════════════════════════════════════════════════════════════

export function ExpenseModal({ onClose, onSaved, categorias = [] }) {
  const [form, setForm] = useState({
    nome: '',
    categoria_id: '',
    categoria: '',
    tipo: 'clinica',
    valor_total: '',
    forma_pagamento: 'pix',
    parcelas_total: 1,
    data: new Date().toISOString().split('T')[0],
    observacoes: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome || !form.valor_total) return;
    setSaving(true);
    try {
      const cat = categorias.find(c => c.id === parseInt(form.categoria_id));
      await criarDespesa({
        ...form,
        categoria_id: form.categoria_id ? parseInt(form.categoria_id) : null,
        categoria: cat ? cat.nome : form.categoria || 'Outros',
        valor_total: parseFloat(form.valor_total),
        parcelas_total: parseInt(form.parcelas_total) || 1,
      });
      onSaved?.();
      onClose();
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-elegant max-w-lg w-full animate-scaleIn max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-primary">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-lg font-semibold text-dark">Novo Gasto</h3>
            <button onClick={onClose} className="text-dark/40 hover:text-dark"><FiX size={20} /></button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Tipo */}
          <div className="grid grid-cols-2 gap-3">
            {['clinica', 'pessoal'].map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setForm({ ...form, tipo: t })}
                className={`py-3 rounded-xl border-2 font-medium text-sm transition-all ${form.tipo === t ? 'border-accent bg-accent/5 text-accent' : 'border-primary text-dark/50 hover:border-secondary'}`}
              >
                {t === 'clinica' ? '🏥 Clínica' : '👤 Pessoal'}
              </button>
            ))}
          </div>

          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-dark/60 mb-1">Descrição</label>
            <input
              type="text"
              value={form.nome}
              onChange={e => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex: Aluguel do consultório"
              className="w-full px-4 py-3 rounded-xl border border-primary focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none"
              required
            />
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-sm font-medium text-dark/60 mb-1">Categoria</label>
            <select
              value={form.categoria_id}
              onChange={e => setForm({ ...form, categoria_id: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-primary focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none bg-white"
            >
              <option value="">Selecione...</option>
              {categorias.filter(c => c.tipo === form.tipo || c.nome === 'Outros').map(c => (
                <option key={c.id} value={c.id}>{c.icone} {c.nome}</option>
              ))}
            </select>
          </div>

          {/* Valor e Parcelas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-dark/60 mb-1">Valor Total (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.valor_total}
                onChange={e => setForm({ ...form, valor_total: e.target.value })}
                placeholder="0,00"
                className="w-full px-4 py-3 rounded-xl border border-primary focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark/60 mb-1">Parcelas</label>
              <select
                value={form.parcelas_total}
                onChange={e => setForm({ ...form, parcelas_total: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-primary focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none bg-white"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                  <option key={n} value={n}>{n === 1 ? 'À vista' : `${n}x de R$ ${(parseFloat(form.valor_total || 0) / n).toFixed(2)}`}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Data e Forma */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-dark/60 mb-1">Data</label>
              <input
                type="date"
                value={form.data}
                onChange={e => setForm({ ...form, data: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-primary focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark/60 mb-1">Forma de Pagamento</label>
              <select
                value={form.forma_pagamento}
                onChange={e => setForm({ ...form, forma_pagamento: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-primary focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none bg-white"
              >
                <option value="dinheiro">Dinheiro</option>
                <option value="pix">Pix</option>
                <option value="cartao">Cartão</option>
                <option value="outro">Outro</option>
              </select>
            </div>
          </div>

          {/* Obs */}
          <div>
            <label className="block text-sm font-medium text-dark/60 mb-1">Observações</label>
            <textarea
              value={form.observacoes}
              onChange={e => setForm({ ...form, observacoes: e.target.value })}
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-primary focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-accent to-accent-dark text-white font-semibold hover:shadow-lg transition-all disabled:opacity-60"
          >
            {saving ? 'Salvando...' : 'Salvar Gasto'}
          </button>
        </form>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
// CLIENT HISTORY MODAL
// ═══════════════════════════════════════════════════════════════════

export function ClientHistoryModal({ clienteId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clienteId) return;
    setLoading(true);
    getHistoricoCliente(clienteId)
      .then(res => setData(res.data))
      .catch(() => alert('Erro ao carregar histórico'))
      .finally(() => setLoading(false));
  }, [clienteId]);

  if (!clienteId) return null;

  const statusColor = {
    pendente: 'bg-yellow-100 text-yellow-700',
    parcial: 'bg-blue-100 text-blue-700',
    pago: 'bg-emerald-100 text-emerald-700',
    atrasado: 'bg-red-100 text-red-600',
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-elegant max-w-2xl w-full animate-scaleIn max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-primary">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-lg font-semibold text-dark">
              Histórico Financeiro {data?.cliente?.nome ? `— ${data.cliente.nome}` : ''}
            </h3>
            <button onClick={onClose} className="text-dark/40 hover:text-dark"><FiX size={20} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8 text-dark/40">Carregando...</div>
          ) : data ? (
            <>
              {/* Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="bg-soft rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-accent">R$ {data.resumo.total_gasto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  <p className="text-xs text-dark/50">Total Pago</p>
                </div>
                <div className="bg-soft rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-dark">R$ {data.resumo.total_pendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  <p className="text-xs text-dark/50">Pendente</p>
                </div>
                <div className="bg-soft rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-dark">{data.resumo.total_atendimentos}</p>
                  <p className="text-xs text-dark/50">Atendimentos</p>
                </div>
                <div className="bg-soft rounded-xl p-3 text-center">
                  <p className={`text-lg font-bold ${data.resumo.atrasados > 0 ? 'text-red-500' : 'text-emerald-600'}`}>{data.resumo.atrasados}</p>
                  <p className="text-xs text-dark/50">Atrasados</p>
                </div>
              </div>

              {/* Payment list */}
              <div className="space-y-2">
                {data.pagamentos.map(p => (
                  <div key={p.id} className={`p-3 rounded-xl border ${p.status === 'atrasado' ? 'border-red-200 bg-red-50/50' : 'border-primary bg-soft'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-dark">{p.descricao}</p>
                        <p className="text-xs text-dark/50">{new Date(p.data_atendimento + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-dark">R$ {p.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[p.status]}`}>
                          {p.status.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {data.pagamentos.length === 0 && (
                  <p className="text-center text-dark/40 text-sm py-6">Nenhum registro financeiro</p>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
// CATEGORY MANAGER MODAL
// ═══════════════════════════════════════════════════════════════════

export function CategoryManagerModal({ onClose, onSaved }) {
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCat, setNewCat] = useState({ nome: '', tipo: 'clinica', icone: '📌' });
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await getCategoriasDespesa({ apenas_ativas: false });
      setCategorias(res.data);
    } catch { }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!newCat.nome.trim()) return;
    setSaving(true);
    try {
      await criarCategoriaDespesa(newCat);
      setNewCat({ nome: '', tipo: 'clinica', icone: '📌' });
      load();
      onSaved?.();
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro');
    }
    setSaving(false);
  };

  const handleUpdate = async (id) => {
    if (!editing) return;
    setSaving(true);
    try {
      await atualizarCategoriaDespesa(id, editing);
      setEditing(null);
      load();
      onSaved?.();
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro');
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Desativar esta categoria?')) return;
    try {
      await deletarCategoriaDespesa(id);
      load();
      onSaved?.();
    } catch (err) {
      alert(err.response?.data?.detail || 'Erro');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-elegant max-w-lg w-full animate-scaleIn max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-primary">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-lg font-semibold text-dark">Gerenciar Categorias</h3>
            <button onClick={onClose} className="text-dark/40 hover:text-dark"><FiX size={20} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Add new */}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <input
                type="text"
                value={newCat.nome}
                onChange={e => setNewCat({ ...newCat, nome: e.target.value })}
                placeholder="Nova categoria..."
                className="w-full px-3 py-2 rounded-xl border border-primary focus:border-accent outline-none text-sm"
              />
            </div>
            <select
              value={newCat.tipo}
              onChange={e => setNewCat({ ...newCat, tipo: e.target.value })}
              className="px-3 py-2 rounded-xl border border-primary text-sm bg-white"
            >
              <option value="clinica">Clínica</option>
              <option value="pessoal">Pessoal</option>
            </select>
            <button
              onClick={handleCreate}
              disabled={saving || !newCat.nome.trim()}
              className="px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-dark transition disabled:opacity-40"
            >
              <FiPlus size={16} />
            </button>
          </div>

          {/* List */}
          {loading ? (
            <p className="text-center text-dark/40">Carregando...</p>
          ) : (
            <div className="space-y-2">
              {categorias.map(cat => (
                <div key={cat.id} className={`flex items-center gap-3 p-3 rounded-xl border ${cat.ativo ? 'border-primary bg-soft' : 'border-red-100 bg-red-50/50 opacity-60'}`}>
                  <span className="text-lg">{cat.icone}</span>
                  {editing && editing._id === cat.id ? (
                    <>
                      <input
                        className="flex-1 px-2 py-1 rounded-lg border border-accent text-sm outline-none"
                        value={editing.nome || ''}
                        onChange={e => setEditing({ ...editing, nome: e.target.value })}
                      />
                      <button onClick={() => handleUpdate(cat.id)} className="text-accent hover:text-accent-dark">
                        <FiCheck size={16} />
                      </button>
                      <button onClick={() => setEditing(null)} className="text-dark/40">
                        <FiX size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-dark">{cat.nome}</p>
                        <p className="text-xs text-dark/40">{cat.tipo === 'clinica' ? 'Clínica' : 'Pessoal'}</p>
                      </div>
                      <button onClick={() => setEditing({ _id: cat.id, nome: cat.nome })} className="text-dark/30 hover:text-accent">
                        <FiEdit2 size={14} />
                      </button>
                      {cat.ativo && (
                        <button onClick={() => handleDelete(cat.id)} className="text-dark/30 hover:text-red-400">
                          <FiTrash2 size={14} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
