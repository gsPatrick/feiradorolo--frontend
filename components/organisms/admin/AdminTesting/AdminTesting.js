'use client';

import { useCallback, useEffect, useState } from 'react';
import styles from './AdminTesting.module.css';
import { cx } from '@/lib/cx';
import { adminService, ApiError } from '@/lib/api';
import Button from '@/components/atoms/Button/Button';
import Icon from '@/components/atoms/Icon/Icon';
import Spinner from '@/components/atoms/Spinner/Spinner';

/* ---------- SVGs inline (ícones lucide ausentes no Icon.js) ---------- */
const Glyph = {
  cpu: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5" />
      <path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3" />
    </>
  ),
  timer: (
    <>
      <line x1="10" y1="2" x2="14" y2="2" />
      <line x1="12" y1="14" x2="15" y2="11" />
      <circle cx="12" cy="14" r="8" />
    </>
  ),
  activity: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  flask: (
    <>
      <path d="M9 3h6M10 3v6.6L4.7 18A2 2 0 0 0 6.5 21h11a2 2 0 0 0 1.8-3L14 9.6V3" />
      <path d="M7 14h10" />
    </>
  ),
  refresh: (
    <>
      <path d="M21 12a9 9 0 1 1-2.6-6.4" />
      <path d="M21 3v6h-6" />
    </>
  ),
};

function GlyphIcon({ name, size = 18, className }) {
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
      {Glyph[name]}
    </svg>
  );
}

const N = (v) => Number(v ?? 0).toLocaleString('pt-BR');

export default function AdminTesting() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminService.systemHealth();
      if (signal?.aborted) return;
      setHealth(data || null);
    } catch (err) {
      if (signal?.aborted) return;
      const msg =
        err instanceof ApiError
          ? err.message || 'Não foi possível obter o status do sistema.'
          : 'Não foi possível obter o status do sistema.';
      setError(msg);
      setHealth(null);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const dbOnline = health?.database?.status === 'online';
  const dbLatency = health?.database?.latencyMs;
  const counts = health?.counts || {};
  const memory = health?.memory || {};

  // API respondeu → online. Se houve erro de rede/servidor → offline.
  const apiOnline = !error && !!health;

  const statusCards = [
    {
      label: 'API',
      value: apiOnline ? 'Operacional' : 'Indisponível',
      state: apiOnline ? 'ok' : 'error',
      glyph: 'activity',
    },
    {
      label: 'Banco de Dados',
      value: dbOnline
        ? `Conectado${typeof dbLatency === 'number' ? ` · ${dbLatency}ms` : ''}`
        : 'Offline',
      state: dbOnline ? 'ok' : 'error',
      glyph: 'database',
    },
  ];

  const countCards = [
    { label: 'Usuários', value: N(counts.users), icon: 'user' },
    { label: 'Produtos', value: N(counts.products), icon: 'package' },
    { label: 'Pedidos', value: N(counts.orders), glyph: 'activity' },
    { label: 'Chats', value: N(counts.chats), icon: 'chat' },
  ];

  return (
    <section className={styles.root}>
      {/* Cabeçalho */}
      <header className={styles.header}>
        <div className={styles.headTitle}>
          <span className={styles.headIcon}>
            <GlyphIcon name="flask" size={22} />
          </span>
          <div>
            <h2 className={styles.title}>Centro de Testes</h2>
            <p className={styles.subtitle}>Monitore a saúde real do sistema em tempo real</p>
          </div>
        </div>
        <div className={styles.headActions}>
          <Button variant="secondary" loading={loading} onClick={() => load()}>
            <GlyphIcon name="refresh" size={16} className={styles.btnGlyph} />
            Atualizar
          </Button>
        </div>
      </header>

      {/* Erro */}
      {error && (
        <div className={cx(styles.notice, styles.noticeError)}>
          <Icon name="bell" size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Status do sistema */}
      <div className={styles.statusGrid}>
        {statusCards.map((s) => (
          <article key={s.label} className={cx(styles.statusCard, styles[`s_${s.state}`])}>
            <span className={styles.statusIcon}>
              <GlyphIcon name={s.glyph} size={20} />
            </span>
            <div className={styles.statusBody}>
              <span className={styles.statusLabel}>{s.label}</span>
              <span className={styles.statusValue}>{loading && !health ? 'Carregando…' : s.value}</span>
            </div>
            <span className={cx(styles.dot, styles[`dot_${s.state}`])} />
          </article>
        ))}
      </div>

      <div className={styles.columns}>
        {/* Contagens reais do sistema */}
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <div className={styles.cardTitle}>
              <GlyphIcon name="database" size={18} />
              <span>Status do Sistema</span>
            </div>
          </div>

          {loading && !health ? (
            <div className={styles.cardLoading}>
              <Spinner size={28} />
              <p>Carregando dados do sistema…</p>
            </div>
          ) : (
            <div className={styles.metricsGrid}>
              {countCards.map((c) => (
                <div key={c.label} className={cx(styles.metric, styles.m_neutral)}>
                  <span className={styles.metricIcon}>
                    {c.glyph ? <GlyphIcon name={c.glyph} size={18} /> : <Icon name={c.icon} size={18} />}
                  </span>
                  <span className={styles.metricValue}>{c.value}</span>
                  <span className={styles.metricLabel}>{c.label}</span>
                </div>
              ))}
            </div>
          )}

          {health && (
            <div className={styles.cardFoot}>
              <dl className={styles.infoList}>
                <Row k="Uptime" v={`${health.uptime ?? 0}s`} />
                <Row k="Node" v={health.nodeVersion || '—'} />
                <Row k="Plataforma" v={health.platform || '—'} />
                <Row k="CPUs" v={health.cpuCount ?? '—'} />
                <Row
                  k="Memória (heap)"
                  v={
                    memory.heapUsedMB != null
                      ? `${memory.heapUsedMB} / ${memory.heapTotalMB} MB`
                      : '—'
                  }
                />
                {health.timestamp && (
                  <Row k="Atualizado" v={new Date(health.timestamp).toLocaleString('pt-BR')} />
                )}
              </dl>
            </div>
          )}
        </div>

        {/* Testes automatizados — indisponível neste ambiente */}
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <div className={styles.cardTitle}>
              <GlyphIcon name="flask" size={18} />
              <span>Testes Automatizados</span>
            </div>
          </div>
          <div className={styles.loadResult}>
            <div className={styles.loadEmpty}>
              <GlyphIcon name="flask" size={40} />
              <p>Execução de testes automatizados não disponível neste ambiente.</p>
              <span>
                Não há um runner de testes integrado à API. Os dados acima refletem o estado real do
                sistema.
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({ k, v, tone }) {
  return (
    <div className={styles.loadRow}>
      <dt>{k}</dt>
      <dd className={tone ? styles[`v_${tone}`] : undefined}>{v}</dd>
    </div>
  );
}
