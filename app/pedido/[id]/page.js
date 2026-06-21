'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import styles from './page.module.css';
import { cx } from '@/lib/cx';
import Button from '@/components/atoms/Button/Button';
import Icon from '@/components/atoms/Icon/Icon';
import Badge from '@/components/atoms/Badge/Badge';
import EmptyState from '@/components/molecules/EmptyState/EmptyState';
import { useToast } from '@/components/providers/ToastProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import ReturnModal from '@/components/organisms/ReturnModal/ReturnModal';
import { orderService, escrowService, paymentService, chatService, productService, disputeService, mapProduct, ApiError } from '@/lib/api';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const DATE = new Intl.DateTimeFormat('pt-BR');
const MONTH_YEAR = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
const RATING = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : DATE.format(d);
}

/* "desde junho de 2024" — usado em "membro desde" / "cliente desde". */
function formatMonthYear(value) {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : MONTH_YEAR.format(d);
}

/* Iniciais do nome para o fallback do avatar. */
function initials(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const first = parts[0][0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

/* Cor estável e agradável a partir do nome (fallback do avatar). */
const AVATAR_COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#14b8a6', '#f97316'];
function avatarColor(name) {
  const s = String(name || '');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

/* Avatar redondo com fallback de iniciais coloridas. */
function Avatar({ src, name, size = 56 }) {
  const dim = { width: size, height: size };
  if (src) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img className={styles.avatar} src={src} alt={name || ''} style={dim} />
    );
  }
  return (
    <span
      className={styles.avatar}
      style={{ ...dim, background: avatarColor(name), fontSize: Math.round(size * 0.4) }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

/* Estrelas (0–5) com preenchimento amarelo proporcional à média. */
function Stars({ value = 0, size = 16 }) {
  const pct = Math.max(0, Math.min(100, (Number(value) / 5) * 100));
  return (
    <span className={styles.stars} style={{ fontSize: size }} aria-label={`${RATING.format(value)} de 5`}>
      <span className={styles.starsBack}>★★★★★</span>
      <span className={styles.starsFront} style={{ width: `${pct}%` }}>★★★★★</span>
    </span>
  );
}

/* Ícones faltantes no Icon.js (lucide-style, SVG inline) */
function Clock({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
    </svg>
  );
}
function CheckCircle({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21.5 11.1V12a9 9 0 1 1-5.3-8.2" /><path d="m9 11 3 3L22 4" />
    </svg>
  );
}
function XCircle({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><path d="m15 9-6 6" /><path d="m9 9 6 6" />
    </svg>
  );
}

/* Labels e ícones de status — fiéis ao front antigo */
const STATUS_META = {
  awaiting_payment: { label: 'Aguardando pagamento', variant: 'brand', Icon: Clock },
  pending: { label: 'Aguardando pagamento', variant: 'brand', Icon: Clock },
  processing: { label: 'Processando', variant: 'info', Icon: Clock },
  paid: { label: 'Pago', variant: 'info', Icon: ({ size }) => <Icon name="package" size={size} /> },
  shipped: { label: 'Enviado', variant: 'brand', Icon: ({ size }) => <Icon name="truck" size={size} /> },
  delivered: { label: 'Entregue', variant: 'success', Icon: CheckCircle },
  completed: { label: 'Concluído', variant: 'success', Icon: CheckCircle },
  cancelled: { label: 'Cancelado', variant: 'danger', Icon: XCircle },
};

const PAYMENT_METHOD_LABELS = {
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  pix: 'PIX',
  boleto: 'Boleto Bancário',
  mercado_pago: 'Mercado Pago',
  open_finance: 'Open Finance',
};

/* Etapas da timeline de rastreio — estilo Kabum, começando pelo pagamento. */
const SHIPPING_STEPS = [
  { key: 'payment', label: 'Pagamento', Icon: ({ size }) => <Icon name="card" size={size} /> },
  { key: 'paid', label: 'Pagamento confirmado', Icon: CheckCircle },
  { key: 'shipped', label: 'Pedido enviado', Icon: ({ size }) => <Icon name="package" size={size} /> },
  { key: 'transit', label: 'Em trânsito', Icon: ({ size }) => <Icon name="truck" size={size} /> },
  { key: 'delivered', label: 'Entregue', Icon: CheckCircle },
];
const PICKUP_STEPS = [
  { key: 'payment', label: 'Pagamento', Icon: ({ size }) => <Icon name="card" size={size} /> },
  { key: 'paid', label: 'Pagamento confirmado', Icon: CheckCircle },
  { key: 'arrange', label: 'Combine a retirada', Icon: ({ size }) => <Icon name="map-pin" size={size} /> },
  { key: 'done', label: 'Retirado / Concluído', Icon: CheckCircle },
];

/**
 * Etapa ativa (0-based) conforme o status do pedido e o status de envio.
 * awaiting_payment/pending => 0 (pagamento pendente, etapa atual).
 * paid/processing => 1 (pagamento confirmado).
 * shipped => avança para envio/trânsito; delivered/completed => última etapa.
 */
function computeActiveStep(steps, order) {
  const status = order?.status;
  const shipping = order?.shipping_status;
  const last = steps.length - 1;
  if (status === 'awaiting_payment' || status === 'pending') return 0;
  if (status === 'delivered' || status === 'completed') return last;
  if (status === 'shipped') {
    if (steps === PICKUP_STEPS) return 2; // combine a retirada
    return shipping === 'in_transit' || shipping === 'transit' ? 3 : 2;
  }
  // paid / processing
  if (status === 'paid' || status === 'processing') return 1;
  return 1;
}

export default function PedidoDetalhePage() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();
  const { toast } = useToast();
  const { openAuth, user } = useAuth();

  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [error, setError] = useState(false);
  const [escrow, setEscrow] = useState(null); // custódia (pickup): pode trazer pickup_token
  const [sellerRating, setSellerRating] = useState(null); // { avg, count } | null se indisponível

  // — Pagamento PIX —
  const [payState, setPayState] = useState('idle'); // idle | loading | ready | paid
  const [pix, setPix] = useState(null); // { qr_code, qr_code_base64, ticket_url }
  const [copied, setCopied] = useState(false);
  const pollRef = useRef(null);

  // — Devolução —
  const [returnOpen, setReturnOpen] = useState(false);
  const [disputeBusy, setDisputeBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    setUnauthorized(false);
    setError(false);
    setEscrow(null);
    orderService
      .getById(id)
      .then((data) => {
        if (!active) return;
        setOrder(data);
        setStatus(data?.status);
        // Retirada presencial: busca o token de 6 dígitos (só vem para o comprador).
        if (data?.delivery_method === 'pickup') {
          escrowService
            .getByOrder(id)
            .then((esc) => {
              if (active) setEscrow(esc || null);
            })
            .catch(() => {
              // 404 = ainda não há custódia (pedido não pago). Trata silenciosamente.
              if (active) setEscrow(null);
            });
        }
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiError && err.status === 401) setUnauthorized(true);
        else setError(true);
        setOrder(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  // Avaliação média do vendedor — média de mapProduct(p).rating dos seus produtos.
  useEffect(() => {
    const sellerId = order?.seller_id || order?.seller?.id;
    if (!sellerId) return;
    let active = true;
    setSellerRating(null);
    productService
      .list(`?seller_id=${sellerId}`)
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data?.products) ? data.products : Array.isArray(data) ? data : [];
        const ratings = list.map((p) => mapProduct(p)?.rating).filter((r) => Number.isFinite(r));
        if (!ratings.length) {
          setSellerRating(null);
          return;
        }
        const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
        setSellerRating({ avg, count: ratings.length });
      })
      .catch(() => {
        if (active) setSellerRating(null);
      });
    return () => {
      active = false;
    };
  }, [order?.seller_id, order?.seller?.id]);

  // Para o polling do PIX ao desmontar o componente.
  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, []);

  async function talkToSeller() {
    try {
      const productId = order.items?.[0]?.product_id || null;
      const chat = await chatService.open(order.seller_id || order.seller?.id, productId);
      router.push(chat && chat.id ? `/mensagens?chat=${chat.id}` : '/mensagens');
    } catch (e) {
      toast({
        title: e?.status === 401 ? 'Faça login para conversar.' : 'Não foi possível abrir a conversa.',
        variant: 'danger',
        duration: 3000,
      });
    }
  }

  function confirmDelivery() {
    setStatus('delivered');
    toast({
      title: 'Entrega confirmada!',
      description: 'O valor em custódia foi liberado para o vendedor.',
      variant: 'success',
      duration: 2500,
    });
  }

  // Recarrega o pedido (após o pagamento confirmar) para a timeline avançar.
  async function reloadOrder() {
    try {
      const data = await orderService.getById(id);
      setOrder(data);
      setStatus(data?.status);
      if (data?.delivery_method === 'pickup') {
        escrowService
          .getByOrder(id)
          .then((esc) => setEscrow(esc || null))
          .catch(() => setEscrow(null));
      }
    } catch {
      /* mantém o estado atual se o reload falhar */
    }
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function startPolling(paymentId) {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const p = await paymentService.getById(paymentId);
        const s = p?.status;
        if (s === 'paid' || s === 'approved') {
          stopPolling();
          setPayState('paid');
          setPix(null);
          await reloadOrder();
          toast({
            title: 'Pagamento confirmado!',
            description: 'Seu pedido está em andamento.',
            variant: 'success',
            duration: 3000,
          });
        } else if (s === 'rejected' || s === 'cancelled') {
          stopPolling();
          setPayState('idle');
          toast({
            title: 'Pagamento não aprovado',
            description: 'Tente gerar um novo PIX.',
            variant: 'danger',
            duration: 3500,
          });
        }
      } catch {
        /* erro transitório no polling — segue tentando */
      }
    }, 4000);
  }

  async function payWithPix() {
    setPayState('loading');
    try {
      const res = await paymentService.createPayment(order.id, { payment_method_id: 'pix' });
      const pixData = res?.pix || null;
      const paymentId = res?.payment?.id;
      if (!pixData || !paymentId) {
        throw new ApiError('PIX indisponível', 502, 'PIX_UNAVAILABLE');
      }
      setPix(pixData);
      setPayState('ready');
      startPolling(paymentId);
    } catch (err) {
      setPayState('idle');
      const code = err instanceof ApiError ? err.code : null;
      const description =
        code === 'PAYMENT_NOT_CONFIGURED'
          ? 'O pagamento ainda não está configurado para este vendedor. Tente novamente mais tarde.'
          : 'Não foi possível gerar o PIX agora. Tente novamente.';
      toast({ title: 'Falha ao gerar pagamento', description, variant: 'danger', duration: 4000 });
    }
  }

  async function copyPixCode() {
    if (!pix?.qr_code) return;
    try {
      await navigator.clipboard.writeText(pix.qr_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Não foi possível copiar', variant: 'danger', duration: 2500 });
    }
  }

  // — Vendedor: aprovar / recusar a devolução —
  async function approveReturn(disputeId) {
    setDisputeBusy(true);
    try {
      await disputeService.approve(disputeId);
      await reloadOrder();
      toast({
        title: 'Devolução aprovada',
        description: 'O reembolso será processado para o comprador.',
        variant: 'success',
        duration: 3000,
      });
    } catch {
      toast({ title: 'Não foi possível aprovar a devolução.', variant: 'danger', duration: 3000 });
    } finally {
      setDisputeBusy(false);
    }
  }

  async function rejectReturn(disputeId) {
    setDisputeBusy(true);
    try {
      await disputeService.reject(disputeId);
      await reloadOrder();
      toast({
        title: 'Devolução recusada',
        description: 'O comprador foi notificado da sua decisão.',
        variant: 'success',
        duration: 3000,
      });
    } catch {
      toast({ title: 'Não foi possível recusar a devolução.', variant: 'danger', duration: 3000 });
    } finally {
      setDisputeBusy(false);
    }
  }

  /* Loading */
  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.head}>
            <Button variant="ghost" size="sm" leftIcon="arrow-left" href="/minha-conta" className={styles.back}>
              Voltar
            </Button>
          </div>
          <div className={styles.card}>
            <div className={styles.cardTitle}>
              <Clock size={20} /> Carregando…
            </div>
          </div>
        </div>
      </main>
    );
  }

  /* Não autorizado (401) */
  if (unauthorized) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.head}>
            <Button variant="ghost" size="sm" leftIcon="arrow-left" href="/minha-conta" className={styles.back}>
              Voltar
            </Button>
          </div>
          <EmptyState
            icon="lock"
            title="Entre para ver o pedido"
            description="Você precisa estar logado para acessar os detalhes deste pedido."
            action={<Button onClick={() => openAuth('login')}>Entrar</Button>}
          />
        </div>
      </main>
    );
  }

  /* Não encontrado / erro */
  if (error || !order) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.head}>
            <Button variant="ghost" size="sm" leftIcon="arrow-left" href="/minha-conta" className={styles.back}>
              Voltar
            </Button>
          </div>
          <EmptyState
            icon="package"
            title="Pedido não encontrado"
            description="Não foi possível carregar este pedido."
            action={<Button href="/minha-conta">Voltar</Button>}
          />
        </div>
      </main>
    );
  }

  const meta = STATUS_META[status] || STATUS_META.paid;
  const StatusIcon = meta.Icon;

  const isPickup = order.delivery_method === 'pickup';
  const trackSteps = isPickup ? PICKUP_STEPS : SHIPPING_STEPS;
  const activeStep = computeActiveStep(trackSteps, order);

  // Pendência de pagamento: status awaiting_payment OU payment_status pending (e não cancelado).
  const isUnpaid =
    status !== 'cancelled' &&
    (status === 'awaiting_payment' || order.payment_status === 'pending');

  const orderNumber = order.order_number || order.id;
  const orderDate = formatDate(order.placed_at || order.createdAt);
  const items = Array.isArray(order.items) ? order.items : [];

  const subtotal = Number(order.subtotal || 0);
  const shipping = Number(order.shipping_cost || 0);
  const discount = Number(order.discount || 0);
  const total = Number(order.total ?? subtotal + shipping - discount);

  const pickupToken = escrow?.pickup_token || null;

  const payment = Array.isArray(order.payments) && order.payments.length ? order.payments[0] : null;
  const paymentMethodLabel = payment && PAYMENT_METHOD_LABELS[payment.method]
    ? PAYMENT_METHOD_LABELS[payment.method]
    : '—';

  // Frete escolhido (somente para envio, quando há transportadora).
  const shippingOption = (!isPickup && order.metadata && order.metadata.shipping_option) || null;
  const shippingCarrier = shippingOption
    ? [shippingOption.company, shippingOption.service_name].filter(Boolean).join(' • ')
    : '';

  const seller = order.seller || null;
  const sellerId = order.seller_id || seller?.id || null;
  const buyer = order.buyer || null;

  // — Devolução / disputa —
  const isBuyer = user?.id === order.buyer_id;
  const isSeller = user?.id === order.seller_id;
  const disputes = Array.isArray(order.disputes) ? order.disputes : [];
  const activeDispute =
    disputes.find((d) => d.status !== 'resolved' && d.status !== 'rejected') || null;
  const isRefunded = status === 'refunded';
  const canRequestReturn =
    isBuyer && !activeDispute && !isRefunded && ['paid', 'delivered'].includes(status);

  // Texto de status amigável da devolução.
  const RETURN_STATUS_LABELS = {
    open: 'Devolução solicitada — aguardando o vendedor',
    requested: 'Devolução solicitada — aguardando o vendedor',
    pending: 'Devolução solicitada — aguardando o vendedor',
    in_review: 'Devolução em análise',
    approved: 'Devolução aprovada',
    refunded: 'Reembolsado',
    resolved: 'Reembolsado',
    rejected: 'Devolução recusada',
  };
  const disputeStatusLabel = activeDispute
    ? RETURN_STATUS_LABELS[activeDispute.status] || 'Devolução em andamento'
    : '';

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {/* Cabeçalho */}
        <div className={styles.head}>
          <Button variant="ghost" size="sm" leftIcon="arrow-left" href="/minha-conta" className={styles.back}>
            Voltar
          </Button>
          <div className={styles.headRow}>
            <div>
              <h1 className={styles.title}>Pedido #{orderNumber}</h1>
              <p className={styles.subtitle}>Realizado em {orderDate}</p>
            </div>
            <Badge variant={meta.variant} className={styles.statusBadge}>
              <StatusIcon size={15} /> {meta.label}
            </Badge>
          </div>
        </div>

        {/* Timeline / Rastreio */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>
            <Icon name="truck" size={20} /> Rastreio do Pedido
          </div>
          {status === 'cancelled' ? (
            <div className={styles.cancelled}>
              <XCircle size={20} /> Este pedido foi cancelado.
            </div>
          ) : (
            <ol className={styles.timeline}>
              {trackSteps.map((step, i) => {
                const StepIcon = step.Icon;
                const done = i <= activeStep;
                const current = i === activeStep;
                const pending = i === activeStep && isUnpaid && i === 0;
                return (
                  <li
                    key={step.key}
                    className={cx(
                      styles.step,
                      done && styles.stepDone,
                      current && styles.stepCurrent,
                      pending && styles.stepPending,
                    )}
                  >
                    <span className={styles.stepDot}><StepIcon size={18} /></span>
                    <span className={styles.stepLabel}>{step.label}</span>
                    {i < trackSteps.length - 1 && (
                      <span className={cx(styles.stepLine, i < activeStep && styles.stepLineDone)} />
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {/* Card destacado de pagamento — quando NÃO pago */}
        {isUnpaid && (
          <div className={cx(styles.card, styles.payCard)}>
            <div className={styles.payHead}>
              <div className={styles.payHeadInfo}>
                <span className={styles.payHint}>Falta pagar</span>
                <span className={styles.payAmount}>{BRL.format(total)}</span>
              </div>
              {payState !== 'ready' && (
                <Button
                  variant="primary"
                  leftIcon="pix"
                  onClick={payWithPix}
                  loading={payState === 'loading'}
                  disabled={payState === 'loading'}
                  className={styles.payBtn}
                >
                  {payState === 'loading' ? 'Gerando PIX…' : 'Pagar com PIX'}
                </Button>
              )}
            </div>

            {payState === 'ready' && pix && (
              <div className={styles.pixBox}>
                {pix.qr_code_base64 && (
                  <div className={styles.pixQr}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`data:image/png;base64,${pix.qr_code_base64}`} alt="QR Code PIX" />
                  </div>
                )}
                <div className={styles.pixInfo}>
                  <p className={styles.pixLead}>
                    <Clock size={16} /> Aguardando pagamento — escaneie o QR Code ou use o código copia-e-cola.
                  </p>
                  {pix.qr_code && (
                    <>
                      <code className={styles.pixCode}>{pix.qr_code}</code>
                      <div className={styles.pixActions}>
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={copied ? 'check' : undefined}
                          onClick={copyPixCode}
                        >
                          {copied ? 'Copiado!' : 'Copiar'}
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
              </div>
            )}
          </div>
        )}

        <div className={styles.grid}>
          {/* Itens do pedido + resumo */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>
              <Icon name="package" size={20} /> Itens do Pedido
            </div>
            <div className={styles.items}>
              {items.map((item, i) => {
                const unit = Number(item.unit_price || 0);
                const qty = Number(item.quantity || 0);
                const lineTotal = Number(item.subtotal ?? unit * qty);
                return (
                  <div key={i} className={styles.item}>
                    <div className={styles.itemMedia}>
                      {(item.product?.images?.[0] || item.product?.cover_image_url) ? (
                        <img
                          src={item.product.images?.[0] || item.product.cover_image_url}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <Icon name="package" size={28} />
                      )}
                    </div>
                    <div className={styles.itemInfo}>
                      <strong>{item.title_snapshot}</strong>
                      <span className={styles.muted}>Quantidade: {qty}</span>
                      <span className={styles.itemUnit}>{BRL.format(unit)} cada</span>
                    </div>
                    <div className={styles.itemTotal}>{BRL.format(lineTotal)}</div>
                  </div>
                );
              })}
            </div>

            <hr className={styles.sep} />

            <div className={styles.summary}>
              <div className={styles.sumRow}><span>Subtotal:</span><span>{BRL.format(subtotal)}</span></div>
              <div className={styles.sumRow}><span>Frete:</span><span>{shipping === 0 ? 'Grátis' : BRL.format(shipping)}</span></div>
              {discount > 0 && (
                <div className={styles.sumRow}><span>Desconto:</span><span>- {BRL.format(discount)}</span></div>
              )}
              <div className={cx(styles.sumRow, styles.sumTotal)}><span>Total:</span><span className={styles.green}>{BRL.format(total)}</span></div>
            </div>
          </div>

          {/* Coluna lateral — pessoas (vendedor + cliente) */}
          <div className={styles.side}>
            {/* Vendedor — perfil completo */}
            <div className={cx(styles.card, styles.peopleCard)}>
              <div className={styles.cardTitle}>
                <Icon name="store" size={20} /> Vendedor
              </div>
              <div className={styles.personHead}>
                <Avatar src={seller?.avatar_url} name={seller?.name} size={56} />
                <div className={styles.personMeta}>
                  <p className={styles.personName}>{seller?.name || 'Vendedor'}</p>
                  {sellerRating ? (
                    <span className={styles.ratingRow}>
                      <Stars value={sellerRating.avg} size={16} />
                      <strong className={styles.ratingNum}>{RATING.format(sellerRating.avg)}</strong>
                    </span>
                  ) : null}
                  {seller?.created_at && (
                    <span className={styles.personSince}>
                      <Clock size={13} /> Membro desde {formatMonthYear(seller.created_at)}
                    </span>
                  )}
                </div>
              </div>
              <div className={styles.personActions}>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon="chat"
                  onClick={talkToSeller}
                  className={styles.sellerBtn}
                >
                  Falar com o vendedor
                </Button>
                {sellerId && (
                  <Button variant="ghost" size="sm" leftIcon="store" href={`/loja/${sellerId}`}>
                    Ver loja
                  </Button>
                )}
              </div>
            </div>

            {/* Cliente — perfil completo */}
            <div className={cx(styles.card, styles.peopleCard)}>
              <div className={styles.cardTitle}>
                <Icon name="user" size={20} /> Cliente
              </div>
              {buyer ? (
                <div className={styles.personHead}>
                  <Avatar src={buyer.avatar_url} name={buyer.name} size={56} />
                  <div className={styles.personMeta}>
                    <p className={styles.personName}>{buyer.name}</p>
                    {buyer.email && (
                      <span className={styles.personContact}>
                        <Icon name="mail" size={14} /> {buyer.email}
                      </span>
                    )}
                    {buyer.phone && (
                      <span className={styles.personContact}>
                        <Icon name="smartphone" size={14} /> {buyer.phone}
                      </span>
                    )}
                    {buyer.created_at && (
                      <span className={styles.personSince}>
                        <Clock size={13} /> Cliente desde {formatMonthYear(buyer.created_at)}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <p className={styles.muted}>Dados do cliente indisponíveis.</p>
              )}
            </div>
          </div>
        </div>

        {/* Cards de logística — preenchem a largura (auto-fit) */}
        <div className={styles.infoGrid}>
          {/* Pagamento */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>
              <Icon name="card" size={20} /> Pagamento
            </div>
            <div className={styles.kv}>
              <div className={styles.kvRow}><span className={styles.muted}>Método:</span><strong>{paymentMethodLabel}</strong></div>
              <div className={styles.kvRow}><span className={styles.muted}>Status:</span><Badge variant={meta.variant} size="sm">{meta.label}</Badge></div>
            </div>
          </div>

          {/* Endereço de entrega */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>
              <Icon name="map-pin" size={20} /> {isPickup ? 'Entrega' : 'Endereço de Entrega'}
            </div>
            <div className={styles.addr}>
              {isPickup ? (
                <p>Retirada presencial — combine o local com o vendedor pelo chat.</p>
              ) : (() => {
                const a = (order.metadata && order.metadata.shipping_address) || null;
                if (!a) return <p className={styles.muted}>Endereço de entrega indisponível.</p>;
                return (
                  <>
                    <p>{a.recipient || a.recipient_name || ''}</p>
                    <p>{[a.street, a.number].filter(Boolean).join(', ')}{a.complement ? ` - ${a.complement}` : ''}</p>
                    <p className={styles.muted}>{[a.neighborhood, a.city, a.state].filter(Boolean).join(', ')}</p>
                    {(a.cep || a.zip_code) && <p className={styles.muted}>CEP: {a.cep || a.zip_code}</p>}
                  </>
                );
              })()}
            </div>
          </div>

          {/* Frete (somente envio com transportadora) */}
          {shippingOption && (
            <div className={styles.card}>
              <div className={styles.cardTitle}>
                <Icon name="truck" size={20} /> Frete
              </div>
              <div className={styles.kv}>
                <div className={styles.kvRow}>
                  <span className={styles.muted}>Transportadora:</span>
                  <strong>{shippingCarrier || '—'}</strong>
                </div>
                {shippingOption.delivery_time != null && (
                  <div className={styles.kvRow}>
                    <span className={styles.muted}>Prazo:</span>
                    <strong>{shippingOption.delivery_time} dias úteis</strong>
                  </div>
                )}
                <div className={styles.kvRow}>
                  <span className={styles.muted}>Valor:</span>
                  <strong>{shipping === 0 ? 'Grátis' : BRL.format(shipping)}</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Retirada presencial — código para o comprador */}
        {isPickup && (
          <div className={cx(styles.card, styles.pickupCard)}>
            <div className={styles.cardTitle}>
              <Icon name="shield" size={20} /> Retirada presencial
            </div>
            {pickupToken ? (
              <div className={styles.pickupBody}>
                <p className={styles.pickupHint}>Seu código de retirada:</p>
                <div className={styles.pickupToken}>{pickupToken}</div>
                <p className={styles.pickupWarn}>
                  Informe este código ao vendedor SOMENTE ao receber o produto.{' '}
                  ⚠️ Combine a retirada em local público e movimentado.
                </p>
              </div>
            ) : (
              <p className={styles.muted}>
                O código de retirada aparecerá aqui após a confirmação do pagamento.
              </p>
            )}
          </div>
        )}

        {/* Custódia / Escrow */}
        {status === 'shipped' && (
          <div className={styles.escrowNote}>
            <Icon name="shield" size={18} />
            <span>O valor está em custódia por 7 dias. Ao confirmar a entrega, ele é liberado imediatamente para o vendedor.</span>
          </div>
        )}

        {/* Pedido reembolsado — destaque */}
        {isRefunded && (
          <div className={cx(styles.card, styles.refundCard)}>
            <div className={styles.refundHead}>
              <CheckCircle size={22} />
              <div>
                <p className={styles.refundTitle}>Pedido reembolsado</p>
                <p className={styles.muted}>O valor foi devolvido ao comprador.</p>
              </div>
            </div>
          </div>
        )}

        {/* Devolução — disputa ativa */}
        {activeDispute && !isRefunded && (
          <div className={cx(styles.card, styles.returnCard)}>
            <div className={styles.cardTitle}>
              <Icon name="package" size={20} /> Devolução
            </div>
            <div className={styles.returnBody}>
              <Badge
                variant={activeDispute.status === 'rejected' ? 'danger' : 'brand'}
                className={styles.returnBadge}
              >
                {disputeStatusLabel}
              </Badge>
              {activeDispute.resolution && (
                <p className={styles.muted}>{activeDispute.resolution}</p>
              )}

              {/* Vendedor: aprovar / recusar quando a disputa está aberta */}
              {isSeller && activeDispute.status === 'open' && (
                <div className={styles.returnActions}>
                  <Button
                    variant="primary"
                    leftIcon="check"
                    onClick={() => approveReturn(activeDispute.id)}
                    loading={disputeBusy}
                    disabled={disputeBusy}
                    className={styles.confirmBtn}
                  >
                    Aprovar devolução
                  </Button>
                  <Button
                    variant="outline"
                    leftIcon="close"
                    onClick={() => rejectReturn(activeDispute.id)}
                    disabled={disputeBusy}
                  >
                    Recusar
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ações */}
        <div className={styles.actions}>
          {status === 'shipped' && (
            <Button variant="primary" leftIcon="check" onClick={confirmDelivery} className={styles.confirmBtn}>
              Confirmar Entrega
            </Button>
          )}
          {status === 'delivered' && (
            <Button variant="accent">Avaliar Produtos</Button>
          )}
          {canRequestReturn && (
            <Button variant="outline" leftIcon="package" onClick={() => setReturnOpen(true)}>
              Solicitar devolução
            </Button>
          )}
          <Button variant="outline" onClick={() => window.print()}>Imprimir Pedido</Button>
        </div>
      </div>

      <ReturnModal
        open={returnOpen}
        onClose={() => setReturnOpen(false)}
        orderId={order.id}
        onDone={reloadOrder}
      />
    </main>
  );
}
