import { useState, useEffect, useMemo, useCallback } from 'react';
import { FiChevronLeft, FiChevronRight, FiPlus, FiLock, FiClock, FiUsers, FiScissors, FiCalendar, FiColumns, FiZoomIn } from 'react-icons/fi';
import { getAgendamentos, getBloqueios, getAgendaDashboard, autoConcluir, getProfissionais } from '../../services/api';
import { NovoAgendamentoModal, DetalhesAgendamentoModal, BloqueioModal, ListaEsperaModal, Modal } from './AgendaModals';
import { ClientesTab, ProcedimentosTab } from './AgendaTabs';

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00 – 20:00
const VIEWS = ['dia', 'semana', 'mes', 'profissional'];
const DAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const ZOOM_OPTIONS = [
  { label: '15min', value: 15, slotH: 20 },
  { label: '30min', value: 30, slotH: 36 },
  { label: '60min', value: 60, slotH: 72 },
];

function fmtDate(d) { return d.toISOString().split('T')[0]; }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function startOfWeek(d) { const r = new Date(d); r.setDate(r.getDate() - r.getDay()); return r; }
function timeToMin(t) { if (!t) return 0; const p = t.split(':'); return parseInt(p[0]) * 60 + parseInt(p[1]); }

/* ── Status ────────────────────────────────────────────────────── */
const STATUS_MAP = {
  agendado:       { label: 'Agendado',       bg: '#3B82F6', bgLight: '#EFF6FF', text: '#1D4ED8', border: '#93C5FD' },
  confirmado:     { label: 'Confirmado',     bg: '#10B981', bgLight: '#ECFDF5', text: '#047857', border: '#6EE7B7' },
  em_atendimento: { label: 'Em Atendimento', bg: '#7C3AED', bgLight: '#EDE9FE', text: '#6D28D9', border: '#C4B5FD' },
  concluido:      { label: 'Concluído',      bg: '#14B8A6', bgLight: '#F0FDFA', text: '#0F766E', border: '#5EEAD4' },
  nao_compareceu: { label: 'Não Compareceu', bg: '#F97316', bgLight: '#FFF7ED', text: '#C2410C', border: '#FDBA74' },
  cancelado:      { label: 'Cancelado',      bg: '#EF4444', bgLight: '#FEF2F2', text: '#B91C1C', border: '#FCA5A5' },
};
const getStatus = (s) => STATUS_MAP[s] || STATUS_MAP.agendado;

