'use client';

import { useEffect, useState } from 'react';
import ProductListing from '@/components/organisms/ProductListing/ProductListing';
import { productService, mapProduct } from '@/lib/api';

export default function ProdutosPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    productService
      .list('?limit=48')
      .then((data) => {
        if (!active) return;
        setProducts((Array.isArray(data) ? data : []).map(mapProduct).filter(Boolean));
      })
      .catch(() => active && setProducts([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  return (
    <main>
      <ProductListing
        title="Todos os produtos"
        breadcrumb={[{ label: 'Início', href: '/' }, { label: 'Produtos' }]}
        products={products}
        loading={loading}
      />
    </main>
  );
}
