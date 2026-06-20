'use client';

import { useEffect, useState } from 'react';
import styles from './AdminAnalytics.module.css';
import { cx } from '@/lib/cx';
import { adminService } from '@/lib/api';
import Select from '@/components/atoms/Select/Select';
import Icon from '@/components/atoms/Icon/Icon';

/* ── Ícones lucide que faltam no atom Icon (NÃO editar Icon.js) ──────── */
function Lucide({ children, size = 16, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}
const IconPercent = (p) => (
  <Lucide {...p}>
    <line x1="19" y1="5" x2="5" y2="19" />
    <circle cx="6.5" cy="6.5" r="2.5" />
    <circle cx="17.5" cy="17.5" r="2.5" />
  </Lucide>
);
const IconCart = (p) => (
  <Lucide {...p}>
    <circle cx="9" cy="21" r="1.5" />
    <circle cx="18" cy="21" r="1.5" />
    <path d="M2 3h2l2.6 13.4a1.5 1.5 0 0 0 1.5 1.1h9.7a1.5 1.5 0 0 0 1.5-1.1L22 7H6" />
  </Lucide>
);
/* ── Formatadores ───────────────────────────────────────────────────── */
const fmtCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const fmtGrowth = (value) => `${value >= 0 ? '+' : ''}${(value || 0).toFixed(1)}%`;

const TABS = [
  { id: 'revenue', label: 'Receita' },
  { id: 'sellers', label: 'Top Vendedores' },
  { id: 'growth', label: 'Crescimento' },
  { id: 'commissions', label: 'Suas Comissões' },
];

const PERIOD_OPTIONS = [
  { value: '7', label: '7 dias' },
  { value: '30', label: '30 dias' },
  { value: '90', label: '90 dias' },
];

/* ── Estrutura vazia (sem dados / erro) — NUNCA mock ─────────────────── */
const EMPTY_DATA = {
  revenue: { total: 0, today: 0, thisWeek: 0, thisMonth: 0, platformCommission: 0 },
  orders: { total: 0, pending: 0, completed: 0 },
  users: { totalBuyers: 0, totalSellers: 0, activeSellers: 0, newThisMonth: 0 },
  topSellers: [],
  revenueChart: [],
  growth: { revenue: 0, orders: 0, commission: 0 },
};

/* ── Gráfico de linha em SVG (sem libs) ─────────────────────────────── */
function LineChart({ data }) {
  const W = 760;
  const H = 320;
  const padX = 48;
  const padY = 24;
  const max = Math.max(...data.map((d) => d.revenue), 1);
  const n = data.length;
  const x = (i) => padX + (i * (W - padX * 2)) / Math.max(n - 1, 1);
  const y = (v) => H - padY - (v / max) * (H - padY * 2);
  const toPath = (key) => data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(d[key]).toFixed(1)}`).join(' ');

  const grid = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className={styles.chartWrap}>
      <svg viewBox={`0 0 ${W} ${H}`} className={styles.chart} preserveAspectRatio="none" role="img" aria-label="Gráfico de receita">
        {grid.map((g, i) => {
          const gy = padY + g * (H - padY * 2);
          return <line key={i} x1={padX} y1={gy} x2={W - padX} y2={gy} className={styles.gridLine} strokeDasharray="3 3" />;
        })}
        <path d={toPath('revenue')} className={styles.lineRevenue} />
        <path d={toPath('platformRevenue')} className={styles.lineCommission} />
        {data.map((d, i) => (
          <circle key={`r${i}`} cx={x(i)} cy={y(d.revenue)} r={3} className={styles.dotRevenue} />
        ))}
        {data.map((d, i) => (
          <circle key={`c${i}`} cx={x(i)} cy={y(d.platformRevenue)} r={2.5} className={styles.dotCommission} />
        ))}
      </svg>
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={cx(styles.legendDot, styles.legendRevenue)} /> Receita Total
        </span>
        <span className={styles.legendItem}>
          <span className={cx(styles.legendDot, styles.legendCommission)} /> Sua Comissão (10%)
        </span>
      </div>
    </div>
  );
}

export default function AdminAnalytics() {
  const [period, setPeriod] = useState('30');
  const [tab, setTab] = useState('revenue');
  const [apiData, setApiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);

    adminService
      .analytics(`?period=${period}`)
      .then((res) => {
        if (!active) return;
        setApiData(res);
      })
      .catch((err) => {
        if (!active) return;
        // eslint-disable-next-line no-console
        console.error('Falha ao carregar analytics:', err);
        setApiData(null);
        setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [period]);

  // Apenas dados REAIS da API. Sem dados → zeros/vazio. NUNCA mock.
  const data = {
    revenue: { ...EMPTY_DATA.revenue, ...(apiData?.revenue || {}) },
    orders: { ...EMPTY_DATA.orders, ...(apiData?.orders || {}) },
    users: { ...EMPTY_DATA.users, ...(apiData?.users || {}) },
    topSellers: Array.isArray(apiData?.topSellers) ? apiData.topSellers : [],
    revenueChart: Array.isArray(apiData?.revenueChart) ? apiData.revenueChart : [],
    growth: { ...EMPTY_DATA.growth, ...(apiData?.growth || {}) },
  };

  return (
    <div className={styles.root}>
      {/* Cabeçalho */}
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Analytics Dashboard</h1>
          <p className={styles.subtitle}>
            Visão completa da sua plataforma de marketplace
            {loading && (
              <span className={styles.loadingHint}>
                <span className={styles.spinner} aria-hidden="true" />
                Carregando…
              </span>
            )}
            {!loading && error && (
              <span className={styles.errorHint}>Não foi possível carregar os dados</span>
            )}
          </p>
        </div>
        <Select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          options={PERIOD_OPTIONS}
          className={styles.periodSelect}
          aria-label="Período"
        />
      </div>

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHead}>
            <span className={styles.kpiTitle}>Receita Total</span>
            <Icon name="dollar" size={16} className={styles.kpiIcon} />
          </div>
          <div className={styles.kpiValue}>{fmtCurrency(data.revenue.total)}</div>
          <p className={styles.kpiHint}>Hoje: {fmtCurrency(data.revenue.today)}</p>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHead}>
            <span className={styles.kpiTitle}>Sua Comissão (10%)</span>
            <IconPercent size={16} className={styles.kpiIcon} />
          </div>
          <div className={cx(styles.kpiValue, styles.green)}>{fmtCurrency(data.revenue.platformCommission)}</div>
          <p className={styles.kpiHint}>Este mês: {fmtCurrency(data.revenue.thisMonth * 0.1)}</p>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHead}>
            <span className={styles.kpiTitle}>Pedidos</span>
            <IconCart size={16} className={styles.kpiIcon} />
          </div>
          <div className={styles.kpiValue}>{data.orders.total}</div>
          <p className={styles.kpiHint}>
            {data.orders.completed} concluídos, {data.orders.pending} pendentes
          </p>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHead}>
            <span className={styles.kpiTitle}>Vendedores Ativos</span>
            <Icon name="user" size={16} className={styles.kpiIcon} />
          </div>
          <div className={styles.kpiValue}>{data.users.activeSellers}</div>
          <p className={styles.kpiHint}>{data.users.newThisMonth} novos este mês</p>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabsList} role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={cx(styles.tabTrigger, tab === t.id && styles.tabActive)}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Receita */}
      {tab === 'revenue' && (
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle}>Receita nos Últimos {period} Dias</h2>
            <p className={styles.cardDesc}>Acompanhe o desempenho financeiro da plataforma</p>
          </div>
          {data.revenueChart.length ? (
            <LineChart data={data.revenueChart} />
          ) : (
            <p className={styles.empty}>{loading ? 'Carregando…' : 'Sem dados'}</p>
          )}
        </div>
      )}

      {/* Top Vendedores */}
      {tab === 'sellers' && (
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle}>Top 10 Vendedores</h2>
            <p className={styles.cardDesc}>Vendedores com maior receita no período selecionado</p>
          </div>
          {data.topSellers.length === 0 && (
            <p className={styles.empty}>{loading ? 'Carregando…' : 'Sem dados'}</p>
          )}
          <div className={styles.sellerList}>
            {data.topSellers.map((seller, index) => (
              <div key={seller.sellerId} className={styles.sellerRow}>
                <div className={styles.sellerLeft}>
                  <div className={styles.rank}>
                    <span>#{index + 1}</span>
                  </div>
                  <div>
                    <p className={styles.sellerName}>{seller.sellerName}</p>
                    <p className={styles.sellerMeta}>{seller.orders} pedidos</p>
                  </div>
                </div>
                <div className={styles.sellerRight}>
                  <p className={styles.sellerRevenue}>{fmtCurrency(seller.revenue)}</p>
                  <p className={styles.sellerCommission}>Sua comissão: {fmtCurrency(seller.platformCommission)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Crescimento */}
      {tab === 'growth' && (
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle}>Métricas de Crescimento</h2>
            <p className={styles.cardDesc}>Comparação mês atual vs mês anterior</p>
          </div>

          <div className={styles.growthGrid}>
            <div className={styles.growthCard}>
              <div className={styles.growthLabel}>
                <Icon name="trending-up" size={20} className={styles.blue} />
                <h3>Receita</h3>
              </div>
              <p className={styles.growthValue}>{fmtCurrency(data.revenue.thisMonth)}</p>
              <p className={cx(styles.growthDelta, data.growth.revenue >= 0 ? styles.green : styles.red)}>
                {fmtGrowth(data.growth.revenue)} vs mês anterior
              </p>
            </div>

            <div className={styles.growthCard}>
              <div className={styles.growthLabel}>
                <IconCart size={20} className={styles.orange} />
                <h3>Pedidos</h3>
              </div>
              <p className={styles.growthValue}>{data.orders.total}</p>
              <p className={cx(styles.growthDelta, data.growth.orders >= 0 ? styles.green : styles.red)}>
                {fmtGrowth(data.growth.orders)} vs mês anterior
              </p>
            </div>

            <div className={styles.growthCard}>
              <div className={styles.growthLabel}>
                <Icon name="dollar" size={20} className={styles.green} />
                <h3>Sua Comissão</h3>
              </div>
              <p className={styles.growthValue}>{fmtCurrency(data.revenue.platformCommission)}</p>
              <p className={cx(styles.growthDelta, data.growth.commission >= 0 ? styles.green : styles.red)}>
                {fmtGrowth(data.growth.commission)} vs mês anterior
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Comissões */}
      {tab === 'commissions' && (
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle}>Suas Comissões Detalhadas</h2>
            <p className={styles.cardDesc}>Como proprietário da plataforma, você recebe 10% de cada venda</p>
          </div>

          <div className={styles.commGrid}>
            <div className={cx(styles.commCard, styles.commGreen)}>
              <h3>Hoje</h3>
              <p>{fmtCurrency(data.revenue.today * 0.1)}</p>
            </div>
            <div className={cx(styles.commCard, styles.commBlue)}>
              <h3>Esta Semana</h3>
              <p>{fmtCurrency(data.revenue.thisWeek * 0.1)}</p>
            </div>
            <div className={cx(styles.commCard, styles.commPurple)}>
              <h3>Este Mês</h3>
              <p>{fmtCurrency(data.revenue.thisMonth * 0.1)}</p>
            </div>
            <div className={cx(styles.commCard, styles.commYellow)}>
              <h3>Total Histórico</h3>
              <p>{fmtCurrency(data.revenue.platformCommission)}</p>
            </div>
          </div>

          <div className={styles.howItWorks}>
            <h3 className={styles.howTitle}>Como funciona sua receita:</h3>
            <ul className={styles.howList}>
              <li>
                <span className={cx(styles.bullet, styles.bgGreen)} />
                <span>
                  Você recebe <strong>10% de comissão</strong> em cada venda concluída
                </span>
              </li>
              <li>
                <span className={cx(styles.bullet, styles.bgBlue)} />
                <span>
                  Vendedores recebem <strong>90% do valor</strong> após confirmação
                </span>
              </li>
              <li>
                <span className={cx(styles.bullet, styles.bgPurple)} />
                <span>
                  Sistema de <strong>escrow 7 dias</strong> protege compradores
                </span>
              </li>
              <li>
                <span className={cx(styles.bullet, styles.bgYellow)} />
                <span>Receita automática sem gestão manual de pagamentos</span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
