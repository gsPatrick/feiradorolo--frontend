'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import styles from './StoreCarousel.module.css';
import Icon from '../../atoms/Icon/Icon';

const SLIDES = [
  {
    grad: 'g1',
    emoji: '🏪',
    name: 'TechStore Premium',
    tag: 'Loja Oficial · 15 anos no mercado',
    stats: [
      { v: '50%', l: 'de desconto' },
      { v: '24h', l: 'entrega rápida' },
      { v: '5★', l: 'avaliação' },
    ],
    lines: ['📱 iPhones, MacBooks e AirPods com os melhores preços!', '⚡ Produtos originais com garantia estendida'],
  },
  {
    grad: 'g2',
    emoji: '👟',
    name: 'MegaSports Oficial',
    tag: 'Loja Oficial · 10 anos no mercado',
    stats: [
      { v: '40%', l: 'de desconto' },
      { v: 'Frete', l: 'grátis Brasil' },
      { v: '4.9★', l: 'avaliação' },
    ],
    lines: ['👟 Tênis e acessórios das maiores marcas!', '🔥 Lançamentos toda semana com cupom exclusivo'],
  },
  {
    grad: 'g3',
    emoji: '🏠',
    name: 'Casa & Conforto',
    tag: 'Loja Oficial · 8 anos no mercado',
    stats: [
      { v: '60%', l: 'de desconto' },
      { v: '12x', l: 'sem juros' },
      { v: '4.8★', l: 'avaliação' },
    ],
    lines: ['🛋️ Móveis e decoração para transformar sua casa!', '🚚 Montagem inclusa nas capitais'],
  },
];

export default function StoreCarousel() {
  const [index, setIndex] = useState(0);
  const count = SLIDES.length;
  const go = useCallback((i) => setIndex((i + count) % count), [count]);
  const next = useCallback(() => setIndex((p) => (p + 1) % count), [count]);

  useEffect(() => {
    const t = setInterval(next, 7000);
    return () => clearInterval(t);
  }, [next]);

  const slide = SLIDES[index];

  return (
    <div className={`${styles.banner} ${styles[slide.grad]}`}>
      <button className={`${styles.arrow} ${styles.left}`} onClick={() => go(index - 1)} aria-label="Anterior">
        <Icon name="chevron-left" size={22} />
      </button>

      <div className={styles.slide} key={index}>
        <div className={styles.store}>
          <span className={styles.logo}>{slide.emoji}</span>
          <div className={styles.storeMeta}>
            <h2 className={styles.name}>{slide.name}</h2>
            <span className={styles.tag}>{slide.tag}</span>
          </div>
        </div>

        <div className={styles.stats}>
          {slide.stats.map((s) => (
            <div key={s.l} className={styles.stat}>
              <strong>{s.v}</strong>
              <span>{s.l}</span>
            </div>
          ))}
        </div>

        <div className={styles.lines}>
          {slide.lines.map((l) => (
            <p key={l}>{l}</p>
          ))}
        </div>

        <div className={styles.actions}>
          <Link href="/loja" className={styles.primary}>
            <Icon name="store" size={18} /> Ver Loja
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
        {SLIDES.map((_, i) => (
          <button
            key={i}
            className={`${styles.dot} ${i === index ? styles.dotActive : ''}`}
            onClick={() => go(i)}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