export default function Agenda() {
  const [tab, setTab] = useState('agenda');
  const [procSubTab, setProcSubTab] = useState('servicos');
  const [view, setView] = useState('dia');
  const [zoom, setZoom] = useState(60);
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
  const [editBloqueio, setEditBloqueio] = useState(null);
  const [showEspera, setShowEspera] = useState(false);
  const [showAniversariantesModal, setShowAniversariantesModal] = useState(false);
  const [prefilledData, setPrefilledData] = useState(null);  // from waiting list

  const slotH = ZOOM_OPTIONS.find(z => z.value === zoom)?.slotH || 72;

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

  // Listen for waiting list "Agendar" events
  useEffect(() => {
    const handler = (e) => {
      const d = e.detail;
      setPrefilledData(d);
      setNewInitDate(d.data || fmtDate(new Date()));
      setNewInitTime(d.hora || '');
      setTab('agenda');
      setShowNew(true);
    };
    window.addEventListener('agenda:agendar-espera', handler);
    return () => window.removeEventListener('agenda:agendar-espera', handler);
  }, []);

  const getDateRange = () => {
    if (view === 'dia' || view === 'profissional') return { start: fmtDate(currentDate), end: fmtDate(currentDate) };
    if (view === 'semana') { const s = startOfWeek(currentDate); return { start: fmtDate(s), end: fmtDate(addDays(s, 6)) }; }
    const y = currentDate.getFullYear(), m = currentDate.getMonth();
    return { start: fmtDate(new Date(y, m, 1)), end: fmtDate(new Date(y, m + 1, 0)) };
  };

  const navigate = (dir) => {
    const d = new Date(currentDate);
    if (view === 'dia' || view === 'profissional') d.setDate(d.getDate() + dir);
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
    if (view === 'dia' || view === 'profissional') return currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (view === 'semana') {
      const s = startOfWeek(currentDate);
      return `${s.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} — ${addDays(s, 6).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  };

  const tabs = [
    { key: 'agenda', label: 'Agenda', icon: FiCalendar },
    { key: 'clientes', label: 'Clientes', icon: FiUsers },
    { key: 'procedimentos', label: 'Procedimentos', icon: FiScissors },
  ];

  const viewLabels = { dia: 'Dia', semana: 'Semana', mes: 'Mês', profissional: 'Profissionais' };

  return (
    <div className="space-y-3 sm:space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-dark">Agenda</h1>
          <p className="text-dark/40 text-xs sm:text-sm">Gerenciamento completo de horários</p>
        </div>
      </div>

      {/* Dashboard Cards */}
      {dashboard && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {[
            { label: 'Hoje', value: dashboard.total_hoje, color: 'from-accent to-accent-dark' },
            { label: 'Confirmados', value: dashboard.confirmados, color: 'from-emerald-400 to-teal-500' },
            { label: 'Concluídos', value: dashboard.concluidos, color: 'from-teal-400 to-cyan-500' },
            { label: 'Lista Espera', value: dashboard.aguardando_espera, color: 'from-amber-400 to-orange-500', onClick: () => { setProcSubTab('espera'); setTab('procedimentos'); } },
          ].map((c, i) => (
            <div key={i} onClick={c.onClick} className={`bg-white rounded-2xl shadow-card p-3 sm:p-4 border border-secondary/20 hover:shadow-hover transition-shadow relative overflow-hidden ${c.onClick ? 'cursor-pointer' : ''}`}>
              {c.onClick && <div className="absolute inset-y-0 left-0 w-1 bg-amber-400 rounded-l-2xl" />}
              <div className={c.onClick ? 'pl-1' : ''}>
                <p className="text-[10px] sm:text-[11px] text-dark/40 font-medium uppercase tracking-wide">{c.label}</p>
                <p className="text-xl sm:text-2xl font-heading font-bold text-dark mt-0.5">{c.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Birthday alert */}
      {dashboard?.aniversariantes?.length > 0 && (
        <div className="p-3.5 bg-gradient-to-r from-pink-50 to-amber-50 rounded-2xl border border-pink-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-pink-100 flex items-center justify-center shrink-0">
            <FiCalendar size={16} className="text-pink-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-heading font-semibold text-sm text-dark">Aniversariantes hoje</p>
            {dashboard.aniversariantes.length > 2 ? (
              <p className="text-xs text-dark/60 mt-0.5">
                Você tem <strong>{dashboard.aniversariantes.length}</strong> clientes fazendo aniversário!{' '}
                <button onClick={() => setShowAniversariantesModal(true)} className="ml-1 text-pink-600 hover:text-pink-700 font-semibold underline decoration-pink-300">
                  Ver lista
                </button>
              </p>
            ) : (
              <p className="text-xs text-dark/60 truncate mt-0.5">
                {dashboard.aniversariantes.map(a => `${a.nome} (dia ${a.dia})`).join(' · ')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-soft p-1 rounded-2xl">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              tab === t.key ? 'bg-white text-accent shadow-card' : 'text-dark/40 hover:text-dark'
            }`}>
            <t.icon size={15} className="shrink-0" />
            <span className="truncate">{t.label}</span>
          </button>
        ))}
      </div>

      {tab === 'agenda' && (
        <div className="space-y-3">
          {/* Toolbar */}
          <div className="flex flex-col gap-2 sm:gap-3">
            {/* Row 1: View switcher + Nav + Zoom */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              {/* View switcher */}
              <div className="flex bg-white rounded-xl shadow-card border border-secondary/30 overflow-hidden">
                {VIEWS.map(v => (
                  <button key={v} onClick={() => setView(v)}
                    className={`px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-[11px] font-semibold transition-all ${
                      view === v ? 'bg-gradient-to-r from-accent to-accent-dark text-white' : 'text-dark/40 hover:text-dark hover:bg-primary/50'
                    }`}>{viewLabels[v]}</button>
                ))}
              </div>
              {/* Nav */}
              <button onClick={() => navigate(-1)} className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white shadow-card border border-secondary/30 flex items-center justify-center hover:bg-primary shrink-0">
                <FiChevronLeft size={14} />
              </button>
              <button onClick={() => setCurrentDate(new Date())} className="px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-white shadow-card border border-secondary/30 text-[11px] sm:text-xs font-semibold hover:bg-primary">Hoje</button>
              <button onClick={() => navigate(1)} className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white shadow-card border border-secondary/30 flex items-center justify-center hover:bg-primary shrink-0">
                <FiChevronRight size={14} />
              </button>
              {/* Zoom */}
              {(view === 'dia' || view === 'semana' || view === 'profissional') && (
                <div className="flex bg-white rounded-xl shadow-card border border-secondary/30 overflow-hidden">
                  {ZOOM_OPTIONS.map(z => (
                    <button key={z.value} onClick={() => setZoom(z.value)}
                      className={`px-2 sm:px-2.5 py-1.5 sm:py-2 text-[10px] font-semibold transition-all ${
                        zoom === z.value ? 'bg-accent/10 text-accent' : 'text-dark/30 hover:text-dark'
                      }`}>{z.label}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Row 2: Date label */}
            <span className="font-heading font-semibold text-dark text-xs sm:text-sm capitalize">{dateLabel()}</span>

            {/* Row 3: Actions */}
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {view !== 'profissional' && (
                <select className="px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl border border-secondary/30 bg-white text-[11px] sm:text-xs flex-1 min-w-0 sm:flex-none" value={filterProf} onChange={e => setFilterProf(e.target.value)}>
                  <option value="">Todos profissionais</option>
                  {profissionais.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              )}
              <button className="px-2 sm:px-3 py-1.5 sm:py-2 bg-white border border-secondary/30 shadow-card rounded-xl text-[11px] sm:text-xs hover:bg-primary flex items-center gap-1" onClick={() => { setEditBloqueio(null); setShowBloqueio(true); }}>
                <FiLock size={12} /> Bloquear
              </button>
              <button className="px-2 sm:px-3 py-1.5 sm:py-2 bg-white border border-secondary/30 shadow-card rounded-xl text-[11px] sm:text-xs hover:bg-primary flex items-center gap-1" onClick={() => setShowEspera(true)}>
                <FiClock size={12} /> Espera
              </button>
              <button className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-gradient-to-r from-accent to-accent-dark text-white rounded-xl text-[11px] sm:text-xs font-semibold shadow-card hover:shadow-hover flex items-center gap-1" onClick={() => openNew()}>
                <FiPlus size={13} /> Agendar
              </button>
            </div>
          </div>

          {/* Calendar views */}
          {view === 'dia' && (
            <DayView date={currentDate} agendamentos={agendamentos} bloqueios={bloqueios} slotH={slotH} zoom={zoom}
              onClickSlot={(t) => openNew(fmtDate(currentDate), t)} onClickEvent={setShowDetails}
              onClickBlock={(b) => { setEditBloqueio(b); setShowBloqueio(true); }} />
          )}
          {view === 'semana' && (
            <WeekView date={currentDate} agendamentos={agendamentos} bloqueios={bloqueios} slotH={slotH} zoom={zoom}
              onClickSlot={(d, t) => openNew(d, t)} onClickEvent={setShowDetails} />
          )}
          {view === 'mes' && (
            <MonthView date={currentDate} agendamentos={agendamentos}
              onClickDay={(d) => { setCurrentDate(new Date(d + 'T12:00:00')); setView('dia'); }}
              onClickEvent={setShowDetails} dashboard={dashboard} />
          )}
          {view === 'profissional' && (
            <ProfessionalView date={currentDate} agendamentos={agendamentos} bloqueios={bloqueios}
              profissionais={profissionais} slotH={slotH} zoom={zoom}
              onClickSlot={(t) => openNew(fmtDate(currentDate), t)} onClickEvent={setShowDetails}
              onClickBlock={(b) => { setEditBloqueio(b); setShowBloqueio(true); }} />
          )}
        </div>
      )}

      {tab === 'clientes' && <ClientesTab />}
      {tab === 'procedimentos' && <ProcedimentosTab defaultSubTab={procSubTab} />}

      <NovoAgendamentoModal open={showNew} onClose={() => { setShowNew(false); setPrefilledData(null); }} onSave={loadAll} initialDate={newInitDate} initialTime={newInitTime} prefilledData={prefilledData} bloqueios={bloqueios} />
      <DetalhesAgendamentoModal open={!!showDetails} onClose={() => setShowDetails(null)} agendamento={showDetails} onUpdate={loadAll} />
      <BloqueioModal open={showBloqueio} onClose={() => { setShowBloqueio(false); setEditBloqueio(null); }} onSave={loadAll} profissionais={profissionais} bloqueio={editBloqueio} />
      <ListaEsperaModal open={showEspera} onClose={() => setShowEspera(false)} onSave={loadAll} />
      
      <Modal open={showAniversariantesModal} onClose={() => setShowAniversariantesModal(false)} title="Aniversariantes do Mês">
        <div className="space-y-2 max-h-96 overflow-y-auto p-1">
          {dashboard?.aniversariantes?.map((a, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-pink-50/50 rounded-xl border border-pink-100">
              <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-500 font-bold shrink-0">
                🎂
              </div>
              <div className="flex-1">
                <p className="font-semibold text-dark text-sm">{a.nome}</p>
                <p className="text-xs text-dark/50">Dia {a.dia}</p>
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   EVENT CARD  — fills 100% parent height
   ═══════════════════════════════════════════════════════════ */
function EventCard({ ag, onClick, compact }) {
  const st = getStatus(ag.status);

  if (compact) {
    return (
      <button onClick={e => { e.stopPropagation(); onClick(ag); }}
        className="w-full text-left px-2 py-1 rounded-lg text-[11px] leading-tight truncate transition-all hover:brightness-95"
        style={{ background: st.bgLight, color: st.text, borderLeft: `3px solid ${st.bg}` }}>
        <span className="font-bold">{ag.hora_inicio?.slice(0,5)}</span>{' '}
        {ag.cliente?.nome?.split(' ')[0]}
      </button>
    );
  }

  return (
    <button onClick={e => { e.stopPropagation(); onClick(ag); }}
      className="w-full h-full text-left rounded-xl overflow-hidden transition-all hover:shadow-lg hover:brightness-[0.97] flex flex-col"
      style={{
        background: st.bgLight,
        border: `1px solid ${st.border}`,
        borderLeftWidth: '4px',
        borderLeftColor: st.bg,
      }}>
      <div className="flex items-start gap-1.5 p-2 flex-1 min-h-0">
        <span className="w-2 h-2 rounded-full mt-1 shrink-0" style={{ background: st.bg }} />
        <div className="flex-1 min-w-0 overflow-hidden">
          <p className="font-semibold text-xs truncate" style={{ color: st.text }}>{ag.cliente?.nome || '—'}</p>
          <p className="text-[11px] text-dark/50 truncate">{ag.servico?.nome} · {ag.profissional?.nome}</p>
          <p className="text-[10px] text-dark/40">{ag.hora_inicio?.slice(0,5)} – {ag.hora_fim?.slice(0,5)}</p>
        </div>
        <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded text-white shrink-0 leading-tight" style={{ background: st.bg }}>
          {st.label}
        </span>
      </div>
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════
   TIME GRID HELPERS — used by Day/Week/Professional views
   ═══════════════════════════════════════════════════════════ */
function buildSlots(zoom) {
  const slots = [];
  for (let h = 7; h <= 20; h++) {
    for (let m = 0; m < 60; m += zoom) {
      slots.push({ h, m, label: `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}` });
    }
  }
  return slots;
}

/* ═══════════════════════════════════════════════════════════
   DAY VIEW  — proportional, zoomable
   ═══════════════════════════════════════════════════════════ */
function DayView({ date, agendamentos, bloqueios, slotH, zoom, onClickSlot, onClickEvent, onClickBlock }) {
  const dateStr = fmtDate(date);
  const dayAgs = agendamentos.filter(a => a.data === dateStr && a.status !== 'cancelado');
  const dayBloqs = bloqueios.filter(b => b.data === dateStr);
  const slots = buildSlots(zoom);
  const gridStart = 7 * 60;
  const pxPerMin = slotH / zoom;
  const gridHeight = slots.length * slotH;

  return (
    <div className="bg-white rounded-2xl shadow-card border border-secondary/20 overflow-hidden">
      <div className="overflow-y-auto max-h-[calc(100vh-380px)] sm:max-h-[calc(100vh-320px)]" style={{ position: 'relative', minHeight: gridHeight }}>
        {slots.map((s, i) => (
          <div key={i}
            className="flex border-b border-secondary/50 cursor-pointer hover:bg-primary/20 transition-colors"
            style={{ height: slotH }}
            onClick={() => onClickSlot(s.label)}>
            <div className="w-12 sm:w-16 shrink-0 px-1 sm:px-2 pt-1.5 text-[10px] sm:text-[11px] text-dark/70 font-medium bg-secondary/10 border-r border-secondary/50 select-none">
              {s.m === 0 ? s.label : ''}
            </div>
            <div className="flex-1 bg-white/50" />
          </div>
        ))}

        {/* Bloqueios */}
        {dayBloqs.map(b => {
          const top = (timeToMin(b.hora_inicio) - gridStart) * pxPerMin;
          const h = Math.max((timeToMin(b.hora_fim) - timeToMin(b.hora_inicio)) * pxPerMin, 20);
          return (
            <div key={`b-${b.id}`}
              className="absolute right-2 bg-gray-100/90 border border-dashed border-gray-300 rounded-xl flex items-start p-1.5 sm:p-2 pointer-events-auto cursor-pointer z-[2] hover:bg-gray-200/90 transition-colors"
              style={{ top, height: h, left: '3rem' }}
              onClick={(e) => { e.stopPropagation(); onClickBlock && onClickBlock(b); }}>
              <FiLock size={12} className="text-gray-400 mr-1.5 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-gray-500">{b.tipo}</p>
                <p className="text-[10px] text-gray-400">{b.profissional?.nome} · {b.hora_inicio?.slice(0,5)}–{b.hora_fim?.slice(0,5)}</p>
              </div>
            </div>
          );
        })}

        {/* Events */}
        {dayAgs.map(ag => {
          const top = (timeToMin(ag.hora_inicio) - gridStart) * pxPerMin;
          const h = Math.max((timeToMin(ag.hora_fim) - timeToMin(ag.hora_inicio)) * pxPerMin, 36);
          return (
            <div key={ag.id} className="absolute z-[2]"
              style={{ top: top + 1, height: h - 2, left: 'calc(3rem + 4px)', right: '4px' }}>
              <EventCard ag={ag} onClick={onClickEvent} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   WEEK VIEW
   ═══════════════════════════════════════════════════════════ */
function WeekView({ date, agendamentos, bloqueios, slotH, zoom, onClickSlot, onClickEvent }) {
  const weekStart = startOfWeek(date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const slots = buildSlots(zoom);
  const gridStart = 7 * 60;
  const pxPerMin = slotH / zoom;
  const gridHeight = slots.length * slotH;

  return (
    <div className="bg-white rounded-2xl shadow-card border border-secondary/20 overflow-x-auto">
      <div style={{ minWidth: 600 }}>
        <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-secondary/50 sticky top-0 z-10 shadow-sm bg-white">
          <div className="border-r border-secondary/50 bg-secondary/10" />
          {days.map((d, i) => {
            const isToday = fmtDate(d) === fmtDate(new Date());
            return (
              <div key={i} className={`text-center py-2.5 border-r border-secondary/50 ${isToday ? 'bg-accent/10 border-b-[3px] border-b-accent' : 'bg-secondary/5'}`}>
                <p className={`text-[10px] uppercase font-semibold ${isToday ? 'text-accent' : 'text-dark/60'}`}>{DAYS_SHORT[d.getDay()]}</p>
                <p className={`text-base font-heading font-bold mt-0.5 ${isToday ? 'text-accent' : 'text-dark'}`}>{d.getDate()}</p>
              </div>
            );
          })}
        </div>
        <div className="overflow-y-auto max-h-[calc(100vh-400px)] sm:max-h-[calc(100vh-360px)]" style={{ position: 'relative', minHeight: gridHeight }}>
          {slots.map((s, i) => (
            <div key={i} className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-secondary/50" style={{ height: slotH }}>
              <div className="px-2 pt-1.5 text-[11px] text-dark/70 font-medium bg-secondary/10 border-r border-secondary/50 select-none">{s.m === 0 ? s.label : ''}</div>
              {days.map((d, di) => (
                <div key={di} className={`border-r border-secondary/40 hover:bg-primary/20 cursor-pointer transition-colors ${fmtDate(d) === fmtDate(new Date()) ? 'bg-accent/[0.03]' : 'bg-white/50'}`}
                  onClick={() => onClickSlot(fmtDate(d), s.label)} />
              ))}
            </div>
          ))}
          {days.map((d, di) => {
            const ds = fmtDate(d);
            return agendamentos.filter(a => a.data === ds && a.status !== 'cancelado').map(ag => {
              const top = (timeToMin(ag.hora_inicio) - gridStart) * pxPerMin;
              const h = Math.max((timeToMin(ag.hora_fim) - timeToMin(ag.hora_inicio)) * pxPerMin, 24);
              return (
                <div key={ag.id} className="absolute z-[2] px-0.5"
                  style={{ top: top + 1, height: h - 2, left: `calc(56px + ${di} * ((100% - 56px) / 7) + 2px)`, width: `calc((100% - 56px) / 7 - 4px)` }}>
                  <EventCard ag={ag} onClick={onClickEvent} compact={h < 40} />
                </div>
              );
            });
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PROFESSIONAL VIEW — one column per professional
   ═══════════════════════════════════════════════════════════ */
function ProfessionalView({ date, agendamentos, bloqueios, profissionais, slotH, zoom, onClickSlot, onClickEvent, onClickBlock }) {
  const dateStr = fmtDate(date);
  const profs = profissionais.filter(p => p.ativo !== false);
  const slots = buildSlots(zoom);
  const gridStart = 7 * 60;
  const pxPerMin = slotH / zoom;
  const gridHeight = slots.length * slotH;
  const colCount = profs.length || 1;

  if (profs.length === 0) return <div className="text-center py-12 text-dark/40">Nenhum profissional cadastrado</div>;

  return (
    <div className="bg-white rounded-2xl shadow-card border border-secondary/20 overflow-x-auto">
      <div style={{ minWidth: Math.max(400, colCount * 160) }}>
        {/* Header */}
        <div className={`grid border-b border-secondary/50 sticky top-0 z-10 shadow-sm bg-white`}
          style={{ gridTemplateColumns: `56px repeat(${colCount}, 1fr)` }}>
          <div className="border-r border-secondary/50 flex items-center justify-center py-2 bg-secondary/10">
            <FiColumns size={16} className="text-dark/50" />
          </div>
          {profs.map(p => (
            <div key={p.id} className="text-center py-2 sm:py-3 border-r border-secondary/50 px-1 sm:px-2 bg-secondary/5">
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-accent to-accent-dark text-white font-bold text-[11px] sm:text-sm flex items-center justify-center mx-auto mb-0.5 sm:mb-1 shadow-sm">
                {p.nome?.charAt(0)}
              </div>
              <p className="text-[10px] sm:text-xs font-semibold text-dark truncate">{p.nome}</p>
              {p.especialidade && <p className="text-[9px] sm:text-[10px] text-dark/60 truncate">{p.especialidade}</p>}
            </div>
          ))}
        </div>

        {/* Grid body */}
        <div className="overflow-y-auto max-h-[calc(100vh-420px)] sm:max-h-[calc(100vh-360px)]" style={{ position: 'relative', minHeight: gridHeight }}>
          {slots.map((s, i) => (
            <div key={i} className="border-b border-secondary/50"
              style={{ height: slotH, display: 'grid', gridTemplateColumns: `56px repeat(${colCount}, 1fr)` }}>
              <div className="px-2 pt-1.5 text-[11px] text-dark/70 font-medium bg-secondary/10 border-r border-secondary/50 select-none">{s.m === 0 ? s.label : ''}</div>
              {profs.map((p, pi) => (
                <div key={pi} className="border-r border-secondary/40 hover:bg-primary/20 cursor-pointer transition-colors bg-white/50"
                  onClick={() => onClickSlot(s.label)} />
              ))}
            </div>
          ))}

          {/* Events per professional column */}
          {profs.map((p, pi) => {
            const profAgs = agendamentos.filter(a => a.data === dateStr && a.profissional_id === p.id && a.status !== 'cancelado');
            const profBloqs = bloqueios.filter(b => b.data === dateStr && b.profissional_id === p.id);

            return (
              <div key={p.id}>
                {profBloqs.map(b => {
                  const top = (timeToMin(b.hora_inicio) - gridStart) * pxPerMin;
                  const h = Math.max((timeToMin(b.hora_fim) - timeToMin(b.hora_inicio)) * pxPerMin, 16);
                  return (
                    <div key={`b-${b.id}`}
                      className="absolute bg-gray-100/80 border border-dashed border-gray-300 rounded-lg flex items-center justify-center pointer-events-auto cursor-pointer hover:bg-gray-200/90 transition-colors z-[2]"
                      style={{
                        top, height: h,
                        left: `calc(56px + ${pi} * ((100% - 56px) / ${colCount}) + 2px)`,
                        width: `calc((100% - 56px) / ${colCount} - 4px)`,
                      }}
                      onClick={(e) => { e.stopPropagation(); onClickBlock && onClickBlock(b); }}>
                      <FiLock size={10} className="text-gray-400" />
                    </div>
                  );
                })}
                {profAgs.map(ag => {
                  const top = (timeToMin(ag.hora_inicio) - gridStart) * pxPerMin;
                  const h = Math.max((timeToMin(ag.hora_fim) - timeToMin(ag.hora_inicio)) * pxPerMin, 28);
                  return (
                    <div key={ag.id}
                      className="absolute z-[2] px-0.5"
                      style={{
                        top: top + 1, height: h - 2,
                        left: `calc(56px + ${pi} * ((100% - 56px) / ${colCount}) + 2px)`,
                        width: `calc((100% - 56px) / ${colCount} - 4px)`,
                      }}>
                      <EventCard ag={ag} onClick={onClickEvent} compact={h < 40} />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MONTH VIEW
   ═══════════════════════════════════════════════════════════ */
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
        {DAYS_SHORT.map(d => (
          <div key={d} className="text-center py-2 text-[10px] font-semibold text-dark/35 uppercase tracking-wider border-b border-primary/40">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="border-r border-b border-primary/25 min-h-[60px] sm:min-h-[90px] bg-primary/10" />;
          const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dayAgs = agendamentos.filter(a => a.data === ds && a.status !== 'cancelado');
          const isToday = ds === fmtDate(new Date());
          const isBday = birthdayDays.has(day);
          return (
            <div key={i}
              className={`border-r border-b border-primary/25 min-h-[60px] sm:min-h-[90px] p-1 sm:p-1.5 cursor-pointer hover:bg-primary/20 transition-colors ${isToday ? 'bg-accent/5' : ''}`}
              onClick={() => onClickDay(ds)}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-semibold ${isToday ? 'bg-accent text-white w-6 h-6 rounded-full flex items-center justify-center' : 'text-dark/50'}`}>{day}</span>
                {isBday && <FiCalendar size={12} className="text-pink-400" />}
                {dayAgs.length > 0 && <span className="text-[9px] font-bold text-accent bg-accent/10 px-1.5 py-0.5 rounded-full">{dayAgs.length}</span>}
              </div>
              <div className="space-y-0.5">
                {dayAgs.slice(0, 3).map(a => <EventCard key={a.id} ag={a} onClick={onClickEvent} compact />)}
                {dayAgs.length > 3 && <p className="text-[9px] text-dark/40 pl-1">+{dayAgs.length - 3} mais</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
