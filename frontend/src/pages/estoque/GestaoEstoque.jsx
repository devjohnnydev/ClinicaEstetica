import { useState, useEffect, useCallback } from 'react';
import {
  FiPackage, FiTruck, FiBarChart2, FiList, FiSearch, FiPlus, FiEdit2,
  FiArrowDownCircle, FiArrowUpCircle, FiAlertTriangle, FiBox, FiTrash2,
  FiChevronLeft, FiChevronRight, FiRefreshCw, FiFilter,
} from 'react-icons/fi';
import {
  getEstoqueDashboard, getEstoqueAlertas, getEstoqueGrafico,
  getProdutosEstoque, deletarProdutoEstoque,
  getMovimentacoes,
  getFornecedores, deletarFornecedor,
} from '../../services/api';
import {
  CATEGORIAS_PRODUTO,
  EstoqueStatCard, EstoqueBarChart, StockLevelBar, StatusBadge,
  ProductModal, MovimentacaoModal, FornecedorModal, ConfirmModal,
} from './EstoqueComponents';


// ─── Helpers ──────────────────────────────────────────────────────
function dataBR(isoStr) {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return '—'; }
}

function dataHoraBR(isoStr) {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
      + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
}

function money(val) {
  return (val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getCategoriaIcon(cat) {
  const found = CATEGORIAS_PRODUTO.find(c => c.value === cat);
  return found ? found.icon : '📦';
}

function getCategoriaLabel(cat) {
  const found = CATEGORIAS_PRODUTO.find(c => c.value === cat);
  return found ? found.label : cat;
}

const MOTIVO_LABELS = {
  compra: 'Compra',
  devolucao: 'Devolução',
  ajuste: 'Ajuste',
  bonificacao: 'Bonificação',
  uso_procedimento: 'Uso em procedimento',
  venda: 'Venda',
  perda: 'Perda / Vencimento',
  estoque_inicial: 'Estoque Inicial',
  outro: 'Outro',
};


// ═══════════════════════════════════════════════════════════════════
// TABS CONFIG
// ═══════════════════════════════════════════════════════════════════
const TABS = [
  { id: 'dashboard', icon: FiBarChart2, label: 'Dashboard' },
  { id: 'produtos', icon: FiPackage, label: 'Produtos' },
  { id: 'movimentacoes', icon: FiList, label: 'Movimentações' },
  { id: 'fornecedores', icon: FiTruck, label: 'Fornecedores' },
];


// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function GestaoEstoque() {
  const [tab, setTab] = useState('dashboard');

  return (
    <div className="animate-fadeIn px-1 sm:px-0">
      {/* Header */}
      <div className="flex flex-col gap-3 mb-5">
        <div>
          <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-dark">📦 Controle de Estoque</h1>
          <p className="text-dark/50 text-xs sm:text-sm mt-0.5">Gestão completa de produtos, movimentações e fornecedores</p>
        </div>
      </div>

      {/* Tabs */}
      <div 
        className="flex gap-1 bg-white rounded-2xl p-1.5 shadow-card border border-primary/40 mb-5 overflow-x-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <style>{`
          .overflow-x-auto::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 shrink-0 min-w-fit px-3 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 ${
              tab === t.id
                ? 'bg-gradient-to-r from-accent/10 to-secondary/20 text-accent shadow-sm'
                : 'text-dark/50 hover:bg-primary/30'
            }`}
          >
            <t.icon size={15} className="shrink-0" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'dashboard' && <DashboardTab />}
      {tab === 'produtos' && <ProdutosTab />}
      {tab === 'movimentacoes' && <MovimentacoesTab />}
      {tab === 'fornecedores' && <FornecedoresTab />}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
// DASHBOARD TAB
// ═══════════════════════════════════════════════════════════════════
function DashboardTab() {
  const [dash, setDash] = useState(null);
  const [alertas, setAlertas] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, aRes, gRes] = await Promise.all([
        getEstoqueDashboard(),
        getEstoqueAlertas(),
        getEstoqueGrafico({ meses: 6 }),
      ]);
      setDash(dRes.data);
      setAlertas(aRes.data);
      setChartData(gRes.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="text-center py-12 text-dark/40 animate-pulse">Carregando dashboard...</div>;
  if (!dash) return <div className="text-center py-12 text-dark/40">Erro ao carregar</div>;

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Alert bar */}
      {alertas.length > 0 && (
        <div className="rounded-2xl p-3 sm:p-4 bg-red-50 border border-red-200 flex items-start gap-3">
          <FiAlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-red-700">
              🔴 {alertas.length} produto{alertas.length > 1 ? 's' : ''} com estoque crítico!
            </p>
            <p className="text-xs text-dark/50 mt-0.5">
              {alertas.slice(0, 3).map(a => a.nome).join(', ')}{alertas.length > 3 ? ` e mais ${alertas.length - 3}...` : ''}
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <EstoqueStatCard
          icon={FiPackage}
          label="Total de Produtos"
          value={dash.total_produtos}
          color="accent"
        />
        <EstoqueStatCard
          icon={FiBox}
          label="Valor em Estoque"
          value={`R$ ${money(dash.valor_total_estoque)}`}
          color="blue"
        />
        <EstoqueStatCard
          icon={FiAlertTriangle}
          label="Estoque Crítico"
          value={dash.produtos_criticos}
          color="red"
          subtitle={`${dash.produtos_atencao} em atenção`}
        />
        <EstoqueStatCard
          icon={FiRefreshCw}
          label="Movimentações/mês"
          value={`${dash.entradas_mes} ent. / ${dash.saidas_mes} saíd.`}
          color="green"
        />
      </div>

      {/* Entradas vs Saídas summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 shadow-card border border-primary/40 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <FiArrowDownCircle size={16} className="text-emerald-500" />
            <span className="text-xs text-dark/50">Entradas do Mês</span>
          </div>
          <p className="text-lg font-bold text-emerald-600">R$ {money(dash.valor_entradas_mes)}</p>
          <p className="text-xs text-dark/40 mt-1">{dash.entradas_mes} unidades</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-card border border-primary/40 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <FiArrowUpCircle size={16} className="text-orange-500" />
            <span className="text-xs text-dark/50">Saídas do Mês</span>
          </div>
          <p className="text-lg font-bold text-orange-600">R$ {money(dash.valor_saidas_mes)}</p>
          <p className="text-xs text-dark/40 mt-1">{dash.saidas_mes} unidades</p>
        </div>
      </div>

      {/* Charts */}
      {chartData && chartData.dados?.length > 0 && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-card border border-primary/40">
          <h3 className="font-heading text-xs sm:text-sm font-semibold text-dark mb-3 flex items-center gap-2">
            <FiBarChart2 size={15} className="text-accent" /> Entradas vs Saídas
          </h3>
          <EstoqueBarChart data={chartData.dados} />
        </div>
      )}

      {/* Categorias breakdown */}
      {dash.categorias && Object.keys(dash.categorias).length > 0 && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-card border border-primary/40">
          <h3 className="font-heading text-xs sm:text-sm font-semibold text-dark mb-3">📊 Por Categoria</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(dash.categorias).map(([cat, data]) => (
              <div key={cat} className="bg-soft rounded-xl p-3 text-center">
                <span className="text-lg">{getCategoriaIcon(cat)}</span>
                <p className="text-xs font-medium text-dark mt-1">{getCategoriaLabel(cat)}</p>
                <p className="text-sm font-bold text-dark">{data.total} itens</p>
                <p className="text-[10px] text-dark/40">R$ {money(data.valor)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alertas list */}
      {alertas.length > 0 && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-card border border-red-100">
          <h3 className="font-heading text-xs sm:text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
            <FiAlertTriangle size={15} /> Produtos com Estoque Baixo
          </h3>
          <div className="space-y-2">
            {alertas.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-2 bg-red-50 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-sm">
                  {getCategoriaIcon(p.categoria)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-dark truncate">{p.nome}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-red-600 font-semibold">
                      {p.quantidade_atual} / {p.quantidade_minima} {p.unidade_medida}
                    </span>
                    <div className="flex-1 max-w-[80px]">
                      <StockLevelBar atual={p.quantidade_atual} minimo={p.quantidade_minima} />
                    </div>
                  </div>
                </div>
                <StatusBadge status={p.status_estoque} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
// PRODUTOS TAB
// ═══════════════════════════════════════════════════════════════════
function ProdutosTab() {
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('todos');
  const [showProductModal, setShowProductModal] = useState(false);
  const [editProduto, setEditProduto] = useState(null);
  const [movProduto, setMovProduto] = useState(null);
  const [movTipo, setMovTipo] = useState('entrada');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (busca) params.busca = busca;
      if (filterCategoria !== 'todos') params.categoria = filterCategoria;
      const res = await getProdutosEstoque(params);
      setProdutos(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [busca, filterCategoria]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deletarProdutoEstoque(confirmDelete.id);
      loadData();
    } catch (err) {
      alert('Erro ao remover produto');
    }
    setConfirmDelete(null);
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Toolbar */}
      <div className="flex flex-col gap-2">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dark/30" size={16} />
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar produto..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-primary focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none text-sm"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterCategoria}
            onChange={e => setFilterCategoria(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl border border-primary text-xs sm:text-sm bg-white text-dark/70"
          >
            <option value="todos">Todas Categorias</option>
            {CATEGORIAS_PRODUTO.map(c => (
              <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
            ))}
          </select>
          <button
            onClick={() => { setEditProduto(null); setShowProductModal(true); }}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-accent to-accent-dark text-white text-xs sm:text-sm font-medium hover:shadow-lg transition"
          >
            <FiPlus size={15} /> Novo Produto
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-white rounded-2xl p-3 shadow-card border border-primary/40 text-center">
          <p className="text-[10px] sm:text-xs text-dark/50">Total</p>
          <p className="text-sm sm:text-lg font-bold text-dark">{produtos.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-3 shadow-card border border-primary/40 text-center">
          <p className="text-[10px] sm:text-xs text-dark/50">Em Alerta</p>
          <p className="text-sm sm:text-lg font-bold text-yellow-600">
            {produtos.filter(p => p.status_estoque === 'atencao').length}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-3 shadow-card border border-primary/40 text-center">
          <p className="text-[10px] sm:text-xs text-dark/50">Críticos</p>
          <p className="text-sm sm:text-lg font-bold text-red-500">
            {produtos.filter(p => p.status_estoque === 'critico').length}
          </p>
        </div>
      </div>

      {/* Product list */}
      {loading ? (
        <div className="text-center py-12 text-dark/40 animate-pulse">Carregando produtos...</div>
      ) : produtos.length === 0 ? (
        <div className="text-center py-12 text-dark/40">
          <FiPackage size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum produto cadastrado</p>
          <button
            onClick={() => { setEditProduto(null); setShowProductModal(true); }}
            className="mt-3 text-accent text-sm font-medium hover:underline"
          >
            + Cadastrar primeiro produto
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {produtos.map(p => (
            <div
              key={p.id}
              className={`bg-white rounded-2xl p-3 sm:p-4 shadow-card border transition-all duration-300 hover:shadow-hover ${
                p.status_estoque === 'critico' ? 'border-red-200 bg-red-50/30' :
                p.status_estoque === 'atencao' ? 'border-yellow-200 bg-yellow-50/30' :
                'border-primary/40'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                  p.status_estoque === 'critico' ? 'bg-red-100' :
                  p.status_estoque === 'atencao' ? 'bg-yellow-100' :
                  'bg-soft'
                }`}>
                  {getCategoriaIcon(p.categoria)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs sm:text-sm font-medium text-dark truncate">{p.nome}</p>
                    <StatusBadge status={p.status_estoque} />
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <span className="text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full bg-accent/10 text-accent">
                      {getCategoriaLabel(p.categoria)}
                    </span>
                    {p.fornecedor_rel && (
                      <span className="text-[10px] sm:text-xs text-dark/40 flex items-center gap-0.5">
                        <FiTruck size={10} /> {p.fornecedor_rel.nome}
                      </span>
                    )}
                  </div>

                  {/* Stock level bar */}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 max-w-[120px]">
                      <StockLevelBar atual={p.quantidade_atual} minimo={p.quantidade_minima} />
                    </div>
                    <span className="text-[10px] sm:text-xs text-dark/50">
                      <span className="font-semibold text-dark">{p.quantidade_atual}</span>
                      {p.quantidade_minima > 0 && <span> / mín. {p.quantidade_minima}</span>}
                      {' '}{p.unidade_medida}
                    </span>
                  </div>
                </div>

                {/* Right side: price + actions */}
                <div className="text-right shrink-0">
                  <p className="text-xs sm:text-sm font-bold text-dark">R$ {money(p.preco_custo)}</p>
                  {p.preco_venda > 0 && (
                    <p className="text-[10px] text-dark/40">Venda: R$ {money(p.preco_venda)}</p>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 mt-2 justify-end">
                    <button
                      onClick={() => { setMovProduto(p); setMovTipo('entrada'); }}
                      className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center hover:bg-emerald-200 transition"
                      title="Entrada"
                    >
                      <FiPlus size={13} />
                    </button>
                    <button
                      onClick={() => { setMovProduto(p); setMovTipo('saida'); }}
                      className="w-7 h-7 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center hover:bg-orange-200 transition"
                      title="Saída"
                    >
                      <FiArrowUpCircle size={13} />
                    </button>
                    <button
                      onClick={() => { setEditProduto(p); setShowProductModal(true); }}
                      className="w-7 h-7 rounded-lg bg-accent/10 text-accent flex items-center justify-center hover:bg-accent/20 transition"
                      title="Editar"
                    >
                      <FiEdit2 size={13} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(p)}
                      className="w-7 h-7 rounded-lg bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-100 transition"
                      title="Remover"
                    >
                      <FiTrash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showProductModal && (
        <ProductModal
          produto={editProduto}
          onClose={() => { setShowProductModal(false); setEditProduto(null); }}
          onSaved={loadData}
        />
      )}
      {movProduto && (
        <MovimentacaoModal
          produto={movProduto}
          tipoInicial={movTipo}
          onClose={() => setMovProduto(null)}
          onSaved={loadData}
        />
      )}
      {confirmDelete && (
        <ConfirmModal
          title="Remover Produto"
          message={`Deseja remover "${confirmDelete.nome}" do estoque? O produto será desativado.`}
          confirmLabel="Remover"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
// MOVIMENTAÇÕES TAB
// ═══════════════════════════════════════════════════════════════════
function MovimentacoesTab() {
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTipo, setFilterTipo] = useState('todos');
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());

  const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { mes, ano, limit: 100 };
      if (filterTipo !== 'todos') params.tipo = filterTipo;
      const res = await getMovimentacoes(params);
      setMovimentacoes(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [mes, ano, filterTipo]);

  useEffect(() => { loadData(); }, [loadData]);

  const totalEntradas = movimentacoes.filter(m => m.tipo === 'entrada').reduce((s, m) => s + m.quantidade, 0);
  const totalSaidas = movimentacoes.filter(m => m.tipo === 'saida').reduce((s, m) => s + m.quantidade, 0);

  return (
    <div className="space-y-4 animate-fadeIn">
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

      {/* Filter */}
      <div className="flex gap-2">
        <select
          value={filterTipo}
          onChange={e => setFilterTipo(e.target.value)}
          className="flex-1 px-3 py-2 rounded-xl border border-primary text-xs sm:text-sm bg-white text-dark/70"
        >
          <option value="todos">Todos os tipos</option>
          <option value="entrada">📥 Entradas</option>
          <option value="saida">📤 Saídas</option>
        </select>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-white rounded-2xl p-3 shadow-card border border-primary/40 text-center">
          <p className="text-[10px] sm:text-xs text-dark/50">Total Registros</p>
          <p className="text-sm sm:text-lg font-bold text-dark">{movimentacoes.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-3 shadow-card border border-primary/40 text-center">
          <p className="text-[10px] sm:text-xs text-dark/50">📥 Entradas</p>
          <p className="text-sm sm:text-lg font-bold text-emerald-600">{totalEntradas}</p>
        </div>
        <div className="bg-white rounded-2xl p-3 shadow-card border border-primary/40 text-center">
          <p className="text-[10px] sm:text-xs text-dark/50">📤 Saídas</p>
          <p className="text-sm sm:text-lg font-bold text-orange-600">{totalSaidas}</p>
        </div>
      </div>

      {/* Movimentação list */}
      {loading ? (
        <div className="text-center py-12 text-dark/40 animate-pulse">Carregando movimentações...</div>
      ) : movimentacoes.length === 0 ? (
        <div className="text-center py-12 text-dark/40">
          <FiList size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma movimentação neste período</p>
        </div>
      ) : (
        <div className="space-y-2">
          {movimentacoes.map(m => (
            <div key={m.id} className="bg-white rounded-2xl p-3 sm:p-4 shadow-card border border-primary/40">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  m.tipo === 'entrada' ? 'bg-emerald-100' : 'bg-orange-100'
                }`}>
                  {m.tipo === 'entrada'
                    ? <FiArrowDownCircle size={16} className="text-emerald-600" />
                    : <FiArrowUpCircle size={16} className="text-orange-600" />
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-dark truncate">
                    {m.produto_rel?.nome || `Produto #${m.produto_id}`}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                    <span className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full font-medium ${
                      m.tipo === 'entrada' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {m.tipo === 'entrada' ? '📥 Entrada' : '📤 Saída'}
                    </span>
                    <span className="text-[10px] sm:text-xs text-dark/40">
                      {MOTIVO_LABELS[m.motivo] || m.motivo}
                    </span>
                  </div>
                  {m.observacoes && (
                    <p className="text-[10px] text-dark/40 mt-0.5 truncate">{m.observacoes}</p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <p className={`text-xs sm:text-sm font-bold ${m.tipo === 'entrada' ? 'text-emerald-600' : 'text-orange-600'}`}>
                    {m.tipo === 'entrada' ? '+' : '-'}{m.quantidade} {m.produto_rel?.unidade_medida || 'un'}
                  </p>
                  {m.preco_unitario > 0 && (
                    <p className="text-[10px] text-dark/40">R$ {money(m.preco_unitario)}/un</p>
                  )}
                  <p className="text-[10px] text-dark/40 mt-0.5">{dataHoraBR(m.created_at)}</p>
                  {m.usuario_nome && (
                    <p className="text-[10px] text-dark/30">por {m.usuario_nome}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════
// FORNECEDORES TAB
// ═══════════════════════════════════════════════════════════════════
function FornecedoresTab() {
  const [fornecedores, setFornecedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editFornecedor, setEditFornecedor] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (busca) params.busca = busca;
      const res = await getFornecedores(params);
      setFornecedores(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [busca]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deletarFornecedor(confirmDelete.id);
      loadData();
    } catch (err) {
      alert('Erro ao remover fornecedor');
    }
    setConfirmDelete(null);
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Toolbar */}
      <div className="flex flex-col gap-2">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-dark/30" size={16} />
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar fornecedor..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-primary focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none text-sm"
          />
        </div>
        <button
          onClick={() => { setEditFornecedor(null); setShowModal(true); }}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-accent to-accent-dark text-white text-xs sm:text-sm font-medium hover:shadow-lg transition self-end"
        >
          <FiPlus size={15} /> Novo Fornecedor
        </button>
      </div>

      {/* Fornecedor list */}
      {loading ? (
        <div className="text-center py-12 text-dark/40 animate-pulse">Carregando fornecedores...</div>
      ) : fornecedores.length === 0 ? (
        <div className="text-center py-12 text-dark/40">
          <FiTruck size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum fornecedor cadastrado</p>
          <button
            onClick={() => { setEditFornecedor(null); setShowModal(true); }}
            className="mt-3 text-accent text-sm font-medium hover:underline"
          >
            + Cadastrar primeiro fornecedor
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {fornecedores.map(f => (
            <div key={f.id} className="bg-white rounded-2xl p-3 sm:p-4 shadow-card border border-primary/40 hover:shadow-hover transition-all duration-300">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/15 to-secondary/20 flex items-center justify-center shrink-0">
                  <FiTruck size={16} className="text-accent" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-dark">{f.nome}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {f.contato && (
                      <span className="text-[10px] sm:text-xs text-dark/40">👤 {f.contato}</span>
                    )}
                    {f.telefone && (
                      <span className="text-[10px] sm:text-xs text-dark/40">📞 {f.telefone}</span>
                    )}
                    {f.email && (
                      <span className="text-[10px] sm:text-xs text-dark/40">📧 {f.email}</span>
                    )}
                  </div>
                  {f.cnpj && (
                    <p className="text-[10px] text-dark/30 mt-0.5">CNPJ: {f.cnpj}</p>
                  )}
                  {f.endereco && (
                    <p className="text-[10px] text-dark/30 mt-0.5">📍 {f.endereco}</p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                    {f.total_produtos} produto{f.total_produtos !== 1 ? 's' : ''}
                  </span>

                  <div className="flex items-center gap-1 mt-2 justify-end">
                    <button
                      onClick={() => { setEditFornecedor(f); setShowModal(true); }}
                      className="w-7 h-7 rounded-lg bg-accent/10 text-accent flex items-center justify-center hover:bg-accent/20 transition"
                      title="Editar"
                    >
                      <FiEdit2 size={13} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(f)}
                      className="w-7 h-7 rounded-lg bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-100 transition"
                      title="Remover"
                    >
                      <FiTrash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <FornecedorModal
          fornecedor={editFornecedor}
          onClose={() => { setShowModal(false); setEditFornecedor(null); }}
          onSaved={loadData}
        />
      )}
      {confirmDelete && (
        <ConfirmModal
          title="Remover Fornecedor"
          message={`Deseja remover o fornecedor "${confirmDelete.nome}"?`}
          confirmLabel="Remover"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
