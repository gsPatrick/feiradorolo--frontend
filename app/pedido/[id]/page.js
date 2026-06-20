'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import styles from './page.module.css';
import { cx } from '@/lib/cx';
import Button from '@/components/atoms/Button/Button';
import Icon from '@/components/atoms/Icon/Icon';
import Badge from '@/components/atoms/Badge/Badge';
import EmptyState from '@/components/molecules/EmptyState/EmptyState';
import { useToast } from '@/components/providers/ToastProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { orderService, escrowService, ApiError } from '@/lib/api';

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
  pending: { label: 'Aguardando Pagamento', variant: 'brand', Icon: Clock },
  paid: { label: 'Pago', variant: 'info', Icon: ({ size }) => <Icon name="package" size={size} /> },
  shipped: { label: 'Enviado', variant: 'brand', Icon: ({ size }) => <Icon name="truck" size={size} /> },
  delivered: { label: 'Entregue', variant: 'success', Icon: CheckCircle },
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

/* Etapas da timeline de rastreio */
const TRACK_STEPS = [
  { key: 'paid', label: 'Pago', Icon: ({ size }) => <Icon name="card" size={size} /> },
  { key: 'shipped', label: 'Enviado', Icon: ({ size }) => <Icon name="package" size={size} /> },
  { key: 'transit', label: 'Em trânsito', Icon: ({ size }) => <Icon name="truck" size={size} /> },
  { key: 'delivered', label: 'Entregue', Icon: CheckCircle },
];
const STATUS_TO_STEP = { pending: -1, paid: 0, shipped: 2, delivered: 3, cancelled: -1 };

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

  function confirmDelivery() {
    setStatus('delivered');
    toast({
      title: 'Entrega confirmada!',
      description: 'O valor em custódia foi liberado para o vendedor.',
      variant: 'success',
      duration: 2500,
    });
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
  const activeStep = STATUS_TO_STEP[status] ?? -1;

  const orderNumber = order.order_number || order.id;
  const orderDate = formatDate(order.placed_at || order.createdAt);
  const items = Array.isArray(order.items) ? order.items : [];

  const subtotal = Number(order.subtotal || 0);
  const shipping = Number(order.shipping_cost || 0);
  const discount = Number(order.discount || 0);
  const total = Number(order.total ?? subtotal + shipping - discount);

  const isPickup = order.delivery_method === 'pickup';
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
              {TRACK_STEPS.map((step, i) => {
                const StepIcon = step.Icon;
                const done = i <= activeStep;
                const current = i === activeStep;
                return (
                  <li key={step.key} className={cx(styles.step, done && styles.stepDone, current && styles.stepCurrent)}>
                    <span className={styles.stepDot}><StepIcon size={18} /></span>
                    <span className={styles.stepLabel}>{step.label}</span>
                    {i < TRACK_STEPS.length - 1 && (
                      <span className={cx(styles.stepLine, i < activeStep && styles.stepLineDone)} />
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>

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
