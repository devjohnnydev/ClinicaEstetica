import { useState, useEffect, useMemo } from 'react';
import { FiX, FiSearch, FiUser, FiEdit2, FiCalendar, FiAlertCircle, FiCheck, FiXCircle, FiPlay, FiRefreshCw, FiGlobe, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import {
  getAgendaClientes, criarAgendaCliente, getPacientesDisponiveis,
  getServicos, getProfissionais, criarAgendamento, atualizarAgendamento,
  cancelarAgendamento, naoCompareceu, concluirAgendamento, confirmarAgendamento,
  emAtendimento, criarBloqueio, criarListaEspera, deletarBloqueio,
  getBloqueiosGlobais, criarBloqueioGlobal, atualizarBloqueioGlobal, deletarBloqueioGlobal,
} from '../../services/api';

function timeToMin(t) { if (!t) return 0; const p = t.split(':'); return parseInt(p[0]) * 60 + parseInt(p[1]); }

/* ── Overlay base ─────────────────────────────────────────────── */
function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className={`relative bg-white rounded-t-2xl sm:rounded-2xl shadow-elegant ${wide ? 'w-full max-w-2xl' : 'w-full max-w-lg'} max-h-[92vh] overflow-y-auto animate-scaleIn`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-primary sticky top-0 bg-white z-10 rounded-t-2xl">
          <h3 className="font-heading font-semibold text-dark text-lg">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-dark/40 hover:text-dark hover:bg-gray-200 transition-colors">
            <FiX size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

const inputCls = "w-full px-4 py-2.5 rounded-2xl border border-secondary/60 bg-soft focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none text-sm transition-all";
const btnPrimary = "px-5 py-2.5 bg-gradient-to-r from-accent to-accent-dark text-white rounded-2xl font-medium text-sm shadow-card hover:shadow-hover transition-all";
const btnSecondary = "px-5 py-2.5 border border-secondary text-dark/60 rounded-2xl font-medium text-sm hover:bg-primary/50 transition-all";
const btnDanger = "px-5 py-2.5 bg-red-50 text-red-500 border border-red-200 rounded-2xl font-medium text-sm hover:bg-red-100 transition-all";
const labelCls = "block text-xs font-medium text-dark/60 mb-1.5";

/* ── Client search + quick-create ─────────────────────────────── */
function ClientPicker({ value, onChange, clients, setClients }) {
  const [q, setQ] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ nome: '', telefone: '', email: '', data_nascimento: '' });

  useEffect(() => { loadClients(); }, []);
  const loadClients = async (busca) => {
    try { const r = await getAgendaClientes(busca); setClients(r.data); } catch {}
  };

  const handleSearch = (v) => { setQ(v); loadClients(v); };

  const handleCreate = async () => {
    try {
      const payload = { ...form };
      if (!payload.data_nascimento) delete payload.data_nascimento;
      const r = await criarAgendaCliente(payload);
      setClients(prev => [r.data, ...prev]);
      onChange(r.data.id);
      setShowCreate(false);
      setForm({ nome: '', telefone: '', email: '', data_nascimento: '' });
    } catch {}
  };

  const selected = clients.find(c => c.id === value);

  return (
    <div>
      <label className={labelCls}>Cliente *</label>
      {selected ? (
        <div className="flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-2xl">
          <FiUser className="text-accent" size={16} />
          <span className="text-sm font-medium text-dark flex-1">{selected.nome}</span>
          <button onClick={() => onChange(null)} className="text-dark/40 hover:text-dark text-xs">Trocar</button>
        </div>
      ) : (
        <>
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dark/30" size={14} />
            <input className={`${inputCls} pl-9`} placeholder="Buscar cliente..." value={q} onChange={e => handleSearch(e.target.value)} />
          </div>
          {q && (
            <div className="mt-1 max-h-32 overflow-y-auto border border-secondary/40 rounded-xl bg-white shadow-card">
              {clients.filter(c => c.nome.toLowerCase().includes(q.toLowerCase())).map(c => (
                <button key={c.id} className="w-full text-left px-3 py-2 text-sm hover:bg-primary/50 transition-colors border-b border-primary/30 last:border-0" onClick={() => { onChange(c.id); setQ(''); }}>
                  <span className="font-medium">{c.nome}</span>
                  {c.telefone && <span className="text-dark/40 ml-2">{c.telefone}</span>}
                  {c.tags && <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full">{c.tags}</span>}
                </button>
              ))}
              {clients.filter(c => c.nome.toLowerCase().includes(q.toLowerCase())).length === 0 && (
                <div className="px-3 py-2 text-sm text-dark/40">Nenhum cliente encontrado</div>
              )}
            </div>
          )}
          <button onClick={() => setShowCreate(!showCreate)} className="mt-2 text-xs text-accent hover:underline font-medium">+ Cadastrar novo cliente</button>
          {showCreate && (
            <div className="mt-2 p-4 bg-primary/30 rounded-xl space-y-2 border border-secondary/30">
              <input className={inputCls} placeholder="Nome *" value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <input className={inputCls} placeholder="Telefone *" value={form.telefone} onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))} />
                <input className={inputCls} placeholder="Email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <input className={inputCls} type="date" value={form.data_nascimento} onChange={e => setForm(p => ({ ...p, data_nascimento: e.target.value }))} />
              <button className={btnPrimary} onClick={handleCreate} disabled={!form.nome || !form.telefone}>Cadastrar</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Multi-date Calendar Picker ───────────────────────────────── */
function MultiDateCalendar({ selectedDates, onChange }) {
  const [viewDate, setViewDate] = useState(new Date());
  const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  const y = viewDate.getFullYear(), m = viewDate.getMonth();
  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today = new Date().toISOString().split('T')[0];

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const toggleDate = (day) => {
    const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const newDates = selectedDates.includes(ds)
      ? selectedDates.filter(d => d !== ds)
      : [...selectedDates, ds].sort();
    onChange(newDates);
  };

  const isSelected = (day) => {
    const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return selectedDates.includes(ds);
  };

  return (
    <div className="border border-secondary/40 rounded-2xl overflow-hidden bg-white">
      {/* Calendar header */}
      <div className="flex items-center justify-between px-4 py-3 bg-soft border-b border-secondary/30">
        <button type="button" onClick={() => setViewDate(new Date(y, m - 1, 1))} className="w-7 h-7 rounded-lg bg-white shadow-sm border border-secondary/30 flex items-center justify-center hover:bg-primary">
          <FiChevronLeft size={14} />
        </button>
        <span className="text-sm font-semibold text-dark">{MONTHS[m]} {y}</span>
        <button type="button" onClick={() => setViewDate(new Date(y, m + 1, 1))} className="w-7 h-7 rounded-lg bg-white shadow-sm border border-secondary/30 flex items-center justify-center hover:bg-primary">
          <FiChevronRight size={14} />
        </button>
      </div>
      {/* Day headers */}
      <div className="grid grid-cols-7">
        {DAYS.map(d => (
          <div key={d} className="text-center py-1.5 text-[10px] font-semibold text-dark/40 uppercase">{d}</div>
        ))}
      </div>
      {/* Days grid */}
      <div className="grid grid-cols-7 gap-px bg-secondary/20 p-px">
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="bg-gray-50 min-h-[36px]" />;
          const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const sel = isSelected(day);
          const isToday = ds === today;
          const isPast = ds < today;
          return (
            <button
              key={i}
              type="button"
              onClick={() => !isPast && toggleDate(day)}
              disabled={isPast}
              className={`min-h-[36px] flex items-center justify-center text-sm font-medium transition-all
                ${sel ? 'bg-accent text-white shadow-sm' : 'bg-white hover:bg-accent/10'}
                ${isToday && !sel ? 'ring-2 ring-accent/40 ring-inset' : ''}
                ${isPast ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {day}
            </button>
          );
        })}
      </div>
      {/* Selected dates summary */}
      {selectedDates.length > 0 && (
        <div className="px-3 py-2 bg-accent/5 border-t border-secondary/20">
          <p className="text-[10px] font-semibold text-dark/50 uppercase mb-1">{selectedDates.length} data(s) selecionada(s)</p>
          <div className="flex flex-wrap gap-1">
            {selectedDates.map(d => (
              <span key={d} className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/15 text-accent rounded-full text-[11px] font-medium">
                {new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                <button type="button" onClick={() => onChange(selectedDates.filter(x => x !== d))} className="hover:text-red-500">×</button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Multi-time Picker ────────────────────────────────────────── */
function MultiTimePicker({ selectedTimes, onChange }) {
  const [inputTime, setInputTime] = useState('');

  const addTime = () => {
    if (inputTime && !selectedTimes.includes(inputTime)) {
      onChange([...selectedTimes, inputTime].sort());
      setInputTime('');
    }
  };

  // Quick time buttons 06:00-22:00
  const quickTimes = [];
  for (let h = 6; h <= 22; h++) {
    quickTimes.push(`${String(h).padStart(2, '0')}:00`);
  }

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input type="time" className={`${inputCls} flex-1`} value={inputTime} onChange={e => setInputTime(e.target.value)} min="06:00" max="23:00" />
        <button type="button" className="px-4 py-2 bg-accent/10 text-accent rounded-2xl text-sm font-medium hover:bg-accent/20 transition-all" onClick={addTime} disabled={!inputTime}>
          Adicionar
        </button>
      </div>
      {/* Quick select */}
      <div className="flex flex-wrap gap-1 mb-2">
        {quickTimes.map(t => (
          <button key={t} type="button" onClick={() => {
            if (selectedTimes.includes(t)) onChange(selectedTimes.filter(x => x !== t));
            else onChange([...selectedTimes, t].sort());
          }}
            className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-all border ${
              selectedTimes.includes(t)
                ? 'bg-accent text-white border-accent shadow-sm'
                : 'bg-white text-dark/50 border-secondary/40 hover:border-accent/40 hover:text-accent'
            }`}
          >{t}</button>
        ))}
      </div>
      {selectedTimes.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedTimes.map(t => (
            <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 bg-accent/15 text-accent rounded-full text-xs font-semibold">
              🕐 {t}
              <button type="button" onClick={() => onChange(selectedTimes.filter(x => x !== t))} className="hover:text-red-500 ml-0.5">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   NEW APPOINTMENT MODAL
   ══════════════════════════════════════════════════════════════════ */
export function NovoAgendamentoModal({ open, onClose, onSave, initialDate, initialTime, prefilledData, bloqueios = [] }) {
  const [clients, setClients] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [form, setForm] = useState({
    agenda_cliente_id: null, servico_id: '', profissional_id: '',
    data: '', hora_inicio: '', hora_fim: '', observacoes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      getServicos({}).then(r => setServicos(r.data)).catch(() => {});
      getProfissionais({}).then(r => setProfissionais(r.data)).catch(() => {});
      setForm(f => ({
        ...f,
        data: prefilledData?.data || initialDate || new Date().toISOString().split('T')[0],
        hora_inicio: prefilledData?.hora || initialTime || '',
        hora_fim: '',
        agenda_cliente_id: prefilledData?.agenda_cliente_id || null,
        servico_id: prefilledData?.servico_id || '',
        profissional_id: '',
        observacoes: '',
      }));
      setError('');
    }
  }, [open, initialDate, initialTime, prefilledData]);

  // Auto-calculate end time
  useEffect(() => {
    if (form.servico_id && form.hora_inicio) {
      const s = servicos.find(s => s.id === Number(form.servico_id));
      if (s) {
        const [h, m] = form.hora_inicio.split(':').map(Number);
        const total = h * 60 + m + s.duracao_minutos;
        const eh = String(Math.floor(total / 60)).padStart(2, '0');
        const em = String(total % 60).padStart(2, '0');
        setForm(f => ({ ...f, hora_fim: `${eh}:${em}` }));
      }
    }
  }, [form.servico_id, form.hora_inicio, servicos]);

  useEffect(() => {
    if (form.profissional_id && form.servico_id) {
      const prof = profissionais.find(p => p.id === Number(form.profissional_id));
      if (prof && prof.servicos) {
        if (!prof.servicos.some(s => s.id === Number(form.servico_id))) {
          setForm(f => ({ ...f, servico_id: '' }));
        }
      }
    }
  }, [form.profissional_id, profissionais]);

  const profSelecionado = profissionais.find(p => p.id === Number(form.profissional_id));
  const availableServicos = form.profissional_id && profSelecionado ? (profSelecionado.servicos || []) : servicos;

  const handleSave = async () => {
    if (!form.agenda_cliente_id || !form.servico_id || !form.profissional_id || !form.data || !form.hora_inicio) {
      setError('Preencha todos os campos obrigatórios'); return;
    }
    
    // Check constraints: Bloqueio
    if (form.hora_inicio) {
       const formStart = timeToMin(form.hora_inicio);
       const formEnd = form.hora_fim ? timeToMin(form.hora_fim) : formStart + 15;
       const conflict = bloqueios.find(b => 
          b.data === form.data &&
          b.profissional_id === Number(form.profissional_id) &&
          Math.max(formStart, timeToMin(b.hora_inicio?.slice(0,5))) < Math.min(formEnd, timeToMin(b.hora_fim?.slice(0,5)))
       );
       if (conflict) {
          setError('O horário selecionado conflita com um bloqueio deste profissional.');
          return;
       }
    }

    setLoading(true); setError('');
    try {
      await criarAgendamento({
        agenda_cliente_id: form.agenda_cliente_id,
        servico_id: Number(form.servico_id),
        profissional_id: Number(form.profissional_id),
        data: form.data,
        hora_inicio: form.hora_inicio + ':00',
        hora_fim: form.hora_fim ? form.hora_fim + ':00' : undefined,
        observacoes: form.observacoes || undefined,
      });
      onSave(); onClose();
    } catch (e) {
      setError(e.response?.data?.detail || 'Erro ao criar agendamento');
    } finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Novo Agendamento">
      <div className="space-y-4">
        {error && <div className="p-3 bg-red-50 text-red-500 rounded-xl text-sm flex items-center gap-2"><FiAlertCircle size={16}/>{error}</div>}
        <ClientPicker value={form.agenda_cliente_id} onChange={v => setForm(f => ({ ...f, agenda_cliente_id: v }))} clients={clients} setClients={setClients} />
        <div>
          <label className={labelCls}>Profissional *</label>
          <select className={inputCls} value={form.profissional_id} onChange={e => setForm(f => ({ ...f, profissional_id: e.target.value }))}>
            <option value="">Selecione...</option>
            {profissionais.map(p => (<option key={p.id} value={p.id}>{p.nome}</option>))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Procedimento *</label>
          <select className={inputCls} value={form.servico_id} onChange={e => setForm(f => ({ ...f, servico_id: e.target.value }))} disabled={!form.profissional_id}>
            <option value="">Selecione...</option>
            {availableServicos.map(s => (
              <option key={s.id} value={s.id}>{s.nome} — {s.duracao_minutos}min — R${s.preco?.toFixed(2)}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div><label className={labelCls}>Data *</label><input type="date" className={inputCls} value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} min="2020-01-01" /></div>
          <div><label className={labelCls}>Início *</label><input type="time" className={inputCls} value={form.hora_inicio} onChange={e => setForm(f => ({ ...f, hora_inicio: e.target.value }))} min="06:00" max="23:00" /></div>
          <div><label className={labelCls}>Fim</label><input type="time" className={inputCls} value={form.hora_fim} onChange={e => setForm(f => ({ ...f, hora_fim: e.target.value }))} /></div>
        </div>
        <div><label className={labelCls}>Observações</label><textarea className={inputCls} rows={2} value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} /></div>
        <div className="flex justify-end gap-3 pt-2">
          <button className={btnSecondary} onClick={onClose}>Cancelar</button>
          <button className={btnPrimary} onClick={handleSave} disabled={loading}>{loading ? 'Salvando...' : 'Agendar'}</button>
        </div>
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════
   APPOINTMENT DETAIL MODAL — FULL STATUS WORKFLOW + EDIT/REAGENDAR
   ══════════════════════════════════════════════════════════════════ */
export function DetalhesAgendamentoModal({ open, onClose, agendamento, onUpdate }) {
  const [showCancel, setShowCancel] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [servicos, setServicos] = useState([]);
  const [profissionais, setProfissionais] = useState([]);
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (open) { setShowCancel(false); setShowEdit(false); setMotivo(''); setError(''); } }, [open, agendamento]);

  useEffect(() => {
    if (showEdit && editForm.servico_id && editForm.hora_inicio) {
      const s = servicos.find(s => s.id === Number(editForm.servico_id));
      if (s) {
        const [h, m] = editForm.hora_inicio.split(':').map(Number);
        const total = h * 60 + m + s.duracao_minutos;
        const eh = String(Math.floor(total / 60)).padStart(2, '0');
        const em = String(total % 60).padStart(2, '0');
        setEditForm(f => ({ ...f, hora_fim: `${eh}:${em}` }));
      }
    }
  }, [editForm.servico_id, editForm.hora_inicio, servicos, showEdit]);

  useEffect(() => {
    if (showEdit && editForm.profissional_id && editForm.servico_id) {
      const prof = profissionais.find(p => p.id === Number(editForm.profissional_id));
      if (prof && prof.servicos) {
        if (!prof.servicos.some(s => s.id === Number(editForm.servico_id))) {
          setEditForm(f => ({ ...f, servico_id: '' }));
        }
      }
    }
  }, [editForm.profissional_id, profissionais, showEdit]);

  const profEditSelecionado = profissionais.find(p => p.id === Number(editForm.profissional_id));
  const availableEditServicos = editForm.profissional_id && profEditSelecionado ? (profEditSelecionado.servicos || []) : servicos;

  if (!open || !agendamento) return null;
  const ag = agendamento;

  const statusColors = {
    agendado:       { bg: '#EFF6FF', text: '#1D4ED8', border: '#93C5FD', badge: '#3B82F6' },
    confirmado:     { bg: '#ECFDF5', text: '#047857', border: '#6EE7B7', badge: '#10B981' },
    em_atendimento: { bg: '#EDE9FE', text: '#6D28D9', border: '#C4B5FD', badge: '#7C3AED' },
    concluido:      { bg: '#F0FDFA', text: '#0F766E', border: '#5EEAD4', badge: '#14B8A6' },
    nao_compareceu: { bg: '#FFF7ED', text: '#C2410C', border: '#FDBA74', badge: '#F97316' },
    cancelado:      { bg: '#FEF2F2', text: '#B91C1C', border: '#FCA5A5', badge: '#EF4444' },
  };
  const statusLabels = { agendado: 'Agendado', confirmado: 'Confirmado', em_atendimento: 'Em Atendimento', cancelado: 'Cancelado', nao_compareceu: 'Não Compareceu', concluido: 'Concluído' };
  const sc = statusColors[ag.status] || statusColors.agendado;
  const isCanceled = ag.status === 'cancelado';

  // status transitions
  const canEdit        = !isCanceled;
  const canNoShow      = !isCanceled;
  const canCancel      = !isCanceled;

  const doAction = async (fn) => {
    setLoading(true);
    try { await fn(ag.id); onUpdate(); onClose(); } catch (e) { setError(e.response?.data?.detail || 'Erro'); }
    finally { setLoading(false); }
  };

  const doCancel = async () => {
    setLoading(true);
    try { await cancelarAgendamento(ag.id); onUpdate(); onClose(); }
    catch (e) { setError(e.response?.data?.detail || 'Erro ao cancelar'); }
    finally { setLoading(false); }
  };

  const openEdit = async () => {
    try {
      const [sRes, pRes] = await Promise.all([getServicos({}), getProfissionais({})]);
      setServicos(sRes.data); setProfissionais(pRes.data);
    } catch {}
    setEditForm({
      data: ag.data,
      hora_inicio: ag.hora_inicio?.slice(0, 5),
      hora_fim: ag.hora_fim?.slice(0, 5),
      servico_id: ag.servico_id,
      profissional_id: ag.profissional_id,
      observacoes: ag.observacoes || '',
    });
    setShowEdit(true);
  };

  const saveEdit = async () => {
    if (!editForm.servico_id || !editForm.profissional_id || !editForm.data || !editForm.hora_inicio) {
      setError('Preencha todos os campos do agendamento (Profissional e Serviço)'); return;
    }

    setLoading(true); setError('');
    try {
      await atualizarAgendamento(ag.id, {
        data: editForm.data,
        hora_inicio: editForm.hora_inicio + ':00',
        hora_fim: editForm.hora_fim ? editForm.hora_fim + ':00' : undefined,
        servico_id: Number(editForm.servico_id),
        profissional_id: Number(editForm.profissional_id),
        status: (ag.status === 'nao_compareceu' || ag.status === 'cancelado') ? 'agendado' : ag.status,
        observacoes: editForm.observacoes || undefined,
      });
      onUpdate(); onClose();
    } catch (e) { setError(e.response?.data?.detail || 'Erro ao salvar'); }
    finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={() => { setShowCancel(false); setShowEdit(false); onClose(); }} title="Detalhes do Agendamento" wide={showEdit}>
      <div className="space-y-5">
        {error && <div className="p-3 bg-red-50 text-red-500 rounded-xl text-sm flex items-center gap-2"><FiAlertCircle size={14}/>{error}</div>}

        {/* Status badge */}
        <div className="flex items-center gap-3">
          <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide text-white" style={{ background: sc.badge }}>
            {statusLabels[ag.status]}
          </span>
        </div>

        {/* Service info */}
        <div className="p-4 rounded-2xl" style={{ background: sc.bg, border: `1px solid ${sc.border}` }}>
          <p className="font-heading font-semibold text-base" style={{ color: sc.text }}>{ag.servico?.nome || '—'}</p>
          <p className="text-xs mt-0.5" style={{ color: sc.text }}>{ag.servico?.duracao_minutos}min · R$ {ag.servico?.preco?.toFixed(2)}</p>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: 'Cliente', val: ag.cliente?.nome, sub: ag.cliente?.telefone },
            { label: 'Profissional', val: ag.profissional?.nome },
            { label: 'Data', val: ag.data ? new Date(ag.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }) : '—' },
            { label: 'Horário', val: `${ag.hora_inicio?.slice(0,5)} — ${ag.hora_fim?.slice(0,5)}` },
          ].map((d, i) => (
            <div key={i} className="p-3 bg-soft rounded-xl">
              <p className="text-[10px] text-dark/40 uppercase font-semibold">{d.label}</p>
              <p className="font-medium text-sm text-dark mt-0.5">{d.val || '—'}</p>
              {d.sub && <p className="text-xs text-dark/40">{d.sub}</p>}
            </div>
          ))}
        </div>

        {ag.observacoes && (
          <div className="p-3 bg-soft rounded-xl">
            <p className="text-[10px] text-dark/40 uppercase font-semibold">Observações</p>
            <p className="text-sm text-dark mt-0.5">{ag.observacoes}</p>
          </div>
        )}

        {/* ── EDIT FORM ─────────────────────────────────── */}
        {showEdit && (
          <div className="p-4 border border-accent/30 bg-accent/5 rounded-2xl space-y-3 animate-scaleIn">
            <div className="flex items-center gap-2 mb-1">
              <FiEdit2 size={14} className="text-accent" />
              <p className="text-sm font-semibold text-dark">Editar / Reagendar</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><label className={labelCls}>Data</label><input type="date" className={inputCls} value={editForm.data} onChange={e => setEditForm(f => ({ ...f, data: e.target.value }))} /></div>
              <div><label className={labelCls}>Início</label><input type="time" className={inputCls} value={editForm.hora_inicio} onChange={e => setEditForm(f => ({ ...f, hora_inicio: e.target.value }))} min="06:00" max="23:00" /></div>
              <div><label className={labelCls}>Fim</label><input type="time" className={inputCls} value={editForm.hora_fim} onChange={e => setEditForm(f => ({ ...f, hora_fim: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className={labelCls}>Profissional</label><select className={inputCls} value={editForm.profissional_id} onChange={e => setEditForm(f => ({ ...f, profissional_id: Number(e.target.value) }))}><option value="">Selecione...</option>{profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
              <div><label className={labelCls}>Serviço</label><select className={inputCls} value={editForm.servico_id} onChange={e => setEditForm(f => ({ ...f, servico_id: Number(e.target.value) }))} disabled={!editForm.profissional_id}><option value="">Selecione...</option>{availableEditServicos.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}</select></div>
            </div>
            <div><label className={labelCls}>Observações</label><textarea className={inputCls} rows={2} value={editForm.observacoes} onChange={e => setEditForm(f => ({ ...f, observacoes: e.target.value }))} /></div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button className={btnPrimary} onClick={saveEdit} disabled={loading}>{loading ? 'Salvando...' : 'Salvar Alterações'}</button>
              <button className={btnSecondary} onClick={() => setShowEdit(false)}>Voltar</button>
            </div>
          </div>
        )}

        {/* ── ACTIONS ────────────────────────────────────── */}
        {!isCanceled && !showEdit && (
          <div className="pt-3 border-t border-primary space-y-3">
            <p className="text-[10px] text-dark/30 uppercase font-semibold tracking-wide">Ações</p>
            <div className="flex flex-wrap gap-2">
              {canEdit && (
                <button className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-2xl text-sm font-medium hover:bg-blue-100 transition-all" onClick={openEdit}>
                  <FiEdit2 size={14} /> Editar / Reagendar
                </button>
              )}
              {canNoShow && (
                <button className="flex items-center gap-1.5 px-4 py-2.5 bg-orange-50 text-orange-500 border border-orange-200 rounded-2xl text-sm font-medium hover:bg-orange-100 transition-all" onClick={() => doAction(naoCompareceu)} disabled={loading}>
                  <FiAlertCircle size={14} /> Não Compareceu
                </button>
              )}
              {canCancel && (
                <button className="flex items-center gap-1.5 px-4 py-2.5 bg-red-50 text-red-500 border border-red-200 rounded-2xl text-sm font-medium hover:bg-red-100 transition-all" onClick={() => setShowCancel(true)}>
                  <FiXCircle size={14} /> Cancelar
                </button>
              )}
            </div>

            {showCancel && (
              <div className="p-4 bg-red-50 rounded-2xl border border-red-200 space-y-3 animate-scaleIn">
                <p className="text-sm font-semibold text-red-600">Cancelar este agendamento?</p>
                <textarea className={inputCls} rows={2} placeholder="Motivo do cancelamento (opcional)..." value={motivo} onChange={e => setMotivo(e.target.value)} />
                <div className="flex gap-2">
                  <button className={btnDanger} onClick={doCancel} disabled={loading}>{loading ? 'Cancelando...' : 'Confirmar Cancelamento'}</button>
                  <button className={btnSecondary} onClick={() => setShowCancel(false)}>Voltar</button>
                </div>
              </div>
            )}
          </div>
        )}

        {isCanceled && (
          <div className="p-4 bg-red-50 rounded-2xl border border-red-200">
            <p className="text-sm font-semibold text-red-600">Agendamento cancelado</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════
   BLOQUEIO MODAL — with integrated Global Block option
   ══════════════════════════════════════════════════════════════════ */
export function BloqueioModal({ open, onClose, onSave, profissionais: profList, bloqueio }) {
  const [profs, setProfs] = useState([]);
  const [editId, setEditId] = useState(null);
  const [isGlobal, setIsGlobal] = useState(false);
  const [form, setForm] = useState({ profissional_id: '', data: '', hora_inicio: '', hora_fim: '', tipo: 'ausencia', motivo: '' });
  const [globalForm, setGlobalForm] = useState({ hora_inicio: '12:00', hora_fim: '13:00', motivo: '' });
  const [globais, setGlobais] = useState([]);
  const [editGlobalId, setEditGlobalId] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadGlobais = async () => {
    try { const r = await getBloqueiosGlobais(); setGlobais(r.data); } catch {}
  };

  useEffect(() => {
    if (open) {
      if (profList?.length) setProfs(profList);
      else getProfissionais({}).then(r => setProfs(r.data)).catch(() => {});
      loadGlobais();
      setIsGlobal(false);
      setEditGlobalId(null);
      
      if (bloqueio) {
        setEditId(bloqueio.id);
        setForm({
          profissional_id: bloqueio.profissional_id || '',
          data: bloqueio.data,
          hora_inicio: bloqueio.hora_inicio?.slice(0, 5),
          hora_fim: bloqueio.hora_fim?.slice(0, 5),
          tipo: bloqueio.tipo || 'ausencia',
          motivo: bloqueio.motivo || ''
        });
      } else {
        setEditId(null);
        setForm({ profissional_id: '', data: new Date().toISOString().split('T')[0], hora_inicio: '08:00', hora_fim: '18:00', tipo: 'ausencia', motivo: '' });
      }
    }
  }, [open, bloqueio]);

  const handleSave = async () => {
    setLoading(true);
    try {
      if (editId) {
        await deletarBloqueio(editId);
      }
      await criarBloqueio({ ...form, profissional_id: Number(form.profissional_id), hora_inicio: form.hora_inicio + ':00', hora_fim: form.hora_fim + ':00' });
      onSave(); onClose();
    } catch {} finally { setLoading(false); }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      if (editId) await deletarBloqueio(editId);
      onSave(); onClose();
    } catch {} finally { setLoading(false); }
  };

  // Global block methods
  const handleSaveGlobal = async () => {
    setLoading(true);
    try {
      if (editGlobalId) {
        await atualizarBloqueioGlobal(editGlobalId, {
          hora_inicio: globalForm.hora_inicio + ':00',
          hora_fim: globalForm.hora_fim + ':00',
          motivo: globalForm.motivo || undefined,
        });
      } else {
        await criarBloqueioGlobal({
          hora_inicio: globalForm.hora_inicio + ':00',
          hora_fim: globalForm.hora_fim + ':00',
          motivo: globalForm.motivo || undefined,
        });
      }
      setEditGlobalId(null);
      setGlobalForm({ hora_inicio: '12:00', hora_fim: '13:00', motivo: '' });
      loadGlobais();
      onSave();
    } catch {} finally { setLoading(false); }
  };

  const handleDeleteGlobal = async (id) => {
    try {
      await deletarBloqueioGlobal(id);
      loadGlobais();
      onSave();
    } catch {}
  };

  const handleEditGlobal = (bg) => {
    setEditGlobalId(bg.id);
    setGlobalForm({
      hora_inicio: bg.hora_inicio?.slice(0, 5) || '12:00',
      hora_fim: bg.hora_fim?.slice(0, 5) || '13:00',
      motivo: bg.motivo || '',
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Bloquear Horário" wide>
      <div className="space-y-4">
        {/* Toggle: Individual vs Global */}
        <div className="flex bg-soft rounded-2xl p-1 gap-1">
          <button onClick={() => setIsGlobal(false)} className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${!isGlobal ? 'bg-white text-accent shadow-card' : 'text-dark/40 hover:text-dark'}`}>
            <FiCalendar size={14} /> Bloqueio Individual
          </button>
          <button onClick={() => setIsGlobal(true)} className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${isGlobal ? 'bg-white text-accent shadow-card' : 'text-dark/40 hover:text-dark'}`}>
            <FiGlobe size={14} /> Bloqueio Global
          </button>
        </div>

        {!isGlobal ? (
          /* ── Individual Block Form ── */
          <>
            <div><label className={labelCls}>Profissional *</label><select className={inputCls} value={form.profissional_id} onChange={e => setForm(f => ({ ...f, profissional_id: e.target.value }))}><option value="">Selecione...</option>{profs.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
            <div><label className={labelCls}>Tipo</label><select className={inputCls} value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}><option value="ausencia">Ausência</option><option value="atestado">Atestado</option><option value="intervalo">Intervalo</option></select></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div><label className={labelCls}>Data</label><input type="date" className={inputCls} value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} /></div>
              <div><label className={labelCls}>Início</label><input type="time" className={inputCls} value={form.hora_inicio} onChange={e => setForm(f => ({ ...f, hora_inicio: e.target.value }))} min="06:00" max="23:00" /></div>
              <div><label className={labelCls}>Fim</label><input type="time" className={inputCls} value={form.hora_fim} onChange={e => setForm(f => ({ ...f, hora_fim: e.target.value }))} min="06:00" max="23:00" /></div>
            </div>
            <div><label className={labelCls}>Motivo</label><textarea className={inputCls} rows={2} value={form.motivo} onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))} /></div>
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-2">
              {editId ? (
                 <button className={btnDanger} onClick={handleDelete} disabled={loading}>{loading ? '...' : 'Desbloquear / Remover'}</button>
              ) : <div />}
              <div className="flex gap-2">
                <button className={btnSecondary} onClick={onClose}>Cancelar</button>
                <button className={btnPrimary} onClick={handleSave} disabled={loading}>{loading ? 'Salvando...' : 'Salvar Bloqueio'}</button>
              </div>
            </div>
          </>
        ) : (
          /* ── Global Block Form ── */
          <>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/60">
              <p className="text-xs text-amber-700 flex items-center gap-1.5">
                <FiAlertCircle size={13} />
                <span><strong>Bloqueio Global</strong> bloqueia o horário para <strong>TODOS</strong> os profissionais em <strong>TODOS</strong> os dias. Permanece ativo até ser removido manualmente.</span>
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><label className={labelCls}>Horário Início *</label><input type="time" className={inputCls} value={globalForm.hora_inicio} onChange={e => setGlobalForm(f => ({ ...f, hora_inicio: e.target.value }))} min="06:00" max="23:00" /></div>
              <div><label className={labelCls}>Horário Fim *</label><input type="time" className={inputCls} value={globalForm.hora_fim} onChange={e => setGlobalForm(f => ({ ...f, hora_fim: e.target.value }))} min="06:00" max="23:00" /></div>
            </div>
            <div><label className={labelCls}>Motivo</label><textarea className={inputCls} rows={2} placeholder="Ex: Horário de almoço, intervalo..." value={globalForm.motivo} onChange={e => setGlobalForm(f => ({ ...f, motivo: e.target.value }))} /></div>
            <div className="flex justify-end gap-2">
              <button className={btnSecondary} onClick={() => { setEditGlobalId(null); setGlobalForm({ hora_inicio: '12:00', hora_fim: '13:00', motivo: '' }); }}>Limpar</button>
              <button className={btnPrimary} onClick={handleSaveGlobal} disabled={loading}>{loading ? 'Salvando...' : editGlobalId ? 'Atualizar Bloqueio' : 'Criar Bloqueio Global'}</button>
            </div>

            {/* Existing global blocks */}
            {globais.length > 0 && (
              <div className="pt-3 border-t border-secondary/30">
                <p className="text-[10px] text-dark/40 uppercase font-semibold tracking-wide mb-2">Bloqueios Globais Ativos</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {globais.map(bg => (
                    <div key={bg.id} className={`flex items-center gap-3 p-3 rounded-xl border ${bg.ativo ? 'bg-red-50/50 border-red-200/60' : 'bg-gray-50 border-gray-200 opacity-50'}`}>
                      <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                        <FiGlobe size={14} className="text-red-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-dark">{bg.hora_inicio?.slice(0,5)} — {bg.hora_fim?.slice(0,5)}</p>
                        <p className="text-xs text-dark/40 truncate">{bg.motivo || 'Sem motivo'}</p>
                      </div>
                      <button className="text-accent hover:text-accent-dark text-xs px-2 py-1" onClick={() => handleEditGlobal(bg)}>
                        <FiEdit2 size={13} />
                      </button>
                      <button className="text-red-400 hover:text-red-600 text-xs px-2 py-1" onClick={() => {
                        if (window.confirm('Remover este bloqueio global?')) handleDeleteGlobal(bg.id);
                      }}>
                        <FiX size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════
   LISTA DE ESPERA MODAL — Multi-date calendar + multi-time
   ══════════════════════════════════════════════════════════════════ */
export function ListaEsperaModal({ open, onClose, onSave }) {
  const [clients, setClients] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [form, setForm] = useState({ agenda_cliente_id: null, servico_id: '', observacoes: '' });
  const [selectedDates, setSelectedDates] = useState([]);
  const [selectedTimes, setSelectedTimes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      getServicos({}).then(r => setServicos(r.data)).catch(() => {});
      setForm({ agenda_cliente_id: null, servico_id: '', observacoes: '' });
      setSelectedDates([]);
      setSelectedTimes([]);
    }
  }, [open]);

  const handleSave = async () => {
    if (!form.agenda_cliente_id) return;
    setLoading(true);
    try {
      const payload = {
        agenda_cliente_id: form.agenda_cliente_id,
        datas_preferidas: selectedDates,
        horarios_preferidos: selectedTimes,
      };
      if (form.servico_id) payload.servico_id = Number(form.servico_id);
      if (form.observacoes) payload.observacoes = form.observacoes;
      await criarListaEspera(payload);
      onSave(); onClose();
    } catch {} finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Adicionar à Lista de Espera" wide>
      <div className="space-y-4">
        <ClientPicker value={form.agenda_cliente_id} onChange={v => setForm(f => ({ ...f, agenda_cliente_id: v }))} clients={clients} setClients={setClients} />
        <div><label className={labelCls}>Procedimento desejado</label><select className={inputCls} value={form.servico_id} onChange={e => setForm(f => ({ ...f, servico_id: e.target.value }))}><option value="">Qualquer</option>{servicos.map(s => <option key={s.id} value={s.id}>{s.nome} — {s.duracao_minutos}min</option>)}</select></div>
        
        {/* Multi-date Calendar */}
        <div>
          <label className={labelCls}>Datas Preferidas</label>
          <MultiDateCalendar selectedDates={selectedDates} onChange={setSelectedDates} />
        </div>

        {/* Multi-time Picker */}
        <div>
          <label className={labelCls}>Horários Preferidos</label>
          <MultiTimePicker selectedTimes={selectedTimes} onChange={setSelectedTimes} />
        </div>

        <div><label className={labelCls}>Observações</label><textarea className={inputCls} rows={2} value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} placeholder="Ex: Cliente prefere pela manhã..." /></div>
        <div className="flex justify-end gap-3">
          <button className={btnSecondary} onClick={onClose}>Cancelar</button>
          <button className={btnPrimary} onClick={handleSave} disabled={loading}>{loading ? 'Salvando...' : 'Adicionar à Lista'}</button>
        </div>
      </div>
    </Modal>
  );
}

export { Modal, inputCls, btnPrimary, btnSecondary, btnDanger, labelCls };
