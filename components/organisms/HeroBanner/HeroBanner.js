'use client';

import { useEffect, useState, useCallback } from 'react';
import styles from './HeroBanner.module.css';
import { cx } from '@/lib/cx';
import Icon from '../../atoms/Icon/Icon';
import { useSiteConfig } from '../../providers/SiteConfigProvider';

// Fallback (usado enquanto a API não responde / se estiver vazia).
const SLIDES = [
  {
    grad: 'g1', title: 'Baixe nosso App', titleIcon: 'smartphone',
    sub: 'Compre com mais praticidade e ganhe ofertas exclusivas', cta: 'Baixar Agora', ctaIcon: 'download',
    href: '/app', side: { top: 'GRÁTIS', word: 'App', bottom: 'DISPONÍVEL' },
  },
  {
    grad: 'g2', title: 'Frete grátis a partir de R$ 79', titleIcon: 'truck',
    sub: 'Em milhares de produtos selecionados para você', cta: 'Ver ofertas', ctaIcon: 'arrow-right',
    href: '/promocoes', side: { top: 'ATÉ', word: 'Frete', bottom: 'GRÁTIS' },
  },
  {
    grad: 'g3', title: 'Cupons toda semana', titleIcon: 'tag',
    sub: 'Descontos exclusivos para você economizar de verdade', cta: 'Pegar cupons', ctaIcon: 'arrow-right',
    href: '/cupons', side: { top: 'NOVOS', word: 'Cupons', bottom: 'TODA SEMANA' },
  },
];

/** Converte um banner da API no formato de slide. */
function toSlide(b) {
  const content = b.content || {};
  return {
    bg: b.background_gradient || b.background_color || null,
    image: b.background_type === 'image' && b.image_url ? b.image_url : null,
    textColor: b.text_color || null,
    title: b.title,
    titleIcon: b.icon,
    sub: b.subtitle,
    cta: b.cta_text,
    ctaIcon: content.cta_icon || 'arrow-right',
    href: b.cta_url || b.link_url || '#',
    side: content.side || null,
  };
}

export default function HeroBanner() {
  const { getBanners } = useSiteConfig();
  const apiBanners = getBanners('home_hero', []);
  const slides = apiBanners.length ? apiBanners.map(toSlide) : SLIDES;

  const [index, setIndex] = useState(0);
  const count = slides.length;
  const go = useCallback((i) => setIndex((i + count) % count), [count]);
  const next = useCallback(() => setIndex((p) => (p + 1) % count), [count]);

  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  useEffect(() => {
    if (count <= 1) return undefined;
    const t = setInterval(next, 6000);
    return () => clearInterval(t);
  }, [next, count]);

  const slide = slides[index] || slides[0];

  return (
    <div
      className={cx(styles.banner, slide.grad && styles[slide.grad])}
      style={
        slide.image
          ? { backgroundImage: `url(${slide.image})`, backgroundSize: 'cover', backgroundPosition: 'center', color: slide.textColor || '#fff' }
          : slide.bg
          ? { background: slide.bg, color: slide.textColor || '#fff' }
          : undefined
      }
    >
      <button className={`${styles.arrow} ${styles.left}`} onClick={() => go(index - 1)} aria-label="Anterior">
        <Icon name="chevron-left" size={22} />
      </button>

      <div className={styles.content} key={index}>
        <h2 className={styles.title}>
          {slide.title} {slide.titleIcon && <Icon name={slide.titleIcon} size={38} className={styles.titleIcon} />}
        </h2>
        <p className={styles.sub}>{slide.sub}</p>
        <a href={slide.href} className={styles.cta}>
          {slide.cta} {slide.ctaIcon && <Icon name={slide.ctaIcon} size={18} />}
        </a>
      </div>

      {slide.side && (
        <div className={styles.side} key={`side-${index}`}>
          <span className={`${styles.pill} ${styles.pillTop}`}>{slide.side.top}</span>
          <span className={styles.word}>{slide.side.word}</span>
          <span className={styles.pill}>{slide.side.bottom}</span>
        </div>
      )}

      <span className={`${styles.bubble} ${styles.b1}`} />
      <span className={`${styles.bubble} ${styles.b2}`} />

      <button className={`${styles.arrow} ${styles.right}`} onClick={next} aria-label="Próximo">
        <Icon name="arrow-right" size={22} />
      </button>

      <div className={styles.dots}>
        {slides.map((_, i) => (
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
