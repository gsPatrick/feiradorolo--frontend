'use client';

import { useState } from 'react';
import Button from '@/components/atoms/Button/Button';
import AddressFormModal from '@/components/organisms/AddressFormModal/AddressFormModal';

const MOCK_ADDRESS = {
  id: '1',
  label: 'Casa',
  recipient: 'Patrick Gomes Siqueira',
  cep: '01310-100',
  street: 'Avenida Paulista',
  number: '1578',
  complement: 'Apto 42',
  neighborhood: 'Bela Vista',
  city: 'São Paulo',
  state: 'SP',
  phone: '(11) 99999-9999',
  isDefault: true,
};

export default function AddressFormDemoPage() {
  const [mode, setMode] = useState(null); // 'add' | 'edit' | null

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '48px 20px' }}>
      <h1 style={{ marginBottom: 8 }}>Demo · AddressFormModal</h1>
      <p style={{ color: 'var(--muted-foreground)', marginBottom: 24 }}>
        Modal global reutilizável para adicionar ou editar endereço (CEP via ViaCEP).
      </p>

      <div style={{ display: 'flex', gap: 12 }}>
        <Button onClick={() => setMode('add')}>Adicionar endereço</Button>
        <Button variant="outline" onClick={() => setMode('edit')}>
          Editar endereço
        </Button>
      </div>

      <AddressFormModal
        open={mode !== null}
        onClose={() => setMode(null)}
        address={mode === 'edit' ? MOCK_ADDRESS : null}
        onSave={(data) => console.log('Endereço salvo:', data)}
      />
    </main>
  );
}
