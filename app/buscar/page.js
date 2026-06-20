'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ProductListing from '@/components/organisms/ProductListing/ProductListing';
import EmptyState from '@/components/molecules/EmptyState/EmptyState';
import { productService, mapProduct } from '@/lib/api';

function BuscarContent() {
  const searchParams = useSearchParams();
  const q = (searchParams.get('q') || '').trim();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    productService
      .list('?search=' + encodeURIComponent(q || '') + '&limit=48')
      .then((data) => {
        if (!active) return;
        setProducts((Array.isArray(data) ? data : []).map(mapProduct).filter(Boolean));
      })
      .catch(() => active && setProducts([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [q]);

  const title = q ? `Resultados para "${q}"` : 'Buscar produtos';

  if (!loading && products.length === 0) {
    return (
      <EmptyState
        icon="search"
        title="Nenhum resultado encontrado"
        description={q ? `Nenhum resultado para "${q}". Tente outros termos.` : 'Digite um termo para buscar produtos.'}
      />
    );
  }

  return (
    <ProductListing
      title={title}
      breadcrumb={[{ label: 'Início', href: '/' }, { label: 'Busca' }]}
      products={products}
      loading={loading}
    />
  );
}

export default function BuscarPage() {
  return (
    <main>
      <Suspense fallback={null}>
        <BuscarContent />
      </Suspense>
    </main>
  );
}
