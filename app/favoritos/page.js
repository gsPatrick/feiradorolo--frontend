'use client';

import styles from './page.module.css';
import DashboardLayout from '@/components/templates/DashboardLayout/DashboardLayout';
import ProductCard from '@/components/molecules/ProductCard/ProductCard';
import EmptyState from '@/components/molecules/EmptyState/EmptyState';
import Button from '@/components/atoms/Button/Button';
import { useFavorites } from '@/components/providers/FavoritesProvider';

export default function FavoritosPage() {
  const { favorites, hydrated } = useFavorites();
  const products = favorites;

  return (
    <DashboardLayout active="favoritos" title="Favoritos">
      {!hydrated ? (
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <ProductCard key={`sk-${i}`} loading />
          ))}
        </div>
      ) : products.length === 0 ? (
        <EmptyState
          icon="heart"
          title="Nenhum favorito ainda"
          description="Salve produtos que você gosta para encontrá-los facilmente depois."
          action={<Button variant="primary" href="/produtos" rightIcon="arrow-right">Descobrir produtos</Button>}
        />
      ) : (
        <>
          <p className={styles.count}>{products.length} produto(s) favoritado(s)</p>
          <div className={styles.grid}>
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
