'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';
import { cx } from '@/lib/cx';
import Button from '@/components/atoms/Button/Button';
import Input from '@/components/atoms/Input/Input';
import Icon from '@/components/atoms/Icon/Icon';
import { useToast } from '@/components/providers/ToastProvider';

const RULES = [
  { key: 'len', label: 'Pelo menos 8 caracteres', test: (s) => s.length >= 8 },
  { key: 'upper', label: '1 letra maiúscula', test: (s) => /[A-Z]/.test(s) },
  { key: 'lower', label: '1 letra minúscula', test: (s) => /[a-z]/.test(s) },
  { key: 'num', label: '1 número', test: (s) => /[0-9]/.test(s) },
];

export default function ResetPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [token, setToken] = useState('');
  const [show, setShow] = useState(false);
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');

  useEffect(() => {
    try {
      setToken(new URLSearchParams(window.location.search).get('token') || '');
    } catch {}
  }, []);

  const checks = useMemo(() => RULES.map((r) => ({ ...r, ok: r.test(pwd) })), [pwd]);
  const allOk = checks.every((c) => c.ok);
  const match = pwd.length > 0 && pwd === confirm;
  const valid = allOk && match;

  function submit(e) {
    e.preventDefault();
    if (!valid) return;
    toast({ title: 'Senha redefinida!', description: 'Você já pode entrar com a nova senha.', variant: 'success', duration: 2500 });
    setTimeout(() => router.push('/'), 800);
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <span className={styles.icon}><Icon name="lock" size={26} /></span>
        <h1 className={styles.title}>Redefinir senha</h1>
        <p className={styles.sub}>Crie uma nova senha para a sua conta.</p>

        {!token && <p className={styles.warn}>⚠️ Link inválido ou sem token. Solicite um novo em "Esqueci a senha".</p>}

        <form className={styles.form} onSubmit={submit}>
          <div>
            <label className={styles.label}>Nova senha</label>
            <Input
              type={show ? 'text' : 'password'}
              placeholder="Digite a nova senha"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              leftIcon="lock"
              rightIcon={show ? 'eye' : 'eye'}
              onRightIconClick={() => setShow((v) => !v)}
            />
          </div>

          <ul className={styles.checklist}>
            {checks.map((c) => (
              <li key={c.key} className={cx(styles.rule, c.ok && styles.ruleOk)}>
                <span className={styles.ruleDot}>{c.ok ? <Icon name="check" size={12} strokeWidth={3} /> : ''}</span>
                {c.label}
              </li>
            ))}
          </ul>

          <div>
            <label className={styles.label}>Confirmar senha</label>
            <Input
              type={show ? 'text' : 'password'}
              placeholder="Repita a senha"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              leftIcon="lock"
              invalid={confirm.length > 0 && !match}
            />
            {confirm.length > 0 && !match && <span className={styles.err}>As senhas não coincidem.</span>}
          </div>

          <Button type="submit" variant="primary" fullWidth disabled={!valid}>Redefinir senha</Button>
        </form>

        <Link href="/" className={styles.back}><Icon name="arrow-left" size={16} /> Voltar para a Home</Link>
      </div>
    </main>
  );
}
