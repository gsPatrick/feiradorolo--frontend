'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import Button from '@/components/atoms/Button/Button';
import ProductCard from '@/components/molecules/ProductCard/ProductCard';
import EmptyState from '@/components/molecules/EmptyState/EmptyState';
import { productService, mapProduct } from '@/lib/api';

function Flame({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}
function Clock({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
    </svg>
  );
}

export default function PromocoesPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productService
      .list('?limit=48')
      .then((d) => {
        const all = (Array.isArray(d) ? d : []).map(mapProduct).filter(Boolean);
        setProducts(all.filter((p) => p.oldPrice));
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <Button variant="outline" size="sm" leftIcon="arrow-left" href="/" className={styles.back}>
            Voltar
          </Button>
          <div className={styles.heroCenter}>
            <div className={styles.heroTitle}>
              <span className={styles.flame}><Flame size={48} /></span>
              <h1>Promoções</h1>
            </div>
            <p className={styles.heroSub}>Até 50% de desconto em produtos selecionados</p>
            <div className={styles.heroBadges}>
              <span className={styles.bOff}>↓ ATÉ 50% OFF</span>
              <span className={styles.bLimited}><Clock size={15} /> OFERTA LIMITADA</span>
            </div>
          </div>
        </div>
      </section>

      {/* Produtos */}
      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2>Produtos em Promoção</h2>
          <p>
            Aproveite nossas ofertas especiais com descontos imperdíveis em uma seleção de produtos escolhidos
            especialmente para você.
          </p>
        </div>

        {loading ? (
          <div className={styles.grid}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={styles.cardWrap}>
                <ProductCard loading />
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className={styles.grid}>
            {products.map((product, i) => (
              <div key={product.id} className={styles.cardWrap}>
                <span className={styles.discount}>
                  -{Math.round((1 - product.price / product.oldPrice) * 100)}%
                </span>
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="tag"
            title="Nenhuma promoção no momento"
            description="Fique atento! Novas ofertas chegam em breve."
            action={
              <Button leftIcon="star" href="/produtos">
                Ver Produtos em Destaque
              </Button>
            }
          />
        )}
      </section>

      {/* CTA */}
      <section className={styles.cta}>
        <div className={styles.ctaInner}>
          <h2>Não perca essas ofertas!</h2>
          <p>Cadastre-se para receber alertas de novas promoções</p>
          <form className={styles.ctaForm} onSubmit={(e) => e.preventDefault()}>
            <input type="email" placeholder="Seu melhor e-mail" className={styles.ctaInput} />
            <button type="submit" className={styles.ctaBtn}>⚡ Cadastrar</button>
          </form>
        </div>
      </section>
    </main>
  );
}
