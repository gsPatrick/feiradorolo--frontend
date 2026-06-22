'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import styles from './page.module.css';
import { cx } from '@/lib/cx';
import Button from '@/components/atoms/Button/Button';
import Icon from '@/components/atoms/Icon/Icon';
import Badge from '@/components/atoms/Badge/Badge';
import Spinner from '@/components/atoms/Spinner/Spinner';
import HighlightBadge from '@/components/atoms/HighlightBadge/HighlightBadge';
import EmptyState from '@/components/molecules/EmptyState/EmptyState';
import Modal from '@/components/organisms/Modal/Modal';
import HighlightPurchase from '@/components/organisms/HighlightPurchase/HighlightPurchase';
import { useAuth } from '@/components/providers/AuthProvider';
import { productService, paymentService, ApiError } from '@/lib/api';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const DATE = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const DATETIME = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : DATE.format(d);
}

/** Data + hora em pt-BR, ex.: "21/06/2026 às 14:30". */
function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return DATETIME.format(d).replace(', ', ' às ');
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
  expired: { label: 'Expirado', variant: 'neutral' },
  pending: { label: 'Pendente', variant: 'brand' },
  cancelled: { label: 'Cancelado', variant: 'danger' },
};

/** Mensagens de erro amigáveis a partir de uma ApiError (ou genérica). */
function friendlyError(err, fallback = 'Algo deu errado. Tente novamente.') {
  if (err instanceof ApiError) {
    if (err.code === 'PAYMENT_NOT_CONFIGURED') {
      return 'O pagamento ainda não está disponível para este vendedor. Tente novamente mais tarde.';
    }
    if (err.code === 'NETWORK') return 'Sem conexão com o servidor. Verifique sua internet.';
    return err.message || fallback;
  }
  return fallback;
}

/** Tempo restante humanizado a partir de days_left / hours_left. */
function formatRemaining(daysLeft, hoursLeft) {
  const d = Number(daysLeft) || 0;
  const h = Number(hoursLeft) || 0;
  if (d <= 0 && h <= 0) return 'menos de 1 hora';
  const parts = [];
  if (d > 0) parts.push(`${d} ${d === 1 ? 'dia' : 'dias'}`);
  if (h > 0) parts.push(`${h}h`);
  return parts.join(' e ');
}

/** Percentual já decorrido do período do destaque (0–100). */
function periodProgress(startsAt, endsAt) {
  const start = startsAt ? new Date(startsAt).getTime() : NaN;
  const end = endsAt ? new Date(endsAt).getTime() : NaN;
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null;
  const now = Date.now();
  const pct = ((now - start) / (end - start)) * 100;
  return Math.min(100, Math.max(0, Math.round(pct)));
}

