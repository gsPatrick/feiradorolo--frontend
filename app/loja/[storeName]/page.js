'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import styles from './page.module.css';
import Button from '@/components/atoms/Button/Button';
import Icon from '@/components/atoms/Icon/Icon';
import ProductCard from '@/components/molecules/ProductCard/ProductCard';
import { cx } from '@/lib/cx';
import { productService, mapProduct } from '@/lib/api';

const AVATAR_KEYS = ['blue', 'green', 'amber', 'red', 'violet', 'pink'];

function Calendar({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
function CheckCircle({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.5 2.5 4.5-4.5" />
    </svg>
  );
}

export default function LojaPage() {
  const params = useParams();
  const router = useRouter();
  const rawStoreName = params.storeName || '';
  const storeName = decodeURIComponent(rawStoreName);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storeName);

  useEffect(() => {
    setLoading(true);
    // Por seller_id (link do produto) usa o filtro da API; por nome (slug) filtra client-side.
    productService
      .list(isUuid ? `?seller_id=${storeName}&limit=48` : '?limit=48')
      .then((d) => {
        const all = (Array.isArray(d) ? d : []).map(mapProduct).filter(Boolean);
        if (isUuid) {
          setProducts(all);
        } else {
          const slug = (s) =>
            String(s).toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
          setProducts(all.filter((p) => slug(p.seller) === slug(storeName)));
        }
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [storeName, isUuid]);

  // Nome real do vendedor (vindo dos produtos) quando buscamos por id; senão deriva do slug.
  const name = (isUuid && products[0] && products[0].seller) || (isUuid ? 'Loja' : storeName.replace(/-/g, ' '));

  const colorKey = AVATAR_KEYS[(name.length || 0) % AVATAR_KEYS.length];
  const initials = name.slice(0, 2).toUpperCase();
  const rating = (4.5 + (name.length % 5) / 10).toFixed(1);
  const totalSales = 80 + (name.length * 17) % 400;

  return (
    <main className={styles.page}>
      <div className={styles.topbar}>
        <div className={styles.topInner}>
          <Button variant="ghost" size="sm" leftIcon="arrow-left" onClick={() => router.back()}>Voltar</Button>
        </div>
      </div>

      <div className={styles.container}>
        {/* Cabeçalho da loja */}
        <div className={styles.storeHead}>
          <div className={cx(styles.avatar, styles[`av_${colorKey}`])}>{initials}</div>
          <div className={styles.storeInfo}>
            <div className={styles.storeName}>
              <h1>{name}</h1>
              <span className={styles.verified}><CheckCircle size={20} /></span>
            </div>
            <p className={styles.storeDesc}>
              Loja oficial no Feira do Rolo. Produtos selecionados, entrega rápida e atendimento de qualidade.
            </p>
            <div className={styles.stats}>
              <span className={styles.stat}>
                <Icon name="star" size={16} className={styles.starIcon} />
                <strong>{rating}</strong> <span className={styles.muted}>({totalSales} avaliações)</span>
              </span>
              <span className={styles.stat}><Icon name="map-pin" size={16} /> São Paulo, SP</span>
              <span className={styles.stat}><Calendar size={16} /> Desde 2023</span>
            </div>
          </div>
        </div>

        {/* Produtos */}
        <div className={styles.productsHead}>
          <h2>Produtos</h2>
          <p>{loading ? 'Carregando…' : `${products.length} itens disponíveis`}</p>
        </div>

        {loading ? (
          <div className={styles.grid}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={styles.cardWrap}>
                <ProductCard loading />
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className={styles.grid}>
            {products.map((p) => (
              <div key={p.id} className={styles.cardWrap}>
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <Icon name="user" size={48} className={styles.emptyIcon} />
            <p>Esta loja ainda não possui produtos cadastrados.</p>
          </div>
        )}
      </div>
    </main>
  );
}
