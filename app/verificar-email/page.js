'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import styles from './page.module.css';
import Button from '@/components/atoms/Button/Button';
import Icon from '@/components/atoms/Icon/Icon';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { verificationService, ApiError } from '@/lib/api';

function VerifyEmailInner() {
  const params = useSearchParams();
  const code = (params.get('code') || '').trim();
  const { user, authReady, openAuth } = useAuth();
  const { toast } = useToast();

  // idle | confirming | success | error | nocode | resent
  const [state, setState] = useState('idle');
  const [message, setMessage] = useState('');

  // Confirma automaticamente quando logado e há código.
  useEffect(() => {
    if (!authReady) return;
    if (!user) return; // aguarda login
    if (!code) { setState('nocode'); return; }
    if (state !== 'idle') return;

    setState('confirming');
    verificationService
      .confirmEmail(code)
      .then(() => {
        setState('success');
        toast({ title: 'E-mail confirmado!', variant: 'success', duration: 2500 });
      })
      .catch((e) => {
        setState('error');
        setMessage(
          e instanceof ApiError && e.status === 400
            ? 'Este link é inválido ou expirou.'
            : (e && e.message) || 'Não foi possível confirmar seu e-mail.'
        );
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, user, code, state]);

  async function resend() {
    try {
      await verificationService.requestEmail();
      toast({ title: 'Enviamos um novo código!', description: 'Confira seu e-mail.', variant: 'success', duration: 2500 });
    } catch (e) {
      const msg = e instanceof ApiError && e.status === 429
        ? 'Aguarde alguns instantes antes de pedir um novo código.'
        : (e && e.message) || 'Não foi possível reenviar agora.';
      toast({ title: msg, variant: 'destructive', duration: 2800 });
    }
  }

  // Não logado.
  if (authReady && !user) {
    return (
      <Card icon="lock" tone="brand" title="Faça login para confirmar"
        sub="Você precisa estar logado na sua conta para verificar o e-mail.">
        <Button variant="primary" fullWidth onClick={() => openAuth('login')}>Entrar</Button>
        <Link href="/" className={styles.back}><Icon name="arrow-left" size={16} /> Voltar para a Home</Link>
      </Card>
    );
  }

  if (state === 'success') {
    return (
      <Card icon="check" tone="success" title="E-mail confirmado! ✓"
        sub="Tudo certo. Seu e-mail foi verificado com sucesso.">
        <Button variant="primary" fullWidth href="/minha-conta">Ir para Minha Conta</Button>
        <Link href="/" className={styles.back}><Icon name="arrow-left" size={16} /> Voltar para a Home</Link>
      </Card>
    );
  }

  if (state === 'error' || state === 'nocode') {
    return (
      <Card icon="mail" tone="brand" title="Não foi possível confirmar"
        sub={state === 'nocode' ? 'O link de verificação está incompleto ou sem código.' : message}>
        <Button variant="primary" fullWidth onClick={resend}>Reenviar código</Button>
        <Button variant="outline" fullWidth href="/minha-conta">Ir para Minha Conta</Button>
        <Link href="/" className={styles.back}><Icon name="arrow-left" size={16} /> Voltar para a Home</Link>
      </Card>
    );
  }

  // idle / confirming (loading)
  return (
    <Card icon="mail" tone="brand" title="Confirmando seu e-mail…"
      sub="Aguarde um instante enquanto verificamos seu e-mail.">
      <div className={styles.loadingDots}><span /><span /><span /></div>
    </Card>
  );
}

function Card({ icon, tone, title, sub, children }) {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <span className={`${styles.icon} ${styles[tone] || ''}`}><Icon name={icon} size={26} /></span>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.sub}>{sub}</p>
        <div className={styles.actions}>{children}</div>
      </div>
    </main>
  );
}

export default function VerificarEmailPage() {
  return (
    <Suspense fallback={<main className={styles.page} />}>
      <VerifyEmailInner />
    </Suspense>
  );
}
