'use client';

import { useState } from 'react';
import Button from '@/components/atoms/Button/Button';
import ReviewForm from '@/components/organisms/ReviewForm/ReviewForm';

export default function ReviewFormDemoPage() {
  const [open, setOpen] = useState(false);

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '48px 20px' }}>
      <h1 style={{ marginBottom: 8 }}>Demo · ReviewForm</h1>
      <p style={{ color: 'var(--muted-foreground)', marginBottom: 24 }}>
        Modal global de avaliação de produto (estrelas, título, comentário).
      </p>

      <Button onClick={() => setOpen(true)}>Avaliar produto</Button>

      <ReviewForm
        open={open}
        onClose={() => setOpen(false)}
        productName="Bicicleta Aro 29 Seminova"
        onSubmit={(data) => console.log('Review submetido:', data)}
      />
    </main>
  );
}
