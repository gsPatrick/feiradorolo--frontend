'use client';

import { useEffect, useState } from 'react';
import styles from './page.module.css';
import ProductCard from '@/components/molecules/ProductCard/ProductCard';
import EmptyState from '@/components/molecules/EmptyState/EmptyState';
import Button from '@/components/atoms/Button/Button';
import { getRecent, clearRecent } from '@/lib/history';

export default function HistoricoPage() {
  const [products, setProducts] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setProducts(getRecent());
    setReady(true);
  }, []);

  function handleClear() {
    clearRecent();
    setProducts([]);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Vistos recentemente</h1>
          <p className={styles.subtitle}>Reveja os produtos que você visitou.</p>
        </div>
        {ready && products.length > 0 && (
          <Button variant="outline" size="sm" leftIcon="trash" onClick={handleClear}>
            Limpar histórico
          </Button>
        )}
      </header>

      {!ready ? null : products.length === 0 ? (
        <EmptyState
          icon="eye"
          title="Você ainda não visitou nenhum produto"
          description="Os produtos que você abrir aparecerão aqui para acesso rápido."
          action={
            <Button variant="primary" href="/produtos" rightIcon="arrow-right">
              Explorar produtos
            </Button>
          }
        />
      ) : (
        <>
          <p className={styles.count}>{products.length} produto(s) visitado(s)</p>
          <div className={styles.grid}>
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </>
      )}
    </main>
  );
}
