import { useState, useEffect, useMemo } from 'react';
import { FiChevronLeft, FiChevronRight, FiPlus, FiLock, FiClock, FiUsers, FiScissors, FiCalendar } from 'react-icons/fi';
import { getAgendamentos, getBloqueios, getAgendaDashboard, autoConcluir, getProfissionais } from '../../services/api';
import { NovoAgendamentoModal, DetalhesAgendamentoModal, BloqueioModal, ListaEsperaModal } from './AgendaModals';
import { ClientesTab, ProcedimentosTab } from './AgendaTabs';

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);
const SLOT_H = 64; // px per hour row — key for proportional sizing
const VIEWS = ['dia', 'semana', 'mes'];
const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function fmtDate(d) { return d.toISOString().split('T')[0]; }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function startOfWeek(d) { const r = new Date(d); r.setDate(r.getDate() - r.getDay()); return r; }
function timeToMin(t) { if (!t) return 0; const [h, m] = t.split(':').map(Number); return h * 60 + m; }

/* ── Status styling map ───────────────────────────────────────── */
const STATUS = {
  agendado:       { label: 'Agendado',       bg: 'bg-blue-500',      bgLight: 'bg-blue-50',  text: 'text-blue-700',    border: 'border-blue-300',    dot: 'bg-blue-500' },
  confirmado:     { label: 'Confirmado',     bg: 'bg-emerald-500',   bgLight: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300', dot: 'bg-emerald-500' },
  cancelado:      { label: 'Cancelado',      bg: 'bg-red-400',       bgLight: 'bg-red-50',   text: 'text-red-600',     border: 'border-red-300',     dot: 'bg-red-400' },
  nao_compareceu: { label: 'Não Compareceu', bg: 'bg-orange-400',    bgLight: 'bg-orange-50', text: 'text-orange-700',  border: 'border-orange-300',  dot: 'bg-orange-400' },
  concluido:      { label: 'Concluído',      bg: 'bg-teal-500',      bgLight: 'bg-teal-50',  text: 'text-teal-700',    border: 'border-teal-300',    dot: 'bg-teal-500' },
};
const getStatus = (s) => STATUS[s] || STATUS.agendado;
const getCatColor = (cat) => cat === 'unha' ? { left: 'border-l-nail-dark', icon: 'bg-nail/20 text-nail-dark' } : { left: 'border-l-accent', icon: 'bg-accent/15 text-accent-dark' };

export default function Agenda() {
  const [tab, setTab] = useState('agenda');
  const [view, setView] = useState('dia');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [agendamentos, setAgendamentos] = useState([]);
  const [bloqueios, setBloqueios] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [profissionais, setProfissionais] = useState([]);
  const [filterProf, setFilterProf] = useState('');
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

  useEffect(() => { getProfissionais({}).then(r => setProfissionais(r.data)).catch(() => {}); }, []);
  useEffect(() => { loadAll(); }, [currentDate, view, filterProf]);

  const getDateRange = () => {
    if (view === 'dia') return { start: fmtDate(currentDate), end: fmtDate(currentDate) };
    if (view === 'semana') { const s = startOfWeek(currentDate); return { start: fmtDate(s), end: fmtDate(addDays(s, 6)) }; }
    const y = currentDate.getFullYear(), m = currentDate.getMonth();
    return { start: fmtDate(new Date(y, m, 1)), end: fmtDate(new Date(y, m + 1, 0)) };
  };
  const navigate = (dir) => { const d = new Date(currentDate); if (view === 'dia') d.setDate(d.getDate() + dir); else if (view === 'semana') d.setDate(d.getDate() + dir * 7); else d.setMonth(d.getMonth() + dir); setCurrentDate(d); };
  const openNew = (date, time) => { setNewInitDate(date || fmtDate(currentDate)); setNewInitTime(time || ''); setShowNew(true); };
  const dateLabel = () => {
    if (view === 'dia') return currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (view === 'semana') { const s = startOfWeek(currentDate); return `${s.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} — ${addDays(s, 6).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}`; }
    return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  };

  const tabs = [
    { key: 'agenda', label: 'Agenda', icon: FiCalendar },
    { key: 'clientes', label: 'Clientes', icon: FiUsers },
    { key: 'procedimentos', label: 'Procedimentos', icon: FiScissors },
  ];

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-dark">Agenda</h1>
          <p className="text-dark/40 text-sm">Gerenciamento completo de horários</p>
        </div>
      </div>

      {/* Dashboard Cards — compact for mobile */}
      {dashboard && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Hoje', value: dashboard.total_hoje, color: 'from-accent to-accent-dark', Icon: FiCalendar },
            { label: 'Confirmados', value: dashboard.confirmados, color: 'from-emerald-400 to-teal-500', Icon: FiCheckIcon },
            { label: 'Concluídos', value: dashboard.concluidos, color: 'from-teal-400 to-cyan-500', Icon: FiCheckIcon },
            { label: 'Lista Espera', value: dashboard.aguardando_espera, color: 'from-amber-400 to-orange-500', Icon: FiClock },
          ].map((c, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-card p-4 border border-secondary/20 hover:shadow-hover transition-shadow">
              <div className="flex items-center justify-between">
                <div><p className="text-[11px] text-dark/40 font-medium uppercase tracking-wide">{c.label}</p><p className="text-2xl font-heading font-bold text-dark mt-0.5">{c.value}</p></div>
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center text-white`}><c.Icon size={16} /></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Birthday alert */}
      {dashboard?.aniversariantes?.length > 0 && (
        <div className="p-3.5 bg-gradient-to-r from-pink-50 to-amber-50 rounded-2xl border border-pink-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-pink-100 flex items-center justify-center shrink-0"><span className="text-base">🎂</span></div>
          <div className="min-w-0">
            <p className="font-heading font-semibold text-sm text-dark">Aniversariantes do mês</p>
            <p className="text-xs text-dark/50 truncate">{dashboard.aniversariantes.map(a => `${a.nome} (dia ${a.dia})`).join(' · ')}</p>
          </div>
        </div>
      )}

      {/* Tabs — mobile-friendly */}
      <div className="flex gap-1 bg-soft p-1 rounded-2xl">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              tab === t.key ? 'bg-white text-accent shadow-card' : 'text-dark/40 hover:text-dark'
            }`}
          ><t.icon size={15} /> <span className="hidden sm:inline">{t.label}</span></button>
        ))}
      </div>

      {tab === 'agenda' && (
        <div className="space-y-3">
          {/* Toolbar — stacks on mobile */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="flex bg-white rounded-xl shadow-card border border-secondary/30 overflow-hidden">
                {VIEWS.map(v => (
                  <button key={v} onClick={() => setView(v)}
                    className={`px-3.5 py-2 text-xs font-semibold capitalize transition-all ${view === v ? 'bg-gradient-to-r from-accent to-accent-dark text-white' : 'text-dark/40 hover:text-dark hover:bg-primary/50'}`}
                  >{v}</button>
                ))}
              </div>
              <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-xl bg-white shadow-card border border-secondary/30 flex items-center justify-center hover:bg-primary"><FiChevronLeft size={15} /></button>
              <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 rounded-xl bg-white shadow-card border border-secondary/30 text-xs font-semibold hover:bg-primary">Hoje</button>
              <button onClick={() => navigate(1)} className="w-8 h-8 rounded-xl bg-white shadow-card border border-secondary/30 flex items-center justify-center hover:bg-primary"><FiChevronRight size={15} /></button>
            </div>
            <span className="font-heading font-semibold text-dark text-sm capitalize">{dateLabel()}</span>
            <div className="sm:ml-auto flex flex-wrap gap-2">
              <select className="px-3 py-2 rounded-xl border border-secondary/30 bg-white text-xs" value={filterProf} onChange={e => setFilterProf(e.target.value)}>
                <option value="">Todos profissionais</option>
                {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </select>
              <button className="px-3 py-2 bg-white border border-secondary/30 shadow-card rounded-xl text-xs hover:bg-primary flex items-center gap-1" onClick={() => setShowBloqueio(true)}><FiLock size={13} /> Bloquear</button>
              <button className="px-3 py-2 bg-white border border-secondary/30 shadow-card rounded-xl text-xs hover:bg-primary flex items-center gap-1" onClick={() => setShowEspera(true)}><FiClock size={13} /> Espera</button>
              <button className="px-3 py-2 bg-gradient-to-r from-accent to-accent-dark text-white rounded-xl text-xs font-semibold shadow-card hover:shadow-hover flex items-center gap-1" onClick={() => openNew()}><FiPlus size={14} /> Agendar</button>
            </div>
          </div>

          {view === 'dia' && <DayView date={currentDate} agendamentos={agendamentos} bloqueios={bloqueios} onClickSlot={(t) => openNew(fmtDate(currentDate), t)} onClickEvent={setShowDetails} />}
          {view === 'semana' && <WeekView date={currentDate} agendamentos={agendamentos} bloqueios={bloqueios} onClickSlot={(d, t) => openNew(d, t)} onClickEvent={setShowDetails} />}
          {view === 'mes' && <MonthView date={currentDate} agendamentos={agendamentos} onClickDay={(d) => { setCurrentDate(new Date(d + 'T12:00:00')); setView('dia'); }} onClickEvent={setShowDetails} dashboard={dashboard} />}
        </div>
      )}
      {tab === 'clientes' && <ClientesTab />}
      {tab === 'procedimentos' && <ProcedimentosTab />}

      <NovoAgendamentoModal open={showNew} onClose={() => setShowNew(false)} onSave={loadAll} initialDate={newInitDate} initialTime={newInitTime} />
      <DetalhesAgendamentoModal open={!!showDetails} onClose={() => setShowDetails(null)} agendamento={showDetails} onUpdate={loadAll} />
      <BloqueioModal open={showBloqueio} onClose={() => setShowBloqueio(false)} onSave={loadAll} profissionais={profissionais} />
      <ListaEsperaModal open={showEspera} onClose={() => setShowEspera(false)} onSave={loadAll} />
    </div>
  );
}

