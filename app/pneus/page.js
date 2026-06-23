'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './page.module.css';
import Icon from '@/components/atoms/Icon/Icon';
import Breadcrumb from '@/components/molecules/Breadcrumb/Breadcrumb';
import ProductCard from '@/components/molecules/ProductCard/ProductCard';
import TireSearchBoxes from './TireSearchBoxes';
import { productService, mapProduct } from '@/lib/api';
import { CATEGORY_SLUG, MARCAS } from './tireOptions';

// Slides do carrossel do hero (SVGs em /public/pneus).
const BANNERS = [
  { src: '/pneus/banner-pneus-1.svg', alt: 'Encontre o pneu certo para o seu carro' },
  { src: '/pneus/banner-pneus-2.svg', alt: 'As melhores marcas, entrega rápida' },
  { src: '/pneus/banner-pneus-3.svg', alt: 'Pague no Pix ou em até 12x' },
];

// Paletas para os "logos" estilizados das marcas (sem usar marca oficial).
const BRAND_COLORS = [
  '#1d4ed8', '#dc2626', '#0f766e', '#b91c1c', '#ea580c',
  '#7c3aed', '#0891b2', '#be123c', '#15803d', '#9333ea',
  '#2563eb', '#c2410c', '#0e7490', '#a16207', '#4338ca',
  '#db2777', '#1e40af', '#b45309', '#047857',
];

function HeroCarousel() {
  const [i, setI] = useState(0);
  const timer = useRef(null);

  const go = (n) => setI(((n % BANNERS.length) + BANNERS.length) % BANNERS.length);

  useEffect(() => {
    timer.current = setInterval(() => setI((p) => (p + 1) % BANNERS.length), 6000);
    return () => clearInterval(timer.current);
  }, []);

  const restart = () => {
    clearInterval(timer.current);
    timer.current = setInterval(() => setI((p) => (p + 1) % BANNERS.length), 6000);
  };

  return (
    <div className={styles.carouselWrap} aria-roledescription="carousel">
      <div className={styles.track} style={{ transform: `translateX(-${i * 100}%)` }}>
        {BANNERS.map((b) => (
          <div className={styles.slide} key={b.src}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.src} alt={b.alt} className={styles.slideImg} />
          </div>
        ))}
      </div>

      <button
        type="button"
        className={`${styles.arrow} ${styles.arrowPrev}`}
        aria-label="Slide anterior"
        onClick={() => { go(i - 1); restart(); }}
      >
        <Icon name="chevron-left" size={22} />
      </button>
      <button
        type="button"
        className={`${styles.arrow} ${styles.arrowNext}`}
        aria-label="Próximo slide"
        onClick={() => { go(i + 1); restart(); }}
      >
        <Icon name="chevron-left" size={22} className={styles.flip} />
      </button>

      <div className={styles.dots}>
        {BANNERS.map((b, idx) => (
          <button
            key={b.src}
            type="button"
            className={`${styles.dot} ${idx === i ? styles.dotOn : ''}`}
            aria-label={`Ir para o slide ${idx + 1}`}
            aria-current={idx === i}
            onClick={() => { go(idx); restart(); }}
          />
        ))}
      </div>
    </div>
  );
}

export default function PneusLanding() {
  // Promoções
  const [promos, setPromos] = useState([]);
  const [loadingPromos, setLoadingPromos] = useState(true);

  useEffect(() => {
    let alive = true;
    productService
      .list(`?category_slug=${CATEGORY_SLUG}&limit=8`)
      .then((d) => {
        if (!alive) return;
        const list = (Array.isArray(d) ? d : []).map(mapProduct).filter(Boolean);
        // Destaque primeiro (diamante > ouro > prata), depois preço.
        const rank = { diamond: 3, gold: 2, silver: 1 };
        list.sort(
          (a, b) =>
            (rank[b.highlightTier] || 0) - (rank[a.highlightTier] || 0) ||
            a.price - b.price
        );
        setPromos(list);
      })
      .catch(() => alive && setPromos([]))
      .finally(() => alive && setLoadingPromos(false));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Breadcrumb items={[{ label: 'Início', href: '/' }, { label: 'Pneus' }]} />
      </div>

      {/* HERO — carrossel de banners */}
      <section className={styles.heroSection}>
        <div className={styles.container}>
          <HeroCarousel />
        </div>
      </section>

      {/* FAIXA DE BUSCAS — estilo PneuFree (2x2) */}
      <section className={styles.searchBand}>
        <div className={styles.container}>
          <TireSearchBoxes variant="full" />
        </div>
      </section>

      {/* PNEUS EM PROMOÇÃO */}
      <section className={styles.container}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Pneus em promoção</h2>
          <a className={styles.seeAll} href={`/pneus/lista`}>
            Ver todos <Icon name="arrow-right" size={15} />
          </a>
        </div>
        <div className={styles.carousel}>
          {loadingPromos
            ? Array.from({ length: 4 }).map((_, i) => (
                <ProductCard key={i} loading className={styles.carouselCard} />
              ))
            : promos.length
            ? promos.map((p) => (
                <ProductCard key={p.id} product={p} className={styles.carouselCard} />
              ))
            : <p className={styles.emptyInline}>Sem promoções no momento.</p>}
        </div>
      </section>

      {/* MARCAS DE PNEUS — grid de "logos" estilizados */}
      <section className={styles.container}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Marcas de pneus</h2>
          <a className={styles.seeAll} href={`/pneus/lista`}>
            Ver todas <Icon name="arrow-right" size={15} />
          </a>
        </div>
        <div className={styles.brandsGrid}>
          {MARCAS.map((m, idx) => {
            const color = BRAND_COLORS[idx % BRAND_COLORS.length];
            return (
              <a
                key={m}
                className={styles.brandCard}
                href={`/pneus/lista?spec_marca=${encodeURIComponent(m)}`}
                style={{ '--brand-accent': color }}
              >
                <span className={styles.brandTire} aria-hidden="true">
                  <span className={styles.brandTireInner} />
                </span>
                <span className={styles.brandWord}>{m}</span>
              </a>
            );
          })}
        </div>
      </section>
    </main>
  );
}
