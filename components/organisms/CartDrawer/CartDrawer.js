'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import styles from './CartDrawer.module.css';
import Icon from '../../atoms/Icon/Icon';
import { useCart } from '../../providers/CartProvider';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export default function CartDrawer() {
  const { items, isOpen, closeCart, setQty, removeItem, totalItems, totalPrice } = useCart();

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') closeCart();
    }
    if (isOpen) {
      document.addEventListener('keydown', onKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, closeCart]);

  return (
    <div className={`${styles.root} ${isOpen ? styles.open : ''}`} aria-hidden={!isOpen}>
      <div className={styles.overlay} onClick={closeCart} />

      <aside className={styles.drawer} role="dialog" aria-label="Carrinho">
        <header className={styles.head}>
          <h2 className={styles.title}>
            <Icon name="cart" size={22} /> Carrinho ({totalItems})
          </h2>
          <button className={styles.close} onClick={closeCart} aria-label="Fechar">
            <Icon name="close" size={20} />
          </button>
        </header>

        {items.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>
              <Icon name="cart" size={40} />
            </span>
            <strong>Carrinho vazio</strong>
            <p>Adicione produtos para continuar</p>
            <button className={styles.continue} onClick={closeCart}>
              Continuar comprando
            </button>
          </div>
        ) : (
          <>
            <div className={styles.list}>
              {items.map((item) => (
                <div key={item.id} className={styles.item}>
                  <div className={styles.thumb}>
                    {item.image ? <img src={item.image} alt={item.title} /> : <Icon name="package" size={22} />}
                  </div>
                  <div className={styles.info}>
                    <span className={styles.itemTitle}>{item.title}</span>
                    <span className={styles.itemPrice}>{BRL.format(item.price * item.qty)}</span>
                    <div className={styles.stepper}>
                      <button onClick={() => setQty(item.id, item.qty - 1)} aria-label="Diminuir">
                        <Icon name="close" size={14} />
                      </button>
                      <span>{item.qty}</span>
                      <button onClick={() => setQty(item.id, item.qty + 1)} aria-label="Aumentar">
                        <Icon name="plus" size={14} />
                      </button>
                    </div>
                  </div>
                  <button className={styles.remove} onClick={() => removeItem(item.id)} aria-label="Remover">
                    <Icon name="close" size={18} />
                  </button>
                </div>
              ))}
            </div>

            <footer className={styles.footer}>
              <div className={styles.row}>
                <span>Subtotal</span>
                <span>{BRL.format(totalPrice)}</span>
              </div>
              <div className={styles.row}>
                <span>Frete</span>
                <span className={styles.free}>Grátis</span>
              </div>
              <div className={`${styles.row} ${styles.total}`}>
                <span>Total</span>
                <span>{BRL.format(totalPrice)}</span>
              </div>
              <Link href="/finalizar-compra" className={styles.checkout}>
                Finalizar Compra
              </Link>
              <Link href="/carrinho" className={styles.viewCart}>
                Ver Carrinho Completo
              </Link>
              <div className={styles.benefits}>
                <span>✅ Frete grátis</span>
                <span>🔒 Compra segura</span>
                <span>↩️ 7 dias para trocar</span>
              </div>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
