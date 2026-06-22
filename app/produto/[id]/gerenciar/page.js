'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import styles from './page.module.css';
import { cx } from '@/lib/cx';
import Button from '@/components/atoms/Button/Button';
import Icon from '@/components/atoms/Icon/Icon';
import Badge from '@/components/atoms/Badge/Badge';
import Spinner from '@/components/atoms/Spinner/Spinner';
import EmptyState from '@/components/molecules/EmptyState/EmptyState';
import Modal from '@/components/organisms/Modal/Modal';
import HighlightPurchase from '@/components/organisms/HighlightPurchase/HighlightPurchase';
import { useAuth } from '@/components/providers/AuthProvider';
import { productService } from '@/lib/api';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const DATE = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : DATE.format(d);
}

const TIER_LABELS = { silver: 'Prata', gold: 'Ouro', diamond: 'Diamante' };
const TIER_ICONS = { silver: '🥈', gold: '🥇', diamond: '💎' };

const STATUS_META = {
  active: { label: 'Ativo', variant: 'success' },
  published: { label: 'Publicado', variant: 'success' },
  draft: { label: 'Rascunho', variant: 'info' },
  paused: { label: 'Pausado', variant: 'brand' },
  inactive: { label: 'Inativo', variant: 'danger' },
  sold: { label: 'Vendido', variant: 'info' },
  removed: { label: 'Removido', variant: 'danger' },
};

const HISTORY_STATUS = {
  active: { label: 'Ativo', variant: 'success' },
  expired: { label: 'Expirado', variant: 'info' },
  pending: { label: 'Pendente', variant: 'brand' },
  cancelled: { label: 'Cancelado', variant: 'danger' },
};

