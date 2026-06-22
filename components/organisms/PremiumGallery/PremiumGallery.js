'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './PremiumGallery.module.css';
import { productService, mapProduct } from '@/lib/api';
import Icon from '../../atoms/Icon/Icon';
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
  const [active, setActive] = useState(0);
  const [pages, setPages] = useState(1);
  const trackRef = useRef(null);

  useEffect(() => {
    productService
      .list('?highlight_tier=diamond&limit=8')
      .then((d) => setProducts((Array.isArray(d) ? d : []).map(mapProduct).filter(Boolean)))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, []);

  // Avança/volta deslizando o track exatamente uma "página visível".
  const scrollByPage = useCallback((dir) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.92, behavior: 'smooth' });
  }, []);

  const scrollToPage = useCallback((i) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  }, []);

  // Acompanha a posição do scroll para iluminar a seta/dot correta e
  // recalcula quantas "páginas" o carrossel tem (responsivo).
  const syncScroll = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    const span = el.scrollWidth - el.clientWidth;
    const perView = Math.max(1, Math.round(el.clientWidth / Math.max(1, el.firstChild?.clientWidth || el.clientWidth)));
    const total = Math.max(1, Math.ceil(el.children.length / perView));
    setPages(total);
    const ratio = span > 0 ? el.scrollLeft / span : 0;
    setActive(Math.round(ratio * (total - 1)));
  }, []);

  useEffect(() => {
    if (loading || !products.length) return undefined;
    syncScroll();
    const el = trackRef.current;
    if (!el) return undefined;
    el.addEventListener('scroll', syncScroll, { passive: true });
    window.addEventListener('resize', syncScroll);
    return () => {
      el.removeEventListener('scroll', syncScroll);
      window.removeEventListener('resize', syncScroll);
    };
  }, [loading, products, syncScroll]);

  // Loading discreto: skeletons no track, sem mudar o layout.
  if (loading) {
    return (
      <section className={styles.section} aria-busy="true">
        <Header />
        <div className={styles.viewport}>
          <div className={styles.track}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div className={styles.cell} key={i}>
                <PremiumProductCard loading />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Só aparece se houver produtos diamante — sem espaço em branco.
  if (!products.length) return null;

  const showNav = pages > 1;

  return (
    <section className={styles.section}>
      <Header />

      <div className={styles.viewport}>
        {showNav && (
          <button
            type="button"
            className={`${styles.arrow} ${styles.left}`}
            onClick={() => scrollByPage(-1)}
            aria-label="Anterior"
            disabled={active === 0}
          >
            <Icon name="chevron-left" size={22} />
          </button>
        )}

        <div className={styles.track} ref={trackRef}>
          {products.map((p) => (
            <div className={styles.cell} key={p.id}>
              <PremiumProductCard product={p} />
            </div>
          ))}
        </div>

        {showNav && (
          <button
            type="button"
            className={`${styles.arrow} ${styles.right}`}
            onClick={() => scrollByPage(1)}
            aria-label="Próximo"
            disabled={active >= pages - 1}
          >
            <Icon name="arrow-right" size={22} />
          </button>
        )}
      </div>

      {showNav && (
        <div className={styles.dots}>
          {Array.from({ length: pages }).map((_, i) => (
            <button
              key={i}
              type="button"
              className={`${styles.dot} ${i === active ? styles.dotActive : ''}`}
              onClick={() => scrollToPage(i)}
              aria-label={`Página ${i + 1}`}
              aria-current={i === active}
            />
          ))}
        </div>
      )}
    </section>
  );
}