/* Simple check icon fallback */
function FiCheckIcon({ size }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>; }

/* ═══════════ APPOINTMENT CARD — proportional ═══════════ */
function EventCard({ ag, onClick, compact }) {
  const st = getStatus(ag.status);
  const cat = getCatColor(ag.servico?.categoria);
  const dur = ag.servico?.duracao_minutos || 30;

  if (compact) {
    return (
      <button onClick={e => { e.stopPropagation(); onClick(ag); }}
        className={`w-full text-left px-2 py-1 rounded-lg text-[11px] leading-tight truncate border-l-[3px] ${cat.left} ${st.bgLight} ${st.text} hover:brightness-95 transition-all`}
      >
        <span className="font-bold">{ag.hora_inicio?.slice(0,5)}</span> {ag.cliente?.nome?.split(' ')[0]}
      </button>
    );
  }

  return (
    <button onClick={e => { e.stopPropagation(); onClick(ag); }}
      className={`w-full text-left p-2.5 rounded-xl border-l-4 ${cat.left} ${st.bgLight} border ${st.border} hover:shadow-md transition-all group overflow-hidden`}
      style={{ minHeight: 40 }}
    >
      <div className="flex items-start gap-2">
        <span className={`w-2 h-2 rounded-full ${st.dot} mt-1 shrink-0`} />
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-xs ${st.text} truncate`}>{ag.cliente?.nome || '—'}</p>
          <p className="text-[11px] text-dark/50 truncate">{ag.servico?.nome} · {ag.profissional?.nome}</p>
          <p className="text-[11px] text-dark/40">{ag.hora_inicio?.slice(0,5)} – {ag.hora_fim?.slice(0,5)}</p>
        </div>
        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${st.bg} text-white shrink-0`}>{st.label}</span>
      </div>
    </button>
  );
}

