'use client';

import { useEffect, useState } from 'react';
import VerificationModal from '@/components/organisms/VerificationModal/VerificationModal';
import { verificationService } from '@/lib/api';

/**
 * Convite global de verificação de e-mail. É disparado pelo evento `fdr:registered`
 * (emitido logo após o cadastro). Checa o status e, se o e-mail ainda não está
 * verificado, abre o VerificationModal no canal 'email' convidando a confirmar.
 */
export default function EmailVerifyInvite() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onRegistered() {
      // pequena espera para o token recém-criado estar disponível
      setTimeout(() => {
        verificationService
          .status()
          .then((s) => { if (!(s && s.email_verified)) setOpen(true); })
          .catch(() => {});
      }, 400);
    }
    window.addEventListener('fdr:registered', onRegistered);
    return () => window.removeEventListener('fdr:registered', onRegistered);
  }, []);

  return (
    <VerificationModal
      open={open}
      channel="email"
      onClose={() => setOpen(false)}
      onVerified={() => setOpen(false)}
    />
  );
}
