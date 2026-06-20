'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import styles from './AdminOrders.module.css';
import { cx } from '@/lib/cx';
import { adminService, ApiError } from '@/lib/api';
import Spinner from '@/components/atoms/Spinner/Spinner';

/* ----- ícones inline (lucide-style) que faltam no átomo Icon ----- */
const sv = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
const IUsers = (p) => <svg {...sv} {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
const ICart = (p) => <svg {...sv} {...p}><circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" /></svg>;
const ITrend = (p) => <svg {...sv} {...p}><path d="m22 7-8.5 8.5-5-5L2 17" /><path d="M16 7h6v6" /></svg>;
const IBag = (p) => <svg {...sv} {...p}><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>;
const IChat = (p) => <svg {...sv} {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
const IAlert = (p) => <svg {...sv} {...p}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4M12 17h.01" /></svg>;
const IBox = (p) => <svg {...sv} {...p}><path d="M21 8 12 3 3 8v8l9 5 9-5Z" /><path d="m3 8 9 5 9-5" /><path d="M12 13v8" /></svg>;
const ICard = (p) => <svg {...sv} {...p}><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>;
const IEye = (p) => <svg {...sv} {...p}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>;
const IShield = (p) => <svg {...sv} {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /></svg>;
const IStar = (p) => <svg {...sv} {...p}><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z" /></svg>;
const IBars = (p) => <svg {...sv} {...p}><path d="M3 3v18h18" /><rect x="7" y="11" width="3" height="6" /><rect x="12" y="7" width="3" height="10" /><rect x="17" y="13" width="3" height="4" /></svg>;
const IGear = (p) => <svg {...sv} {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></svg>;
const IRefresh = (p) => <svg {...sv} {...p}><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" /></svg>;

const brlFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/* mapeia o status real do pedido para os 4 buckets do painel (fallback: ignora) */
const STATUS_BUCKET = {
  pending: 'pending',
  awaiting_payment: 'pending',
  paid: 'paid',
  processing: 'paid',
  shipped: 'shipped',
  delivered: 'delivered',
  completed: 'delivered',
};

/* rótulos pt-BR por status (fallback: o próprio status) */
const ORDER_STATUS_LABEL = {
  pending: 'Pendente',
  awaiting_payment: 'Aguardando pagamento',
  paid: 'Pago',
  processing: 'Processando',
  shipped: 'Enviado',
  delivered: 'Entregue',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
  disputed: 'Em disputa',
};

/* classe de cor da tag por bucket (reaproveita as cores do painel) */
const STATUS_TAG_CLASS = {
  pending: 'tagRed',
  paid: 'tagBlue',
  shipped: 'tagAmber',
  delivered: 'tagGreen',
};

/* deriva os contadores/estatísticas a partir dos pedidos reais */
function deriveStats(orders) {
  const statusBreakdown = { pending: 0, paid: 0, shipped: 0, delivered: 0 };
  let totalRevenue = 0;
  let platformCommission = 0;
  let disputes = 0;
  for (const o of orders) {
    const bucket = STATUS_BUCKET[o.status];
    if (bucket) statusBreakdown[bucket] += 1;
    totalRevenue += Number(o.total) || 0;
    platformCommission += Number(o.commission_amount) || 0;
    if (o.status === 'disputed') disputes += 1;
  }
  return { totalOrders: orders.length, totalRevenue, platformCommission, disputes, statusBreakdown };
}

const QUICK_LINKS = [
  { title: 'Pagamentos', desc: 'Checkout · Mercado Pago + Escrow', Icon: ICard, color: 'green', path: '/finalizar-compra' },
  { title: 'Custódia (Escrow)', desc: 'Retenção e liberação do pedido', Icon: IShield, color: 'blue', dynamic: 'order' },
  { title: 'Meus Pedidos', desc: 'Painel do usuário', Icon: IBag, color: 'purple', path: '/minha-conta?tab=pedidos' },
  { title: 'Avaliações', desc: 'Sistema de reviews', Icon: IStar, color: 'amber', path: '/avaliacoes' },
  { title: 'Mensagens', desc: 'Chat comprador-vendedor', Icon: IChat, color: 'indigo', path: '/mensagens' },
  { title: 'Segurança', desc: 'Verificação e dispositivos', Icon: IGear, color: 'red', path: '/seguranca' },
];

/** Formata uptime (segundos) em "Xh Ym" / "Ym". */
function fmtUptime(seconds) {
  const s = Number(seconds) || 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/* badge "X pendentes" só aparece quando há valor real (> 0); senão "—" */
const badge = (n, singular, plural) => {
  const v = Number(n) || 0;
  return `${v} ${v === 1 ? singular : (plural || singular)}`;
};

export default function AdminOrders() {
  const router = useRouter();

  // Dashboard (métricas reais) e lista de pedidos reais.
  const [dashboard, setDashboard] = useState(null);
  const [orders, setOrders] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [dash, list, sys] = await Promise.all([
        adminService.dashboard().catch((e) => { if (!(e instanceof ApiError)) console.error(e); return null; }),
        adminService.orders('?limit=50').catch((e) => { if (!(e instanceof ApiError)) console.error(e); return null; }),
        adminService.systemHealth().catch((e) => { if (!(e instanceof ApiError)) console.error(e); return null; }),
      ]);
      setDashboard(dash || null);
      setOrders(Array.isArray(list) ? list : null);
      setHealth(sys || null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Estatísticas derivadas apenas dos pedidos reais (null se não houver dados).
  const orderStats = orders ? deriveStats(orders) : null;
  // Helpers de exibição: "—" quando não há dados reais carregados.
  const sNum = (v) => (orderStats ? v : '—');
  const sBrl = (v) => (orderStats ? brlFmt.format(Number(v) || 0) : '—');

  const recentPending = (dashboard && Array.isArray(dashboard.recentPending)) ? dashboard.recentPending : [];
  const recentDisputes = (dashboard && Array.isArray(dashboard.recentDisputes)) ? dashboard.recentDisputes : [];
  const hasActions = recentPending.length > 0 || recentDisputes.length > 0;

  const go = (path) => router.push(path);

  return (
    <div className={styles.wrap}>
      {/* ---- Métricas (dados reais do dashboard) ---- */}
      <div className={styles.metrics}>
        <div className={styles.metricCard}>
          <div className={styles.metricTop}>
            <div>
              <p className={styles.metricLabel}>Pedidos Hoje</p>
              <p className={cx(styles.metricValue, styles.tPurple)}>{dashboard ? (dashboard.ordersToday ?? 0) : '—'}</p>
            </div>
            <ICart className={styles.iPurple} />
          </div>
          <span className={cx(styles.metricFoot, styles.tPurple)}>Pendentes: {dashboard ? (dashboard.pendingOrders ?? 0) : '—'}</span>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricTop}>
            <div>
              <p className={styles.metricLabel}>Receita Hoje</p>
              <p className={cx(styles.metricValue, styles.tAmber)}>{dashboard ? brlFmt.format(Number(dashboard.revenueToday) || 0) : '—'}</p>
            </div>
            <ITrend className={styles.iAmber} />
          </div>
          <span className={cx(styles.metricFoot, styles.tAmber)}>Ticket médio: {dashboard ? brlFmt.format(Number(dashboard.avgOrderValue) || 0) : '—'}</span>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricTop}>
            <div>
              <p className={styles.metricLabel}>Usuários</p>
              <p className={cx(styles.metricValue, styles.tBlue)}>{dashboard ? (dashboard.totalUsers ?? 0) : '—'}</p>
            </div>
            <IUsers className={styles.iBlue} />
          </div>
          <span className={cx(styles.metricFoot, styles.tBlue)}>Novos hoje: {dashboard ? (dashboard.newUsersToday ?? 0) : '—'}</span>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricTop}>
            <div>
              <p className={styles.metricLabel}>Pagamentos Pendentes</p>
              <p className={cx(styles.metricValue, styles.tGreen)}>{dashboard ? (dashboard.pendingPayments ?? 0) : '—'}</p>
            </div>
            <ICard className={styles.iGreen} />
          </div>
          <span className={cx(styles.metricFoot, styles.tGreen)}>Estoque baixo: {dashboard ? (dashboard.lowStock ?? 0) : '—'}</span>
        </div>
      </div>

      {/* ---- 6 cards rápidos (dados reais do dashboard) ---- */}
      <div className={styles.quickStats}>
        <button className={styles.qsCard} onClick={() => go('/admin')}>
          <IBag className={styles.iBlue} />
          <span className={styles.qsBadge}>{dashboard ? badge(dashboard.pendingOrders, 'pendente', 'pendentes') : '—'}</span>
          <span className={styles.qsLabel}>Pedidos</span>
        </button>
        <button className={styles.qsCard} onClick={() => go('/chat')}>
          <IChat className={styles.iGreen} />
          <span className={styles.qsBadge}>{dashboard ? badge(dashboard.flaggedMessages, 'sinalizada', 'sinalizadas') : '—'}</span>
          <span className={styles.qsLabel}>Mensagens</span>
        </button>
        <button className={styles.qsCard}>
          <IAlert className={styles.iRed} />
          <span className={cx(styles.qsBadge, styles.qsBadgeDanger)}>{dashboard ? badge(dashboard.openDisputes, 'aberta', 'abertas') : '—'}</span>
          <span className={styles.qsLabel}>Disputas</span>
        </button>
        <button className={styles.qsCard} onClick={() => go('/admin')}>
          <IUsers className={styles.iPurple} />
          <span className={styles.qsBadge}>{dashboard ? `+${dashboard.newUsersToday ?? 0} hoje` : '—'}</span>
          <span className={styles.qsLabel}>Usuários</span>
        </button>
        <button className={styles.qsCard}>
          <IBox className={styles.iOrange} />
          <span className={cx(styles.qsBadge, styles.qsBadgeOutline)}>{dashboard ? badge(dashboard.lowStock, 'baixo') : '—'}</span>
          <span className={styles.qsLabel}>Estoque</span>
        </button>
        <button className={styles.qsCard}>
          <ICard className={styles.iAmber} />
          <span className={cx(styles.qsBadge, styles.qsBadgeOutline)}>{dashboard ? badge(dashboard.pendingPayments, 'pendente', 'pendentes') : '—'}</span>
          <span className={styles.qsLabel}>Pagamentos</span>
        </button>
      </div>

      {/* ---- Ações Rápidas (pedidos pendentes + disputas reais) ---- */}
      <div className={styles.panel}>
        <h2 className={styles.panelTitle}>Ações Rápidas</h2>
        {loading && !dashboard ? (
          <div className={styles.loadingBox}><Spinner size={20} /> Carregando…</div>
        ) : hasActions ? (
          <div className={styles.actionList}>
            {recentPending.map((p) => (
              <div key={`p-${p.id}`} className={cx(styles.actionRow, styles.rowBlue)}>
                <div className={styles.actionInfo}>
                  <IBag className={styles.iBlue} />
                  <div>
                    <p className={styles.actionName}>Pedido #{p.order_number || p.id}</p>
                    <p className={styles.actionSub}>{brlFmt.format(Number(p.total) || 0)} · {ORDER_STATUS_LABEL[p.status] || p.status}</p>
                  </div>
                </div>
                <div className={styles.actionBtns}>
                  <button className={styles.btnGhost} onClick={() => go(`/pedido/${p.id}`)}><IEye width={14} height={14} /> Ver</button>
                </div>
              </div>
            ))}
            {recentDisputes.map((d) => (
              <div key={`d-${d.id}`} className={cx(styles.actionRow, styles.rowRed)}>
                <div className={styles.actionInfo}>
                  <IAlert className={styles.iRed} />
                  <div>
                    <p className={styles.actionName}>Disputa #{d.id}</p>
                    <p className={styles.actionSub}>{d.reason || 'Disputa'}{d.order_id ? ` · Pedido #${d.order_id}` : ''} · {ORDER_STATUS_LABEL[d.status] || d.status}</p>
                  </div>
                </div>
                <div className={styles.actionBtns}>
                  <button className={styles.btnGhost} onClick={() => d.order_id && go(`/pedido/${d.order_id}`)}><IEye width={14} height={14} /> Analisar</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.emptyBox}>Nenhuma ação pendente.</p>
        )}
      </div>

      {/* ---- Estatísticas dos Pedidos ---- */}
      <div className={styles.ostats}>
        <div className={styles.ostatCard}><IBag className={cx(styles.ostatIcon, styles.iGreen)} /><p className={styles.ostatValue}>{sNum(orderStats?.totalOrders)}</p><p className={styles.ostatLabel}>Total de Pedidos</p></div>
        <div className={styles.ostatCard}><ICard className={cx(styles.ostatIcon, styles.iBlue)} /><p className={styles.ostatValue}>{sBrl(orderStats?.totalRevenue)}</p><p className={styles.ostatLabel}>Receita Total</p></div>
        <div className={styles.ostatCard}><ITrend className={cx(styles.ostatIcon, styles.iAmber)} /><p className={styles.ostatValue}>{sBrl(orderStats?.platformCommission)}</p><p className={styles.ostatLabel}>Comissão</p></div>
        <div className={styles.ostatCard}><IShield className={cx(styles.ostatIcon, styles.iPurple)} /><p className={styles.ostatValue}>{sNum(orderStats?.disputes)}</p><p className={styles.ostatLabel}>Disputas</p></div>
      </div>

      {/* ---- Sistema de Pagamentos & Demonstrações (botões corrigidos) ---- */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}><ICard width={20} height={20} /> Sistema de Pagamentos &amp; Demonstrações</h2>
        <div className={styles.payGrid}>
          <button className={cx(styles.payBtn, styles.bgGreen)} onClick={() => go('/finalizar-compra')}>
            <ICard width={24} height={24} />
            <strong>Demo de Pagamentos</strong>
            <span>Sistema Mercado Pago + Escrow</span>
          </button>
          <button className={cx(styles.payBtn, styles.bgBlue)} onClick={() => go('/pedido/order-001')}>
            <IShield width={24} height={24} />
            <strong>Sistema Escrow</strong>
            <span>Retenção de 7 dias</span>
          </button>
          <button className={cx(styles.payBtn, styles.bgPurple)} onClick={() => go('/minha-conta?tab=pedidos')}>
            <IBag width={24} height={24} />
            <strong>Ver Pedidos</strong>
            <span>Painel do usuário</span>
          </button>
        </div>
      </div>

      {/* ---- Dashboard Executivo ---- */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}><IBars width={20} height={20} /> Dashboard Executivo</h2>
        <div className={styles.execGrid}>
          <div className={cx(styles.execCard, styles.softBlue)}><IBox className={styles.iBlue} /><div className={styles.execValue}>{sNum(orderStats?.totalOrders)}</div><div className={styles.execLabel}>Total de Pedidos</div></div>
          <div className={cx(styles.execCard, styles.softGreen)}><ITrend className={styles.iGreen} /><div className={styles.execValue}>{sBrl(orderStats?.totalRevenue)}</div><div className={styles.execLabel}>Receita Total</div></div>
          <div className={cx(styles.execCard, styles.softPurple)}><IBars className={styles.iPurple} /><div className={styles.execValue}>{sBrl(orderStats?.platformCommission)}</div><div className={styles.execLabel}>Comissão</div></div>
          <div className={cx(styles.execCard, styles.softAmber)}><IShield className={styles.iAmber} /><div className={styles.execValue}>{sNum(orderStats?.disputes)}</div><div className={styles.execLabel}>Disputas</div></div>
        </div>
      </div>

      {/* ---- Acesso Rápido aos Sistemas ---- */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Acesso Rápido aos Sistemas</h2>
        <div className={styles.linksGrid}>
          {QUICK_LINKS.map((l) => (
            <button key={l.title} className={cx(styles.linkBtn, styles[`bg${l.color[0].toUpperCase()}${l.color.slice(1)}`])} onClick={() => go(l.dynamic === 'order' ? (orders && orders[0] ? `/pedido/${orders[0].id}` : '/minha-conta?tab=pedidos') : l.path)}>
              <span className={styles.linkHead}><l.Icon width={24} height={24} /> <strong>{l.title}</strong></span>
              <span className={styles.linkDesc}>{l.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ---- Monitoramento do Sistema (saúde real) ---- */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}><IGear width={20} height={20} /> Monitoramento do Sistema</h2>
        <div className={styles.monGrid}>
          {health ? (
            [
              ...(Array.isArray(health.services) ? health.services : []).map((s) => ({
                name: s.name,
                status: s.status === 'online' ? `Online · ${s.latency ?? 0}ms` : (s.status || 'Indisponível'),
                ok: s.status === 'online',
              })),
              { name: 'Uptime', status: fmtUptime(health.uptime), ok: true },
              { name: 'Memória', status: health.memory ? `${health.memory.rssMB} MB` : '—', ok: true },
            ].map((m) => (
              <div key={m.name} className={styles.monCard}>
                <span className={styles.monDot} style={m.ok ? undefined : { background: '#dc2626' }} />
                <p className={styles.monName}>{m.name}</p>
                <p className={styles.monStatus}>{m.status}</p>
              </div>
            ))
          ) : (
            <div className={styles.monCard}>
              <span className={styles.monDot} style={{ background: '#9ca3af' }} />
              <p className={styles.monName}>Status</p>
              <p className={styles.monStatus}>{loading ? 'Verificando…' : 'Indisponível'}</p>
            </div>
          )}
        </div>
      </div>

      {/* ---- Status dos Pedidos ---- */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}>
          Status dos Pedidos
          <button className={styles.refreshBtn} onClick={loadData} disabled={loading} title="Atualizar">
            {loading ? <Spinner size={16} /> : <IRefresh width={16} height={16} />} Atualizar
          </button>
        </h2>
        <div className={styles.statusGrid}>
          <div className={cx(styles.statusCell, styles.softRed)}><p className={cx(styles.statusValue, styles.tRed)}>{sNum(orderStats?.statusBreakdown.pending)}</p><p className={styles.statusLabel}>Pendentes</p></div>
          <div className={cx(styles.statusCell, styles.softBlue)}><p className={cx(styles.statusValue, styles.tBlue)}>{sNum(orderStats?.statusBreakdown.paid)}</p><p className={styles.statusLabel}>Pagos</p></div>
          <div className={cx(styles.statusCell, styles.softAmber)}><p className={cx(styles.statusValue, styles.tAmber)}>{sNum(orderStats?.statusBreakdown.shipped)}</p><p className={styles.statusLabel}>Enviados</p></div>
          <div className={cx(styles.statusCell, styles.softGreen)}><p className={cx(styles.statusValue, styles.tGreen)}>{sNum(orderStats?.statusBreakdown.delivered)}</p><p className={styles.statusLabel}>Entregues</p></div>
        </div>
      </div>

      {/* ---- Lista de Pedidos (API real) ---- */}
      <div className={styles.card}>
        <h2 className={styles.cardTitle}><IBag width={20} height={20} /> Pedidos Recentes</h2>
        {loading && !orders ? (
          <div className={styles.loadingBox}><Spinner size={20} /> Carregando…</div>
        ) : orders && orders.length > 0 ? (
          <div className={styles.tableWrap}>
            <table className={styles.ordersTable}>
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Status</th>
                  <th>Itens</th>
                  <th>Total</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const bucket = STATUS_BUCKET[o.status];
                  const label = ORDER_STATUS_LABEL[o.status] || o.status;
                  const dateRaw = o.placed_at || o.createdAt;
                  return (
                    <tr key={o.id}>
                      <td>#{o.order_number}</td>
                      <td>
                        <span className={cx(styles.statusTag, STATUS_TAG_CLASS[bucket] && styles[STATUS_TAG_CLASS[bucket]])}>{label}</span>
                      </td>
                      <td>{o.items && o.items.length ? `${o.items.length} ${o.items.length === 1 ? 'item' : 'itens'}` : '—'}</td>
                      <td>{brlFmt.format(Number(o.total) || 0)}</td>
                      <td>{dateRaw ? dateFmt.format(new Date(dateRaw)) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={styles.emptyBox}>Sem dados.</p>
        )}
      </div>
    </div>
  );
}
