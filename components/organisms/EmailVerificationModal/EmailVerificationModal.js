'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './EmailVerificationModal.module.css';
import { cx } from '@/lib/cx';
import Modal from '../Modal/Modal';
import Button from '../../atoms/Button/Button';
import Icon from '../../atoms/Icon/Icon';
import { useToast } from '@/components/providers/ToastProvider';

const EMPTY = ['', '', '', '', '', ''];

/* Ícones ausentes no Icon.js — SVG inline (lucide 24x24, stroke currentColor) */
function ClockIcon({ size = 16, className }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function RefreshIcon({ size = 16, className }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}

/**
 * EmailVerificationModal — código de 6 dígitos, réplica fiel do front antigo.
 * Auto-advance, backspace, colar (preenche tudo), auto-submit ao completar,
 * link "Reenviar código" com timer de 60s e estados de erro/sucesso.
 *
 * Props: { open, onClose, email, onVerify(code), onResend }
 */
export default function EmailVerificationModal({ open, onClose, email = '', onVerify, onResend }) {
  const [code, setCode] = useState(EMPTY);
  const [isVerifying, setIsVerifying] = useState(false);
  const [canResend, setCanResend] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const inputsRef = useRef([]);
  const { toast } = useToast();

  // Reset ao abrir
  useEffect(() => {
    if (open) {
      setCode(EMPTY);
      setIsVerifying(false);
      setCanResend(false);
      setResendCountdown(60);
      setIsResending(false);
      setTimeout(() => inputsRef.current[0]?.focus(), 30);
    }
  }, [open]);

  // Countdown de reenvio
  useEffect(() => {
    if (!open) return;
    if (!canResend && resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (resendCountdown === 0) setCanResend(true);
  }, [open, canResend, resendCountdown]);

  // Auto-submit quando completo
  useEffect(() => {
    if (open && code.every((d) => d !== '')) {
      handleVerifyCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, open]);

  const focusInput = (i) => inputsRef.current[i]?.focus();

  const handlePaste = (e, index) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    if (/^\d{6}$/.test(pasted)) {
      setCode(pasted.split(''));
      setTimeout(() => focusInput(5), 10);
      return;
    }
    if (/^\d$/.test(pasted)) {
      const next = [...code];
      next[index] = pasted;
      setCode(next);
      if (index < 5) focusInput(index + 1);
    }
  };

  const handleInputChange = (index, raw) => {
    let value = raw;
    if (value.length > 1) {
      if (/^\d{6}$/.test(value)) {
        setCode(value.split(''));
        setTimeout(() => focusInput(5), 10);
        return;
      }
      value = value.slice(-1);
    }
    if (value.length <= 1 && /^[0-9]*$/.test(value)) {
      const next = [...code];
      next[index] = value;
      setCode(next);
      if (value && index < 5) focusInput(index + 1);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      focusInput(index - 1);
    }
  };

  async function handleVerifyCode() {
    const verificationCode = code.join('');
    if (verificationCode.length !== 6 || isVerifying) return;

    setIsVerifying(true);
    try {
      let ok = true;
      if (onVerify) {
        const result = await onVerify(verificationCode);
        ok = result !== false;
      }
      if (ok) {
        toast({
          title: 'Email verificado com sucesso!',
          description: 'Sua conta foi ativada. Redirecionando...',
          variant: 'success',
        });
        onClose && onClose();
      } else {
        toast({
          title: 'Código inválido',
          description: 'Verifique o código e tente novamente',
          variant: 'destructive',
        });
        setCode(EMPTY);
        focusInput(0);
      }
    } catch (err) {
      toast({
        title: 'Erro de verificação',
        description: 'Não foi possível verificar o código',
        variant: 'destructive',
      });
      setCode(EMPTY);
      focusInput(0);
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleResendCode() {
    setIsResending(true);
    try {
      if (onResend) await onResend();
      toast({
        title: 'Código reenviado!',
        description: 'Verifique sua caixa de entrada',
        variant: 'success',
      });
      setCanResend(false);
      setResendCountdown(60);
      setCode(EMPTY);
      focusInput(0);
    } catch (err) {
      toast({
        title: 'Erro ao reenviar',
        description: 'Não foi possível reenviar o código',
        variant: 'destructive',
      });
    } finally {
      setIsResending(false);
    }
  }

  const title = (
    <span className={styles.title}>
      <Icon name="mail" size={20} className={styles.titleIcon} />
      Verificar Email
    </span>
  );

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className={styles.content}>
        <div className={styles.intro}>
          <p className={styles.lead}>Enviamos um código de 6 dígitos para:</p>
          <p className={styles.email}>{email}</p>
        </div>

        <div className={styles.block}>
          <label className={styles.label}>Digite o código de verificação:</label>
          <div className={styles.boxes}>
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputsRef.current[index] = el)}
                id={`code-${index}`}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={digit}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={(e) => handlePaste(e, index)}
                className={styles.box}
                disabled={isVerifying}
                placeholder="0"
                autoComplete="one-time-code"
              />
            ))}
          </div>

          {isVerifying && (
            <div className={styles.verifying}>
              <RefreshIcon size={16} className={styles.spin} />
              <span>Verificando código...</span>
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <div className={styles.expire}>
            <ClockIcon size={16} />
            <span>O código expira em 10 minutos</span>
          </div>

          {!canResend ? (
            <p className={styles.countdown}>Reenviar código em {resendCountdown}s</p>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResendCode}
              disabled={isResending}
              loading={isResending}
              className={styles.resend}
            >
              {isResending ? (
                'Enviando...'
              ) : (
                <span className={styles.resendLabel}>
                  <Icon name="mail" size={16} />
                  Reenviar código
                </span>
              )}
            </Button>
          )}
        </div>

        <div className={styles.hint}>
          <p>
            <span aria-hidden="true">💡 </span>
            <strong>Não recebeu?</strong>
          </p>
          <p>Verifique sua pasta de spam ou lixo eletrônico.</p>
        </div>
      </div>
    </Modal>
  );
}
