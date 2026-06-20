'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { cx } from '@/lib/cx';
import { categoryService } from '@/lib/api';
import Icon from '@/components/atoms/Icon/Icon';
import Button from '@/components/atoms/Button/Button';

// Cor pastel do círculo por categoria (réplica do front antigo).
const COLORS = {
  'roupas-femininas': 'pink', 'roupas-masculinas': 'blue', beleza: 'rose', saude: 'green',
  'acessorios-de-moda': 'purple', eletrodomesticos: 'yellow', 'sapatos-masculinos': 'blue',
  'celulares-e-dispositivos': 'cyan', 'viagens-e-bagagens': 'sky', 'bolsas-femininas': 'pink',
  'sapatos-femininos': 'pink', 'bolsas-masculinas': 'gray', relogios: 'amber', audio: 'violet',
  'alimentos-e-bebidas': 'orange', 'animais-domesticos': 'emerald', 'mae-e-bebe': 'pink',
  'moda-infantil': 'orange', 'jogos-e-consoles': 'emerald', 'cameras-e-drones': 'stone',
  'casa-e-decoracao': 'amber', 'esportes-e-atividades-ao-ar-livre': 'red', papelaria: 'indigo',
  'hobbies-e-colecoes': 'emerald', 'livros-e-revistas': 'indigo', 'computadores-e-acessorios': 'blue',
  'pecas-e-acessorios-para-veiculos': 'gray',
};

export default function CategoriasPage() {
  const router = useRouter();
  const [cats, setCats] = useState(null);
  const [error, setError] = useState(false);

  function load() {
    setError(false);
    setCats(null);
    categoryService
      .tree()
      .then((d) => {
        const roots = (Array.isArray(d) ? d : []).filter((c) => !c.parent_id);
        roots.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        setCats(roots);
      })
      .catch(() => setError(true));
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className={styles.page}>
      <div className={styles.head}>
        <div className={styles.headInner}>
          <Icon name="grid" size={32} className={styles.headIcon} />
          <div>
            <h1 className={styles.title}>Todas as Categorias</h1>
            <p className={styles.subtitle}>Descubra produtos incríveis organizados por categoria</p>
          </div>
        </div>
      </div>

      <div className={styles.container}>
        {error ? (
          <div className={styles.state}>
            <h2>Erro ao carregar categorias</h2>
            <p>Não foi possível carregar as categorias. Tente novamente mais tarde.</p>
            <Button onClick={load}>Tentar novamente</Button>
          </div>
        ) : cats === null ? (
          <div className={styles.grid}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className={cx(styles.card, styles.skeleton)}>
                <div className={styles.skCircle} />
                <div className={styles.skLine} />
                <div className={styles.skLineSm} />
              </div>
            ))}
          </div>
        ) : cats.length > 0 ? (
          <div className={styles.grid}>
            {cats.map((category) => {
              const color = COLORS[category.slug] || 'gray';
              return (
                <button
                  key={category.id}
                  className={styles.card}
                  onClick={() => router.push(`/categoria/${category.slug}`)}
                >
                  <span className={cx(styles.circle, styles[`c_${color}`])}>
                    <span className={styles.emoji}>{category.icon || '🛍️'}</span>
                  </span>
                  <h3 className={styles.name}>{category.name}</h3>
                  {category.productCount > 0 && (
                    <span className={styles.badge}>{category.productCount} produtos</span>
                  )}
                  {category.salesCount > 0 && <span className={styles.sales}>{category.salesCount} vendas</span>}
                </button>
              );
            })}
          </div>
        ) : (
          <div className={styles.state}>
            <Icon name="grid" size={64} className={styles.emptyIcon} />
            <h2>Nenhuma categoria encontrada</h2>
            <p>As categorias estão sendo configuradas. Volte em breve!</p>
            <Button leftIcon="arrow-right" onClick={() => router.push('/')}>Voltar para a Home</Button>
          </div>
        )}
      </div>

      {cats && cats.length > 0 && (
        <div className={styles.cta}>
          <div className={styles.ctaInner}>
            <h2>Não encontrou o que procura?</h2>
            <p>Use nossa busca avançada para encontrar produtos específicos</p>
            <Button variant="primary" className={styles.ctaBtn} onClick={() => router.push('/buscar')}>
              Fazer uma busca
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
