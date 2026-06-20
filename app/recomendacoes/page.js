'use client';

import { useEffect, useState } from 'react';
import styles from './page.module.css';
import Icon from '@/components/atoms/Icon/Icon';
import ProductCard from '@/components/molecules/ProductCard/ProductCard';
import EmptyState from '@/components/molecules/EmptyState/EmptyState';
import { productService, mapProduct } from '@/lib/api';

function Clock({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
    </svg>
  );
}

function rotate(arr, n) {
  if (!Array.isArray(arr) || arr.length === 0) return [];
  return [...arr.slice(n), ...arr.slice(0, n)].slice(0, 6);
}

const SECTIONS = [
  { key: 'personalized', title: 'Recomendados Para Você', description: 'Baseado no seu histórico de navegação e preferências', icon: 'brain', badge: 'IA Personalizada', offset: 0 },
  { key: 'trending', title: 'Tendências do Momento', description: 'Os produtos mais procurados esta semana', icon: 'trending-up', badge: 'Em Alta', offset: 3 },
  { key: 'time_based', title: 'Baseado no Horário', description: 'Sugestões ideais para este momento do dia', icon: 'clock', badge: 'Inteligente', offset: 6 },
  { key: 'top_rated', title: 'Mais Bem Avaliados', description: 'Produtos com as melhores avaliações nas suas categorias favoritas', icon: 'star', badge: 'Top Qualidade', offset: 9 },
];

export default function RecomendacoesPage() {
  const [all, setAll] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    productService
      .list('?limit=48')
      .then((d) => {
        if (active) setAll((Array.isArray(d) ? d : []).map(mapProduct).filter(Boolean));
      })
      .catch(() => {
        if (active) setAll([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={styles.head}>
          <h1>Recomendações Personalizadas</h1>
          <p>Descubra produtos selecionados especialmente para você com nossa IA avançada</p>
        </div>

        <div className={styles.sections}>
          {SECTIONS.map((s) => {
            const products = rotate(all, s.offset);
            return (
              <section key={s.key} className={styles.card}>
                <div className={styles.cardHead}>
                  <span className={styles.icon}>
                    {s.icon === 'clock' ? <Clock size={22} /> : <Icon name={s.icon} size={22} />}
                  </span>
                  <div>
                    <h2 className={styles.cardTitle}>
                      {s.title}
                      <span className={styles.badge}>{s.badge}</span>
                    </h2>
                    <p className={styles.cardDesc}>{s.description}</p>
                  </div>
                </div>
                {loading ? (
                  <div className={styles.grid}>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <ProductCard key={`${s.key}-skeleton-${i}`} loading />
                    ))}
                  </div>
                ) : products.length === 0 ? (
                  <EmptyState title="Sem recomendações ainda" />
                ) : (
                  <div className={styles.grid}>
                    {products.map((p) => (
                      <ProductCard key={`${s.key}-${p.id}`} product={p} />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
