'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './RenewalReminder.module.css';
import { cx } from '@/lib/cx';
import Icon from '@/components/atoms/Icon/Icon';
import Button from '@/components/atoms/Button/Button';
import { useAuth } from '@/components/providers/AuthProvider';
import { notificationService } from '@/lib/api';

const SESSION_KEY = 'fdr.renewalReminderDismissed';

/* Extrai o link de pagamento (pay_url) de uma notificação de renovação pendente. */
function payUrlFromNotif(n) {
  const d = (n && n.data) || {};
  return d.pay_url || d.payUrl || null;
}

/**
 * Lembrete global de renovação de plano. Para o usuário logado, busca as
 * notificações e, se houver `plan.expiring` ou `plan.renewal_pending` não lida,
 * mostra um banner discreto com CTA "Renovar agora". Fechável; não reabre na
 * mesma sessão (sessionStorage). Não ocupa espaço se não houver nada relevante.
 */
export default function RenewalReminder() {
  const { user, authReady } = useAuth();
  const [notif, setNotif] = useState(null); // notificação relevante escolhida
  const [dismissed, setDismissed] = useState(true); // começa fechado (evita flash)

  useEffect(() => {
    if (!authReady || !user) return;
    // Já fechado nesta sessão? Não busca/mostra.
    try {
      if (sessionStorage.getItem(SESSION_KEY) === '1') return;
    } catch {
      /* sessionStorage indisponível: segue mostrando */
    }

    let active = true;
    notificationService
      .listMine()
      .then((rows) => {
        if (!active) return;
        const list = Array.isArray(rows) ? rows : (rows && rows.notifications) || [];
        // Prioriza renovação pendente (mais urgente) sobre "vence em X dias".
        const pending = list.find(
          (n) => n && n.type === 'plan.renewal_pending' && !n.read_at && !n.is_read
        );
        const expiring = list.find(
          (n) => n && n.type === 'plan.expiring' && !n.read_at && !n.is_read
        );
        const chosen = pending || expiring || null;
        if (chosen) {
          setNotif(chosen);
          setDismissed(false);
        }
      })
      .catch(() => {
        /* nunca quebra a UI por causa do lembrete */
      });

    return () => {
      active = false;
    };
  }, [authReady, user]);

  function close() {
    setDismissed(true);
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      /* ignore */
    }
  }

  if (!authReady || !user || !notif || dismissed) return null;

  const isPending = notif.type === 'plan.renewal_pending';
  const data = notif.data || {};
  const daysLeft = data.days_left != null ? Number(data.days_left) : null;
  const payUrl = payUrlFromNotif(notif);

  const title = isPending
    ? 'Renovação pendente'
    : daysLeft != null
    ? `Seu plano vence em ${daysLeft} ${daysLeft === 1 ? 'dia' : 'dias'}`
    : 'Seu plano está prestes a vencer';

  const message = isPending
    ? 'Pague para manter seus anúncios ativos e sem interrupção.'
    : 'Renove agora para não perder a visibilidade dos seus anúncios.';

  // renewal_pending com pay_url → link externo; senão, página de planos.
  const ctaHref = isPending && payUrl ? payUrl : '/planos-e-taxas';
  const ctaExternal = isPending && !!payUrl;

  return (
    <div className={styles.root} role="status" aria-live="polite">
      <div className={cx(styles.banner, isPending && styles.bannerUrgent)}>
        <span className={styles.icon}>
          <Icon name={isPending ? 'sparkle' : 'star'} size={20} />
        </span>
        <div className={styles.body}>
          <strong className={styles.title}>{title}</strong>
          <span className={styles.message}>{message}</span>
        </div>
        <div className={styles.actions}>
          {ctaExternal ? (
            <a href={ctaHref} target="_blank" rel="noopener noreferrer">
              <Button size="sm" rightIcon="arrow-right">
                Renovar agora
              </Button>
            </a>
          ) : (
            <Button size="sm" rightIcon="arrow-right" href={ctaHref} onClick={close}>
              Renovar agora
            </Button>
          )}
          <button
            type="button"
            className={styles.close}
            onClick={close}
            aria-label="Fechar lembrete"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
