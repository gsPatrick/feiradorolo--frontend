'use client';

import { useState } from 'react';
import Button from '@/components/atoms/Button/Button';
import EmailVerificationModal from '@/components/organisms/EmailVerificationModal/EmailVerificationModal';

export default function EmailVerificationDemoPage() {
  const [open, setOpen] = useState(false);

  // Simulação sem backend: aceita qualquer código de 6 dígitos.
  async function handleVerify(code) {
    await new Promise((r) => setTimeout(r, 600));
    return /^\d{6}$/.test(code);
  }

  async function handleResend() {
    await new Promise((r) => setTimeout(r, 600));
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '40px',
      }}
    >
      <Button onClick={() => setOpen(true)}>Verificar e-mail</Button>

      <EmailVerificationModal
        open={open}
        onClose={() => setOpen(false)}
        email="usuario@feiradorolo.com"
        onVerify={handleVerify}
        onResend={handleResend}
      />
    </main>
  );
}
