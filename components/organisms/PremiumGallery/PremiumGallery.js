'use client';

import { useState, useEffect } from 'react';
import styles from './PremiumGallery.module.css';
import { productService, mapProduct } from '@/lib/api';
import PremiumProductCard from '../../molecules/PremiumProductCard/PremiumProductCard';

function Header() {
  return (
    <div className={styles.head}>
      <div className={styles.heading}>
        <span className={styles.seal} aria-hidden="true">💎</span>
        <div className={styles.headingText}>
          <h2 className={styles.title}>Galeria Premium</h2>
          <p className={styles.subtitle}>
            Anúncios em destaque máximo — vitrine selecionada de vendedores de elite
          </p>
        </div>
      </div>
      <span className={styles.accent} aria-hidden="true" />
    </div>
  );
}

export default function PremiumGallery() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productService
      .list('?highlight_tier=diamond&limit=8')
      .then((d) => setProducts((Array.isArray(d) ? d : []).map(mapProduct).filter(Boolean)))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  // Loading discreto: mostra skeletons só enquanto carrega.
  if (loading) {
    return (
      <section className={styles.section} aria-busy="true">
        <Header />
        <div className={styles.grid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <PremiumProductCard key={i} loading />
          ))}
        </div>
      </section>
    );
  }

  // Só aparece se houver produtos diamante — sem espaço em branco.
  if (!products.length) return null;

  return (
    <section className={styles.section}>
      <Header />
      <div className={styles.grid}>
        {products.map((p) => (
          <PremiumProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
