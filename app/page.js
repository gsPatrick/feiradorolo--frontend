'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import { productService, mapProduct } from '@/lib/api';
import HeroBanner from '@/components/organisms/HeroBanner/HeroBanner';
import StoreCarousel from '@/components/organisms/StoreCarousel/StoreCarousel';
import QuickAccessCards from '@/components/organisms/QuickAccessCards/QuickAccessCards';
import FlashSaleBar from '@/components/organisms/FlashSaleBar/FlashSaleBar';
import ProductSection from '@/components/organisms/ProductSection/ProductSection';
import PremiumGallery from '@/components/organisms/PremiumGallery/PremiumGallery';
import CategoryGrid from '@/components/organisms/CategoryGrid/CategoryGrid';
import AppPromo from '@/components/organisms/AppPromo/AppPromo';

export default function HomePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    productService
      .list('?limit=48')
      .then((d) => setProducts((Array.isArray(d) ? d : []).map(mapProduct).filter(Boolean)))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  const MOST_SOLD = products.slice(0, 6);
  const INSPIRED = products.slice(6, 12);
  const RECO = products.slice(12, 18);

  return (
    <main>

      <div className={styles.content}>
        <div className={styles.container}>
          <div className={styles.heroWrap}>
            <HeroBanner />
          </div>
          <div className={styles.cardsWrap}>
            <QuickAccessCards />
          </div>
        </div>

        <FlashSaleBar />

        <div className={styles.container}>
          <div className={styles.sectionWrap}>
            <PremiumGallery />
          </div>

          <div className={styles.sectionWrap}>
            <ProductSection
              icon="trending-up"
              iconColor="#ea580c"
              title="Produtos Mais Vendidos"
              subtitle="Os produtos favoritos dos nossos clientes"
              products={MOST_SOLD}
              loading={loading}
            />
          </div>

          <div className={styles.storeWrap}>
            <StoreCarousel />
          </div>
        </div>
      </div>

      <div className={styles.cream}>
        <div className={styles.container}>
          <div className={styles.sectionWrap}>
            <ProductSection
              icon="bulb"
              iconColor="#f5b400"
              title="Inspirado no Visto por Último"
              subtitle="Descubra produtos de categorias relacionadas ao que você tem navegado"
              products={INSPIRED}
              loading={loading}
            />
          </div>
        </div>
      </div>

      <div className={styles.lavender}>
        <div className={styles.container}>
          <div className={styles.sectionWrap}>
            <ProductSection
              icon="brain"
              iconColor="#7c3aed"
              title="Recomendações para Você"
              subtitle="Produtos selecionados especialmente para você"
              badge="IA Personalizada"
              actionLabel="Ver Todas"
              actionHref="/recomendacoes"
              products={RECO}
              loading={loading}
            />
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.container}>
          <div className={styles.categoriesWrap}>
            <CategoryGrid />
          </div>
        </div>
      </div>

      <AppPromo />
    </main>
  );
}
