'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './AuthForm.module.css';
import { cx } from '@/lib/cx';
import FormField from '../../molecules/FormField/FormField';
import Button from '../../atoms/Button/Button';
import Icon from '../../atoms/Icon/Icon';
import { authService, setToken } from '@/lib/api';
import { useToast } from '../../providers/ToastProvider';

const TEST_ACCOUNTS = [
  { label: '👤 Comprador', email: 'comprador@teste.com', role: 'individual' },
  { label: '🏪 Vendedor', email: 'usuario2@teste.com', role: 'seller' },
  { label: '🛡️ Admin', email: 'admin@teste.com', role: 'admin' },
];

const reqs = (p) => ({
  len: p.length >= 8,
  upper: /[A-Z]/.test(p),
  lower: /[a-z]/.test(p),
  num: /[0-9]/.test(p),
});

export default function AuthForm({ initialMode = 'login', showTestAccounts = false, accent = 'blue' }) {
  const router = useRouter();
  const { toast } = useToast();
  const [mode, setMode] = useState(initialMode);
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [accountType, setAccountType] = useState('individual');
  const [f, setF] = useState({ firstName: '', lastName: '', phone: '', document: '', email: '', password: '', confirm: '' });

  const isLogin = mode === 'login';
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const r = reqs(f.password);

  function fillTest(email, role) {
    setF((s) => ({ ...s, email, password: '123456' }));
    try {
      window.localStorage.setItem('fdr.role', role);
    } catch (e) {}
  }

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const res = await authService.login(f.email, f.password);
        if (res?.token) setToken(res.token);
      } else {
        if (f.password !== f.confirm) throw new Error('As senhas não coincidem.');
        const res = await authService.register({
          name: `${f.firstName} ${f.lastName}`.trim(),
          email: f.email,
          password: f.password,
          phone: f.phone,
          person_type: accountType,
          cpf: accountType === 'individual' ? f.document : undefined,
          cnpj: accountType === 'company' ? f.document : undefined,
        });
        if (res?.token) setToken(res.token);
      }
      toast({ title: isLogin ? 'Bem-vindo à Feira do Rolo!' : 'Conta criada com sucesso!', variant: 'success', duration: 1500 });
      router.push('/minha-conta');
    } catch (err) {
      // Backend indisponível (modo demo): entra mesmo assim e vai para a conta.
      if (err && (err.status === 0 || err.code === 'NETWORK')) {
        toast({ title: 'Entrando (modo demo)…', variant: 'success', duration: 1200 });
        router.push('/minha-conta');
      } else {
        toast({ title: err.message || 'Não foi possível concluir.', variant: 'destructive', duration: 2500 });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.head}>
        <h1 className={styles.title}>{isLogin ? 'Entrar' : 'Criar sua conta'}</h1>
        <p className={styles.subtitle}>
          {isLogin ? 'Acesse para comprar e vender no maior rolo do Brasil.' : 'Leva menos de 1 minuto. É grátis!'}
        </p>
      </div>

      {!isLogin && (
        <>
          <div className={styles.row2}>
            <FormField label="Nome" placeholder="João" required value={f.firstName} onChange={set('firstName')} />
            <FormField label="Sobrenome" placeholder="Silva" required value={f.lastName} onChange={set('lastName')} />
          </div>
          <FormField label="Telefone" placeholder="(11) 99999-9999" leftIcon="user" value={f.phone} onChange={set('phone')} />
          <div className={styles.field}>
            <span className={styles.label}>Tipo de conta</span>
            <div className={styles.segmented}>
              <button type="button" className={cx(accountType === 'individual' && styles.segActive)} onClick={() => setAccountType('individual')}>
                Pessoa Física
              </button>
              <button type="button" className={cx(accountType === 'company' && styles.segActive)} onClick={() => setAccountType('company')}>
                Empresa
              </button>
            </div>
          </div>
          <FormField
            label={accountType === 'individual' ? 'CPF' : 'CNPJ'}
            placeholder={accountType === 'individual' ? '000.000.000-00' : '00.000.000/0000-00'}
            required
            value={f.document}
            onChange={set('document')}
          />
        </>
      )}

      <FormField
        label={isLogin ? 'E-mail, telefone ou CPF' : 'E-mail'}
        type="email"
        placeholder="voce@email.com"
        leftIcon="mail"
        required
        value={f.email}
        onChange={set('email')}
      />

      <FormField
        label="Senha"
        type={showPwd ? 'text' : 'password'}
        placeholder="••••••••"
        leftIcon="lock"
        rightIcon="eye"
        onRightIconClick={() => setShowPwd((v) => !v)}
        required
        value={f.password}
        onChange={set('password')}
      />

      {!isLogin && (
        <>
          <FormField
            label="Confirmar senha"
            type={showPwd ? 'text' : 'password'}
            placeholder="••••••••"
            leftIcon="lock"
            required
            value={f.confirm}
            onChange={set('confirm')}
          />
          <ul className={styles.reqs}>
            {[
              ['len', 'Mínimo 8 caracteres'],
              ['upper', '1 letra maiúscula'],
              ['lower', '1 letra minúscula'],
              ['num', '1 número'],
            ].map(([k, l]) => (
              <li key={k} className={cx(r[k] && styles.reqOk)}>
                <Icon name="check" size={13} /> {l}
              </li>
            ))}
          </ul>
        </>
      )}

      {isLogin && (
        <Link href="/forgot-password" className={styles.forgot}>
          Esqueceu a senha?
        </Link>
      )}

      <Button type="submit" variant="primary" size="lg" fullWidth loading={loading} className={cx(accent === 'gold' && styles.gold)}>
        {isLogin ? 'Entrar' : 'Criar conta'}
      </Button>

      <div className={styles.divider}>
        <span>ou continue com</span>
      </div>
      <div className={styles.social}>
        <button type="button" className={styles.socialBtn}>
          <span className={styles.gmark}>G</span> Google
        </button>
        <button type="button" className={styles.socialBtn}>
          <Icon name="facebook" size={18} /> Facebook
        </button>
      </div>

      {showTestAccounts && (
        <div className={styles.testBox}>
          <span className={styles.testTitle}>Contas de teste · senha 123456</span>
          <div className={styles.testGrid}>
            {TEST_ACCOUNTS.map((t) => (
              <button key={t.email} type="button" onClick={() => fillTest(t.email, t.role)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className={styles.toggle}>
        {isLogin ? 'Não tem conta? ' : 'Já tem conta? '}
        <button type="button" onClick={() => setMode(isLogin ? 'register' : 'login')}>
          {isLogin ? 'Cadastre-se' : 'Faça login'}
        </button>
      </p>
    </form>
  );
}
