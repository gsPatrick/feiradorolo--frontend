'use client';

import { useEffect, useState } from 'react';
import styles from './page.module.css';
import { cx } from '@/lib/cx';
import DashboardLayout from '@/components/templates/DashboardLayout/DashboardLayout';
import Badge from '@/components/atoms/Badge/Badge';
import Button from '@/components/atoms/Button/Button';
import Icon from '@/components/atoms/Icon/Icon';
import Input from '@/components/atoms/Input/Input';
import EmptyState from '@/components/molecules/EmptyState/EmptyState';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { orderService, escrowService } from '@/lib/api';
import { STATUS_LABELS } from '@/lib/mock-account';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const DATE = new Intl.DateTimeFormat('pt-BR');

const FILTERS = [
  { v: 'all', l: 'Todos' },
  { v: 'paid', l: 'Pagos' },
  { v: 'shipped', l: 'Enviados' },
  { v: 'delivered', l: 'Entregues' },
];

function statusOf(status) {
  return STATUS_LABELS[status] || { label: status, variant: 'default' };
}

function titleOf(sale) {
  const items = sale.items || [];
  if (items.length === 0) return 'Pedido';
  if (items.length === 1) return items[0].title_snapshot;
  return `${items.length} itens`;
}

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : DATE.format(d);
}

const DONE_STATUSES = new Set(['delivered', 'cancelled', 'released']);

export default function MinhasVendasPage() {
  const { openAuth } = useAuth();
  const { toast } = useToast();
  const [filter, setFilter] = useState('all');
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [tokens, setTokens] = useState({}); // { [orderId]: '123456' }
  const [releasing, setReleasing] = useState(null); // orderId em processamento

  const loadSales = () => {
    let active = true;
    setLoading(true);
    setUnauthorized(false);
    orderService
      .listSales()
      .then((data) => {
        if (!active) return;
        setSales(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!active) return;
        if (err && err.status === 401) setUnauthorized(true);
        setSales([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  };

  useEffect(() => {
    return loadSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function releasePickup(orderId) {
    const token = (tokens[orderId] || '').trim();
    if (token.length !== 6) {
      toast({ title: 'Informe o código de 6 dígitos.', variant: 'destructive' });
      return;
    }
    setReleasing(orderId);
    try {
      await escrowService.releaseByToken(orderId, token);
      toast({ title: 'Retirada confirmada! Pagamento liberado.', variant: 'success' });
      setTokens((t) => ({ ...t, [orderId]: '' }));
      loadSales();
    } catch (e) {
      toast({
        title: 'Não foi possível liberar o pagamento',
        description: e?.message || 'Código de retirada inválido.',
        variant: 'destructive',
      });
    } finally {
      setReleasing(null);
    }
  }

  const list = filter === 'all' ? sales : sales.filter((s) => s.status === filter);

  const totalSales = sales.reduce((s, v) => s + Number(v.total || 0), 0);

  return (
    <DashboardLayout active="vendas" title="Minhas Vendas">
      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statIcon} data-c="blue"><Icon name="tag" size={20} /></span>
          <div><strong>{sales.length}</strong><span>vendas · {BRL.format(totalSales)}</span></div>
        </div>
        <div className={styles.stat}>
          <span className={styles.statIcon} data-c="green"><Icon name="dollar" size={20} /></span>
          <div><strong>{BRL.format(totalSales)}</strong><span>recebido (líquido)</span></div>
        </div>
        <div className={styles.stat}>
          <span className={styles.statIcon} data-c="gold"><Icon name="trending-up" size={20} /></span>
          <div><strong>{sales.length}</strong><span>este mês</span></div>
        </div>
      </div>

      <div className={styles.filters}>
        {FILTERS.map((f) => (
          <button key={f.v} className={cx(styles.filter, filter === f.v && styles.filterActive)} onClick={() => setFilter(f.v)}>
            {f.l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.list}>
          {[0, 1, 2].map((i) => (
            <div key={i} className={styles.sale} aria-hidden="true">
              <span className={styles.thumb} />
              <div className={styles.info}>
                <strong style={{ opacity: 0.4 }}>Carregando…</strong>
                <span style={{ opacity: 0.4 }}>Carregando suas vendas</span>
              </div>
            </div>
          ))}
        </div>
      ) : unauthorized ? (
        <EmptyState
          icon="lock"
          title="Entre para ver suas vendas"
          description="Você precisa estar logado para acessar suas vendas."
          action={<Button onClick={() => openAuth('login')}>Entrar</Button>}
        />
      ) : list.length === 0 ? (
        <EmptyState
          icon="tag"
          title="Você ainda não realizou vendas"
          description="Quando você vender um produto, ele aparecerá aqui."
        />
      ) : (
        <div className={styles.list}>
          {list.map((s) => {
            const st = statusOf(s.status);
            const total = Number(s.total || 0);
            const isPickup = s.delivery_method === 'pickup';
            const canRelease = isPickup && !DONE_STATUSES.has(s.status);
            return (
              <div key={s.id} className={styles.sale}>
                <span className={styles.thumb} style={{ display: 'grid', placeItems: 'center', background: 'var(--muted)' }}>
                  <Icon name="tag" size={24} />
                </span>
                <div className={styles.info}>
                  <strong>{titleOf(s)}</strong>
                  <span>Pedido {s.id} · {formatDate(s.created_at)}</span>
                  <div className={styles.badgeRow}>
                    <Badge variant={st.variant} size="sm" className={styles.badge}>{st.label}</Badge>
                    {isPickup && <Badge variant="info" size="sm" className={styles.badge}>🤝 Retirada</Badge>}
                  </div>

                  {canRelease && (
                    <div className={styles.pickupRelease}>
                      <span className={styles.pickupReleaseLabel}>
                        Código de retirada do comprador:
                      </span>
                      <div className={styles.pickupReleaseRow}>
                        <Input
                          value={tokens[s.id] || ''}
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="000000"
                          className={styles.pickupInput}
                          onChange={(e) =>
                            setTokens((t) => ({
                              ...t,
                              [s.id]: e.target.value.replace(/\D/g, '').slice(0, 6),
                            }))
                          }
                          onKeyDown={(e) => e.key === 'Enter' && releasePickup(s.id)}
                        />
                        <Button
                          size="sm"
                          onClick={() => releasePickup(s.id)}
                          loading={releasing === s.id}
                        >
                          Confirmar retirada e liberar pagamento
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                <div className={styles.finance}>
                  <div className={cx(styles.fRow, styles.net)}><span>Total</span><strong>{BRL.format(total)}</strong></div>
                  <div className={styles.saleActions}>
                    <Button size="sm" variant="outline">Ver</Button>
                    <Button size="sm" variant="ghost" leftIcon="chat">Chat</Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
