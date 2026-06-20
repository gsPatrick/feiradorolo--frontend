'use client';

import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { useCart } from '@/components/providers/CartProvider';
import Button from '@/components/atoms/Button/Button';
import Icon from '@/components/atoms/Icon/Icon';
import EmptyState from '@/components/molecules/EmptyState/EmptyState';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function Minus({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
    </svg>
  );
}

export default function CarrinhoPage() {
  const router = useRouter();
  const { items, removeItem, setQty, clear, totalItems, totalPrice } = useCart();

  function updateQuantity(id, newQty) {
    if (newQty < 1) removeItem(id);
    else setQty(id, newQty);
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={styles.backRow}>
          <Button variant="ghost" size="sm" leftIcon="arrow-left" href="/produtos" className={styles.back}>
            Continuar comprando
          </Button>
        </div>

        <h1 className={styles.title}>Carrinho de Compras</h1>

        {items.length === 0 ? (
          <EmptyState
            icon="cart"
            title="Seu carrinho está vazio"
            description="Adicione produtos ao carrinho para continuar comprando"
            action={
              <Button size="lg" href="/produtos">
                Continuar comprando
              </Button>
            }
          />
        ) : (
          <div className={styles.grid}>
            {/* Itens */}
            <div className={styles.itemsCol}>
              <div className={styles.itemsHead}>
                <h2 className={styles.itemsTitle}>Itens no carrinho ({items.length})</h2>
                <Button variant="outline" size="sm" leftIcon="trash" onClick={clear} className={styles.clearBtn}>
                  Limpar carrinho
                </Button>
              </div>

              {items.map((item) => (
                <div key={item.id} className={styles.card}>
                  <div className={styles.thumb}>
                    {item.image ? (
                      <img src={item.image} alt={item.title} />
                    ) : (
                      <div className={styles.thumbFallback}>
                        <Icon name="package" size={28} />
                      </div>
                    )}
                  </div>

                  <div className={styles.info}>
                    <h3 className={styles.itemTitle}>{item.title}</h3>
                    <p className={styles.price}>{brl.format(item.price)}</p>
                    <p className={styles.subtotal}>Subtotal: {brl.format(item.price * item.qty)}</p>
                  </div>

                  <div className={styles.stepper}>
                    <button
                      type="button"
                      className={styles.stepBtn}
                      onClick={() => updateQuantity(item.id, item.qty - 1)}
                      disabled={item.qty <= 1}
                      aria-label="Diminuir quantidade"
                    >
                      <Minus size={16} />
                    </button>
                    <span className={styles.qty}>{item.qty}</span>
                    <button
                      type="button"
                      className={styles.stepBtn}
                      onClick={() => updateQuantity(item.id, item.qty + 1)}
                      aria-label="Aumentar quantidade"
                    >
                      <Icon name="plus" size={16} />
                    </button>
                  </div>

                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => removeItem(item.id)}
                    aria-label="Remover item"
                  >
                    <Icon name="trash" size={16} />
                  </button>
                </div>
              ))}
            </div>

            {/* Resumo */}
            <div className={styles.summaryCol}>
              <div className={styles.summary}>
                <h2 className={styles.summaryTitle}>Resumo do Pedido</h2>

                <div className={styles.summaryRows}>
                  <div className={styles.row}>
                    <span>Subtotal ({totalItems} {totalItems === 1 ? 'item' : 'itens'})</span>
                    <span>{brl.format(totalPrice)}</span>
                  </div>
                  <div className={styles.row}>
                    <span>Frete</span>
                    <span className={styles.free}>Grátis</span>
                  </div>
                  <div className={styles.divider} />
                  <div className={styles.totalRow}>
                    <span>Total</span>
                    <span>{brl.format(totalPrice)}</span>
                  </div>
                </div>

                <div className={styles.actions}>
                  <Button size="lg" fullWidth onClick={() => router.push('/finalizar-compra')}>
                    Finalizar Compra
                  </Button>
                  <Button variant="outline" size="lg" fullWidth href="/produtos">
                    Continuar Comprando
                  </Button>
                </div>

                <div className={styles.benefits}>
                  <div className={styles.benefit} data-tone="green">
                    <span className={styles.benefitIcon}>✅</span> Frete grátis
                  </div>
                  <div className={styles.benefit} data-tone="blue">
                    <span className={styles.benefitIcon}>🔒</span> Compra 100% segura
                  </div>
                  <div className={styles.benefit} data-tone="purple">
                    <span className={styles.benefitIcon}>↩️</span> 7 dias para trocar ou devolver
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
