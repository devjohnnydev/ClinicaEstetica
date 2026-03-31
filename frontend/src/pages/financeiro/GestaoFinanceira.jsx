import { useState, useEffect, useCallback } from 'react';
import {
  FiDollarSign, FiTrendingUp, FiTrendingDown, FiArrowDown, FiArrowUp,
  FiSearch, FiFilter, FiPlus, FiUser, FiCalendar, FiAlertTriangle,
  FiCreditCard, FiSettings, FiChevronLeft, FiChevronRight, FiPieChart,
  FiBarChart2, FiActivity, FiCheckCircle, FiClock, FiAlertCircle, FiRefreshCw,
} from 'react-icons/fi';
import {
  getFinanceiroDashboard,
  getPagamentos,
  getDespesas,
  deletarDespesa,
  atualizarParcela,
  getCategoriasDespesa,
  getCaixa,
  getGraficoReceitaGastos,
  getGraficoEvolucao,
  getGraficoDistribuicao,
  getClientesFinanceiro,
} from '../../services/api';
import {
  StatCard, BarChart, LineChart, DonutChart,
  PaymentModal, ExpenseModal, ClientHistoryModal, CategoryManagerModal,
  ConfirmModal,
} from './FinanceiroComponents';

// ─── Helper: formata data ISO para dd/mm/yyyy BR ─────────────────
function dataBR(isoStr) {
  if (!isoStr) return '—';
  const [y, m, d] = isoStr.split('-');
  return `${d}/${m}/${y}`;
}

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const TABS = [
  { id: 'dashboard', icon: FiBarChart2, label: 'Dashboard' },
  { id: 'entradas', icon: FiArrowDown, label: 'Entradas' },
  { id: 'gastos', icon: FiArrowUp, label: 'Gastos' },
];

