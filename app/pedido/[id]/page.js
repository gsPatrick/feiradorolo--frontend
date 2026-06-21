'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import styles from './page.module.css';
import { cx } from '@/lib/cx';
import Button from '@/components/atoms/Button/Button';
import Icon from '@/components/atoms/Icon/Icon';
import Badge from '@/components/atoms/Badge/Badge';
import EmptyState from '@/components/molecules/EmptyState/EmptyState';
import { useToast } from '@/components/providers/ToastProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { orderService, escrowService, paymentService, ApiError } from '@/lib/api';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const DATE = new Intl.DateTimeFormat('pt-BR');

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : DATE.format(d);
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
  const { toast } = useToast();
  const { openAuth } = useAuth();

  const [order, setOrder] = useState(null);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unauthorized, setUnauthorized] = useState(false);
  const [error, setError] = useState(false);
  const [escrow, setEscrow] = useState(null); // custódia (pickup): pode trazer pickup_token

  // — Pagamento PIX —
  const [payState, setPayState] = useState('idle'); // idle | loading | ready | paid
  const [pix, setPix] = useState(null); // { qr_code, qr_code_base64, ticket_url }
  const [copied, setCopied] = useState(false);
  const pollRef = useRef(null);

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

  // Para o polling do PIX ao desmontar o componente.
  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, []);

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
                      <Icon name="package" size={28} />
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

          {/* Coluna lateral */}
          <div className={styles.side}>
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
                <Icon name="map-pin" size={20} /> Endereço de Entrega
              </div>
              <div className={styles.addr}>
                <p className={styles.muted}>Endereço de entrega indisponível.</p>
              </div>
            </div>

            {/* Cliente */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>
                <Icon name="user" size={20} /> Cliente
              </div>
              <div className={styles.addr}>
                <p className={styles.muted}>Dados do cliente indisponíveis.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pedido em análise (verificação facial) */}
        {order.held_for_buyer_verification && (
          <div className={styles.verifyNote}>
            <Clock size={18} />
            <span>Pedido em análise — conclua sua verificação facial para liberá-lo.</span>
          </div>
        )}

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
          <Button variant="outline" onClick={() => window.print()}>Imprimir Pedido</Button>
        </div>
      </div>
    </main>
  );
}
