import { useState, useEffect, useMemo } from 'react';
import { FiChevronLeft, FiChevronRight, FiPlus, FiLock, FiClock, FiFilter } from 'react-icons/fi';
import { getAgendamentos, getBloqueios, getAgendaDashboard, autoConcluir, getProfissionais } from '../../services/api';
import { NovoAgendamentoModal, DetalhesAgendamentoModal, BloqueioModal, ListaEsperaModal } from './AgendaModals';
import { ClientesTab, ProcedimentosTab } from './AgendaTabs';

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00 → 20:00
const VIEWS = ['dia', 'semana', 'mes'];
const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function fmtDate(d) { return d.toISOString().split('T')[0]; }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function startOfWeek(d) { const r = new Date(d); r.setDate(r.getDate() - r.getDay()); return r; }

export default function Agenda() {
  const [tab, setTab] = useState('agenda');
  const [view, setView] = useState('dia');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [agendamentos, setAgendamentos] = useState([]);
  const [bloqueios, setBloqueios] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [profissionais, setProfissionais] = useState([]);
  const [filterProf, setFilterProf] = useState('');

  // Modals
  const [showNew, setShowNew] = useState(false);
  const [newInitDate, setNewInitDate] = useState('');
  const [newInitTime, setNewInitTime] = useState('');
  const [showDetails, setShowDetails] = useState(null);
  const [showBloqueio, setShowBloqueio] = useState(false);
  const [showEspera, setShowEspera] = useState(false);

  const loadAll = async () => {
    try { autoConcluir().catch(() => {}); } catch {}
    const range = getDateRange();
    try {
      const params = { data_inicio: range.start, data_fim: range.end };
      if (filterProf) params.profissional_id = filterProf;
      const [agRes, blRes, dbRes] = await Promise.all([
        getAgendamentos(params),
        getBloqueios({ ...params, profissional_id: filterProf || undefined }),
        getAgendaDashboard(),
      ]);
      setAgendamentos(agRes.data);
      setBloqueios(blRes.data);
      setDashboard(dbRes.data);
    } catch {}
  };

  const loadProfs = async () => {
    try { const r = await getProfissionais({}); setProfissionais(r.data); } catch {}
  };

  useEffect(() => { loadProfs(); }, []);
  useEffect(() => { loadAll(); }, [currentDate, view, filterProf]);

  const getDateRange = () => {
    if (view === 'dia') return { start: fmtDate(currentDate), end: fmtDate(currentDate) };
    if (view === 'semana') { const s = startOfWeek(currentDate); return { start: fmtDate(s), end: fmtDate(addDays(s, 6)) }; }
    const y = currentDate.getFullYear(), m = currentDate.getMonth();
    return { start: fmtDate(new Date(y, m, 1)), end: fmtDate(new Date(y, m + 1, 0)) };
  };

  const navigate = (dir) => {
    const d = new Date(currentDate);
    if (view === 'dia') d.setDate(d.getDate() + dir);
    else if (view === 'semana') d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  };

  const openNew = (date, time) => {
    setNewInitDate(date || fmtDate(currentDate));
    setNewInitTime(time || '');
    setShowNew(true);
  };

  const dateLabel = () => {
    if (view === 'dia') return currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (view === 'semana') { const s = startOfWeek(currentDate); return `${s.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} — ${addDays(s, 6).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}`; }
    return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  };

  const tabs = [
    { key: 'agenda', label: '📅 Agenda', icon: null },
    { key: 'clientes', label: '👥 Clientes', icon: null },
    { key: 'procedimentos', label: '💆 Procedimentos', icon: null },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-dark">Agenda</h1>
        <p className="text-dark/50 text-sm mt-1">Gerenciamento completo de horários</p>
      </div>

      {/* Dashboard Cards */}
      {dashboard && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Hoje', value: dashboard.total_hoje, color: 'from-accent to-accent-dark', icon: '📅' },
            { label: 'Confirmados', value: dashboard.confirmados, color: 'from-green-400 to-emerald-500', icon: '✅' },
            { label: 'Concluídos', value: dashboard.concluidos, color: 'from-emerald-400 to-teal-500', icon: '✔' },
            { label: 'Lista Espera', value: dashboard.aguardando_espera, color: 'from-amber-400 to-orange-500', icon: '⏳' },
          ].map((c, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-card p-4 border border-secondary/20 hover:shadow-hover transition-shadow">
              <div className="flex items-center justify-between">
                <div><p className="text-xs text-dark/40 font-medium">{c.label}</p><p className="text-2xl font-heading font-bold text-dark mt-1">{c.value}</p></div>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center text-white text-lg`}>{c.icon}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Birthday alert */}
      {dashboard?.aniversariantes?.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-pink-50 to-amber-50 rounded-2xl border border-pink-100 flex items-center gap-3">
          <span className="text-2xl">🎂</span>
          <div>
            <p className="font-heading font-semibold text-sm text-dark">Aniversariantes do mês!</p>
            <p className="text-xs text-dark/50">{dashboard.aniversariantes.map(a => `${a.nome} (dia ${a.dia})`).join(' • ')}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-secondary/30 pb-3">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-5 py-2.5 rounded-t-2xl text-sm font-medium transition-all ${tab === t.key ? 'bg-white text-accent shadow-card border border-secondary/30 border-b-0 -mb-[13px] pb-[13px]' : 'text-dark/50 hover:text-dark hover:bg-primary/50'}`}
          >{t.label}</button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'agenda' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-white rounded-2xl shadow-card border border-secondary/30 overflow-hidden">
              {VIEWS.map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-4 py-2 text-sm font-medium capitalize transition-all ${view === v ? 'bg-gradient-to-r from-accent to-accent-dark text-white' : 'text-dark/50 hover:bg-primary/50'}`}
                >{v}</button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-xl bg-white shadow-card border border-secondary/30 flex items-center justify-center hover:bg-primary transition-colors"><FiChevronLeft size={16} /></button>
              <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 rounded-xl bg-white shadow-card border border-secondary/30 text-xs font-medium hover:bg-primary">Hoje</button>
              <button onClick={() => navigate(1)} className="w-8 h-8 rounded-xl bg-white shadow-card border border-secondary/30 flex items-center justify-center hover:bg-primary transition-colors"><FiChevronRight size={16} /></button>
            </div>
            <span className="font-heading font-semibold text-dark text-sm capitalize">{dateLabel()}</span>
            <div className="ml-auto flex gap-2">
              <select className="px-3 py-2 rounded-2xl border border-secondary/30 bg-white text-sm" value={filterProf} onChange={e => setFilterProf(e.target.value)}>
                <option value="">Todos profissionais</option>
                {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
              <button className="px-4 py-2 bg-white border border-secondary/30 shadow-card rounded-2xl text-sm hover:bg-primary flex items-center gap-1" onClick={() => setShowBloqueio(true)}><FiLock size={14} /> Bloquear</button>
              <button className="px-4 py-2 bg-white border border-secondary/30 shadow-card rounded-2xl text-sm hover:bg-primary flex items-center gap-1" onClick={() => setShowEspera(true)}><FiClock size={14} /> Espera</button>
              <button className="px-4 py-2 bg-gradient-to-r from-accent to-accent-dark text-white rounded-2xl text-sm font-medium shadow-card hover:shadow-hover flex items-center gap-1" onClick={() => openNew()}><FiPlus size={14} /> Agendar</button>
            </div>
          </div>

          {/* Calendar Views */}
          {view === 'dia' && <DayView date={currentDate} agendamentos={agendamentos} bloqueios={bloqueios} onClickSlot={(t) => openNew(fmtDate(currentDate), t)} onClickEvent={setShowDetails} />}
          {view === 'semana' && <WeekView date={currentDate} agendamentos={agendamentos} bloqueios={bloqueios} onClickSlot={(d, t) => openNew(d, t)} onClickEvent={setShowDetails} />}
          {view === 'mes' && <MonthView date={currentDate} agendamentos={agendamentos} onClickDay={(d) => { setCurrentDate(new Date(d + 'T12:00:00')); setView('dia'); }} onClickEvent={setShowDetails} dashboard={dashboard} />}
        </div>
      )}
      {tab === 'clientes' && <ClientesTab />}
      {tab === 'procedimentos' && <ProcedimentosTab />}

      {/* Modals */}
      <NovoAgendamentoModal open={showNew} onClose={() => setShowNew(false)} onSave={loadAll} initialDate={newInitDate} initialTime={newInitTime} />
      <DetalhesAgendamentoModal open={!!showDetails} onClose={() => setShowDetails(null)} agendamento={showDetails} onUpdate={loadAll} />
      <BloqueioModal open={showBloqueio} onClose={() => setShowBloqueio(false)} onSave={loadAll} profissionais={profissionais} />
      <ListaEsperaModal open={showEspera} onClose={() => setShowEspera(false)} onSave={loadAll} />
    </div>
  );
}

/* ═══════════ DAY VIEW ═══════════ */
function DayView({ date, agendamentos, bloqueios, onClickSlot, onClickEvent }) {
  const dateStr = fmtDate(date);
  const dayAgs = agendamentos.filter(a => a.data === dateStr && a.status !== 'cancelado');
  const dayBloqs = bloqueios.filter(b => b.data === dateStr);

  return (
    <div className="bg-white rounded-2xl shadow-card border border-secondary/20 overflow-hidden">
      <div className="overflow-y-auto max-h-[600px]">
        {HOURS.map(h => {
          const timeStr = `${String(h).padStart(2, '0')}:00`;
          const slotAgs = dayAgs.filter(a => { const sh = parseInt(a.hora_inicio?.split(':')[0]); return sh === h; });
          const slotBloqs = dayBloqs.filter(b => { const sh = parseInt(b.hora_inicio?.split(':')[0]); return sh === h; });
          return (
            <div key={h} className="flex border-b border-primary/50 min-h-[60px] hover:bg-primary/20 transition-colors cursor-pointer" onClick={() => onClickSlot(timeStr)}>
              <div className="w-16 shrink-0 px-3 py-2 text-xs text-dark/40 font-medium border-r border-primary/50">{timeStr}</div>
              <div className="flex-1 p-1 flex flex-wrap gap-1">
                {slotBloqs.map(b => (
                  <div key={`b-${b.id}`} className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-500 text-xs flex-1 min-w-[120px]">
                    ⛔ {b.tipo} {b.profissional?.nome ? `— ${b.profissional.nome}` : ''} ({b.hora_inicio?.slice(0,5)}–{b.hora_fim?.slice(0,5)})
                  </div>
                ))}
                {slotAgs.map(a => (
                  <div key={a.id} onClick={e => { e.stopPropagation(); onClickEvent(a); }}
                    className={`px-3 py-1.5 rounded-xl text-xs flex-1 min-w-[120px] cursor-pointer transition-all hover:scale-[1.02] border ${
                      a.servico?.categoria === 'estetica'
                        ? 'bg-accent/10 border-accent/20 text-accent-dark'
                        : 'bg-nail/10 border-nail/20 text-nail-dark'
                    }`}
                  >
                    <span className="font-semibold">{a.hora_inicio?.slice(0, 5)}</span> {a.cliente?.nome} — {a.servico?.nome}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════ WEEK VIEW ═══════════ */
function WeekView({ date, agendamentos, bloqueios, onClickSlot, onClickEvent }) {
  const weekStart = startOfWeek(date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="bg-white rounded-2xl shadow-card border border-secondary/20 overflow-x-auto">
      <div className="min-w-[800px]">
        {/* Header */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-secondary/30">
          <div className="border-r border-primary/50" />
          {days.map((d, i) => {
            const isToday = fmtDate(d) === fmtDate(new Date());
            return (
              <div key={i} className={`text-center py-3 border-r border-primary/50 ${isToday ? 'bg-accent/5' : ''}`}>
                <p className="text-xs text-dark/40">{DAYS[d.getDay()]}</p>
                <p className={`text-sm font-heading font-bold ${isToday ? 'text-accent' : 'text-dark'}`}>{d.getDate()}</p>
              </div>
            );
          })}
        </div>
        {/* Grid */}
        <div className="overflow-y-auto max-h-[500px]">
          {HOURS.map(h => (
            <div key={h} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-primary/30 min-h-[50px]">
              <div className="px-2 py-1 text-xs text-dark/40 border-r border-primary/50">{String(h).padStart(2, '0')}:00</div>
              {days.map((d, di) => {
                const ds = fmtDate(d);
                const slotAgs = agendamentos.filter(a => a.data === ds && parseInt(a.hora_inicio?.split(':')[0]) === h && a.status !== 'cancelado');
                return (
                  <div key={di} className="border-r border-primary/30 p-0.5 hover:bg-primary/20 cursor-pointer" onClick={() => onClickSlot(ds, `${String(h).padStart(2, '0')}:00`)}>
                    {slotAgs.map(a => (
                      <div key={a.id} onClick={e => { e.stopPropagation(); onClickEvent(a); }}
                        className={`px-1.5 py-0.5 rounded-lg text-[10px] mb-0.5 truncate cursor-pointer ${
                          a.servico?.categoria === 'estetica' ? 'bg-accent/15 text-accent-dark' : 'bg-nail/15 text-nail-dark'
                        }`}
                      >{a.hora_inicio?.slice(0, 5)} {a.cliente?.nome?.split(' ')[0]}</div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════ MONTH VIEW ═══════════ */
function MonthView({ date, agendamentos, onClickDay, onClickEvent, dashboard }) {
  const y = date.getFullYear(), m = date.getMonth();
  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const birthdayDays = useMemo(() => {
    return new Set((dashboard?.aniversariantes || []).map(a => a.dia));
  }, [dashboard]);

  return (
    <div className="bg-white rounded-2xl shadow-card border border-secondary/20 overflow-hidden">
      <div className="grid grid-cols-7">
        {DAYS.map(d => <div key={d} className="text-center py-2 text-xs font-medium text-dark/40 border-b border-primary/50">{d}</div>)}
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="border-r border-b border-primary/30 min-h-[80px] bg-primary/20" />;
          const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayAgs = agendamentos.filter(a => a.data === ds && a.status !== 'cancelado');
          const isToday = ds === fmtDate(new Date());
          const isBday = birthdayDays.has(day);
          return (
            <div key={i} className={`border-r border-b border-primary/30 min-h-[80px] p-1 cursor-pointer hover:bg-primary/30 transition-colors ${isToday ? 'bg-accent/5' : ''}`} onClick={() => onClickDay(ds)}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${isToday ? 'bg-accent text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-dark/60'}`}>{day}</span>
                {isBday && <span className="text-sm">🎂</span>}
              </div>
              <div className="mt-1 space-y-0.5">
                {dayAgs.slice(0, 3).map(a => (
                  <div key={a.id} onClick={e => { e.stopPropagation(); onClickEvent(a); }}
                    className={`text-[10px] px-1 py-0.5 rounded truncate cursor-pointer ${
                      a.servico?.categoria === 'estetica' ? 'bg-accent/15 text-accent-dark' : 'bg-nail/15 text-nail-dark'
                    }`}
                  >{a.hora_inicio?.slice(0, 5)} {a.cliente?.nome?.split(' ')[0]}</div>
                ))}
                {dayAgs.length > 3 && <p className="text-[9px] text-dark/40">+{dayAgs.length - 3} mais</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
