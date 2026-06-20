'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import styles from './page.module.css';
import { cx } from '@/lib/cx';
import Button from '@/components/atoms/Button/Button';
import Badge from '@/components/atoms/Badge/Badge';
import Icon from '@/components/atoms/Icon/Icon';
import { orderService, ApiError } from '@/lib/api';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

// Ícone faltante (lucide-style) — CheckCircle
function CheckCircle({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  );
}
// Ícone faltante — Clock
function Clock({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
    </svg>
  );
}

const PAYMENT_METHOD_LABEL = { pix: 'PIX', boleto: 'Boleto', card: 'Cartão de Crédito' };
const PAYMENT_METHOD_ICON = { pix: 'pix', boleto: 'barcode', card: 'card' };

const num = (v) => (typeof v === 'number' ? v : Number(v) || 0);

function getStatusBadge(status) {
  const map = {
    pending: { label: 'Pendente', variant: 'neutral' },
    paid: { label: 'Pago', variant: 'success' },
    shipped: { label: 'Enviado', variant: 'info' },
    delivered: { label: 'Entregue', variant: 'success' },
    cancelled: { label: 'Cancelado', variant: 'danger' },
  };
  return map[status] || { label: status, variant: 'outline' };
}

function getPaymentStatusBadge(status) {
  const map = {
    approved: { label: 'Aprovado', variant: 'success' },
    pending: { label: 'Pendente', variant: 'neutral' },
    rejected: { label: 'Rejeitado', variant: 'danger' },
    cancelled: { label: 'Cancelado', variant: 'danger' },
  };
  return map[status] || { label: status, variant: 'outline' };
}

