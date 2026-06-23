'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProductListing from '@/components/organisms/ProductListing/ProductListing';
import { productService, mapProduct } from '@/lib/api';
import { categoryRoute } from '@/lib/searchRoute';

export default function CategoriaPage() {
  const { slug } = useParams();
  const router = useRouter();

  // Categorias de verticais (Pneus, Imóveis, Veículos...) redirecionam para a
  // página dedicada da vertical.
  useEffect(() => {
    if (!slug) return;
    const route = categoryRoute(slug);
    if (route && !route.startsWith('/categoria/')) router.replace(route);
  }, [slug, router]);
  const label = (slug || '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    productService
      .list('?slug=' + encodeURIComponent(slug) + '&limit=48')
      .then((d) => setProducts((Array.isArray(d) ? d : []).map(mapProduct).filter(Boolean)))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <main>
      <ProductListing
        title={label}
        breadcrumb={[
          { label: 'Início', href: '/' },
          { label: 'Categorias', href: '/categorias' },
          { label },
        ]}
        products={products}
        loading={loading}
      />
    </main>
  );
}
