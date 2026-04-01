import { useState, useEffect } from 'react';
import { FiSearch, FiPlus, FiCalendar, FiEdit2, FiScissors, FiUser, FiClock, FiTrash2, FiArrowRight, FiFilter, FiCheckCircle, FiAlertCircle, FiChevronDown, FiChevronUp, FiXCircle } from 'react-icons/fi';
import {
  getAgendaClientes, criarAgendaCliente, atualizarAgendaCliente,
  getClienteAgendamentos, getPacientesDisponiveis,
  getServicos, criarServico, atualizarServico, deletarServico,
  getProfissionais, criarProfissional, atualizarProfissional, vincularServicos,
  getListaEspera, deletarListaEspera, getListaEsperaAnalise, resolverListaEspera,
  atualizarListaEspera,
} from '../../services/api';
import { Modal, inputCls, btnPrimary, btnSecondary, btnDanger, labelCls } from './AgendaModals';

const statusColors = {
  agendado: 'bg-blue-50 text-blue-600', confirmado: 'bg-green-50 text-green-600',
  em_atendimento: 'bg-violet-50 text-violet-600',
  cancelado: 'bg-red-50 text-red-500', nao_compareceu: 'bg-orange-50 text-orange-500',
  concluido: 'bg-emerald-50 text-emerald-600',
};
const statusLabels = { agendado: 'Agendado', confirmado: 'Confirmado', em_atendimento: 'Em Atendimento', cancelado: 'Cancelado', nao_compareceu: 'Não Compareceu', concluido: 'Concluído' };

