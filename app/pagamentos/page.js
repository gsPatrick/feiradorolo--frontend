'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import { cx } from '@/lib/cx';
import Icon from '@/components/atoms/Icon/Icon';
import Button from '@/components/atoms/Button/Button';
import { useToast } from '@/components/providers/ToastProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { paymentService, ApiError } from '@/lib/api';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

// Filtros (abas/chips). `group` casa com o backend (?group=).
const FILTERS = [
  { k: 'all', l: 'Todos', group: null },
  { k: 'pending', l: 'Pendentes', group: 'pending' },
  { k: 'done', l: 'Concluídos', group: 'done' },
  { k: 'other', l: 'Outros', group: 'other' },
];

// Metadados de status → rótulo + cor do badge.
const STATUS_META = {
  pending: { label: 'Pendente', cls: 'badgePending' },
  in_process: { label: 'Em análise', cls: 'badgePending' },
  authorized: { label: 'Autorizado', cls: 'badgeDone' },
  approved: { label: 'Concluído', cls: 'badgeDone' },
  rejected: { label: 'Recusado', cls: 'badgeDanger' },
  cancelled: { label: 'Cancelado', cls: 'badgeNeutral' },
  refunded: { label: 'Estornado', cls: 'badgeNeutral' },
  charged_back: { label: 'Contestado', cls: 'badgeDanger' },
};

// Método de pagamento → rótulo + ícone.
const METHOD_META = {
  pix: { label: 'Pix', icon: 'pix' },
  credit_card: { label: 'Cartão de crédito', icon: 'card' },
  debit_card: { label: 'Cartão de débito', icon: 'card' },
  boleto: { label: 'Boleto', icon: 'barcode' },
  account_money: { label: 'Saldo', icon: 'dollar' },
};

function statusMeta(status) {
  return STATUS_META[status] || { label: status || '—', cls: 'badgeNeutral' };
}
function methodMeta(method) {
  return METHOD_META[method] || { label: 'Pagamento', icon: 'dollar' };
}

function formatDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PagamentosPage() {
  const { toast } = useToast();
  const { openAuth, user, authReady } = useAuth();

  const [filter, setFilter] = useState('all');
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  // idle | loading | loadingMore | ready | unauth | error
  const [state, setState] = useState('idle');

  const load = useCallback(
    async (targetPage, currentFilter, append) => {
      const grp = FILTERS.find((f) => f.k === currentFilter)?.group;
      setState(append ? 'loadingMore' : 'loading');
      try {
        const res = await paymentService.mine({ page: targetPage, limit: 20, group: grp || undefined });
        const data = (res && res.data) || [];
        setItems((prev) => (append ? [...prev, ...data] : data));
        setSummary((res && res.summary) || null);
        setPagination((res && res.pagination) || null);
        setPage(targetPage);
        setState('ready');
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          setState('unauth');
        } else {
          setState('error');
        }
      }
    },
    []
  );

  // Carrega quando a sessão fica pronta ou o filtro muda.
  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      setState('unauth');
      return;
    }
    load(1, filter, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, user && user.id, filter]);

  function changeFilter(k) {
    if (k === filter) return;
    setItems([]);
    setPagination(null);
    setFilter(k);
  }

  function loadMore() {
    if (!pagination) return;
    if (page >= pagination.pages) return;
    load(page + 1, filter, true);
  }

  async function copyPix(code) {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      toast({ title: 'Código Pix copiado!', variant: 'success', duration: 2000 });
    } catch {
      toast({ title: 'Não foi possível copiar', variant: 'danger', duration: 2500 });
    }
  }

  const hasMore = pagination && page < pagination.pages;

  return (
    <main>
      <div className={styles.subheader}>
        <div className={styles.subInner}>
          <Link href="/minha-conta" className={styles.back}>
            <Icon name="arrow-left" size={20} /> Voltar
          </Link>
          <h1 className={styles.pageTitle}>Pagamentos</h1>
        </div>
      </div>

      <div className={styles.page}>
        <div className={styles.container}>
          {/* Destaque: total gasto + contagens */}
          <section className={styles.summaryCard}>
            <div className={styles.summaryMain}>
              <span className={styles.summaryLabel}>
                <Icon name="dollar" size={18} /> Total gasto
              </span>
              <strong className={styles.summaryValue}>
                {summary ? BRL.format(Number(summary.total_spent) || 0) : '—'}
              </strong>
              <span className={styles.summaryHint}>Soma dos pagamentos concluídos</span>
            </div>
            <div className={styles.summaryStats}>
              <div className={styles.statBox}>
                <strong>{summary ? summary.approved : 0}</strong>
                <span>Concluídos</span>
              </div>
              <div className={styles.statBox}>
                <strong>{summary ? summary.pending : 0}</strong>
                <span>Pendentes</span>
              </div>
              <div className={styles.statBox}>
                <strong>{summary ? summary.total : 0}</strong>
                <span>No total</span>
              </div>
            </div>
          </section>

          {/* Filtros */}
          <div className={styles.filters} role="tablist" aria-label="Filtrar pagamentos">
            {FILTERS.map((f) => (
              <button
                key={f.k}
                role="tab"
                aria-selected={filter === f.k}
                className={cx(styles.chip, filter === f.k && styles.chipActive)}
                onClick={() => changeFilter(f.k)}
              >
                {f.l}
              </button>
            ))}
          </div>

          {/* Lista / estados */}
          {state === 'unauth' ? (
            <div className={styles.emptyCard}>
              <span className={styles.emptyIcon}><Icon name="user" size={36} /></span>
              <strong>Entre para ver seus pagamentos</strong>
              <p>Faça login para acompanhar seu histórico de pagamentos no Feira do Rolo.</p>
              <Button variant="primary" leftIcon="user" onClick={() => openAuth('login')}>Entrar</Button>
            </div>
          ) : state === 'error' ? (
            <div className={styles.emptyCard}>
              <span className={styles.emptyIcon}><Icon name="dollar" size={36} /></span>
              <strong>Não foi possível carregar seus pagamentos</strong>
              <p>Tente novamente em alguns instantes.</p>
              <Button variant="primary" onClick={() => load(1, filter, false)}>Tentar novamente</Button>
            </div>
          ) : state === 'loading' ? (
            <div className={styles.list}>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={cx(styles.row, styles.rowSkeleton)}>
                  <div className={styles.skelIcon} />
                  <div className={styles.skelLines}>
                    <span className={styles.skelLine} style={{ width: '55%' }} />
                    <span className={styles.skelLine} style={{ width: '35%' }} />
                  </div>
                  <div className={styles.skelAmount} />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className={styles.emptyCard}>
              <span className={styles.emptyIcon}><Icon name="dollar" size={36} /></span>
              <strong>Nenhum pagamento encontrado</strong>
              <p>
                {filter === 'all'
                  ? 'Você ainda não realizou pagamentos no Feira do Rolo.'
                  : 'Nenhum pagamento neste filtro.'}
              </p>
              {filter === 'all' && (
                <Button variant="primary" leftIcon="cart" href="/produtos">Começar a Comprar</Button>
              )}
            </div>
          ) : (
            <>
              <div className={styles.list}>
                {items.map((p) => {
                  const sm = statusMeta(p.status);
                  const mm = methodMeta(p.method);
                  const isPending = p.status === 'pending' || p.status === 'in_process';
                  return (
                    <div key={p.id} className={styles.row}>
                      <span className={cx(styles.methodIcon, styles[`m_${p.method}`])}>
                        <Icon name={mm.icon} size={20} />
                      </span>
                      <div className={styles.rowInfo}>
                        <strong className={styles.rowDesc}>{p.description}</strong>
                        <div className={styles.rowMeta}>
                          <span>{mm.label}</span>
                          <span className={styles.dot} aria-hidden="true">•</span>
                          <span>{formatDateTime(p.created_at)}</span>
                        </div>
                        {isPending && (p.pix_code || p.pay_url) && (
                          <div className={styles.rowActions}>
                            {p.pix_code && (
                              <button
                                type="button"
                                className={styles.payLink}
                                onClick={() => copyPix(p.pix_code)}
                              >
                                <Icon name="pix" size={14} /> Copiar código Pix
                              </button>
                            )}
                            {p.pay_url && (
                              <a
                                href={p.pay_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.payLink}
                              >
                                <Icon name="arrow-right" size={14} /> Pagar agora
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                      <div className={styles.rowRight}>
                        <span className={styles.rowAmount}>{BRL.format(Number(p.amount) || 0)}</span>
                        <span className={cx(styles.badge, styles[sm.cls])}>{sm.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {hasMore && (
                <div className={styles.loadMore}>
                  <Button
                    variant="outline"
                    onClick={loadMore}
                    loading={state === 'loadingMore'}
                    disabled={state === 'loadingMore'}
                  >
                    {state === 'loadingMore' ? 'Carregando…' : 'Carregar mais'}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