export default function GestaoFinanceira() {
  const [tab, setTab] = useState('dashboard');
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());

  return (
    <div className="animate-fadeIn px-1 sm:px-0">
      {/* Header */}
      <div className="flex flex-col gap-3 mb-5">
        <div>
          <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-dark">💰 Gestão Financeira</h1>
          <p className="text-dark/50 text-xs sm:text-sm mt-0.5">Controle completo de caixa, receitas e despesas</p>
        </div>

        {/* Month selector */}
        <div className="flex items-center gap-2 bg-white rounded-2xl px-3 py-2 shadow-card border border-primary/40 self-start">
          <button onClick={() => { if (mes === 1) { setMes(12); setAno(a => a - 1); } else setMes(m => m - 1); }} className="text-dark/40 hover:text-accent transition p-1">
            <FiChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium text-dark min-w-[110px] text-center">{MESES[mes - 1]} {ano}</span>
          <button onClick={() => { if (mes === 12) { setMes(1); setAno(a => a + 1); } else setMes(m => m + 1); }} className="text-dark/40 hover:text-accent transition p-1">
            <FiChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-2xl p-1.5 shadow-card border border-primary/40 mb-5">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 ${
              tab === t.id
                ? 'bg-gradient-to-r from-accent/10 to-secondary/20 text-accent shadow-sm'
                : 'text-dark/50 hover:bg-primary/30'
            }`}
          >
            <t.icon size={15} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'dashboard' && <DashboardTab mes={mes} ano={ano} />}
      {tab === 'entradas' && <EntradasTab mes={mes} ano={ano} />}
      {tab === 'gastos' && <GastosTab mes={mes} ano={ano} />}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
// DASHBOARD TAB
// ═══════════════════════════════════════════════════════════════════

function DashboardTab({ mes, ano }) {
  const [dash, setDash] = useState(null);
  const [chartBar, setChartBar] = useState(null);
  const [chartLine, setChartLine] = useState(null);
  const [chartPie, setChartPie] = useState(null);
  const [caixa, setCaixa] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, bRes, lRes, pRes, cRes] = await Promise.all([
        getFinanceiroDashboard({ mes, ano }),
        getGraficoReceitaGastos({ ano }),
        getGraficoEvolucao({ meses: 6 }),
        getGraficoDistribuicao({ mes, ano }),
        getCaixa({ mes, ano }),
      ]);
      setDash(dRes.data);
      setChartBar(bRes.data);
      setChartLine(lRes.data);
      setChartPie(pRes.data);
      setCaixa(cRes.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [mes, ano]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="text-center py-12 text-dark/40 animate-pulse">Carregando dashboard...</div>;
  if (!dash) return <div className="text-center py-12 text-dark/40">Erro ao carregar</div>;

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Alert bar */}
      {(dash.alertas.atrasados > 0 || dash.alertas.pendentes > 0) && (
        <div className={`rounded-2xl p-3 sm:p-4 ${dash.alertas.atrasados > 0 ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'} flex items-start sm:items-center gap-3`}>
          <FiAlertTriangle size={18} className={`shrink-0 mt-0.5 sm:mt-0 ${dash.alertas.atrasados > 0 ? 'text-red-500' : 'text-yellow-600'}`} />
          <div className="flex-1 min-w-0">
            {dash.alertas.atrasados > 0 && (
              <p className="text-xs sm:text-sm font-medium text-red-700">
                🔴 {dash.alertas.atrasados} pagamento{dash.alertas.atrasados > 1 ? 's' : ''} atrasado{dash.alertas.atrasados > 1 ? 's' : ''}
              </p>
            )}
            {dash.alertas.pendentes > 0 && (
              <p className="text-xs sm:text-sm text-dark/60">
                ⏳ {dash.alertas.pendentes} pendente{dash.alertas.pendentes > 1 ? 's' : ''} — R$ {dash.alertas.valor_pendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <StatCard icon={FiDollarSign} label="Receita do Mês" value={dash.receita_mes} variacao={dash.variacao_receita} />
        <StatCard icon={FiArrowUp} label="Gastos do Mês" value={dash.gastos_mes} variacao={dash.variacao_gastos} color="red" />
        <StatCard icon={FiTrendingUp} label="Lucro do Mês" value={dash.lucro_mes} variacao={dash.variacao_lucro} color={dash.lucro_mes >= 0 ? 'green' : 'red'} />
        <StatCard icon={FiActivity} label="Receita Total" value={dash.receita_total} />
      </div>

      {/* Cash flow summary */}
      {caixa && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-card border border-primary/40">
          <h3 className="font-heading text-xs sm:text-sm font-semibold text-dark mb-3 flex items-center gap-2">
            <FiDollarSign size={15} className="text-accent" /> Controle de Caixa — {MESES[mes - 1]}
          </h3>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="text-center">
              <p className="text-[10px] sm:text-xs text-dark/50 mb-1">Entradas</p>
              <p className="text-sm sm:text-lg font-bold text-emerald-600">R$ {caixa.total_entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] sm:text-xs text-dark/50 mb-1">Saídas</p>
              <p className="text-sm sm:text-lg font-bold text-red-500">R$ {caixa.total_saidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] sm:text-xs text-dark/50 mb-1">Saldo</p>
              <p className={`text-sm sm:text-lg font-bold ${caixa.saldo >= 0 ? 'text-accent' : 'text-red-500'}`}>R$ {caixa.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-card border border-primary/40">
          <h3 className="font-heading text-xs sm:text-sm font-semibold text-dark mb-3 flex items-center gap-2">
            <FiBarChart2 size={15} className="text-accent" /> Receita vs Gastos — {ano}
          </h3>
          {chartBar && <BarChart data={chartBar.dados} />}
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-card border border-primary/40">
          <h3 className="font-heading text-xs sm:text-sm font-semibold text-dark mb-3 flex items-center gap-2">
            <FiActivity size={15} className="text-accent" /> Evolução Financeira
          </h3>
          {chartLine && <LineChart data={chartLine.dados} />}
        </div>
      </div>

      {/* Donut */}
      {chartPie && chartPie.dados?.length > 0 && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-card border border-primary/40">
          <h3 className="font-heading text-xs sm:text-sm font-semibold text-dark mb-3 flex items-center gap-2">
            <FiPieChart size={15} className="text-accent" /> Distribuição de Gastos — {MESES[mes - 1]}
          </h3>
          <div className="max-w-[240px] mx-auto">
            <DonutChart data={chartPie.dados} />
          </div>
        </div>
      )}

      {/* Comparison */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-card border border-primary/40">
        <h3 className="font-heading text-xs sm:text-sm font-semibold text-dark mb-3">📅 Comparativo com Mês Anterior</h3>
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {[
            { label: 'Receita', atual: dash.receita_mes, anterior: dash.receita_anterior, variacao: dash.variacao_receita },
            { label: 'Gastos', atual: dash.gastos_mes, anterior: dash.gastos_anterior, variacao: dash.variacao_gastos },
            { label: 'Lucro', atual: dash.lucro_mes, anterior: dash.lucro_anterior, variacao: dash.variacao_lucro },
          ].map(item => (
            <div key={item.label} className="bg-soft rounded-xl p-3 sm:p-4">
              <p className="text-[10px] sm:text-xs text-dark/50 mb-1">{item.label}</p>
              <p className="text-sm sm:text-lg font-bold text-dark">R$ {item.atual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p className="text-[10px] sm:text-xs text-dark/40 mt-1 hidden sm:block">Anterior: R$ {item.anterior.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p className={`text-[10px] sm:text-xs font-medium mt-0.5 ${item.variacao > 0 ? 'text-emerald-600' : item.variacao < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                {item.variacao > 0 ? '↑' : item.variacao < 0 ? '↓' : '–'} {Math.abs(item.variacao)}%
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
// ENTRADAS (PAGAMENTOS) TAB
// ═══════════════════════════════════════════════════════════════════

function EntradasTab({ mes, ano }) {
  const [pagamentos, setPagamentos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todos');
  const [busca, setBusca] = useState('');
  const [selectedPag, setSelectedPag] = useState(null);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [viewMode, setViewMode] = useState('pagamentos');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { mes, ano };
      if (filter !== 'todos') params.status = filter;
      const [pRes, cRes] = await Promise.all([
        getPagamentos(params),
        getClientesFinanceiro(),
      ]);
      setPagamentos(pRes.data);
      setClientes(cRes.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [mes, ano, filter]);

  useEffect(() => { loadData(); }, [loadData]);

  const statusColor = {
    pendente: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    parcial: 'bg-blue-100 text-blue-700 border-blue-200',
    pago: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    atrasado: 'bg-red-100 text-red-600 border-red-200',
  };

  const statusIcon = {
    pendente: FiClock,
    parcial: FiRefreshCw,
    pago: FiCheckCircle,
    atrasado: FiAlertCircle,
  };

  const filteredPagamentos = pagamentos.filter(p => {
    if (!busca) return true;
    return p.descricao?.toLowerCase().includes(busca.toLowerCase()) ||
      p.cliente?.nome?.toLowerCase().includes(busca.toLowerCase());
  });

  const filteredClientes = clientes.filter(c => {
    if (!busca) return true;
    return c.nome?.toLowerCase().includes(busca.toLowerCase());
  });

  const totalRecebido = pagamentos.filter(p => p.status === 'pago').reduce((s, p) => s + p.valor_pago, 0);
  const totalPendente = pagamentos.filter(p => p.status !== 'pago').reduce((s, p) => s + (p.valor_total - p.valor_pago), 0);
  const totalAtrasados = pagamentos.filter(p => p.status === 'atrasado').length;

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-card border border-primary/40 text-center">
          <p className="text-[10px] sm:text-xs text-dark/50">Recebido</p>
          <p className="text-sm sm:text-lg font-bold text-emerald-600">R$ {totalRecebido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-card border border-primary/40 text-center">
          <p className="text-[10px] sm:text-xs text-dark/50">Pendente</p>
          <p className="text-sm sm:text-lg font-bold text-yellow-600">R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-card border border-primary/40 text-center">
          <p className="text-[10px] sm:text-xs text-dark/50">Atrasados</p>
          <p className={`text-sm sm:text-lg font-bold ${totalAtrasados > 0 ? 'text-red-500' : 'text-dark'}`}>{totalAtrasados}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-2">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dark/30" size={16} />
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar cliente ou procedimento..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-primary focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none text-sm"
          />
        </div>

        <div className="flex gap-2">
          <div className="flex bg-white rounded-xl border border-primary overflow-hidden">
            <button
              onClick={() => setViewMode('pagamentos')}
              className={`px-3 py-2 text-xs font-medium transition ${viewMode === 'pagamentos' ? 'bg-accent/10 text-accent' : 'text-dark/50'}`}
            >
              <FiCreditCard size={14} />
            </button>
            <button
              onClick={() => setViewMode('clientes')}
              className={`px-3 py-2 text-xs font-medium transition ${viewMode === 'clientes' ? 'bg-accent/10 text-accent' : 'text-dark/50'}`}
            >
              <FiUser size={14} />
            </button>
          </div>

          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl border border-primary text-xs sm:text-sm bg-white text-dark/70"
          >
            <option value="todos">Todos</option>
            <option value="pendente">Pendentes</option>
            <option value="parcial">Parciais</option>
            <option value="pago">Pagos</option>
            <option value="atrasado">Atrasados</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-dark/40 animate-pulse">Carregando pagamentos...</div>
      ) : viewMode === 'pagamentos' ? (
        <div className="space-y-2">
          {filteredPagamentos.length === 0 ? (
            <div className="text-center py-12 text-dark/40">
              <FiDollarSign size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum pagamento encontrado</p>
            </div>
          ) : (
            filteredPagamentos.map(p => {
              const SIcon = statusIcon[p.status] || FiClock;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPag(p)}
                  className={`bg-white rounded-2xl p-3 sm:p-4 shadow-card border cursor-pointer hover:shadow-hover transition-all duration-300 ${
                    p.status === 'atrasado' ? 'border-red-200 bg-red-50/30' : 'border-primary/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${p.status === 'atrasado' ? 'bg-red-100' : p.status === 'pago' ? 'bg-emerald-100' : 'bg-accent/10'}`}>
                      <SIcon size={16} className={p.status === 'atrasado' ? 'text-red-500' : p.status === 'pago' ? 'text-emerald-600' : 'text-accent'} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-dark truncate">{p.descricao}</p>
                      <p className="text-[10px] sm:text-xs text-dark/40 truncate">
                        {p.cliente?.nome || '—'} • {dataBR(p.data_atendimento)}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs sm:text-sm font-bold text-dark">R$ {p.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      {p.valor_pago > 0 && p.status !== 'pago' && (
                        <p className="text-[10px] sm:text-xs text-emerald-600">Pago: R$ {p.valor_pago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      )}
                      <span className={`inline-block mt-0.5 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium ${statusColor[p.status]}`}>
                        {p.status === 'atrasado' ? '🔴 ATRASADO' : p.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredClientes.length === 0 ? (
            <div className="text-center py-12 text-dark/40">
              <FiUser size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum cliente encontrado</p>
            </div>
          ) : (
            filteredClientes.map(c => (
              <div
                key={c.id}
                onClick={() => setSelectedCliente(c.id)}
                className="bg-white rounded-2xl p-3 sm:p-4 shadow-card border border-primary/40 cursor-pointer hover:shadow-hover transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-accent/15 to-secondary/20 flex items-center justify-center shrink-0">
                    <FiUser size={16} className="text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-dark truncate">{c.nome}</p>
                    <p className="text-[10px] sm:text-xs text-dark/40">{c.total_atendimentos} atendimento{c.total_atendimentos !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs sm:text-sm font-bold text-accent">R$ {c.total_gasto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    {c.pendente > 0 && (
                      <p className="text-[10px] sm:text-xs text-yellow-600">Pend: R$ {c.pendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    )}
                    {c.atrasados > 0 && (
                      <span className="text-[10px] text-red-500 font-medium">🔴 {c.atrasados}</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {selectedPag && <PaymentModal pagamento={selectedPag} onClose={() => setSelectedPag(null)} onSaved={loadData} />}
      {selectedCliente && <ClientHistoryModal clienteId={selectedCliente} onClose={() => setSelectedCliente(null)} />}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
// GASTOS (DESPESAS) TAB
// ═══════════════════════════════════════════════════════════════════

function GastosTab({ mes, ano }) {
  const [despesas, setDespesas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewExpense, setShowNewExpense] = useState(false);
  const [showCatManager, setShowCatManager] = useState(false);
  const [filterTipo, setFilterTipo] = useState('todos');
  const [confirmParcela, setConfirmParcela] = useState(null); // { despId, parcela }

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { mes, ano };
      if (filterTipo !== 'todos') params.tipo = filterTipo;
      const [dRes, cRes] = await Promise.all([
        getDespesas(params),
        getCategoriasDespesa(),
      ]);
      setDespesas(dRes.data);
      setCategorias(cRes.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [mes, ano, filterTipo]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = async (id) => {
    if (!confirm('Remover esta despesa?')) return;
    try {
      await deletarDespesa(id);
      loadData();
    } catch (err) {
      alert('Erro ao remover');
    }
  };

  const handleConfirmParcela = async () => {
    if (!confirmParcela) return;
    const { despId, parcela } = confirmParcela;
    try {
      // Usa data BR (fuso São Paulo)
      const now = new Date();
      const brDate = now.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
      await atualizarParcela(despId, parcela.id, {
        pago: !parcela.pago,
        data_pagamento: !parcela.pago ? brDate : null,
      });
      loadData();
    } catch (err) {
      alert('Erro ao atualizar parcela');
    }
    setConfirmParcela(null);
  };

  const totalClinica = despesas.filter(d => d.tipo === 'clinica').reduce((s, d) => s + d.valor_total, 0);
  const totalPessoal = despesas.filter(d => d.tipo === 'pessoal').reduce((s, d) => s + d.valor_total, 0);
  const totalGeral = totalClinica + totalPessoal;

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-card border border-primary/40 text-center">
          <p className="text-[10px] sm:text-xs text-dark/50">🏥 Clínica</p>
          <p className="text-sm sm:text-lg font-bold text-accent">R$ {totalClinica.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-card border border-primary/40 text-center">
          <p className="text-[10px] sm:text-xs text-dark/50">👤 Pessoal</p>
          <p className="text-sm sm:text-lg font-bold text-dark">R$ {totalPessoal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-2xl p-3 sm:p-4 shadow-card border border-primary/40 text-center">
          <p className="text-[10px] sm:text-xs text-dark/50">Total</p>
          <p className="text-sm sm:text-lg font-bold text-red-500">R$ {totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <select
            value={filterTipo}
            onChange={e => setFilterTipo(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl border border-primary text-xs sm:text-sm bg-white text-dark/70"
          >
            <option value="todos">Todos os tipos</option>
            <option value="clinica">🏥 Clínica</option>
            <option value="pessoal">👤 Pessoal</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCatManager(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-primary text-xs sm:text-sm text-dark/60 hover:border-accent hover:text-accent transition"
          >
            <FiSettings size={14} /> Categorias
          </button>
          <button
            onClick={() => setShowNewExpense(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-accent to-accent-dark text-white text-xs sm:text-sm font-medium hover:shadow-lg transition"
          >
            <FiPlus size={15} /> Novo Gasto
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-dark/40 animate-pulse">Carregando despesas...</div>
      ) : despesas.length === 0 ? (
        <div className="text-center py-12 text-dark/40">
          <FiArrowUp size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma despesa neste mês</p>
        </div>
      ) : (
        <div className="space-y-3">
          {despesas.map(d => {
            const catIcon = d.categoria_rel?.icone || '📌';
            return (
              <div key={d.id} className="bg-white rounded-2xl shadow-card border border-primary/40 overflow-hidden">
                <div className="p-3 sm:p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-soft flex items-center justify-center text-base sm:text-lg shrink-0 mt-0.5">
                      {catIcon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-dark">{d.nome}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                        <span className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full ${d.tipo === 'clinica' ? 'bg-accent/10 text-accent' : 'bg-purple-100 text-purple-600'}`}>
                          {d.tipo === 'clinica' ? '🏥' : '👤'} {d.tipo === 'clinica' ? 'Clínica' : 'Pessoal'}
                        </span>
                        <span className="text-[10px] sm:text-xs text-dark/40">{d.categoria_rel?.nome || d.categoria}</span>
                        <span className="text-[10px] sm:text-xs text-dark/40">• {dataBR(d.data)}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs sm:text-sm font-bold text-dark">R$ {d.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      {d.parcelas_total > 1 && (
                        <p className="text-[10px] sm:text-xs text-dark/40">{d.parcelas_total}x R$ {(d.valor_total / d.parcelas_total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      )}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(d.id); }} className="text-dark/20 hover:text-red-400 transition shrink-0 mt-1">
                      <FiAlertTriangle size={13} />
                    </button>
                  </div>

                  {/* Parcelas */}
                  {d.parcelas_total > 1 && d.parcelas?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-primary/50">
                      <p className="text-[10px] sm:text-xs font-medium text-dark/50 mb-2">Parcelas</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                        {d.parcelas.map(p => (
                          <button
                            key={p.id}
                            onClick={() => setConfirmParcela({ despId: d.id, parcela: p })}
                            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-[10px] sm:text-xs transition-all ${
                              p.pago
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : 'bg-white border-primary text-dark/60 hover:border-accent'
                            }`}
                          >
                            {p.pago ? <FiCheckCircle size={11} /> : <FiClock size={11} />}
                            <span>{p.numero_parcela}/{d.parcelas_total}</span>
                            <span className="font-medium">R$ {p.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm parcela modal */}
      {confirmParcela && (
        <ConfirmModal
          title={confirmParcela.parcela.pago ? 'Desmarcar Parcela' : 'Confirmar Pagamento'}
          message={
            confirmParcela.parcela.pago
              ? `Deseja desmarcar a parcela ${confirmParcela.parcela.numero_parcela} como não paga?`
              : `Confirmar pagamento da parcela ${confirmParcela.parcela.numero_parcela} no valor de R$ ${confirmParcela.parcela.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}?`
          }
          confirmLabel={confirmParcela.parcela.pago ? 'Desmarcar' : 'Confirmar Pagamento'}
          onConfirm={handleConfirmParcela}
          onCancel={() => setConfirmParcela(null)}
        />
      )}

      {showNewExpense && <ExpenseModal onClose={() => setShowNewExpense(false)} onSaved={loadData} categorias={categorias} />}
      {showCatManager && <CategoryManagerModal onClose={() => setShowCatManager(false)} onSaved={loadData} />}
    </div>
  );
}
