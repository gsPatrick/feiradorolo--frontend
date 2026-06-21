'use client';

import { useEffect, useState } from 'react';
import styles from './AuthModal.module.css';
import { cx } from '@/lib/cx';
import Input from '../../atoms/Input/Input';
import Button from '../../atoms/Button/Button';
import Icon from '../../atoms/Icon/Icon';
import { authService, setToken } from '@/lib/api';
import { useToast } from '../../providers/ToastProvider';
import { maskPhone, maskCPF, maskCNPJ, onlyDigits } from '@/lib/masks';

export default function AuthModal({ open, onClose, initialMode = 'login', onAuthenticated }) {
  const { toast } = useToast();
  const [mode, setModeRaw] = useState(initialMode); // login | register | forgot
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [login, setLogin] = useState({ email: '', password: '' });
  const [reg, setReg] = useState({ name: '', accountType: 'individual', document: '', phone: '', email: '', password: '' });
  const [forgotEmail, setForgotEmail] = useState('');
  const [showPwd, setShowPwd] = useState(false);

  // Troca de aba sempre limpa o erro exibido.
  const setMode = (m) => {
    setError('');
    setModeRaw(m);
  };

  useEffect(() => {
    if (open) {
      setModeRaw(initialMode);
      setError('');
    }
  }, [open, initialMode]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose && onClose();
    }
    if (open) {
      document.addEventListener('keydown', onKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  function finish(data, successMsg) {
    if (data && data.token) setToken(data.token);
    toast({ title: successMsg, variant: 'success' });
    if (onAuthenticated && data && data.user) onAuthenticated(data.user);
    onClose && onClose();
  }

  async function doLogin(e) {
    e.preventDefault();
    setError('');
    if (!login.email || !login.password) return setError('Informe e-mail e senha.');
    setLoading(true);
    try {
      const data = await authService.login(login.email, login.password);
      finish(data, 'Bem-vindo de volta!');
    } catch (err) {
      setError(err.message || 'E-mail ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  }

  async function doRegister(e) {
    e.preventDefault();
    setError('');
    if (!reg.name || !reg.email || !reg.password) return setError('Preencha nome, e-mail e senha.');
    if (!reg.document) return setError(reg.accountType === 'company' ? 'Informe o CNPJ.' : 'Informe o CPF.');
    setLoading(true);
    try {
      const data = await authService.register({
        name: reg.name,
        email: reg.email,
        password: reg.password,
        phone: reg.phone ? onlyDigits(reg.phone) : undefined,
        person_type: reg.accountType,
        cpf: reg.accountType === 'individual' ? onlyDigits(reg.document) : undefined,
        cnpj: reg.accountType === 'company' ? onlyDigits(reg.document) : undefined,
      });
      if (data && data.token) {
        finish(data, 'Conta criada!');
        // convida a vincular o Mercado Pago (modal global ouve este evento)
        try { window.dispatchEvent(new CustomEvent('fdr:registered')); } catch {}
      } else {
        toast({ title: 'Conta criada!', description: 'Verifique seu e-mail.', variant: 'success' });
        onClose && onClose();
      }
    } catch (err) {
      setError(err.message || 'Não foi possível cadastrar.');
    } finally {
      setLoading(false);
    }
  }

  function doForgot(e) {
    e.preventDefault();
    setError('');
    if (!forgotEmail) return setError('Informe seu e-mail.');
    toast({ title: 'Link enviado!', description: 'Confira seu e-mail para redefinir a senha.', variant: 'success' });
    setMode('login');
  }

  const isRegister = mode === 'register';

  return (
    <div className={styles.root}>
      <div className={styles.overlay} onClick={onClose} />
      <div className={cx(styles.container, isRegister && styles.active)} role="dialog" aria-modal="true">
        <button className={styles.close} onClick={onClose} aria-label="Fechar"><Icon name="close" size={20} /></button>

        {/* ---- LOGIN / FORGOT ---- */}
        <div className={cx(styles.formBox, styles.signIn)}>
          {mode === 'forgot' ? (
            <form className={styles.form} onSubmit={doForgot}>
              <span className={styles.brand}>Feira do Rolo</span>
              <h2 className={styles.h2}>Recuperar senha</h2>
              <p className={styles.formSub}>Enviaremos um link de redefinição para o seu e-mail.</p>
              <div className={styles.field}>
                <Input type="email" placeholder="seu@email.com" leftIcon="mail" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} />
              </div>
              {error && <p className={styles.error}>{error}</p>}
              <Button type="submit" variant="primary" fullWidth rightIcon="arrow-right">Enviar link</Button>
              <button type="button" className={styles.link} onClick={() => setMode('login')}>Voltar ao login</button>
            </form>
          ) : (
            <form className={styles.form} onSubmit={doLogin}>
              <span className={styles.brand}>Feira do Rolo</span>
              <h2 className={styles.h2}>Bem-vindo de volta</h2>
              <p className={styles.formSub}>Entre para acompanhar pedidos, favoritos e cupons.</p>
              <div className={styles.field}>
                <Input type="email" placeholder="E-mail" leftIcon="mail" value={login.email} onChange={(e) => setLogin((p) => ({ ...p, email: e.target.value }))} />
              </div>
              <div className={styles.field}>
                <Input type={showPwd ? 'text' : 'password'} placeholder="Senha" leftIcon="lock" rightIcon="eye" onRightIconClick={() => setShowPwd((v) => !v)} value={login.password} onChange={(e) => setLogin((p) => ({ ...p, password: e.target.value }))} />
              </div>
              <button type="button" className={styles.forgot} onClick={() => setMode('forgot')}>Esqueceu a senha?</button>
              {error && <p className={styles.error}>{error}</p>}
              <Button type="submit" variant="primary" fullWidth loading={loading} rightIcon="arrow-right">Entrar</Button>
            </form>
          )}
        </div>

        {/* ---- CADASTRO ---- */}
        <div className={cx(styles.formBox, styles.signUp)}>
          <form className={styles.form} onSubmit={doRegister}>
            <span className={styles.brand}>Feira do Rolo</span>
            <h2 className={styles.h2}>Criar conta</h2>
            <p className={styles.formSub}>Cadastre-se e ganhe acesso a ofertas e cupons exclusivos.</p>

            {/* Tipo de conta: Pessoa Física (CPF) ou Jurídica (CNPJ) */}
            <div className={styles.acctType}>
              <button
                type="button"
                className={cx(styles.acctBtn, reg.accountType === 'individual' && styles.acctBtnActive)}
                onClick={() => setReg((p) => ({ ...p, accountType: 'individual', document: '' }))}
              >
                Pessoa Física
              </button>
              <button
                type="button"
                className={cx(styles.acctBtn, reg.accountType === 'company' && styles.acctBtnActive)}
                onClick={() => setReg((p) => ({ ...p, accountType: 'company', document: '' }))}
              >
                Pessoa Jurídica
              </button>
            </div>

            <div className={styles.field}>
              <Input placeholder={reg.accountType === 'company' ? 'Razão social / Nome' : 'Seu nome'} leftIcon="user" value={reg.name} onChange={(e) => setReg((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className={styles.field}>
              <Input
                placeholder={reg.accountType === 'company' ? 'CNPJ' : 'CPF'}
                leftIcon="shield"
                inputMode="numeric"
                value={reg.document}
                onChange={(e) =>
                  setReg((p) => ({
                    ...p,
                    document: p.accountType === 'company' ? maskCNPJ(e.target.value) : maskCPF(e.target.value),
                  }))
                }
              />
            </div>
            <div className={styles.field}>
              <Input placeholder="Telefone (opcional)" leftIcon="smartphone" inputMode="tel" value={reg.phone} onChange={(e) => setReg((p) => ({ ...p, phone: maskPhone(e.target.value) }))} />
            </div>
            <div className={styles.field}>
              <Input type="email" placeholder="E-mail" leftIcon="mail" value={reg.email} onChange={(e) => setReg((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div className={styles.field}>
              <Input type={showPwd ? 'text' : 'password'} placeholder="Crie uma senha" leftIcon="lock" rightIcon="eye" onRightIconClick={() => setShowPwd((v) => !v)} value={reg.password} onChange={(e) => setReg((p) => ({ ...p, password: e.target.value }))} />
            </div>
            {error && <p className={styles.error}>{error}</p>}
            <Button type="submit" variant="primary" fullWidth loading={loading} rightIcon="arrow-right">Cadastrar</Button>
          </form>
        </div>

        {/* ---- Painel promo (slate + acento amarelo) ---- */}
        <div className={styles.overlayWrap}>
          <div className={styles.overlayInner}>
            <div className={cx(styles.overlayPanel, styles.overlayLeft)}>
              <span className={styles.promoLogo}>Feira do Rolo</span>
              <h2 className={styles.promoH}>Já tem conta?</h2>
              <p className={styles.promoP}>Entre para acessar seus pedidos, cupons e finalizar suas compras com segurança.</p>
              <button className={styles.brandBtn} onClick={() => setMode('login')}>Fazer login</button>
            </div>
            <div className={cx(styles.overlayPanel, styles.overlayRight)}>
              <span className={styles.promoLogo}>Feira do Rolo</span>
              <h2 className={styles.promoH}>Primeira vez por aqui?</h2>
              <p className={styles.promoP}>Crie sua conta e aproveite ofertas, frete grátis e pagamento protegido.</p>
              <button className={styles.brandBtn} onClick={() => setMode('register')}>Criar conta</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