export default function GerenciarAnuncioPage() {
  const params = useParams();
  const id = params?.id;
  const { user, authReady, openAuth } = useAuth();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [highlights, setHighlights] = useState(null); // { current, has_active_or_pending, history } | null
  const [highlightsLoading, setHighlightsLoading] = useState(false);

  const [purchaseOpen, setPurchaseOpen] = useState(false);

  // Estado do fluxo de pagamento Pix de um destaque pendente.
  const [payOpen, setPayOpen] = useState(false);
  const [payTarget, setPayTarget] = useState(null); // item do histórico/pendente
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState('');
  const [pix, setPix] = useState(null); // { qr_code, qr_code_base64, ticket_url }
  const [payApproved, setPayApproved] = useState(false);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef(null);

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

  // Carrega o histórico/status de destaques (apenas para o dono).
  function loadHighlights() {
    if (!id) return;
    setHighlightsLoading(true);
    productService
      .highlights(id)
      .then((data) => setHighlights(data || { current: null, has_active_or_pending: false, history: [] }))
      .catch(() => setHighlights({ current: null, has_active_or_pending: false, history: [] }))
      .finally(() => setHighlightsLoading(false));
  }

  useEffect(() => {
    if (isOwner) loadHighlights();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner, id]);

  // Para o polling ao desmontar.
  useEffect(() => () => stopPolling(), []);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function startPolling(paymentId) {
    stopPolling();
    if (!paymentId) return;
    pollRef.current = setInterval(async () => {
      try {
        const p = await paymentService.getById(paymentId);
        const s = String(p?.status || '').toLowerCase();
        if (s === 'paid' || s === 'approved' || s === 'authorized') {
          stopPolling();
          setPayApproved(true);
          setPix(null);
          // Recarrega produto + histórico para refletir o destaque ativado.
          productService.getById(id).then((data) => setProduct(data)).catch(() => {});
          loadHighlights();
        } else if (s === 'rejected' || s === 'cancelled') {
          stopPolling();
          setPix(null);
          setPayError('O pagamento não foi aprovado. Tente gerar um novo Pix.');
        }
      } catch {
        /* erro transitório no polling — segue tentando */
      }
    }, 4000);
  }

  function onPaid() {
    // Recarrega produto + histórico para refletir o destaque ativado.
    productService.getById(id).then((data) => setProduct(data)).catch(() => {});
    loadHighlights();
  }

  // Abre o modal de pagamento e gera (ou retoma) o Pix do destaque pendente.
  async function openPayFlow(item) {
    setPayTarget(item);
    setPayOpen(true);
    setPayError('');
    setPayApproved(false);
    setCopied(false);
    setPix(null);
    setPayLoading(true);
    stopPolling();
    try {
      const res = await productService.payHighlight(id, item.id);
      const pixData = res?.pix || item.pix || null;
      const paymentId = res?.payment?.id || item?.payment?.id;
      if (!pixData) {
        setPayError(
          'O pagamento foi registrado, mas o Pix ainda não pôde ser gerado. Tente novamente em instantes.'
        );
      } else {
        setPix(pixData);
      }
      startPolling(paymentId);
    } catch (err) {
      setPayError(friendlyError(err, 'Não foi possível gerar o pagamento deste destaque.'));
    } finally {
      setPayLoading(false);
    }
  }

  function closePayFlow() {
    stopPolling();
    setPayOpen(false);
    setPayTarget(null);
    setPix(null);
    setPayError('');
    setPayApproved(false);
    setCopied(false);
  }

  async function copyPix() {
    if (!pix?.qr_code) return;
    try {
      await navigator.clipboard.writeText(pix.qr_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setPayError('Não foi possível copiar o código. Copie manualmente.');
    }
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

  // Destaque pendente (gerado mas ainda não pago). Vem de `current` (se status
  // pending) ou do histórico — usado para o card de aviso de pagamento.
  const pending =
    current && current.status === 'pending'
      ? current
      : history.find((h) => h.status === 'pending' && !h.paid) || null;
  const activeHighlight = current && current.status === 'active' ? current : null;

  // Bloqueia o botão de novo impulso se houver ativo ou pendente.
  const blockNew =
    highlights?.has_active_or_pending != null
      ? !!highlights.has_active_or_pending
      : !!(activeHighlight || pending);

  const views = product.views_count;
  const favorites = product.favorites_count;
  const hasMetrics = views != null || favorites != null;

  const activeProgress = activeHighlight
    ? periodProgress(activeHighlight.starts_at, activeHighlight.ends_at)
    : null;
  const activeResults = activeHighlight?.results || null;

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
                {activeHighlight && (
                  <span className={cx(styles.metaItem, styles.metaHighlight)}>
                    {TIER_ICONS[activeHighlight.tier] || '✨'} Destaque{' '}
                    {TIER_LABELS[activeHighlight.tier] || activeHighlight.tier}
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
            {!blockNew && (
              <Button variant="primary" leftIcon="bolt" onClick={() => setPurchaseOpen(true)}>
                Destacar / Impulsionar
              </Button>
            )}
          </div>

          {highlightsLoading ? (
            <div className={styles.loadingInline}>
              <Spinner size={22} /> <span>Carregando destaque…</span>
            </div>
          ) : activeHighlight ? (
            /* ---------- Card de destaque ATIVO (rico) ---------- */
            <div className={styles.activeCard}>
              <div className={styles.activeHead}>
                <div className={styles.activeTier}>
                  <HighlightBadge tier={activeHighlight.tier} />
                  <Badge variant="success" dot>Ativo</Badge>
                </div>
                {(activeHighlight.days_left != null || activeHighlight.hours_left != null) && (
                  <span className={styles.remaining}>
                    <Icon name="bolt" size={15} /> Faltam{' '}
                    <strong>{formatRemaining(activeHighlight.days_left, activeHighlight.hours_left)}</strong>
                  </span>
                )}
              </div>

              {/* Barra de progresso do período */}
              {activeProgress != null && (
                <div className={styles.progressWrap}>
                  <div className={styles.progressBar}>
                    <span className={styles.progressFill} style={{ width: `${activeProgress}%` }} />
                  </div>
                  <span className={styles.progressLabel}>{activeProgress}% do período decorrido</span>
                </div>
              )}

              {/* Datas + duração */}
              <div className={styles.dateGrid}>
                <div className={styles.dateItem}>
                  <span className={styles.dateLabel}>Início</span>
                  <strong className={styles.dateValue}>{formatDateTime(activeHighlight.starts_at)}</strong>
                </div>
                <div className={styles.dateItem}>
                  <span className={styles.dateLabel}>Fim</span>
                  <strong className={styles.dateValue}>{formatDateTime(activeHighlight.ends_at)}</strong>
                </div>
                <div className={styles.dateItem}>
                  <span className={styles.dateLabel}>Duração</span>
                  <strong className={styles.dateValue}>
                    {activeHighlight.duration_days != null
                      ? `${activeHighlight.duration_days} ${activeHighlight.duration_days === 1 ? 'dia' : 'dias'}`
                      : '—'}
                  </strong>
                </div>
              </div>

              {/* Resultados do impulso */}
              <div className={styles.resultsBlock}>
                <span className={styles.resultsTitle}>
                  <Icon name="trending-up" size={16} /> Resultados desde o início do destaque
                </span>
                {activeResults ? (
                  <div className={styles.resultsGrid}>
                    <div className={styles.resultCard}>
                      <Icon name="eye" size={18} className={styles.resultIcon} />
                      <strong>+{activeResults.views_gained ?? 0}</strong>
                      <span>Visualizações</span>
                    </div>
                    <div className={styles.resultCard}>
                      <Icon name="heart" size={18} className={styles.resultIcon} />
                      <strong>+{activeResults.favorites_gained ?? 0}</strong>
                      <span>Favoritos</span>
                    </div>
                    <div className={styles.resultCard}>
                      <Icon name="tag" size={18} className={styles.resultIcon} />
                      <strong>+{activeResults.sales_gained ?? 0}</strong>
                      <span>Vendas</span>
                    </div>
                  </div>
                ) : (
                  <p className={styles.muted}>
                    Os resultados aparecem aqui assim que houver novas visualizações, favoritos ou vendas.
                  </p>
                )}
              </div>
            </div>
          ) : pending ? (
            /* ---------- Card de destaque PENDENTE (pagamento) ---------- */
            <div className={styles.pendingCard}>
              <div className={styles.pendingHead}>
                <span className={styles.pendingIcon}>{TIER_ICONS[pending.tier] || '✨'}</span>
                <div className={styles.pendingInfo}>
                  <div className={styles.pendingTitle}>
                    Pagamento pendente <Badge variant="brand" size="sm">Aguardando pagamento</Badge>
                  </div>
                  <span className={styles.muted}>
                    Destaque <strong>{TIER_LABELS[pending.tier] || pending.tier}</strong>
                    {pending.price != null ? ` · ${BRL.format(pending.price)}` : ''}
                  </span>
                  <span className={styles.mutedSm}>Gerado em {formatDateTime(pending.created_at)}</span>
                </div>
              </div>
              <p className={styles.pendingHint}>
                Finalize o pagamento via Pix para ativar o destaque. A ativação é automática assim que o
                pagamento for confirmado.
              </p>
              <Button variant="primary" leftIcon="pix" onClick={() => openPayFlow(pending)}>
                Pagar agora / Gerar QR Code
              </Button>
            </div>
          ) : (
            <p className={styles.muted}>
              Este anúncio não está em destaque. Impulsione para aparecer no topo e vender mais rápido.
            </p>
          )}
        </section>

        {/* Histórico de destaques */}
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h3 className={styles.cardTitle}><Icon name="card" size={20} /> Histórico de destaques</h3>
          </div>
          {highlightsLoading ? (
            <div className={styles.loadingInline}><Spinner size={22} /> <span>Carregando histórico…</span></div>
          ) : history.length === 0 ? (
            <p className={styles.muted}>Nenhum destaque contratado ainda.</p>
          ) : (
            <div className={styles.historyTable} role="table">
              <div className={cx(styles.historyRow, styles.historyHeadRow)} role="row">
                <span>Destaque</span>
                <span>Valor</span>
                <span>Status</span>
                <span>Início</span>
                <span>Fim</span>
                <span>Duração</span>
                <span>Resultados</span>
              </div>
              {history.map((h) => {
                const hs = HISTORY_STATUS[h.status] || { label: h.status || '—', variant: 'info' };
                const isPending = h.status === 'pending' && !h.paid;
                const r = h.results || null;
                const durationTxt =
                  h.duration_days != null
                    ? `${h.duration_days} ${h.duration_days === 1 ? 'dia' : 'dias'}`
                    : '—';
                return (
                  <div key={h.id} className={styles.historyRow} role="row">
                    <span className={styles.histCell} data-label="Destaque">
                      <span className={styles.histTier}>
                        <span className={styles.histTierIcon}>{TIER_ICONS[h.tier] || '✨'}</span>
                        {TIER_LABELS[h.tier] || h.tier}
                      </span>
                    </span>
                    <span className={styles.histCell} data-label="Valor">
                      {h.price != null ? BRL.format(h.price) : '—'}
                    </span>
                    <span className={styles.histCell} data-label="Status">
                      <Badge variant={hs.variant} size="sm">{hs.label}</Badge>
                    </span>
                    <span className={cx(styles.histCell, styles.muted)} data-label="Início">
                      {h.starts_at ? formatDateTime(h.starts_at) : '—'}
                    </span>
                    <span className={cx(styles.histCell, styles.muted)} data-label="Fim">
                      {h.ends_at ? formatDateTime(h.ends_at) : '—'}
                    </span>
                    <span className={cx(styles.histCell, styles.muted)} data-label="Duração">
                      {durationTxt}
                    </span>
                    <span className={styles.histCell} data-label="Resultados">
                      {r ? (
                        <span className={styles.histResults}>
                          <span title="Visualizações ganhas"><Icon name="eye" size={13} /> +{r.views_gained ?? 0}</span>
                          <span title="Favoritos ganhos"><Icon name="heart" size={13} /> +{r.favorites_gained ?? 0}</span>
                        </span>
                      ) : (
                        <span className={styles.muted}>—</span>
                      )}
                    </span>
                    {isPending && (
                      <span className={cx(styles.histCell, styles.histPayCell)} data-label="">
                        <Button variant="primary" size="sm" leftIcon="pix" onClick={() => openPayFlow(h)}>
                          Pagar
                        </Button>
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Modal de compra de novo destaque */}
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

      {/* Modal de pagamento Pix de um destaque pendente */}
      <Modal
        open={payOpen}
        onClose={closePayFlow}
        size="md"
        title={payApproved ? 'Destaque ativado 🎉' : 'Pagar destaque com Pix'}
      >
        {payApproved ? (
          <div className={styles.paySuccess}>
            <div className={styles.paySuccessIcon}>🎉</div>
            <h3 className={styles.paySuccessTitle}>Pagamento confirmado!</h3>
            <p className={styles.muted}>
              {payTarget ? `Destaque ${TIER_LABELS[payTarget.tier] || payTarget.tier} ` : 'Seu destaque '}
              já está ativo. Aproveite a visibilidade extra.
            </p>
            <Button onClick={closePayFlow}>Concluir</Button>
          </div>
        ) : (
          <div className={styles.payFlow}>
            {payTarget && (
              <div className={styles.paySummary}>
                <span className={styles.payTierIcon}>{TIER_ICONS[payTarget.tier] || '✨'}</span>
                <div>
                  <strong>Destaque {TIER_LABELS[payTarget.tier] || payTarget.tier}</strong>
                  <span className={styles.payAmount}>
                    {payTarget.price != null ? BRL.format(payTarget.price) : 'Pix'}
                    {payTarget.created_at ? ` · gerado em ${formatDateTime(payTarget.created_at)}` : ''}
                  </span>
                </div>
              </div>
            )}

            {payError && (
              <div className={styles.errorBox}>
                <Icon name="sparkle" size={16} /> <span>{payError}</span>
              </div>
            )}

            {payLoading ? (
              <div className={styles.pixQrPlaceholder}>
                <Spinner size={28} />
                <span>Gerando Pix…</span>
              </div>
            ) : (
              <div className={styles.pixBox}>
                {pix?.qr_code_base64 ? (
                  <div className={styles.pixQr}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`data:image/png;base64,${pix.qr_code_base64}`} alt="QR Code Pix" />
                  </div>
                ) : (
                  !payError && (
                    <div className={styles.pixQrPlaceholder}>
                      <Spinner size={28} />
                      <span>Gerando Pix…</span>
                    </div>
                  )
                )}

                {pix && (
                  <div className={styles.pixInfo}>
                    <p className={styles.pixLead}>
                      <span className={styles.pulse} /> Aguardando pagamento
                    </p>
                    <p className={styles.pixHint}>
                      Escaneie o QR Code no app do seu banco ou use o código copia-e-cola. A ativação é
                      automática assim que o pagamento for confirmado.
                    </p>
                    {pix.qr_code && (
                      <>
                        <code className={styles.pixCode}>{pix.qr_code}</code>
                        <div className={styles.pixActions}>
                          <Button variant="primary" size="sm" leftIcon={copied ? 'check' : 'pix'} onClick={copyPix}>
                            {copied ? 'Copiado!' : 'Copiar código Pix'}
                          </Button>
                          {pix.ticket_url && (
                            <Button variant="ghost" size="sm" href={pix.ticket_url} target="_blank" rel="noopener noreferrer">
                              Abrir no banco
                            </Button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </main>
  );
}