/* ═══════════ CLIENTES TAB ═══════════ */
export function ClientesTab() {
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ nome: '', telefone: '', email: '', data_nascimento: '', observacoes: '', tags: '' });
  const [selectedHist, setSelectedHist] = useState(null);
  const [historico, setHistorico] = useState([]);

  const load = async () => {
    try { const r = await getAgendaClientes(busca); setClientes(r.data); } catch {}
  };
  useEffect(() => { load(); }, [busca]);

  const handleSave = async () => {
    try {
      const payload = { ...form };
      if (!payload.data_nascimento) delete payload.data_nascimento;
      if (editId) await atualizarAgendaCliente(editId, payload);
      else await criarAgendaCliente(payload);
      setShowForm(false); setEditId(null);
      setForm({ nome: '', telefone: '', email: '', data_nascimento: '', observacoes: '', tags: '' });
      load();
    } catch {}
  };

  const viewHistory = async (id) => {
    setSelectedHist(id);
    try { const r = await getClienteAgendamentos(id); setHistorico(r.data); } catch {}
  };

  const isBirthday = (c) => {
    if (!c.data_nascimento) return false;
    const today = new Date();
    const d = new Date(c.data_nascimento + 'T12:00:00');
    return d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dark/30" size={16} />
          <input className={`${inputCls} pl-10`} placeholder="Buscar clientes..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <button className={`${btnPrimary} whitespace-nowrap`} onClick={() => { setShowForm(true); setEditId(null); setForm({ nome: '', telefone: '', email: '', data_nascimento: '', observacoes: '', tags: '' }); }}>
          <FiPlus className="inline mr-1" size={14} /> Novo Cliente
        </button>
      </div>

      {showForm && (
        <div className="p-5 bg-white rounded-2xl shadow-card border border-secondary/30 space-y-3 animate-scaleIn">
          <h4 className="font-heading font-semibold text-sm text-dark">{editId ? 'Editar' : 'Novo'} Cliente</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={labelCls}>Nome *</label><input className={inputCls} value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} /></div>
            <div><label className={labelCls}>Telefone *</label><input className={inputCls} value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} /></div>
            <div><label className={labelCls}>Email</label><input className={inputCls} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div><label className={labelCls}>Data Nasc.</label><input type="date" className={inputCls} value={form.data_nascimento} onChange={e => setForm(f => ({ ...f, data_nascimento: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={labelCls}>Observações</label><textarea className={inputCls} rows={2} value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} /></div>
            <div><label className={labelCls}>Tags (VIP, Recorrente, etc)</label><input className={inputCls} value={form.tags || ''} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="Ex: VIP, Chata..." /></div>
          </div>
          <div className="flex gap-3"><button className={btnPrimary} onClick={handleSave}>Salvar</button><button className={btnSecondary} onClick={() => setShowForm(false)}>Cancelar</button></div>
        </div>
      )}

      <div className="grid gap-3">
        {clientes.map(c => (
          <div key={c.id} className="p-3 sm:p-4 bg-white rounded-2xl shadow-card border border-secondary/20 hover:shadow-hover transition-shadow">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-secondary flex items-center justify-center text-white font-bold text-sm shrink-0">
                {c.nome?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-heading font-semibold text-sm text-dark truncate flex items-center gap-2">
                  <span>{isBirthday(c) && '🎂 '}{c.nome}</span>
                  {c.tags && c.tags.split(',').map((t, i) => t.trim() ? <span key={i} className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] uppercase font-bold">{t.trim()}</span> : null)}
                </p>
                <p className="text-xs text-dark/40 mt-0.5">{c.telefone} {c.email ? `• ${c.email}` : ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-2 sm:mt-0 sm:ml-14 pl-0 sm:pl-0">
              <button className="text-accent hover:text-accent-dark text-xs" onClick={() => viewHistory(c.id)}>
                <FiCalendar className="inline mr-1" size={12} /> Histórico
              </button>
              <button className="text-dark/40 hover:text-dark text-xs" onClick={() => { setEditId(c.id); setForm({ nome: c.nome, telefone: c.telefone, email: c.email || '', data_nascimento: c.data_nascimento || '', observacoes: c.observacoes || '', tags: c.tags || '' }); setShowForm(true); }}>
                <FiEdit2 size={12} />
              </button>
            </div>
          </div>
        ))}
        {!clientes.length && <p className="text-center text-dark/40 text-sm py-8">Nenhum cliente encontrado</p>}
      </div>

      <Modal open={!!selectedHist} onClose={() => setSelectedHist(null)} title="Histórico de Agendamentos">
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {historico.map(ag => (
            <div key={ag.id} className="p-3 bg-soft rounded-xl flex items-center gap-3 text-sm">
              <div className={`px-2 py-0.5 rounded-full text-xs ${statusColors[ag.status]}`}>{statusLabels[ag.status]}</div>
              <span className="text-dark/60">{ag.data}</span>
              <span className="font-medium text-dark">{ag.servico?.nome}</span>
              <span className="text-dark/40">{ag.hora_inicio?.slice(0, 5)}</span>
            </div>
          ))}
          {!historico.length && <p className="text-center text-dark/40 py-4">Sem agendamentos</p>}
        </div>
      </Modal>
    </div>
  );
}

/* ═══════════ PROCEDIMENTOS TAB ═══════════ */
export function ProcedimentosTab({ defaultSubTab = 'servicos' }) {
  const [subTab, setSubTab] = useState(defaultSubTab);

  useEffect(() => {
    setSubTab(defaultSubTab);
  }, [defaultSubTab]);

  return (
    <div className="animate-fadeIn">
      <div className="flex flex-wrap gap-2 mb-4">
        {[['servicos', 'Serviços'], ['profissionais', 'Profissionais'], ['espera', 'Lista de Espera']].map(([key, label]) => (
          <button key={key} onClick={() => setSubTab(key)}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-2xl text-xs sm:text-sm font-medium transition-all ${subTab === key ? 'bg-gradient-to-r from-accent to-accent-dark text-white shadow-card' : 'bg-white text-dark/60 hover:bg-primary border border-secondary/30'}`}
          >{label}</button>
        ))}
      </div>
      {subTab === 'servicos' && <ServicosSubTab />}
      {subTab === 'profissionais' && <ProfissionaisSubTab />}
      {subTab === 'espera' && <ListaEsperaSubTab />}
    </div>
  );
}

function ServicosSubTab() {
  const [servicos, setServicos] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ nome: '', categoria: 'estetica', preco: '', duracao_minutos: '60' });

  const load = async () => { try { const r = await getServicos({ apenas_ativos: false }); setServicos(r.data); } catch {} };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    try {
      const payload = { ...form, preco: parseFloat(form.preco), duracao_minutos: parseInt(form.duracao_minutos) };
      if (editId) await atualizarServico(editId, payload);
      else await criarServico(payload);
      setShowForm(false); setEditId(null); load();
    } catch {}
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className={btnPrimary} onClick={() => { setShowForm(true); setEditId(null); setForm({ nome: '', categoria: 'estetica', preco: '', duracao_minutos: '60' }); }}>
          <FiPlus className="inline mr-1" size={14} /> Novo Serviço
        </button>
      </div>
      {showForm && (
        <div className="p-5 bg-white rounded-2xl shadow-card border border-secondary/30 space-y-3 animate-scaleIn">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={labelCls}>Nome *</label><input className={inputCls} value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} /></div>
            <div><label className={labelCls}>Categoria *</label><select className={inputCls} value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}><option value="estetica">Estética</option><option value="unha">Unha</option></select></div>
            <div><label className={labelCls}>Preço (R$) *</label><input type="number" step="0.01" className={inputCls} value={form.preco} onChange={e => setForm(f => ({ ...f, preco: e.target.value }))} /></div>
            <div><label className={labelCls}>Duração (min) *</label><input type="number" className={inputCls} value={form.duracao_minutos} onChange={e => setForm(f => ({ ...f, duracao_minutos: e.target.value }))} /></div>
          </div>
          <div className="flex gap-3"><button className={btnPrimary} onClick={handleSave}>Salvar</button><button className={btnSecondary} onClick={() => setShowForm(false)}>Cancelar</button></div>
        </div>
      )}
      <div className="grid gap-3">
        {servicos.map(s => (
          <div key={s.id} className={`p-4 bg-white rounded-2xl shadow-card border-l-4 ${s.categoria === 'estetica' ? 'border-accent' : 'border-nail'} flex items-center gap-4 ${!s.ativo ? 'opacity-50' : ''}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.categoria === 'estetica' ? 'bg-accent/15 text-accent-dark' : 'bg-nail/15 text-nail-dark'}`}>
              <FiScissors size={18} />
            </div>
            <div className="flex-1">
              <p className="font-heading font-semibold text-sm">{s.nome}{!s.ativo && <span className="ml-2 text-[10px] text-red-400 bg-red-50 px-1.5 py-0.5 rounded-full">Inativo</span>}</p>
              <p className="text-xs text-dark/40">{s.duracao_minutos}min • R${s.preco?.toFixed(2)}</p>
            </div>
            <button className="text-dark/40 hover:text-dark text-xs" onClick={() => { setEditId(s.id); setForm({ nome: s.nome, categoria: s.categoria, preco: String(s.preco), duracao_minutos: String(s.duracao_minutos) }); setShowForm(true); }}><FiEdit2 size={14} /></button>
            {s.ativo && (
              <button className="text-red-300 hover:text-red-500 text-xs ml-1" title="Remover serviço" onClick={async () => {
                if (window.confirm(`Deseja desativar o serviço "${s.nome}"?`)) {
                  try { await deletarServico(s.id); load(); } catch {}
                }
              }}><FiTrash2 size={14} /></button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfissionaisSubTab() {
  const [profs, setProfs] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ nome: '', especialidade: '', telefone: '', email: '', senha: '' });
  const [linkId, setLinkId] = useState(null);
  const [linkIds, setLinkIds] = useState([]);

  const load = async () => { try { const r = await getProfissionais({ apenas_ativos: false }); setProfs(r.data); } catch {} };
  useEffect(() => { load(); getServicos({}).then(r => setServicos(r.data)).catch(() => {}); }, []);

  const handleSave = async () => {
    try {
      const payload = { ...form };
      if (editId) { delete payload.senha; await atualizarProfissional(editId, payload); }
      else await criarProfissional(payload);
      setShowForm(false); setEditId(null); load();
    } catch {}
  };

  const handleLink = async () => {
    try { await vincularServicos(linkId, { servico_ids: linkIds }); setLinkId(null); load(); } catch {}
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className={btnPrimary} onClick={() => { setShowForm(true); setEditId(null); setForm({ nome: '', especialidade: '', telefone: '', email: '', senha: '' }); }}>
          <FiPlus className="inline mr-1" size={14} /> Novo Profissional
        </button>
      </div>
      {showForm && (
        <div className="p-5 bg-white rounded-2xl shadow-card border border-secondary/30 space-y-3 animate-scaleIn">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className={labelCls}>Nome *</label><input className={inputCls} value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} /></div>
            <div><label className={labelCls}>Especialidade</label><input className={inputCls} value={form.especialidade} onChange={e => setForm(f => ({ ...f, especialidade: e.target.value }))} /></div>
            <div><label className={labelCls}>Telefone</label><input className={inputCls} value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} /></div>
            <div><label className={labelCls}>Email (gera login)</label><input className={inputCls} type="email" placeholder="profissional@clinica.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            {!editId && (
              <div className="sm:col-span-2">
                <label className={labelCls}>Senha de acesso *</label>
                <input className={inputCls} type="password" placeholder="Senha para o profissional acessar o sistema" value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))} />
                <p className="text-[11px] text-dark/40 mt-1">O profissional usará este email e senha para acessar sua própria agenda.</p>
              </div>
            )}
          </div>
          {!editId && form.email && <p className="text-xs text-accent bg-accent/10 px-3 py-1.5 rounded-xl">Um login será criado automaticamente para este profissional visualizar sua agenda.</p>}
          <div className="flex gap-3"><button className={btnPrimary} onClick={handleSave}>Salvar</button><button className={btnSecondary} onClick={() => setShowForm(false)}>Cancelar</button></div>
        </div>
      )}
      <div className="grid gap-3">
        {profs.map(p => (
          <div key={p.id} className="p-3 sm:p-4 bg-white rounded-2xl shadow-card border border-secondary/20">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-secondary flex items-center justify-center text-white font-bold text-sm shrink-0">{p.nome?.charAt(0)}</div>
              <div className="flex-1 min-w-0">
                <p className="font-heading font-semibold text-sm">{p.nome}</p>
                <p className="text-xs text-dark/40">{p.especialidade || 'Sem especialidade'}</p>
                {p.servicos?.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{p.servicos.map(s => (<span key={s.id} className={`text-xs px-2 py-0.5 rounded-full ${s.categoria === 'estetica' ? 'bg-accent/10 text-accent' : 'bg-nail/10 text-nail-dark'}`}>{s.nome}</span>))}</div>}
              </div>
            </div>
            <div className="flex items-center gap-3 mt-2 pl-0 sm:ml-14">
              <button className="text-accent hover:text-accent-dark text-xs" onClick={() => { setLinkId(p.id); setLinkIds(p.servicos?.map(s => s.id) || []); }}>Vincular Serviços</button>
              <button className="text-dark/40 hover:text-dark text-xs" onClick={() => { setEditId(p.id); setForm({ nome: p.nome, especialidade: p.especialidade || '', telefone: p.telefone || '', email: p.email || '' }); setShowForm(true); }}><FiEdit2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>
      <Modal open={!!linkId} onClose={() => setLinkId(null)} title="Vincular Serviços">
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {servicos.map(s => (
            <label key={s.id} className="flex items-center gap-3 p-2 hover:bg-primary/30 rounded-xl cursor-pointer">
              <input type="checkbox" checked={linkIds.includes(s.id)} onChange={e => setLinkIds(e.target.checked ? [...linkIds, s.id] : linkIds.filter(i => i !== s.id))} className="accent-accent" />
              <span className={`text-xs px-2 py-0.5 rounded-full ${s.categoria === 'estetica' ? 'bg-accent/10 text-accent' : 'bg-nail/10 text-nail-dark'}`}>{s.categoria}</span>
              <span className="text-sm">{s.nome}</span>
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-3 mt-4"><button className={btnPrimary} onClick={handleLink}>Salvar</button></div>
      </Modal>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   LISTA DE ESPERA — Professional grade sub-tab
   ═══════════════════════════════════════════════════════════════════ */
function ListaEsperaSubTab() {
  const [analise, setAnalise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  // Filters
  const [filterCliente, setFilterCliente] = useState('');
  const [filterServico, setFilterServico] = useState('');
  const [filterVaga, setFilterVaga] = useState('todos'); // todos | com_vaga | sem_vaga
  const [showFilters, setShowFilters] = useState(false);
  const [servicos, setServicos] = useState([]);
  // Edit modal
  const [editItem, setEditItem] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [r, sRes] = await Promise.all([getListaEsperaAnalise(), getServicos({})]);
      setAnalise(r.data);
      setServicos(sRes.data);
    } catch {} finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleAgendar = (le) => {
    const detail = {
      agenda_cliente_id: le.agenda_cliente_id,
      servico_id: le.servico_id,
      data: (le.datas_preferidas && le.datas_preferidas[0]) || le.data_desejada || new Date().toISOString().split('T')[0],
      hora: (le.horarios_preferidos && le.horarios_preferidos[0]) || le.horario_desejado || '',
      le_id: le.id,
    };
    window.dispatchEvent(new CustomEvent('agenda:agendar-espera', { detail }));
  };

  const handleResolver = async (id) => {
    try { await resolverListaEspera(id); load(); } catch {}
  };

  const handleRemover = async (id) => {
    if (!window.confirm('Remover este item da lista de espera?')) return;
    try { await deletarListaEspera(id); load(); } catch {}
  };

  // Filter items
  const filteredItems = (analise?.items || []).filter(le => {
    if (filterCliente && !le.cliente_nome?.toLowerCase().includes(filterCliente.toLowerCase())) return false;
    if (filterServico && le.servico_id !== Number(filterServico)) return false;
    if (filterVaga === 'com_vaga' && !le.tem_vaga) return false;
    if (filterVaga === 'sem_vaga' && le.tem_vaga) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-3 border-accent/30 border-t-accent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-white rounded-2xl shadow-card p-3 sm:p-4 border border-secondary/20 text-center">
          <p className="text-[10px] text-dark/40 font-semibold uppercase tracking-wide">Total</p>
          <p className="text-2xl font-heading font-bold text-dark mt-1">{analise?.total || 0}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-card p-3 sm:p-4 border border-emerald-200/40 text-center relative overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-1 bg-emerald-400 rounded-l-2xl" />
          <p className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wide">Com Vaga</p>
          <p className="text-2xl font-heading font-bold text-emerald-600 mt-1">{analise?.com_vaga || 0}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-card p-3 sm:p-4 border border-amber-200/40 text-center relative overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-1 bg-amber-400 rounded-l-2xl" />
          <p className="text-[10px] text-amber-600 font-semibold uppercase tracking-wide">Aguardando</p>
          <p className="text-2xl font-heading font-bold text-amber-600 mt-1">{analise?.sem_vaga || 0}</p>
        </div>
      </div>

      {/* ── Alert if there are items with availability ── */}
      {analise?.com_vaga > 0 && (
        <div className="p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200/60 flex items-center gap-3 animate-fadeIn">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
            <FiAlertCircle size={18} className="text-emerald-500" />
          </div>
          <div className="flex-1">
            <p className="font-heading font-semibold text-sm text-dark">Horários disponíveis encontrados!</p>
            <p className="text-xs text-dark/60 mt-0.5">
              <strong>{analise.com_vaga}</strong> cliente(s) da lista de espera possuem horários disponíveis na agenda.
            </p>
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-secondary/30 shadow-card rounded-xl text-xs font-medium hover:bg-primary transition-all">
          <FiFilter size={13} /> Filtros {showFilters ? <FiChevronUp size={12} /> : <FiChevronDown size={12} />}
        </button>
        {/* Quick filter chips */}
        <button onClick={() => setFilterVaga('todos')} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${filterVaga === 'todos' ? 'bg-accent text-white border-accent' : 'bg-white text-dark/50 border-secondary/30 hover:border-accent/40'}`}>Todos</button>
        <button onClick={() => setFilterVaga('com_vaga')} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${filterVaga === 'com_vaga' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-dark/50 border-secondary/30 hover:border-emerald-400'}`}>🟢 Com Vaga</button>
        <button onClick={() => setFilterVaga('sem_vaga')} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all border ${filterVaga === 'sem_vaga' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-dark/50 border-secondary/30 hover:border-amber-400'}`}>🔴 Sem Vaga</button>
        <button onClick={load} className="ml-auto px-3 py-2 bg-white border border-secondary/30 shadow-card rounded-xl text-xs font-medium hover:bg-primary transition-all" title="Atualizar análise">
          <FiArrowRight size={13} className="rotate-[360deg]" /> ↻
        </button>
      </div>

      {showFilters && (
        <div className="p-4 bg-white rounded-2xl shadow-card border border-secondary/20 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-scaleIn">
          <div>
            <label className={labelCls}>Buscar por Cliente</label>
            <input className={inputCls} placeholder="Nome do cliente..." value={filterCliente} onChange={e => setFilterCliente(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Procedimento</label>
            <select className={inputCls} value={filterServico} onChange={e => setFilterServico(e.target.value)}>
              <option value="">Todos</option>
              {servicos.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* ── Cards ── */}
      <div className="space-y-3">
        {filteredItems.map(le => {
          const isExpanded = expandedId === le.id;
          const allDates = [...(le.datas_preferidas || [])];
          if (le.data_desejada && !allDates.includes(le.data_desejada)) allDates.push(le.data_desejada);
          const allTimes = [...(le.horarios_preferidos || [])];
          if (le.horario_desejado && !allTimes.includes(le.horario_desejado)) allTimes.push(le.horario_desejado);

          return (
            <div key={le.id} className={`bg-white rounded-2xl shadow-card border overflow-hidden transition-all hover:shadow-hover ${le.tem_vaga ? 'border-emerald-200/60' : 'border-secondary/20'}`}>
              {/* Status bar */}
              <div className={`h-1 ${le.tem_vaga ? 'bg-gradient-to-r from-emerald-400 to-teal-400' : 'bg-gradient-to-r from-amber-300 to-orange-300'}`} />
              
              <div className="p-4">
                {/* Header row */}
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${le.tem_vaga ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'}`}>
                    <FiUser size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-heading font-semibold text-sm text-dark">{le.cliente_nome}</p>
                      {le.tem_vaga ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold uppercase">
                          <FiCheckCircle size={10} /> Vaga Disponível
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full text-[10px] font-bold uppercase">
                          <FiClock size={10} /> Aguardando
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-dark/50 mt-0.5">{le.cliente_telefone}</p>
                  </div>
                </div>

                {/* Details grid */}
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="p-2 bg-soft rounded-xl">
                    <p className="text-[9px] text-dark/40 uppercase font-semibold">Procedimento</p>
                    <p className="text-xs font-medium text-dark mt-0.5 truncate">{le.servico_nome}</p>
                  </div>
                  <div className="p-2 bg-soft rounded-xl">
                    <p className="text-[9px] text-dark/40 uppercase font-semibold">Duração</p>
                    <p className="text-xs font-medium text-dark mt-0.5">{le.servico_duracao}min</p>
                  </div>
                  <div className="p-2 bg-soft rounded-xl">
                    <p className="text-[9px] text-dark/40 uppercase font-semibold">Datas</p>
                    <div className="flex flex-wrap gap-0.5 mt-0.5">
                      {allDates.length > 0 ? allDates.slice(0, 3).map((d, i) => (
                        <span key={i} className="text-[10px] font-medium text-accent bg-accent/10 px-1.5 py-0.5 rounded">
                          {new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </span>
                      )) : <span className="text-[10px] text-dark/40">Qualquer</span>}
                      {allDates.length > 3 && <span className="text-[10px] text-dark/40">+{allDates.length - 3}</span>}
                    </div>
                  </div>
                  <div className="p-2 bg-soft rounded-xl">
                    <p className="text-[9px] text-dark/40 uppercase font-semibold">Horários</p>
                    <div className="flex flex-wrap gap-0.5 mt-0.5">
                      {allTimes.length > 0 ? allTimes.map((t, i) => (
                        <span key={i} className="text-[10px] font-medium text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">{t}</span>
                      )) : <span className="text-[10px] text-dark/40">Qualquer</span>}
                    </div>
                  </div>
                </div>

                {le.observacoes && (
                  <p className="text-xs text-dark/40 mt-2 italic">💬 {le.observacoes}</p>
                )}

                {/* Created at */}
                <p className="text-[10px] text-dark/30 mt-2">
                  Adicionado em {le.created_at ? new Date(le.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                </p>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-secondary/20">
                  {le.tem_vaga && (
                    <button onClick={() => setExpandedId(isExpanded ? null : le.id)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-xl text-xs font-semibold hover:bg-emerald-100 transition-all">
                      <FiCalendar size={12} /> {isExpanded ? 'Ocultar Horários' : 'Ver Horários Disponíveis'}
                    </button>
                  )}
                  <button onClick={() => handleAgendar(le)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-accent/10 text-accent rounded-xl text-xs font-semibold hover:bg-accent/20 transition-all">
                    <FiArrowRight size={12} /> Agendar
                  </button>
                  <button onClick={() => handleResolver(le.id)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-teal-50 text-teal-600 border border-teal-200 rounded-xl text-xs font-medium hover:bg-teal-100 transition-all">
                    <FiCheckCircle size={12} /> Resolvido
                  </button>
                  <button onClick={() => handleRemover(le.id)}
                    className="flex items-center gap-1 px-2 py-2 text-red-400 hover:text-red-600 text-xs transition-all ml-auto">
                    <FiTrash2 size={13} />
                  </button>
                </div>

                {/* Expanded: Available slots */}
                {isExpanded && le.disponibilidades && le.disponibilidades.length > 0 && (
                  <div className="mt-3 p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/40 space-y-2 animate-scaleIn">
                    <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                      <FiCheckCircle size={13} /> Horários disponíveis encontrados:
                    </p>
                    <div className="max-h-48 overflow-y-auto space-y-1.5">
                      {le.disponibilidades.map((disp, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-emerald-100">
                          <span className="text-xs font-medium text-dark w-20 shrink-0">
                            {new Date(disp.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', weekday: 'short' })}
                          </span>
                          <span className="text-[10px] text-dark/50 w-24 shrink-0 truncate">{disp.profissional_nome}</span>
                          <div className="flex flex-wrap gap-1 flex-1">
                            {disp.horarios_livres.map((hl, j) => (
                              <span key={j} className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded font-medium">
                                {hl.inicio}–{hl.fim}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-soft flex items-center justify-center mx-auto mb-3">
              <FiClock size={28} className="text-dark/20" />
            </div>
            <p className="text-dark/40 text-sm font-medium">Lista de espera vazia</p>
            <p className="text-dark/25 text-xs mt-1">Adicione clientes à lista de espera usando o botão "Espera" na agenda</p>
          </div>
        )}
      </div>
    </div>
  );
}
