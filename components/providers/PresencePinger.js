'use client';

import { useEffect } from 'react';
import { presenceService } from '@/lib/api';

const SID_KEY = 'fdr.sid';
const PING_INTERVAL = 60_000; // 60s

/* Gera/lê um session_id anônimo persistente (uuid). SSR-safe: só roda no client. */
function getSessionId() {
  if (typeof window === 'undefined') return null;
  try {
    let sid = window.localStorage.getItem(SID_KEY);
    if (!sid) {
      sid =
        (window.crypto && typeof window.crypto.randomUUID === 'function'
          ? window.crypto.randomUUID()
          : 'sid-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2));
      window.localStorage.setItem(SID_KEY, sid);
    }
    return sid;
  } catch {
    // localStorage indisponível — usa um id efêmero por sessão.
    return 'sid-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
  }
}

/**
 * Registra a presença de cada visitante: pinga ao montar, a cada 60s e ao voltar
 * o foco da aba. Pausa o intervalo enquanto a aba está oculta. Falhas são
 * silenciosas — jamais quebram a navegação. Renderiza null.
 */
export default function PresencePinger() {
  useEffect(() => {
    const sid = getSessionId();
    if (!sid) return;

    let timer = null;

    const ping = () => {
      try {
        const path =
          typeof window !== 'undefined' && window.location ? window.location.pathname : '/';
        // fire-and-forget; nunca propaga erro.
        Promise.resolve(presenceService.ping({ session_id: sid, path })).catch(() => {});
      } catch {
        /* silencioso */
      }
    };

    const startTimer = () => {
      if (timer) return;
      timer = setInterval(ping, PING_INTERVAL);
    };
    const stopTimer = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const onVisibility = () => {
      if (typeof document === 'undefined') return;
      if (document.visibilityState === 'visible') {
        ping(); // pinga ao voltar o foco
        startTimer();
      } else {
        stopTimer(); // economiza enquanto oculta
      }
    };

    // Ping inicial + agenda recorrente (se a aba já estiver visível).
    ping();
    if (typeof document === 'undefined' || document.visibilityState === 'visible') {
      startTimer();
    }

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', ping);

    return () => {
      stopTimer();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', ping);
    };
  }, []);

  return null;
}
