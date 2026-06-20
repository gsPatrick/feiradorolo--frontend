'use client';

import { useState } from 'react';
import ProductRatingModal from '@/components/organisms/ProductRatingModal/ProductRatingModal';
import Button from '@/components/atoms/Button/Button';

const MOCK_ORDER = {
  id: 'ORD-2026-00091827',
  product: {
    title: 'Tênis de Corrida Masculino - Tam. 42',
    image:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&h=200&fit=crop',
  },
};

export default function ProductRatingDemoPage() {
  const [open, setOpen] = useState(false);

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '40px',
      }}
    >
      <div style={{ textAlign: 'center', display: 'grid', gap: 16 }}>
        <h1 style={{ fontSize: '1.5rem', color: 'var(--foreground)' }}>
          Demo: ProductRatingModal
        </h1>
        <p style={{ color: 'var(--muted-foreground)' }}>
          Avalie o produto comprado com estrelas, comentário e fotos.
        </p>
        <Button onClick={() => setOpen(true)} leftIcon="star">
          Avaliar Produto
        </Button>
      </div>

      <ProductRatingModal
        open={open}
        onClose={() => setOpen(false)}
        order={MOCK_ORDER}
        onSubmit={(data) => console.log('Avaliação enviada:', data)}
      />
    </main>
  );
}
