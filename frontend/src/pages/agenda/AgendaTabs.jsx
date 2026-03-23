import { useState, useEffect } from 'react';
import { FiSearch, FiPlus, FiCalendar, FiEdit2 } from 'react-icons/fi';
import {
  getAgendaClientes, criarAgendaCliente, atualizarAgendaCliente,
  getClienteAgendamentos, getPacientesDisponiveis,
  getServicos, criarServico, atualizarServico, deletarServico,
  getProfissionais, criarProfissional, atualizarProfissional, vincularServicos,
  getListaEspera, deletarListaEspera,
} from '../../services/api';
import { Modal, inputCls, btnPrimary, btnSecondary, labelCls } from './AgendaModals';

const statusColors = {
  agendado: 'bg-blue-50 text-blue-600', confirmado: 'bg-green-50 text-green-600',
  cancelado: 'bg-red-50 text-red-500', nao_compareceu: 'bg-orange-50 text-orange-500',
  concluido: 'bg-emerald-50 text-emerald-600',
};
const statusLabels = { agendado: 'Agendado', confirmado: 'Confirmado', cancelado: 'Cancelado', nao_compareceu: 'Não Compareceu', concluido: 'Concluído' };

/* ═══════════ CLIENTES TAB ═══════════ */
export function ClientesTab() {
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ nome: '', telefone: '', email: '', data_nascimento: '', observacoes: '' });
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
      setForm({ nome: '', telefone: '', email: '', data_nascimento: '', observacoes: '' });
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
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dark/30" size={16} />
          <input className={`${inputCls} pl-10`} placeholder="Buscar clientes..." value={busca} onChange={e => setBusca(e.target.value)} />
        </div>
        <button className={btnPrimary} onClick={() => { setShowForm(true); setEditId(null); setForm({ nome: '', telefone: '', email: '', data_nascimento: '', observacoes: '' }); }}>
          <FiPlus className="inline mr-1" size={14} /> Novo Cliente
        </button>
      </div>

      {showForm && (
        <div className="p-5 bg-white rounded-2xl shadow-card border border-secondary/30 space-y-3 animate-scaleIn">
          <h4 className="font-heading font-semibold text-sm text-dark">{editId ? 'Editar' : 'Novo'} Cliente</h4>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Nome *</label><input className={inputCls} value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} /></div>
            <div><label className={labelCls}>Telefone *</label><input className={inputCls} value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} /></div>
            <div><label className={labelCls}>Email</label><input className={inputCls} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div><label className={labelCls}>Data Nasc.</label><input type="date" className={inputCls} value={form.data_nascimento} onChange={e => setForm(f => ({ ...f, data_nascimento: e.target.value }))} /></div>
          </div>
          <div><label className={labelCls}>Observações</label><textarea className={inputCls} rows={2} value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} /></div>
          <div className="flex gap-3"><button className={btnPrimary} onClick={handleSave}>Salvar</button><button className={btnSecondary} onClick={() => setShowForm(false)}>Cancelar</button></div>
        </div>
      )}

      <div className="grid gap-3">
        {clientes.map(c => (
          <div key={c.id} className="p-4 bg-white rounded-2xl shadow-card border border-secondary/20 flex items-center gap-4 hover:shadow-hover transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-secondary flex items-center justify-center text-white font-bold text-sm">
              {c.nome?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-heading font-semibold text-sm text-dark truncate">
                {isBirthday(c) && '🎂 '}{c.nome}
              </p>
              <p className="text-xs text-dark/40">{c.telefone} {c.email ? `• ${c.email}` : ''}</p>
            </div>
            <button className="text-accent hover:text-accent-dark text-xs" onClick={() => viewHistory(c.id)}>
              <FiCalendar className="inline mr-1" size={12} /> Histórico
            </button>
            <button className="text-dark/40 hover:text-dark text-xs" onClick={() => { setEditId(c.id); setForm({ nome: c.nome, telefone: c.telefone, email: c.email || '', data_nascimento: c.data_nascimento || '', observacoes: c.observacoes || '' }); setShowForm(true); }}>
              <FiEdit2 size={12} />
            </button>
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
export function ProcedimentosTab() {
  const [subTab, setSubTab] = useState('servicos');
  return (
    <div className="animate-fadeIn">
      <div className="flex gap-2 mb-4">
        {[['servicos', '💆 Serviços'], ['profissionais', '👩‍⚕️ Profissionais'], ['espera', '⏳ Lista de Espera']].map(([key, label]) => (
          <button key={key} onClick={() => setSubTab(key)}
            className={`px-4 py-2 rounded-2xl text-sm font-medium transition-all ${subTab === key ? 'bg-gradient-to-r from-accent to-accent-dark text-white shadow-card' : 'bg-white text-dark/60 hover:bg-primary border border-secondary/30'}`}
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
          <div className="grid grid-cols-2 gap-3">
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
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${s.categoria === 'estetica' ? 'bg-accent' : 'bg-nail'}`}>
              {s.categoria === 'estetica' ? '💆' : '💅'}
            </div>
            <div className="flex-1">
              <p className="font-heading font-semibold text-sm">{s.nome}</p>
              <p className="text-xs text-dark/40">{s.duracao_minutos}min • R${s.preco?.toFixed(2)}</p>
            </div>
            <button className="text-dark/40 hover:text-dark text-xs" onClick={() => { setEditId(s.id); setForm({ nome: s.nome, categoria: s.categoria, preco: String(s.preco), duracao_minutos: String(s.duracao_minutos) }); setShowForm(true); }}><FiEdit2 size={14} /></button>
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
  const [form, setForm] = useState({ nome: '', especialidade: '', telefone: '' });
  const [linkId, setLinkId] = useState(null);
  const [linkIds, setLinkIds] = useState([]);

  const load = async () => { try { const r = await getProfissionais({ apenas_ativos: false }); setProfs(r.data); } catch {} };
  useEffect(() => { load(); getServicos({}).then(r => setServicos(r.data)).catch(() => {}); }, []);

  const handleSave = async () => {
    try {
      if (editId) await atualizarProfissional(editId, form);
      else await criarProfissional(form);
      setShowForm(false); setEditId(null); load();
    } catch {}
  };

  const handleLink = async () => {
    try { await vincularServicos(linkId, { servico_ids: linkIds }); setLinkId(null); load(); } catch {}
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className={btnPrimary} onClick={() => { setShowForm(true); setEditId(null); setForm({ nome: '', especialidade: '', telefone: '' }); }}>
          <FiPlus className="inline mr-1" size={14} /> Novo Profissional
        </button>
      </div>
      {showForm && (
        <div className="p-5 bg-white rounded-2xl shadow-card border border-secondary/30 space-y-3 animate-scaleIn">
          <div className="grid grid-cols-3 gap-3">
            <div><label className={labelCls}>Nome *</label><input className={inputCls} value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} /></div>
            <div><label className={labelCls}>Especialidade</label><input className={inputCls} value={form.especialidade} onChange={e => setForm(f => ({ ...f, especialidade: e.target.value }))} /></div>
            <div><label className={labelCls}>Telefone</label><input className={inputCls} value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} /></div>
          </div>
          <div className="flex gap-3"><button className={btnPrimary} onClick={handleSave}>Salvar</button><button className={btnSecondary} onClick={() => setShowForm(false)}>Cancelar</button></div>
        </div>
      )}
      <div className="grid gap-3">
        {profs.map(p => (
          <div key={p.id} className="p-4 bg-white rounded-2xl shadow-card border border-secondary/20 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-secondary flex items-center justify-center text-white font-bold text-sm">{p.nome?.charAt(0)}</div>
            <div className="flex-1">
              <p className="font-heading font-semibold text-sm">{p.nome}</p>
              <p className="text-xs text-dark/40">{p.especialidade || 'Sem especialidade'}</p>
              {p.servicos?.length > 0 && <div className="flex flex-wrap gap-1 mt-1">{p.servicos.map(s => (<span key={s.id} className={`text-xs px-2 py-0.5 rounded-full ${s.categoria === 'estetica' ? 'bg-accent/10 text-accent' : 'bg-nail/10 text-nail-dark'}`}>{s.nome}</span>))}</div>}
            </div>
            <button className="text-accent hover:text-accent-dark text-xs" onClick={() => { setLinkId(p.id); setLinkIds(p.servicos?.map(s => s.id) || []); }}>Vincular Serviços</button>
            <button className="text-dark/40 hover:text-dark text-xs" onClick={() => { setEditId(p.id); setForm({ nome: p.nome, especialidade: p.especialidade || '', telefone: p.telefone || '' }); setShowForm(true); }}><FiEdit2 size={14} /></button>
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

function ListaEsperaSubTab() {
  const [items, setItems] = useState([]);
  const load = async () => { try { const r = await getListaEspera({}); setItems(r.data); } catch {} };
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-3">
      {items.map(le => (
        <div key={le.id} className="p-4 bg-white rounded-2xl shadow-card border border-secondary/20 flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500">⏳</div>
          <div className="flex-1">
            <p className="font-heading font-semibold text-sm">{le.cliente?.nome || '—'}</p>
            <p className="text-xs text-dark/40">
              {le.servico?.nome || 'Qualquer serviço'}
              {le.data_desejada ? ` • ${le.data_desejada}` : ''}
              {le.horario_desejado ? ` • ${le.horario_desejado.slice(0, 5)}` : ''}
            </p>
          </div>
          <button className="text-red-400 hover:text-red-500 text-xs" onClick={async () => { await deletarListaEspera(le.id); load(); }}>Remover</button>
        </div>
      ))}
      {!items.length && <p className="text-center text-dark/40 text-sm py-8">Lista de espera vazia</p>}
    </div>
  );
}
