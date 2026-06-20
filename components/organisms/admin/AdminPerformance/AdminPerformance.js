'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './AdminPerformance.module.css';
import { cx } from '@/lib/cx';
import { adminService, ApiError } from '@/lib/api';
import Icon from '@/components/atoms/Icon/Icon';
import Button from '@/components/atoms/Button/Button';
import Badge from '@/components/atoms/Badge/Badge';

/* — SVGs inline (lucide) para ícones ausentes no Icon.js — */
function ClockIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function HardDriveIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="22" y1="12" x2="2" y2="12" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
      <line x1="6" y1="16" x2="6.01" y2="16" />
      <line x1="10" y1="16" x2="10.01" y2="16" />
    </svg>
  );
}
function DatabaseIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14a9 3 0 0 0 18 0V5" />
      <path d="M3 12a9 3 0 0 0 18 0" />
    </svg>
  );
}
function ActivityIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
function ServerIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
      <line x1="6" y1="6" x2="6.01" y2="6" />
      <line x1="6" y1="18" x2="6.01" y2="18" />
    </svg>
  );
}
function CpuIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="2" ry="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" /><line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" /><line x1="15" y1="20" x2="15" y2="23" />
      <line x1="20" y1="9" x2="23" y2="9" /><line x1="20" y1="14" x2="23" y2="14" />
      <line x1="1" y1="9" x2="4" y2="9" /><line x1="1" y1="14" x2="4" y2="14" />
    </svg>
  );
}
function GlobeIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}
function RefreshIcon({ size = 18, className }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 2v6h-6" />
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M3 22v-6h6" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    </svg>
  );
}
function BarChart3Icon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 3v18h18" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
    </svg>
  );
}

