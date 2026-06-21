'use client';

import { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/organisms/Modal/Modal';
import Button from '@/components/atoms/Button/Button';
import Input from '@/components/atoms/Input/Input';
import Icon from '@/components/atoms/Icon/Icon';
import { useToast } from '@/components/providers/ToastProvider';
import { verificationService, ApiError } from '@/lib/api';
import styles from './VerificationModal.module.css';

const CHANNELS = {
  email: {
    title: 'Verificar e-mail',
    icon: 'mail',
    sentMsg: 'Enviamos um código de 6 dígitos para o seu e-mail.',
    request: () => verificationService.requestEmail(),
    confirm: (code) => verificationService.confirmEmail(code),
  },
  phone: {
    title: 'Verificar WhatsApp',
    icon: 'phone',
    sentMsg: 'Enviamos um código de 6 dígitos para o seu WhatsApp.',
    request: () => verificationService.requestPhone(),
    confirm: (code) => verificationService.confirmPhone(code),
  },
};

const RESEND_COOLDOWN = 60; // segundos

/**
 * Modal que verifica um canal (e-mail ou telefone/WhatsApp) via código de 6 dígitos.
 * Props: open, onClose, channel ('email' | 'phone'), onVerified.
 */
export default function VerificationModal({ open, onClose, channel = 'email', onVerified }) {
  const { toast } = useToast();
  const cfg = CHANNELS[channel] || CHANNELS.email;

  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [info, setInfo] = useState('');          // mensagem informativa (azul)
  const [warn, setWarn] = useState('');          // aviso amigável (amarelo) — ex: WhatsApp indisponível
  const [cooldown, setCooldown] = useState(0);   // segundos restantes para reenviar
  const [unavailable, setUnavailable] = useState(false); // canal não configurado (WhatsApp)

  // Dispara o pedido inicial do código ao abrir.
  const requestCode = useCallback(
    async (isResend = false) => {
      setSending(true);
      setWarn('');
      try {
        const res = await cfg.request();
        if (res && res.already) {
          setInfo('Este canal já está verificado.');
        } else {
          setInfo(cfg.sentMsg);
        }
        setUnavailable(false);
        setCooldown(RESEND_COOLDOWN);
        if (isResend) toast({ title: 'Código reenviado!', variant: 'success', duration: 1800 });
      } catch (e) {
        const codeErr = e instanceof ApiError ? e.code : null;
        if (codeErr === 'WHATSAPP_NOT_CONFIGURED') {
          setUnavailable(true);
          setInfo('');
          setWarn('A verificação por WhatsApp ainda não está disponível. Tente novamente mais tarde.');
        } else if (e instanceof ApiError && e.status === 429) {
          setWarn('Você pediu um código há pouco. Aguarde alguns instantes antes de tentar de novo.');
          setCooldown(RESEND_COOLDOWN);
        } else {
          setWarn((e && e.message) || 'Não foi possível enviar o código. Tente novamente.');
        }
      } finally {
        setSending(false);
      }
    },
    [cfg, toast]
  );

  // Ao abrir: reseta estado e pede o código.
  useEffect(() => {
    if (!open) return;
    setCode('');
    setInfo('');
    setWarn('');
    setUnavailable(false);
    setCooldown(0);
    requestCode(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, channel]);

  // Contagem regressiva do cooldown de reenvio.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  async function confirm() {
    const clean = code.replace(/\D/g, '');
    if (clean.length !== 6) {
      setWarn('Digite o código de 6 dígitos.');
      return;
    }
    setConfirming(true);
    setWarn('');
    try {
      await cfg.confirm(clean);
      toast({ title: 'Verificado com sucesso!', variant: 'success', duration: 2000 });
      onVerified && onVerified();
      onClose && onClose();
    } catch (e) {
      const msg =
        e instanceof ApiError && e.status === 400
          ? 'Código inválido ou expirado. Confira ou reenvie um novo.'
          : (e && e.message) || 'Não foi possível confirmar o código.';
      setWarn(msg);
    } finally {
      setConfirming(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title={cfg.title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
          <Button
            variant="primary"
            loading={confirming}
            disabled={unavailable || code.replace(/\D/g, '').length !== 6}
            onClick={confirm}
          >
            Confirmar
          </Button>
        </>
      }
    >
      <div className={styles.body}>
        <span className={styles.icon}><Icon name={cfg.icon} size={24} /></span>

        {info && <p className={styles.info}>{info}</p>}
        {warn && <p className={styles.warn}>{warn}</p>}

        {!unavailable && (
          <>
            <Input
              className={styles.codeInput}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="000000"
              aria-label="Código de verificação"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') confirm(); }}
            />

            <button
              type="button"
              className={styles.resend}
              onClick={() => requestCode(true)}
              disabled={sending || cooldown > 0}
            >
              {sending
                ? 'Enviando…'
                : cooldown > 0
                  ? `Reenviar código (${cooldown}s)`
                  : 'Reenviar código'}
            </button>
          </>
        )}
      </div>
    </Modal>
  );
}