export default function GerenciarAnuncioPage() {
  const params = useParams();
  const id = params?.id;
  const { user, authReady, openAuth } = useAuth();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [highlights, setHighlights] = useState(null); // { current, history } | null
  const [highlightsLoading, setHighlightsLoading] = useState(false);

  const [purchaseOpen, setPurchaseOpen] = useState(false);

  // Carrega o produto.
  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    setError(false);
    productService
      .getById(id)
      .then((data) => {
        if (active) setProduct(data);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const sellerId = product?.seller_id || product?.seller?.id || null;
  const isOwner = !!(user && sellerId && user.id === sellerId);

  // Carrega o histórico de destaques (apenas para o dono).
  function loadHighlights() {
    if (!id) return;
    setHighlightsLoading(true);
    productService
      .highlights(id)
      .then((data) => setHighlights(data || { current: null, history: [] }))
      .catch(() => setHighlights({ current: null, history: [] }))
      .finally(() => setHighlightsLoading(false));
  }

  useEffect(() => {
    if (isOwner) loadHighlights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, id]);

  function onPaid() {
    // Recarrega produto + histórico para refletir o destaque ativado.
    productService.getById(id).then((data) => setProduct(data)).catch(() => {});
    loadHighlights();
  }

  /* ------------------------------ Loading ------------------------------ */
  if (loading || !authReady) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.loading}>
            <Spinner size={34} /> <span>Carregando anúncio…</span>
          </div>
        </div>
      </main>
    );
  }

  /* ----------------------------- Erro / 404 ---------------------------- */
  if (error || !product) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <Button variant="ghost" size="sm" leftIcon="arrow-left" href="/minha-conta?tab=meus-produtos" className={styles.back}>
            Voltar
          </Button>
          <EmptyState
            icon="package"
            title="Anúncio não encontrado"
            description="Não foi possível carregar este anúncio."
            action={<Button href="/minha-conta?tab=meus-produtos">Meus produtos</Button>}
          />
        </div>
      </main>
    );
  }

  /* ----------------------- Não é o dono / deslogado -------------------- */
  if (!isOwner) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <Button variant="ghost" size="sm" leftIcon="arrow-left" href={`/produto/${id}`} className={styles.back}>
            Voltar ao anúncio
          </Button>
          <EmptyState
            icon="lock"
            title={user ? 'Acesso restrito' : 'Entre para gerenciar'}
            description={
              user
                ? 'Apenas o dono deste anúncio pode acessar a gestão. Você pode ver o anúncio normalmente.'
                : 'Você precisa estar logado como o dono deste anúncio para gerenciá-lo.'
            }
            action={
              user ? (
                <Button href={`/produto/${id}`}>Ver anúncio</Button>
              ) : (
                <Button onClick={() => openAuth('login')}>Entrar</Button>
              )
            }
          />
        </div>
      </main>
    );
  }

  /* ------------------------------ Conteúdo ----------------------------- */
  const images = Array.isArray(product.images) ? product.images : [];
  const cover = images[0] || product.cover_image_url || '';
  const price = Number(product.promotional_price ?? product.price) || 0;
  const statusMeta = STATUS_META[product.status] || { label: product.status || '—', variant: 'info' };

  const current = highlights?.current || null;
  const history = Array.isArray(highlights?.history) ? highlights.history : [];

  const views = product.views_count;
  const favorites = product.favorites_count;
  const hasMetrics = views != null || favorites != null;

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={styles.head}>
          <Button variant="ghost" size="sm" leftIcon="arrow-left" href="/minha-conta?tab=meus-produtos" className={styles.back}>
            Voltar
          </Button>
          <h1 className={styles.title}>Gerenciar anúncio</h1>
          <p className={styles.subtitle}>Acompanhe e impulsione a performance do seu produto.</p>
        </div>

        {/* Resumo do produto */}
        <section className={styles.card}>
          <div className={styles.summary}>
            <div className={styles.media}>
              {cover ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={cover} alt={product.title} />
              ) : (
                <Icon name="package" size={40} />
              )}
            </div>
            <div className={styles.summaryInfo}>
              <div className={styles.summaryTop}>
                <h2 className={styles.prodTitle}>{product.title}</h2>
                <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
              </div>
              <p className={styles.price}>{BRL.format(price)}</p>
              <div className={styles.metaRow}>
                <span className={styles.metaItem}>
                  <Icon name="package" size={15} /> Estoque: <strong>{product.stock ?? 0}</strong>
                </span>
                {current && (
                  <span className={cx(styles.metaItem, styles.metaHighlight)}>
                    {TIER_ICONS[current.tier] || '✨'} Destaque {TIER_LABELS[current.tier] || current.tier}
                  </span>
                )}
              </div>
              <div className={styles.summaryActions}>
                <Button variant="outline" size="sm" leftIcon="eye" href={`/produto/${id}`}>Ver no site</Button>
                <Button variant="outline" size="sm" leftIcon="edit" href={`/editar-produto/${id}`}>Editar</Button>
              </div>
            </div>
          </div>
        </section>

        {/* Métricas */}
        {hasMetrics && (
          <section className={styles.metrics}>
            <div className={styles.metricCard}>
              <Icon name="eye" size={22} className={styles.metricIcon} />
              <div>
                <strong className={styles.metricValue}>{views ?? 0}</strong>
                <span className={styles.metricLabel}>Visualizações</span>
              </div>
            </div>
            <div className={styles.metricCard}>
              <Icon name="heart" size={22} className={styles.metricIcon} />
              <div>
                <strong className={styles.metricValue}>{favorites ?? 0}</strong>
                <span className={styles.metricLabel}>Favoritos</span>
              </div>
            </div>
          </section>
        )}

        {/* Destaque atual + impulsionar */}
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h3 className={styles.cardTitle}><Icon name="bolt" size={20} /> Destaque</h3>
            <Button variant="primary" leftIcon="bolt" onClick={() => setPurchaseOpen(true)}>
              {current ? 'Renovar / Impulsionar' : 'Destacar / Impulsionar'}
            </Button>
          </div>
          {current ? (
            <div className={styles.currentHighlight}>
              <span className={styles.currentIcon}>{TIER_ICONS[current.tier] || '✨'}</span>
              <div>
                <strong>Destaque {TIER_LABELS[current.tier] || current.tier} ativo</strong>
                <span className={styles.muted}>Vence em {formatDate(current.ends_at)}</span>
              </div>
            </div>
          ) : (
            <p className={styles.muted}>
              Este anúncio não está em destaque. Impulsione para aparecer no topo e vender mais rápido.
            </p>
          )}
        </section>

        {/* Histórico de pagamentos / destaques */}
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h3 className={styles.cardTitle}><Icon name="card" size={20} /> Histórico de destaques</h3>
          </div>
          {highlightsLoading ? (
            <div className={styles.loadingInline}><Spinner size={22} /> <span>Carregando histórico…</span></div>
          ) : history.length === 0 ? (
            <p className={styles.muted}>Nenhum destaque contratado ainda.</p>
          ) : (
            <div className={styles.historyTable}>
              <div className={cx(styles.historyRow, styles.historyHeadRow)}>
                <span>Destaque</span>
                <span>Valor</span>
                <span>Período</span>
                <span>Status</span>
              </div>
              {history.map((h) => {
                const hs = HISTORY_STATUS[h.status] || { label: h.status, variant: 'info' };
                return (
                  <div key={h.id} className={styles.historyRow}>
                    <span className={styles.histTier}>
                      {TIER_ICONS[h.tier] || '✨'} {TIER_LABELS[h.tier] || h.tier}
                    </span>
                    <span>{h.price != null ? BRL.format(h.price) : '—'}</span>
                    <span className={styles.muted}>
                      {h.starts_at ? `${formatDate(h.starts_at)} → ${formatDate(h.ends_at)}` : formatDate(h.created_at)}
                    </span>
                    <span className={styles.histStatus}>
                      <Badge variant={h.paid ? 'success' : hs.variant} size="sm">
                        {h.paid ? 'Pago' : hs.label}
                      </Badge>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <Modal
        open={purchaseOpen}
        onClose={() => setPurchaseOpen(false)}
        size="lg"
        title="Impulsionar anúncio 🚀"
      >
        <HighlightPurchase
          productId={id}
          productName={product.title}
          onPaid={onPaid}
          onClose={() => setPurchaseOpen(false)}
        />
      </Modal>
    </main>
  );
}
