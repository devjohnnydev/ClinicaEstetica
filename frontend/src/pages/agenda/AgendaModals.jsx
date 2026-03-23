import { useState, useEffect } from 'react';
import { FiX, FiSearch, FiUser, FiClock, FiCalendar } from 'react-icons/fi';
import {
  getAgendaClientes, criarAgendaCliente, getPacientesDisponiveis,
  getServicos, getProfissionais, criarAgendamento, atualizarAgendamento,
  cancelarAgendamento, naoCompareceu, concluirAgendamento, confirmarAgendamento,
  criarBloqueio, criarListaEspera,
} from '../../services/api';

/* ── Overlay base ─────────────────────────────────────────────── */
function Modal({ open, onClose, title, children, wide }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
      <div
        className={`relative bg-white rounded-2xl shadow-elegant ${wide ? 'w-full max-w-2xl' : 'w-full max-w-lg'} max-h-[90vh] overflow-y-auto animate-scaleIn`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-primary">
          <h3 className="font-heading font-semibold text-dark text-lg">{title}</h3>
          <button onClick={onClose} className="text-dark/40 hover:text-dark transition-colors"><FiX size={20} /></button>
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
            <div className="mt-1 max-h-32 overflow-y-auto border border-secondary/40 rounded-xl bg-white">
              {clients.filter(c => c.nome.toLowerCase().includes(q.toLowerCase())).map(c => (
                <button key={c.id} className="w-full text-left px-3 py-2 text-sm hover:bg-primary/50 transition-colors" onClick={() => { onChange(c.id); setQ(''); }}>
                  {c.nome} — {c.telefone}
                </button>
              ))}
            </div>
          )}
          <button onClick={() => setShowCreate(!showCreate)} className="mt-2 text-xs text-accent hover:underline">+ Novo cliente rápido</button>
          {showCreate && (
            <div className="mt-2 p-3 bg-primary/30 rounded-xl space-y-2">
              <input className={inputCls} placeholder="Nome *" value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} />
              <input className={inputCls} placeholder="Telefone *" value={form.telefone} onChange={e => setForm(p => ({ ...p, telefone: e.target.value }))} />
              <input className={inputCls} placeholder="Email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              <input className={inputCls} type="date" value={form.data_nascimento} onChange={e => setForm(p => ({ ...p, data_nascimento: e.target.value }))} />
              <button className={btnPrimary} onClick={handleCreate} disabled={!form.nome || !form.telefone}>Criar</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── NEW APPOINTMENT MODAL ────────────────────────────────────── */
export function NovoAgendamentoModal({ open, onClose, onSave, initialDate, initialTime }) {
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
        data: initialDate || new Date().toISOString().split('T')[0],
        hora_inicio: initialTime || '',
        hora_fim: '',
        agenda_cliente_id: null, servico_id: '', profissional_id: '', observacoes: '',
      }));
      setError('');
    }
  }, [open, initialDate, initialTime]);

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

  const handleSave = async () => {
    if (!form.agenda_cliente_id || !form.servico_id || !form.profissional_id || !form.data || !form.hora_inicio) {
      setError('Preencha todos os campos obrigatórios'); return;
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
    <Modal open={open} onClose={onClose} title="📅 Novo Agendamento">
      <div className="space-y-4">
        {error && <div className="p-3 bg-red-50 text-red-500 rounded-xl text-sm">{error}</div>}
        <ClientPicker value={form.agenda_cliente_id} onChange={v => setForm(f => ({ ...f, agenda_cliente_id: v }))} clients={clients} setClients={setClients} />
        <div>
          <label className={labelCls}>Procedimento *</label>
          <select className={inputCls} value={form.servico_id} onChange={e => setForm(f => ({ ...f, servico_id: e.target.value }))}>
            <option value="">Selecione...</option>
            {servicos.map(s => (
              <option key={s.id} value={s.id}>{s.nome} ({s.categoria}) — {s.duracao_minutos}min — R${s.preco.toFixed(2)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Profissional *</label>
          <select className={inputCls} value={form.profissional_id} onChange={e => setForm(f => ({ ...f, profissional_id: e.target.value }))}>
            <option value="">Selecione...</option>
            {profissionais.map(p => (<option key={p.id} value={p.id}>{p.nome}</option>))}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><label className={labelCls}>Data *</label><input type="date" className={inputCls} value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} /></div>
          <div><label className={labelCls}>Início *</label><input type="time" className={inputCls} value={form.hora_inicio} onChange={e => setForm(f => ({ ...f, hora_inicio: e.target.value }))} /></div>
          <div><label className={labelCls}>Fim</label><input type="time" className={inputCls} value={form.hora_fim} onChange={e => setForm(f => ({ ...f, hora_fim: e.target.value }))} /></div>
        </div>
        <div><label className={labelCls}>Observações</label><textarea className={inputCls} rows={2} value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} /></div>
        <div className="flex justify-end gap-3 pt-2">
          <button className={btnSecondary} onClick={onClose}>Cancelar</button>
          <button className={btnPrimary} onClick={handleSave} disabled={loading}>{loading ? 'Salvando...' : '✨ Agendar'}</button>
        </div>
      </div>
    </Modal>
  );
}

/* ── APPOINTMENT DETAIL MODAL ─────────────────────────────────── */
export function DetalhesAgendamentoModal({ open, onClose, agendamento, onUpdate }) {
  if (!open || !agendamento) return null;
  const ag = agendamento;
  const isEstetica = ag.servico?.categoria === 'estetica';
  const colorCls = isEstetica ? 'bg-accent/10 text-accent border-accent/20' : 'bg-nail/10 text-nail-dark border-nail/20';

  const now = new Date();
  const agStart = new Date(`${ag.data}T${ag.hora_inicio}`);
  const canCancel = now < agStart && !['cancelado', 'concluido', 'nao_compareceu'].includes(ag.status);
  const canMarkNoShow = now >= agStart && ['agendado', 'confirmado'].includes(ag.status);
  const canComplete = ['agendado', 'confirmado'].includes(ag.status);
  const canConfirm = ag.status === 'agendado';

  const doAction = async (fn) => { try { await fn(ag.id); onUpdate(); onClose(); } catch {} };

  const statusLabels = { agendado: 'Agendado', confirmado: 'Confirmado', cancelado: 'Cancelado', nao_compareceu: 'Não Compareceu', concluido: 'Concluído' };
  const statusColors = { agendado: 'bg-blue-50 text-blue-600', confirmado: 'bg-green-50 text-green-600', cancelado: 'bg-red-50 text-red-500', nao_compareceu: 'bg-orange-50 text-orange-500', concluido: 'bg-emerald-50 text-emerald-600' };

  return (
    <Modal open={open} onClose={onClose} title="Detalhes do Agendamento">
      <div className="space-y-4">
        <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${statusColors[ag.status] || ''}`}>{statusLabels[ag.status]}</div>
        <div className={`p-4 rounded-2xl border ${colorCls}`}>
          <p className="font-heading font-semibold">{ag.servico?.nome || '—'}</p>
          <p className="text-xs mt-1">{isEstetica ? '💆 Estética' : '💅 Unha'}</p>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-dark/40">Cliente:</span><p className="font-medium">{ag.cliente?.nome || '—'}</p></div>
          <div><span className="text-dark/40">Profissional:</span><p className="font-medium">{ag.profissional?.nome || '—'}</p></div>
          <div><span className="text-dark/40">Data:</span><p className="font-medium">{ag.data}</p></div>
          <div><span className="text-dark/40">Horário:</span><p className="font-medium">{ag.hora_inicio?.slice(0,5)} — {ag.hora_fim?.slice(0,5)}</p></div>
        </div>
        {ag.observacoes && <div className="text-sm"><span className="text-dark/40">Obs:</span><p>{ag.observacoes}</p></div>}
        <div className="flex flex-wrap gap-2 pt-3 border-t border-primary">
          {canConfirm && <button className={btnPrimary} onClick={() => doAction(confirmarAgendamento)}>✅ Confirmar</button>}
          {canComplete && <button className="px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-2xl text-sm font-medium hover:bg-emerald-100" onClick={() => doAction(concluirAgendamento)}>✔ Concluir</button>}
          {canMarkNoShow && <button className="px-4 py-2 bg-orange-50 text-orange-500 border border-orange-200 rounded-2xl text-sm font-medium hover:bg-orange-100" onClick={() => doAction(naoCompareceu)}>⚠ Não Compareceu</button>}
          {canCancel && <button className={btnDanger} onClick={() => doAction(cancelarAgendamento)}>✕ Cancelar</button>}
        </div>
      </div>
    </Modal>
  );
}

/* ── BLOQUEIO MODAL ───────────────────────────────────────────── */
export function BloqueioModal({ open, onClose, onSave, profissionais: profList }) {
  const [profs, setProfs] = useState([]);
  const [form, setForm] = useState({ profissional_id: '', data: '', hora_inicio: '', hora_fim: '', tipo: 'ausencia', motivo: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (profList?.length) setProfs(profList);
      else getProfissionais({}).then(r => setProfs(r.data)).catch(() => {});
      setForm({ profissional_id: '', data: new Date().toISOString().split('T')[0], hora_inicio: '08:00', hora_fim: '18:00', tipo: 'ausencia', motivo: '' });
    }
  }, [open]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await criarBloqueio({ ...form, profissional_id: Number(form.profissional_id), hora_inicio: form.hora_inicio + ':00', hora_fim: form.hora_fim + ':00' });
      onSave(); onClose();
    } catch {} finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="⛔ Bloquear Horário">
      <div className="space-y-4">
        <div><label className={labelCls}>Profissional *</label><select className={inputCls} value={form.profissional_id} onChange={e => setForm(f => ({ ...f, profissional_id: e.target.value }))}><option value="">Selecione...</option>{profs.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select></div>
        <div><label className={labelCls}>Tipo</label><select className={inputCls} value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}><option value="ausencia">Ausência</option><option value="atestado">Atestado</option><option value="intervalo">Intervalo</option></select></div>
        <div className="grid grid-cols-3 gap-3">
          <div><label className={labelCls}>Data</label><input type="date" className={inputCls} value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} /></div>
          <div><label className={labelCls}>Início</label><input type="time" className={inputCls} value={form.hora_inicio} onChange={e => setForm(f => ({ ...f, hora_inicio: e.target.value }))} /></div>
          <div><label className={labelCls}>Fim</label><input type="time" className={inputCls} value={form.hora_fim} onChange={e => setForm(f => ({ ...f, hora_fim: e.target.value }))} /></div>
        </div>
        <div><label className={labelCls}>Motivo</label><textarea className={inputCls} rows={2} value={form.motivo} onChange={e => setForm(f => ({ ...f, motivo: e.target.value }))} /></div>
        <div className="flex justify-end gap-3"><button className={btnSecondary} onClick={onClose}>Cancelar</button><button className={btnPrimary} onClick={handleSave} disabled={loading}>{loading ? 'Salvando...' : 'Bloquear'}</button></div>
      </div>
    </Modal>
  );
}

/* ── LISTA DE ESPERA MODAL ────────────────────────────────────── */
export function ListaEsperaModal({ open, onClose, onSave }) {
  const [clients, setClients] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [form, setForm] = useState({ agenda_cliente_id: null, servico_id: '', data_desejada: '', horario_desejado: '', observacoes: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      getServicos({}).then(r => setServicos(r.data)).catch(() => {});
      setForm({ agenda_cliente_id: null, servico_id: '', data_desejada: '', horario_desejado: '', observacoes: '' });
    }
  }, [open]);

  const handleSave = async () => {
    if (!form.agenda_cliente_id) return;
    setLoading(true);
    try {
      const payload = { agenda_cliente_id: form.agenda_cliente_id };
      if (form.servico_id) payload.servico_id = Number(form.servico_id);
      if (form.data_desejada) payload.data_desejada = form.data_desejada;
      if (form.horario_desejado) payload.horario_desejado = form.horario_desejado + ':00';
      if (form.observacoes) payload.observacoes = form.observacoes;
      await criarListaEspera(payload);
      onSave(); onClose();
    } catch {} finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="⏳ Adicionar à Lista de Espera">
      <div className="space-y-4">
        <ClientPicker value={form.agenda_cliente_id} onChange={v => setForm(f => ({ ...f, agenda_cliente_id: v }))} clients={clients} setClients={setClients} />
        <div><label className={labelCls}>Procedimento desejado</label><select className={inputCls} value={form.servico_id} onChange={e => setForm(f => ({ ...f, servico_id: e.target.value }))}><option value="">Qualquer</option>{servicos.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}</select></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Data desejada</label><input type="date" className={inputCls} value={form.data_desejada} onChange={e => setForm(f => ({ ...f, data_desejada: e.target.value }))} /></div>
          <div><label className={labelCls}>Horário desejado</label><input type="time" className={inputCls} value={form.horario_desejado} onChange={e => setForm(f => ({ ...f, horario_desejado: e.target.value }))} /></div>
        </div>
        <div><label className={labelCls}>Observações</label><textarea className={inputCls} rows={2} value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} /></div>
        <div className="flex justify-end gap-3"><button className={btnSecondary} onClick={onClose}>Cancelar</button><button className={btnPrimary} onClick={handleSave} disabled={loading}>{loading ? 'Salvando...' : 'Adicionar'}</button></div>
      </div>
    </Modal>
  );
}

export { Modal, inputCls, btnPrimary, btnSecondary, btnDanger, labelCls };