/* ═══════════ DAY VIEW — proportional height ═══════════ */
function DayView({ date, agendamentos, bloqueios, onClickSlot, onClickEvent }) {
  const dateStr = fmtDate(date);
  const dayAgs = agendamentos.filter(a => a.data === dateStr && a.status !== 'cancelado');
  const dayBloqs = bloqueios.filter(b => b.data === dateStr);
  const gridStart = HOURS[0] * 60; // 07:00 in minutes

  return (
    <div className="bg-white rounded-2xl shadow-card border border-secondary/20 overflow-hidden">
      <div className="overflow-y-auto max-h-[calc(100vh-320px)] agenda-grid relative" style={{ minHeight: HOURS.length * SLOT_H }}>
        {/* Hour grid lines */}
        {HOURS.map((h, i) => (
          <div key={h} className="flex border-b border-primary/40 cursor-pointer hover:bg-primary/10 transition-colors"
            style={{ height: SLOT_H }}
            onClick={() => onClickSlot(`${String(h).padStart(2, '0')}:00`)}
          >
            <div className="w-14 sm:w-16 shrink-0 px-2 pt-1 text-[11px] text-dark/35 font-medium border-r border-primary/40 select-none">
              {String(h).padStart(2, '0')}:00
            </div>
            <div className="flex-1" />
          </div>
        ))}

        {/* Bloqueios — positioned absolutely */}
        {dayBloqs.map(b => {
          const top = (timeToMin(b.hora_inicio) - gridStart) / 60 * SLOT_H;
          const height = Math.max((timeToMin(b.hora_fim) - timeToMin(b.hora_inicio)) / 60 * SLOT_H, SLOT_H / 2);
          const tipos = { ausencia: 'Ausência', atestado: 'Atestado', intervalo: 'Intervalo' };
          return (
            <div key={`b-${b.id}`} className="absolute left-14 sm:left-16 right-2 bg-gray-100/80 border border-gray-200 border-dashed rounded-xl flex items-start p-2.5 pointer-events-none z-[1]"
              style={{ top, height }}
            >
              <FiLock size={12} className="text-gray-400 mr-1.5 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-gray-500">{tipos[b.tipo] || b.tipo}</p>
                <p className="text-[11px] text-gray-400">{b.profissional?.nome} · {b.hora_inicio?.slice(0,5)}–{b.hora_fim?.slice(0,5)}</p>
              </div>
            </div>
          );
        })}

        {/* Appointments — proportional */}
        {dayAgs.map(ag => {
          const top = (timeToMin(ag.hora_inicio) - gridStart) / 60 * SLOT_H;
          const dur = timeToMin(ag.hora_fim) - timeToMin(ag.hora_inicio);
          const height = Math.max(dur / 60 * SLOT_H, 40);
          return (
            <div key={ag.id} className="absolute left-14 sm:left-16 right-2 z-[2]" style={{ top: top + 2, height: height - 4 }}>
              <EventCard ag={ag} onClick={onClickEvent} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════ WEEK VIEW — proportional ═══════════ */
function WeekView({ date, agendamentos, bloqueios, onClickSlot, onClickEvent }) {
  const weekStart = startOfWeek(date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const gridStart = HOURS[0] * 60;

  return (
    <div className="bg-white rounded-2xl shadow-card border border-secondary/20 overflow-x-auto week-scroll">
      <div className="min-w-[700px]">
        {/* Header */}
        <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-secondary/30 sticky top-0 bg-white z-10">
          <div className="border-r border-primary/40" />
          {days.map((d, i) => {
            const isToday = fmtDate(d) === fmtDate(new Date());
            return (
              <div key={i} className={`text-center py-2.5 border-r border-primary/40 ${isToday ? 'bg-accent/5' : ''}`}>
                <p className="text-[10px] text-dark/35 uppercase font-semibold tracking-wide">{DAYS[d.getDay()]}</p>
                <p className={`text-sm font-heading font-bold mt-0.5 ${isToday ? 'bg-accent text-white w-7 h-7 rounded-full flex items-center justify-center mx-auto' : 'text-dark'}`}>{d.getDate()}</p>
              </div>
            );
          })}
        </div>
        {/* Grid body */}
        <div className="overflow-y-auto max-h-[calc(100vh-360px)] agenda-grid relative">
          {/* Hour rows */}
          {HOURS.map(h => (
            <div key={h} className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-primary/30" style={{ height: SLOT_H }}>
              <div className="px-2 pt-1 text-[10px] text-dark/30 font-medium border-r border-primary/40">{String(h).padStart(2, '0')}:00</div>
              {days.map((d, di) => (
                <div key={di} className="border-r border-primary/25 hover:bg-primary/10 cursor-pointer transition-colors relative"
                  onClick={() => onClickSlot(fmtDate(d), `${String(h).padStart(2, '0')}:00`)} />
              ))}
            </div>
          ))}
          {/* Overlay events — each day column */}
          {days.map((d, di) => {
            const ds = fmtDate(d);
            const colAgs = agendamentos.filter(a => a.data === ds && a.status !== 'cancelado');
            // colLeft: 56px (time col) + di * colWidth
            return colAgs.map(ag => {
              const top = (timeToMin(ag.hora_inicio) - gridStart) / 60 * SLOT_H;
              const dur = timeToMin(ag.hora_fim) - timeToMin(ag.hora_inicio);
              const height = Math.max(dur / 60 * SLOT_H, 28);
              return (
                <div key={ag.id} className="absolute z-[2] px-0.5"
                  style={{
                    top: top + 1,
                    height: height - 2,
                    left: `calc(56px + ${di} * ((100% - 56px) / 7) + 2px)`,
                    width: `calc((100% - 56px) / 7 - 4px)`,
                  }}
                >
                  <EventCard ag={ag} onClick={onClickEvent} compact={dur < 40} />
                </div>
              );
            });
          })}
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
  const birthdayDays = useMemo(() => new Set((dashboard?.aniversariantes || []).map(a => a.dia)), [dashboard]);

  return (
    <div className="bg-white rounded-2xl shadow-card border border-secondary/20 overflow-hidden">
      <div className="grid grid-cols-7">
        {DAYS.map(d => <div key={d} className="text-center py-2 text-[10px] font-semibold text-dark/35 uppercase tracking-wider border-b border-primary/40">{d}</div>)}
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="border-r border-b border-primary/25 min-h-[90px] bg-primary/10" />;
          const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayAgs = agendamentos.filter(a => a.data === ds && a.status !== 'cancelado');
          const isToday = ds === fmtDate(new Date());
          const isBday = birthdayDays.has(day);
          return (
            <div key={i} className={`border-r border-b border-primary/25 min-h-[90px] p-1.5 cursor-pointer hover:bg-primary/20 transition-colors ${isToday ? 'bg-accent/5' : ''}`} onClick={() => onClickDay(ds)}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-semibold ${isToday ? 'bg-accent text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-dark/50'}`}>{day}</span>
                {isBday && <span className="text-xs">🎂</span>}
                {dayAgs.length > 0 && <span className="text-[9px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded-full">{dayAgs.length}</span>}
              </div>
              <div className="space-y-0.5">
                {dayAgs.slice(0, 3).map(a => (
                  <EventCard key={a.id} ag={a} onClick={onClickEvent} compact />
                ))}
                {dayAgs.length > 3 && <p className="text-[9px] text-dark/40 pl-1">+{dayAgs.length - 3} mais</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
