'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/organisms/Modal/Modal';
import Button from '@/components/atoms/Button/Button';
import { paymentService } from '@/lib/api';
import { useToast } from '@/components/providers/ToastProvider';

/**
 * Modal global de convite para vincular o Mercado Pago. É disparado pelo evento
 * `fdr:registered` (emitido pelo AuthModal logo após o cadastro). Se o usuário já
 * tem conta vinculada, não aparece. Pode ser dispensado.
 */
export default function MpSignupInvite() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    function onRegistered() {
      // pequena espera para o token recém-criado estar disponível
      setTimeout(() => {
        paymentService
          .connectStatus()
          .then((s) => { if (!(s && s.linked)) setOpen(true); })
          .catch(() => setOpen(true));
      }, 300);
    }
    window.addEventListener('fdr:registered', onRegistered);
    return () => window.removeEventListener('fdr:registered', onRegistered);
  }, []);

  async function connect() {
    setConnecting(true);
    try {
      const res = await paymentService.connectMercadoPago();
      if (res && res.url) { window.location.href = res.url; return; }
      toast({ title: 'Não foi possível iniciar o vínculo', variant: 'destructive', duration: 2500 });
    } catch (e) {
      toast({ title: 'Erro ao conectar', description: (e && e.message) || 'Tente novamente.', variant: 'destructive', duration: 2500 });
    } finally {
      setConnecting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      size="sm"
      title="Bem-vindo! Receba suas vendas no Mercado Pago"
      footer={(
        <>
          <Button variant="ghost" onClick={() => setOpen(false)}>Agora não</Button>
          <Button variant="primary" loading={connecting} leftIcon="dollar" onClick={connect}>Vincular agora</Button>
        </>
      )}
    >
      <p style={{ lineHeight: 1.6, margin: 0 }}>
        Sua conta foi criada! 🎉 Para já poder <strong>vender e receber o valor das vendas direto na sua conta</strong>,
        vincule seu Mercado Pago — leva menos de 1 minuto. Você também pode fazer isso depois em
        {' '}<strong>Minha Conta → Vendas → Configurações</strong>.
      </p>
    </Modal>
  );
}
