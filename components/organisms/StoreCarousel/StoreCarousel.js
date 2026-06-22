'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './StoreCarousel.module.css';
import Icon from '../../atoms/Icon/Icon';
import VerifiedSeal from '../../atoms/VerifiedSeal/VerifiedSeal';
import { useFavorites } from '../../providers/FavoritesProvider';
import { useToast } from '../../providers/ToastProvider';
import { productService, mapProduct } from '@/lib/api';

const fmtPrice = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const discountPct = (price, oldPrice) => {
  const p = Number(price) || 0;
  const o = Number(oldPrice) || 0;
  if (!o || o <= p) return 0;
  return Math.round(((o - p) / o) * 100);
};

export default function StoreCarousel() {
  const router = useRouter();
  const { isFavorite, toggle } = useFavorites();
  const { toast } = useToast();
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);

  const count = slides.length;
  const go = useCallback((i) => setIndex(() => (count ? (i + count) % count : 0)), [count]);
  const next = useCallback(() => setIndex((p) => (count ? (p + 1) % count : 0)), [count]);

  useEffect(() => {
    let active = true;

    const toSlides = (res) => {
      const arr = Array.isArray(res) ? res : res?.data || [];
      return arr.map(mapProduct).filter((p) => p && p.image);
    };

    (async () => {
      try {
        let items = toSlides(await productService.list('?limit=8&highlight_tier=diamond'));
        if (!items.length) {
          items = toSlides(await productService.list('?limit=8'));
        }
        if (active) setSlides(items);
      } catch {
        if (active) setSlides([]);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (count < 2) return undefined;
    const t = setInterval(next, 7000);
    return () => clearInterval(t);
  }, [next, count]);

  if (loading) {
    return <div className={`${styles.banner} ${styles.skeleton}`} aria-hidden="true" />;
  }

  if (!count) return null;

  const safeIndex = index % count;
  const slide = slides[safeIndex];
  const pct = discountPct(slide.price, slide.oldPrice);
  const fav = isFavorite(slide.id);

  // Favoritar de verdade (sem navegar). Para o clique não abrir o produto.
  const handleFav = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const nowFav = toggle(slide);
    toast({
      title: nowFav ? '♥ Adicionado aos favoritos' : 'Removido dos favoritos',
      variant: nowFav ? 'success' : 'default',
      duration: 1200,
    });
  };
  // Banner inteiro abre o produto.
  const openProduct = () => router.push(`/produto/${slide.id}`);

  return (
    <div className={styles.banner}>
      <span className={styles.glow} aria-hidden="true" />

      {count > 1 ? (
        <button
          className={`${styles.arrow} ${styles.left}`}
          onClick={() => go(safeIndex - 1)}
          aria-label="Anterior"
        >
          <Icon name="chevron-left" size={22} />
        </button>
      ) : null}

      <article
        className={styles.slide}
        key={slide.id}
        onClick={openProduct}
        role="link"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openProduct()}
        style={{ cursor: 'pointer' }}
      >
        <div className={styles.media}>
          <span className={styles.badge}>
            <Icon name="star" size={14} /> Destaque
          </span>
          <span className={styles.sponsored}>Patrocinado</span>

          <span className={styles.frame}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.cover} src={slide.image} alt={slide.title} />
            {pct > 0 ? <span className={styles.off}>-{pct}%</span> : null}
          </span>
        </div>

        <div className={styles.info}>
          <div className={styles.seller}>
            <Icon name="store" size={15} />
            <span className={styles.sellerName}>{slide.seller}</span>
            {slide.sellerInfo ? (
              <VerifiedSeal seller={slide.sellerInfo} size={15} />
            ) : null}
          </div>

          <h2 className={styles.title}>{slide.title}</h2>

          <div className={styles.tags}>
            {slide.category ? (
              <span className={styles.tag}>{slide.category}</span>
            ) : null}
            <span className={styles.tag}>
              {slide.condition === 'used' ? 'Usado' : 'Novo'}
            </span>
            {slide.freeShipping ? (
              <span className={`${styles.tag} ${styles.ship}`}>
                <Icon name="truck" size={15} /> Frete grátis
              </span>
            ) : null}
          </div>

          <div className={styles.priceBox}>
            {slide.oldPrice ? (
              <div className={styles.priceTop}>
                <span className={styles.old}>{fmtPrice(slide.oldPrice)}</span>
                {pct > 0 ? <span className={styles.offTag}>{pct}% OFF</span> : null}
              </div>
            ) : null}
            <strong className={styles.price}>{fmtPrice(slide.price)}</strong>
          </div>

          <div className={styles.actions}>
            <Link
              href={`/produto/${slide.id}`}
              className={styles.primary}
              onClick={(e) => e.stopPropagation()}
            >
              Ver produto <Icon name="arrow-right" size={18} />
            </Link>
            <button
              type="button"
              className={styles.secondary}
              aria-label={fav ? 'Remover dos favoritos' : 'Favoritar'}
              aria-pressed={fav}
              onClick={handleFav}
              style={fav ? { color: 'var(--destructive, #dc2626)' } : undefined}
            >
              <Icon name="heart" size={19} fill={fav ? 'currentColor' : 'none'} />
              <span className={styles.secondaryLabel}>{fav ? 'Favoritado' : 'Favoritar'}</span>
            </button>
          </div>
        </div>
      </article>

      {count > 1 ? (
        <button className={`${styles.arrow} ${styles.right}`} onClick={next} aria-label="Próximo">
          <Icon name="arrow-right" size={22} />
        </button>
      ) : null}

      {count > 1 ? (
        <div className={styles.dots}>
          {slides.map((s, i) => (
            <button
              key={s.id}
              className={`${styles.dot} ${i === safeIndex ? styles.dotActive : ''}`}
              onClick={() => go(i)}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