export default function PedidoConfirmadoPage() {
  const { orderId } = useParams();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // { type: 'auth' | 'notfound' | 'generic', message }

  useEffect(() => {
    if (!orderId) return;
    let active = true;
    setLoading(true);
    setError(null);
    orderService
      .getById(orderId)
      .then((data) => {
        if (active) setOrder(data);
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiError && err.status === 401) {
          setError({ type: 'auth', message: 'Faça login para ver os detalhes do seu pedido.' });
        } else if (err instanceof ApiError && err.status === 404) {
          setError({ type: 'notfound', message: 'Não encontramos esse pedido.' });
        } else {
          setError({
            type: 'generic',
            message: (err && err.message) || 'Não foi possível carregar o pedido.',
          });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [orderId]);

  if (loading) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <section className={cx(styles.card, styles.heroCard)}>
            <h1 className={styles.heroTitle}>Carregando pedido…</h1>
            <p className={styles.heroSub}>Estamos buscando os detalhes do seu pedido.</p>
          </section>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <section className={cx(styles.card, styles.heroCard)}>
            <h1 className={styles.heroTitle}>
              {error.type === 'auth' ? 'Acesso necessário' : 'Pedido não encontrado'}
            </h1>
            <p className={styles.heroSub}>{error.message}</p>
            <div className={styles.actions}>
              {error.type === 'auth' ? (
                <>
                  <Button variant="outline" href="/" className={styles.actionBtn}>
                    Voltar ao Início
                  </Button>
                  <Button href="/login" rightIcon="arrow-right" className={styles.actionBtn}>
                    Fazer Login
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" href="/" className={styles.actionBtn}>
                    Voltar ao Início
                  </Button>
                  <Button href="/minha-conta?tab=pedidos" rightIcon="arrow-right" className={styles.actionBtn}>
                    Ver Meus Pedidos
                  </Button>
                </>
              )}
            </div>
          </section>
        </div>
      </main>
    );
  }

  const items = Array.isArray(order.items) ? order.items : [];
  const orderNumber = order.order_number || (orderId ? String(orderId).slice(-8) : '--------');
  const subtotal = num(order.subtotal);
  const frete = num(order.shipping_cost);
  const total = num(order.total != null ? order.total : subtotal + frete);

  const statusBadge = getStatusBadge(order.status);
  const paymentBadge = getPaymentStatusBadge(order.payment_status);
  const methodLabel = PAYMENT_METHOD_LABEL[order.payment_method] || 'Online';
  const methodIcon = PAYMENT_METHOD_ICON[order.payment_method] || 'card';
  const createdAt = order.createdAt ? new Date(order.createdAt) : new Date();

  const addr = order.shipping_address || order.address || {};
  const address = {
    nome: addr.nome || addr.recipient_name || order.customer_name || 'Comprador',
    rua: addr.rua || addr.street || addr.line1 || '—',
    bairro: addr.bairro || addr.district || '—',
    cidade:
      addr.cidade ||
      (addr.city && addr.state ? `${addr.city} - ${addr.state}` : addr.city) ||
      '—',
    cep: addr.cep || addr.zip || addr.postal_code || '—',
  };

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {/* Header de Confirmação */}
        <section className={cx(styles.card, styles.heroCard)}>
          <div className={styles.successRing}>
            <CheckCircle size={44} />
          </div>
          <h1 className={styles.heroTitle}>Pedido Confirmado!</h1>
          <p className={styles.heroSub}>
            Seu pedido foi criado com sucesso e está sendo processado.
          </p>
          <div className={styles.orderNumber}>Pedido #{orderNumber}</div>
        </section>

        {/* Status do Pedido */}
        <section className={styles.card}>
          <header className={styles.cardHead}>
            <Icon name="package" size={20} />
            <h2>Status do Pedido</h2>
          </header>
          <div className={styles.cardBody}>
            <div className={styles.statusRow}>
              <div>
                <p className={styles.strong}>Status Atual</p>
                <p className={styles.muted}>
                  Última atualização: {new Date().toLocaleString('pt-BR')}
                </p>
              </div>
              <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
            </div>

            {/* Timeline */}
            <ul className={styles.timeline}>
              <li className={styles.tlItem}>
                <span className={cx(styles.tlDot, styles.tlDotDone)} />
                <div>
                  <p className={styles.strong}>Pedido Criado</p>
                  <p className={styles.muted}>{createdAt.toLocaleString('pt-BR')}</p>
                </div>
              </li>
              {order.status === 'paid' && (
                <li className={styles.tlItem}>
                  <span className={cx(styles.tlDot, styles.tlDotDone)} />
                  <div>
                    <p className={styles.strong}>Pagamento Confirmado</p>
                    <p className={styles.muted}>Escrow ativado por 7 dias</p>
                  </div>
                </li>
              )}
              <li className={styles.tlItem}>
                <span className={styles.tlDot} />
                <div>
                  <p className={styles.dim}>Preparando Envio</p>
                  <p className={styles.dim}>Aguardando confirmação do vendedor</p>
                </div>
              </li>
              <li className={styles.tlItem}>
                <span className={styles.tlDot} />
                <div>
                  <p className={styles.dim}>Em Trânsito</p>
                  <p className={styles.dim}>Código de rastreamento será enviado</p>
                </div>
              </li>
              <li className={styles.tlItem}>
                <span className={styles.tlDot} />
                <div>
                  <p className={styles.dim}>Entregue</p>
                  <p className={styles.dim}>Confirmação de entrega</p>
                </div>
              </li>
            </ul>
          </div>
        </section>

        {/* Status do Pagamento */}
        <section className={styles.card}>
          <header className={styles.cardHead}>
            <Icon name={methodIcon} size={20} />
            <h2>Status do Pagamento</h2>
          </header>
          <div className={styles.cardBody}>
            <div className={styles.statusRow}>
              <div>
                <p className={styles.strong}>Pagamento via {methodLabel}</p>
                <p className={styles.muted}>ID: {order.id}</p>
              </div>
              <Badge variant={paymentBadge.variant}>{paymentBadge.label}</Badge>
            </div>

            {order.payment_status === 'approved' && (
              <div className={cx(styles.notice, styles.noticeSuccess)}>
                <div className={styles.noticeHead}>
                  <CheckCircle size={16} />
                  <span>Pagamento Confirmado</span>
                </div>
                <p>
                  O valor está em escrow por 7 dias para garantir sua proteção. Após a
                  confirmação da entrega ou prazo, o pagamento será liberado ao vendedor.
                </p>
              </div>
            )}

            {order.payment_status === 'pending' && (
              <div className={cx(styles.notice, styles.noticeWarning)}>
                <div className={styles.noticeHead}>
                  <Clock size={16} />
                  <span>Aguardando Pagamento</span>
                </div>
                <p>
                  Seu pagamento está sendo processado. Você receberá uma notificação assim
                  que for confirmado.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Resumo do Pedido */}
        <section className={styles.card}>
          <header className={styles.cardHead}>
            <h2>Resumo do Pedido</h2>
          </header>
          <div className={styles.cardBody}>
            <ul className={styles.items}>
              {items.map((item, idx) => {
                const title = item.title_snapshot || 'Produto';
                const qty = num(item.quantity) || 1;
                const lineTotal =
                  item.subtotal != null ? num(item.subtotal) : num(item.unit_price) * qty;
                return (
                  <li key={item.id || idx} className={styles.item}>
                    <img className={styles.itemImg} src={item.cover || ''} alt={title} />
                    <div className={styles.itemInfo}>
                      <p className={styles.itemTitle}>{title}</p>
                      <p className={styles.muted}>Qtd: {qty}</p>
                    </div>
                    <span className={styles.itemPrice}>{brl.format(lineTotal)}</span>
                  </li>
                );
              })}
            </ul>

            <div className={styles.divider} />

            <div className={styles.summaryRow}>
              <span>Subtotal</span>
              <span>{brl.format(subtotal)}</span>
            </div>
            <div className={styles.summaryRow}>
              <span>Frete</span>
              <span className={styles.free}>{frete === 0 ? 'Grátis' : brl.format(frete)}</span>
            </div>
            <div className={cx(styles.summaryRow, styles.totalRow)}>
              <span>Total do Pedido</span>
              <span>{brl.format(total)}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.muted}>Método de Pagamento</span>
              <span className={styles.muted}>{methodLabel}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.muted}>Data do Pedido</span>
              <span className={styles.muted}>{createdAt.toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
        </section>

        {/* Endereço de Entrega */}
        <section className={styles.card}>
          <header className={styles.cardHead}>
            <Icon name="map-pin" size={20} />
            <h2>Endereço de Entrega</h2>
          </header>
          <div className={styles.cardBody}>
            <p className={styles.strong}>{address.nome}</p>
            <p className={styles.muted}>{address.rua}</p>
            <p className={styles.muted}>{address.bairro} — {address.cidade}</p>
            <p className={styles.muted}>CEP {address.cep}</p>
          </div>
        </section>

        {/* Próximos passos / Proteção do Comprador */}
        <section className={styles.card}>
          <header className={styles.cardHead}>
            <Icon name="truck" size={20} />
            <h2>Próximos Passos</h2>
          </header>
          <div className={styles.cardBody}>
            <ul className={styles.steps}>
              <li className={styles.step}>
                <CheckCircle size={20} />
                <div>
                  <p className={styles.strong}>Escrow de 7 dias</p>
                  <p className={styles.muted}>O pagamento fica retido até a confirmação da entrega</p>
                </div>
              </li>
              <li className={styles.step}>
                <CheckCircle size={20} />
                <div>
                  <p className={styles.strong}>Garantia de entrega</p>
                  <p className={styles.muted}>Se não receber o produto, seu dinheiro será devolvido</p>
                </div>
              </li>
              <li className={styles.step}>
                <CheckCircle size={20} />
                <div>
                  <p className={styles.strong}>Suporte dedicado</p>
                  <p className={styles.muted}>Nossa equipe está disponível para ajudar em caso de problemas</p>
                </div>
              </li>
            </ul>
          </div>
        </section>

        {/* Ações */}
        <div className={styles.actions}>
          <Button variant="outline" href="/produtos" className={styles.actionBtn}>
            Continuar Comprando
          </Button>
          <Button href="/minha-conta?tab=pedidos" rightIcon="arrow-right" className={styles.actionBtn}>
            Ver Meus Pedidos
          </Button>
        </div>

        {/* Informações Adicionais */}
        <div className={styles.note}>
          <p>Você receberá atualizações por email sobre o status do seu pedido.</p>
          <p>Em caso de dúvidas, entre em contato conosco através do chat.</p>
        </div>
      </div>
    </main>
  );
}
