'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import styles from './StoreCarousel.module.css';
import Icon from '../../atoms/Icon/Icon';
import { productService, mapProduct } from '@/lib/api';

const GRADS = ['g1', 'g2', 'g3'];

const fmtPrice = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function StoreCarousel() {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);

  const count = slides.length;
  const go = useCallback((i) => setIndex((p) => (count ? (i + count) % count : 0)), [count]);
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
  const grad = GRADS[safeIndex % GRADS.length];

  return (
    <div className={`${styles.banner} ${styles[grad]}`}>
      <button className={`${styles.arrow} ${styles.left}`} onClick={() => go(safeIndex - 1)} aria-label="Anterior">
        <Icon name="chevron-left" size={22} />
      </button>

      <div className={styles.slide} key={safeIndex}>
        <div className={styles.store}>
          <span className={styles.logo}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.cover} src={slide.image} alt={slide.title} />
          </span>
          <div className={styles.storeMeta}>
            <h2 className={styles.name}>{slide.title}</h2>
            <span className={styles.tag}>{slide.seller}</span>
          </div>
        </div>

        <div className={styles.stats}>
          <div className={styles.stat}>
            <strong>{fmtPrice(slide.price)}</strong>
            <span>{slide.oldPrice ? `de ${fmtPrice(slide.oldPrice)}` : 'à vista'}</span>
          </div>
          {slide.category ? (
            <div className={styles.stat}>
              <strong>{slide.category}</strong>
              <span>categoria</span>
            </div>
          ) : null}
          {slide.freeShipping ? (
            <div className={styles.stat}>
              <strong>Frete</strong>
              <span>grátis</span>
            </div>
          ) : (
            <div className={styles.stat}>
              <strong>{slide.condition === 'used' ? 'Usado' : 'Novo'}</strong>
              <span>condição</span>
            </div>
          )}
        </div>

        <div className={styles.lines}>
          <p>Destaque da Feira do Rolo — confira agora!</p>
        </div>

        <div className={styles.actions}>
          <Link href={`/produto/${slide.id}`} className={styles.primary}>
            <Icon name="store" size={18} /> Ver Produto
          </Link>
          <Link href="/favoritos" className={styles.secondary}>
            <Icon name="heart" size={18} /> Favoritar
          </Link>
        </div>
      </div>

      <button className={`${styles.arrow} ${styles.right}`} onClick={next} aria-label="Próximo">
        <Icon name="arrow-right" size={22} />
      </button>

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
    </div>
  );
}
