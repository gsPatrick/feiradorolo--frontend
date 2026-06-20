'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import Button from '@/components/atoms/Button/Button';
import FormField from '@/components/molecules/FormField/FormField';
import Icon from '@/components/atoms/Icon/Icon';
import { useToast } from '@/components/providers/ToastProvider';

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  function submit(e) {
    e.preventDefault();
    if (!email) {
      toast({ title: 'Informe seu e-mail.', variant: 'destructive' });
      return;
    }
    setSent(true);
    toast({ title: 'Link enviado!', description: 'Confira seu e-mail.', variant: 'success' });
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <span className={styles.icon}><Icon name="lock" size={26} /></span>
        <h1 className={styles.title}>Esqueceu a senha?</h1>
        <p className={styles.sub}>
          Sem problema. Informe o e-mail da sua conta e enviaremos um link para você criar uma nova senha.
        </p>

        {sent ? (
          <div className={styles.success}>
            <Icon name="check" size={22} />
            <p>Enviamos um link de redefinição para <strong>{email}</strong>. Verifique sua caixa de entrada (e o spam).</p>
            <Button variant="outline" href="/" fullWidth>Voltar ao início</Button>
          </div>
        ) : (
          <form className={styles.form} onSubmit={submit}>
            <FormField label="E-mail" type="email" leftIcon="mail" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Button type="submit" variant="primary" fullWidth>Enviar link de redefinição</Button>
          </form>
        )}

        <Link href="/" className={styles.back}><Icon name="arrow-left" size={16} /> Voltar para a Home</Link>
      </div>
    </main>
  );
}