/* — Helpers (somente formatação, sem dados fabricados) — */
function formatUptime(seconds) {
  const s = Math.max(0, Math.round(seconds));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function isUp(status) {
  return status === 'ok' || status === 'online';
}

function serviceIcon(name = '') {
  const n = name.toLowerCase();
  if (n.includes('cache') || n.includes('redis')) return 'bolt';
  if (n.includes('cdn') || n.includes('asset') || n.includes('edge')) return 'globe';
  if (n.includes('db') || n.includes('banco') || n.includes('postgres')) return 'db';
  return 'server';
}

const REFRESH_MS = 10000;

export default function AdminPerformance() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const mountedRef = useRef(true);

  const fetchHealth = useCallback(async () => {
    try {
      const h = await adminService.systemHealth();
      if (!mountedRef.current) return;
      if (!h) {
        setError('Sem dados');
      } else {
        setHealth(h);
        setError(null);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      if (err instanceof ApiError && err.status === 401) {
        setError('Sem permissão para visualizar a saúde do sistema.');
      } else {
        setError('Sem dados');
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchHealth();
    const id = setInterval(fetchHealth, REFRESH_MS);
    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
  }, [fetchHealth]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchHealth();
    setTimeout(() => {
      if (mountedRef.current) setIsRefreshing(false);
    }, 400);
  }, [fetchHealth]);

  if (loading) {
    return (
      <div className={styles.wrap}>
        <div className={styles.loading}>Carregando…</div>
      </div>
    );
  }

  if (!health) {
    return (
      <div className={styles.wrap}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Saúde do Sistema</h2>
            <p className={styles.subtitle}>Métricas reais do processo e dos serviços</p>
          </div>
          <Button onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshIcon size={16} className={isRefreshing ? styles.spin : undefined} />
            {isRefreshing ? 'Atualizando...' : 'Atualizar'}
          </Button>
        </div>
        <div className={styles.loading}>{error || 'Sem dados'}</div>
      </div>
    );
  }

  const mem = health.memory || {};
  const db = health.database || {};
  const counts = health.counts || {};
  const loadAvg = Array.isArray(health.loadAvg) ? health.loadAvg : [];

  // Serviços reais: banco + lista da API (sem duplicar o banco caso já listado).
  const apiServices = Array.isArray(health.services) ? health.services : [];
  const hasDbInServices = apiServices.some((s) => serviceIcon(s.name) === 'db');
  const services = [];
  if (db && (db.status || typeof db.latencyMs === 'number') && !hasDbInServices) {
    services.push({
      name: 'Banco de Dados',
      detail: typeof db.latencyMs === 'number' ? `${db.latencyMs}ms` : '—',
      icon: 'db',
      status: isUp(db.status) ? 'online' : 'degraded',
      latency: typeof db.latencyMs === 'number' ? db.latencyMs : null,
    });
  }
  apiServices.forEach((s) => {
    services.push({
      name: s.name,
      detail: typeof s.latency === 'number' ? `${s.latency}ms` : '—',
      icon: serviceIcon(s.name),
      status: isUp(s.status) ? 'online' : 'degraded',
      latency: typeof s.latency === 'number' ? s.latency : null,
    });
  });

  const dbOnline = isUp(db.status);
  const heapUsed = typeof mem.heapUsedMB === 'number' ? mem.heapUsedMB : null;
  const heapTotal = typeof mem.heapTotalMB === 'number' ? mem.heapTotalMB : null;
  const rss = typeof mem.rssMB === 'number' ? mem.rssMB : null;
  const heapPct =
    heapUsed != null && heapTotal ? Math.round((heapUsed / heapTotal) * 100) : null;

  return (
    <div className={styles.wrap}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Saúde do Sistema</h2>
          <p className={styles.subtitle}>Métricas reais do processo e dos serviços</p>
        </div>
        <Button onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshIcon size={16} className={isRefreshing ? styles.spin : undefined} />
          {isRefreshing ? 'Atualizando...' : 'Atualizar'}
        </Button>
      </div>

      {/* Métricas-chave reais */}
      <div className={styles.metricsGrid}>
        <div className={cx(styles.card, styles.metricCard, styles.borderOrange)}>
          <div className={styles.metricHead}>
            <div className={cx(styles.metricIcon, styles.bgOrange)}>
              <ClockIcon size={20} />
            </div>
            <div>
              <div className={styles.metricLabel}>Uptime</div>
              <div className={styles.metricValue}>
                {typeof health.uptime === 'number' ? formatUptime(health.uptime) : '—'}
              </div>
            </div>
          </div>
          <div className={cx(styles.metricFoot, styles.txtOrange)}>Tempo de processo</div>
        </div>

        <div className={cx(styles.card, styles.metricCard, styles.borderBlue)}>
          <div className={styles.metricHead}>
            <div className={cx(styles.metricIcon, styles.bgBlue)}>
              <HardDriveIcon size={20} />
            </div>
            <div>
              <div className={styles.metricLabel}>Heap usado</div>
              <div className={styles.metricValue}>
                {heapUsed != null ? `${heapUsed}MB` : '—'}
              </div>
            </div>
          </div>
          <div className={cx(styles.metricFoot, styles.txtBlue)}>
            {heapTotal != null ? `de ${heapTotal}MB no heap` : 'Sem dados'}
          </div>
        </div>

        <div className={cx(styles.card, styles.metricCard, styles.borderPurple)}>
          <div className={styles.metricHead}>
            <div className={cx(styles.metricIcon, styles.bgPurple)}>
              <ActivityIcon size={20} />
            </div>
            <div>
              <div className={styles.metricLabel}>Load average (1m)</div>
              <div className={styles.metricValue}>
                {loadAvg.length > 0 ? loadAvg[0] : '—'}
              </div>
            </div>
          </div>
          <div className={cx(styles.metricFoot, styles.txtPurple)}>
            {loadAvg.length >= 3
              ? `5m ${loadAvg[1]} · 15m ${loadAvg[2]}`
              : 'Carga do sistema'}
          </div>
        </div>

        <div
          className={cx(
            styles.card,
            styles.metricCard,
            dbOnline ? styles.borderGreen : styles.borderOrange
          )}
        >
          <div className={styles.metricHead}>
            <div className={cx(styles.metricIcon, dbOnline ? styles.bgGreen : styles.bgOrange)}>
              <DatabaseIcon size={20} />
            </div>
            <div>
              <div className={styles.metricLabel}>Banco de dados</div>
              <div className={styles.metricValue}>
                {typeof db.latencyMs === 'number' ? `${db.latencyMs}ms` : '—'}
              </div>
            </div>
          </div>
          <div className={cx(styles.metricFoot, dbOnline ? styles.txtGreen : styles.txtOrange)}>
            {db.status ? (dbOnline ? 'Online' : `Status: ${db.status}`) : 'Sem dados'}
          </div>
        </div>
      </div>

      {/* Status dos Serviços (real) */}
      {services.length > 0 && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>
              <Icon name="shield" size={20} />
              Status dos Serviços
            </div>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.servicesGrid}>
              {services.map((svc) => (
                <div key={svc.name} className={styles.service}>
                  <div className={styles.serviceIcon}>
                    {svc.icon === 'db' && <DatabaseIcon size={20} />}
                    {svc.icon === 'server' && <ServerIcon size={20} />}
                    {svc.icon === 'bolt' && <Icon name="bolt" size={20} />}
                    {svc.icon === 'globe' && <GlobeIcon size={20} />}
                  </div>
                  <div className={styles.serviceInfo}>
                    <div className={styles.serviceName}>{svc.name}</div>
                    <div className={styles.serviceDetail}>{svc.detail}</div>
                  </div>
                  <div className={styles.serviceRight}>
                    <Badge variant={svc.status === 'online' ? 'success' : 'danger'} dot>
                      {svc.status === 'online' ? 'Online' : 'Degradado'}
                    </Badge>
                    {svc.latency != null && (
                      <div className={styles.serviceLatency}>{svc.latency}ms</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recursos do processo (memória real) */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitle}>
            <HardDriveIcon size={20} />
            Memória do Processo
          </div>
        </div>
        <div className={styles.cardBody}>
          <div className={styles.sysGrid}>
            <div className={styles.sys}>
              <HardDriveIcon size={32} />
              <div className={styles.sysTitle}>Heap usado</div>
              <div className={styles.sysValue}>{heapUsed != null ? `${heapUsed} MB` : '—'}</div>
            </div>
            <div className={styles.sys}>
              <HardDriveIcon size={32} />
              <div className={styles.sysTitle}>Heap total</div>
              <div className={styles.sysValue}>{heapTotal != null ? `${heapTotal} MB` : '—'}</div>
            </div>
            <div className={styles.sys}>
              <ServerIcon size={32} />
              <div className={styles.sysTitle}>RSS</div>
              <div className={styles.sysValue}>{rss != null ? `${rss} MB` : '—'}</div>
            </div>
          </div>
          {heapPct != null && (
            <div className={styles.progress} style={{ marginTop: 16 }}>
              <div className={styles.progressBar} style={{ width: `${Math.min(100, heapPct)}%` }} />
            </div>
          )}
        </div>
      </div>

      {/* Contagens reais do banco */}
      {(typeof counts.orders === 'number' ||
        typeof counts.users === 'number' ||
        typeof counts.products === 'number' ||
        typeof counts.chats === 'number') && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>
              <BarChart3Icon size={20} />
              Totais no Banco
            </div>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.sysGrid}>
              <div className={styles.sys}>
                <BarChart3Icon size={32} />
                <div className={styles.sysTitle}>Pedidos</div>
                <div className={styles.sysValue}>
                  {Number(counts.orders || 0).toLocaleString('pt-BR')}
                </div>
              </div>
              <div className={styles.sys}>
                <ServerIcon size={32} />
                <div className={styles.sysTitle}>Usuários</div>
                <div className={styles.sysValue}>
                  {Number(counts.users || 0).toLocaleString('pt-BR')}
                </div>
              </div>
              <div className={styles.sys}>
                <DatabaseIcon size={32} />
                <div className={styles.sysTitle}>Produtos</div>
                <div className={styles.sysValue}>
                  {Number(counts.products || 0).toLocaleString('pt-BR')}
                </div>
              </div>
            </div>
            <div className={styles.sysGrid} style={{ marginTop: 16 }}>
              <div className={styles.sys}>
                <ActivityIcon size={32} />
                <div className={styles.sysTitle}>Chats</div>
                <div className={styles.sysValue}>
                  {Number(counts.chats || 0).toLocaleString('pt-BR')}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Informações do Sistema (reais) */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitle}>
            <ServerIcon size={20} />
            Informações do Sistema
          </div>
        </div>
        <div className={styles.cardBody}>
          <div className={styles.sysGrid}>
            <div className={styles.sys}>
              <CpuIcon size={32} />
              <div className={styles.sysTitle}>Node.js</div>
              <div className={styles.sysValue}>{health.nodeVersion || '—'}</div>
            </div>
            <div className={styles.sys}>
              <GlobeIcon size={32} />
              <div className={styles.sysTitle}>Plataforma</div>
              <div className={styles.sysValue}>{health.platform || '—'}</div>
            </div>
            <div className={styles.sys}>
              <CpuIcon size={32} />
              <div className={styles.sysTitle}>CPU Cores</div>
              <div className={styles.sysValue}>
                {typeof health.cpuCount === 'number' ? health.cpuCount : '—'}
              </div>
            </div>
          </div>
          {health.timestamp && (
            <div className={styles.scoreUpdated} style={{ marginTop: 16, textAlign: 'right' }}>
              Última atualização: {new Date(health.timestamp).toLocaleTimeString('pt-BR')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
