'use client';

import { useEffect, useState } from 'react';
import styles from './page.module.css';
import DashboardLayout from '@/components/templates/DashboardLayout/DashboardLayout';
import ProductCard from '@/components/molecules/ProductCard/ProductCard';
import EmptyState from '@/components/molecules/EmptyState/EmptyState';
import Button from '@/components/atoms/Button/Button';
import { favoriteService, mapProduct } from '@/lib/api';
import { useAuth } from '@/components/providers/AuthProvider';

export default function FavoritosPage() {
  const { openAuth } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [needLogin, setNeedLogin] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    favoriteService
      .listMine()
      .then((data) => {
        if (!active) return;
        setProducts((Array.isArray(data) ? data : []).map(mapProduct).filter(Boolean));
      })
      .catch((err) => {
        if (!active) return;
        setProducts([]);
        if (err && err.status === 401) setNeedLogin(true);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return (
    <DashboardLayout active="favoritos" title="Favoritos">
      {loading ? (
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <ProductCard key={`sk-${i}`} loading />
          ))}
        </div>
      ) : needLogin ? (
        <EmptyState
          icon="heart"
          title="Entre para ver seus favoritos"
          description="Faça login para salvar e acessar os produtos que você curtiu."
          action={<Button variant="primary" onClick={() => openAuth('login')} rightIcon="arrow-right">Entrar</Button>}
        />
      ) : products.length === 0 ? (
        <EmptyState
          icon="heart"
          title="Você ainda não tem favoritos"
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
