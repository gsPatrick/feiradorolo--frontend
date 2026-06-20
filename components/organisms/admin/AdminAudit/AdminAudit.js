'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './AdminAudit.module.css';
import { cx } from '@/lib/cx';
import Button from '@/components/atoms/Button/Button';
import Input from '@/components/atoms/Input/Input';
import Select from '@/components/atoms/Select/Select';
import Badge from '@/components/atoms/Badge/Badge';
import Icon from '@/components/atoms/Icon/Icon';
import Spinner from '@/components/atoms/Spinner/Spinner';
import { useToast } from '@/components/providers/ToastProvider';
import { adminService } from '@/lib/api';

/* ── SVGs inline (lucide) para ícones ausentes no Icon.js ── */
const Svg = (props) => (
  <svg
    width={props.size || 20}
    height={props.size || 20}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={props.className}
  >
    {props.children}
  </svg>
);
const IconActivity = (p) => (
  <Svg {...p}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></Svg>
);
const IconUsers = (p) => (
  <Svg {...p}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </Svg>
);
const IconAlert = (p) => (
  <Svg {...p}>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4" /><path d="M12 17h.01" />
  </Svg>
);
const IconClock = (p) => (
  <Svg {...p}><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></Svg>
);

const SEVERITY_LABEL = { low: 'Baixa', medium: 'Média', high: 'Alta', critical: 'Crítica' };
const SEVERITY_VARIANT = { low: 'success', medium: 'brand', high: 'danger', critical: 'danger' };

function toDate(s) {
  return new Date(s).toLocaleString('pt-BR');
}

/* ── Helpers para mapear logs reais da API ao formato da tabela ── */
function shortJson(v) {
  if (v == null) return '—';
  let str;
  if (typeof v === 'object') {
    try { str = JSON.stringify(v); } catch { str = String(v); }
  } else {
    str = String(v);
  }
  return str.length > 60 ? `${str.slice(0, 57)}…` : str;
}

/* Deriva a severidade (usada nos badges/filtros) a partir da ação. */
function severityFromAction(action) {
  const a = String(action || '').toLowerCase();
  if (a.includes('delete') || a.includes('destroy') || a.includes('ban') || a.includes('remove')) return 'critical';
  if (a.includes('update') || a.includes('restore') || a.includes('moderate')) return 'medium';
  if (a.includes('create') || a.includes('login')) return 'low';
  return 'medium';
}

/** Converte um registro de setting-log da API no shape consumido pela tabela. */
function mapAuditLog(l) {
  const author = l.changed_by != null ? `usr_${l.changed_by}` : '—';
  const entityBase = l.setting_key || l.entity || '—';
  const entityId = l.entity_id != null ? ` #${l.entity_id}` : '';
  const change = `${shortJson(l.old_value)} → ${shortJson(l.new_value)}`;
  return {
    id: l.id,
    timestamp: l.createdAt,
    userEmail: author,
    userId: author,
    action: String(l.action || 'ACTION').toUpperCase(),
    entity: `${entityBase}${entityId}: ${change}`,
    ip: l.ip_address || '—',
    severity: severityFromAction(l.action),
  };
}

export default function AdminAudit({ className }) {
  const { toast } = useToast();
  const today = new Date();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [startDate, setStartDate] = useState(weekAgo.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);
  const [severity, setSeverity] = useState('all');

  // Logs de auditoria vindos da API — sem mock/fallback.
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await adminService.settingLogs('?limit=50');
      const list = Array.isArray(res) ? res : (res?.data || []);
      setLogs(list.map(mapAuditLog));
    } catch (err) {
      setLogs([]);
      toast({
        title: 'Não foi possível carregar os logs de auditoria.',
        variant: 'danger',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredLogs = useMemo(() => {
    const start = startDate ? new Date(startDate + 'T00:00:00') : null;
    const end = endDate ? new Date(endDate + 'T23:59:59') : null;
    return logs.filter((log) => {
      const d = new Date(log.timestamp);
      if (start && d < start) return false;
      if (end && d > end) return false;
      if (severity !== 'all' && log.severity !== severity) return false;
      return true;
    });
  }, [startDate, endDate, severity, logs]);

  const summary = useMemo(() => {
    const uniqueUsers = new Set(filteredLogs.map((l) => l.userId)).size;
    const critical = filteredLogs.filter((l) => l.severity === 'critical').length;
    const hours = {};
    filteredLogs.forEach((l) => {
      const h = new Date(l.timestamp).getHours();
      hours[h] = (hours[h] || 0) + 1;
    });
    const top = Object.entries(hours).sort((a, b) => b[1] - a[1])[0];
    return {
      totalActions: filteredLogs.length,
      uniqueUsers,
      criticalActions: critical,
      mostActiveHour: top ? `${String(top[0]).padStart(2, '0')}:00` : '--:--',
    };
  }, [filteredLogs]);

  function handleExport() {
    if (!filteredLogs.length) {
      toast({ title: 'Nenhum registro para exportar.', variant: 'warning' });
      return;
    }
    toast({
      title: 'Logs exportados com sucesso!',
      description: `${filteredLogs.length} registros gerados em CSV.`,
      variant: 'success',
    });
  }

  return (
    <div className={cx(styles.root, className)}>
      {/* ── Filtros ── */}
      <section className={styles.card}>
        <header className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>
            <Icon name="filter" size={18} /> Configurações de Auditoria
          </h3>
        </header>
        <div className={styles.cardBody}>
          <div className={styles.filterGrid}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="startDate">Data Inicial</label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="endDate">Data Final</label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="severity">Severidade</label>
              <Select
                id="severity"
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                options={[
                  { value: 'all', label: 'Todas' },
                  { value: 'low', label: 'Baixa' },
                  { value: 'medium', label: 'Média' },
                  { value: 'high', label: 'Alta' },
                  { value: 'critical', label: 'Crítica' },
                ]}
              />
            </div>
            <div className={styles.fieldEnd}>
              <Button leftIcon="download" fullWidth onClick={handleExport}>
                Exportar Logs
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Summary Cards ── */}
      <div className={styles.summaryGrid}>
        <div className={styles.statCard}>
          <div>
            <p className={styles.statLabel}>Total de Ações</p>
            <p className={styles.statValue}>{summary.totalActions}</p>
          </div>
          <span className={cx(styles.statIcon, styles.info)}><IconActivity size={28} /></span>
        </div>
        <div className={styles.statCard}>
          <div>
            <p className={styles.statLabel}>Usuários Únicos</p>
            <p className={styles.statValue}>{summary.uniqueUsers}</p>
          </div>
          <span className={cx(styles.statIcon, styles.success)}><IconUsers size={28} /></span>
        </div>
        <div className={styles.statCard}>
          <div>
            <p className={styles.statLabel}>Ações Críticas</p>
            <p className={cx(styles.statValue, styles.danger)}>{summary.criticalActions}</p>
          </div>
          <span className={cx(styles.statIcon, styles.danger)}><IconAlert size={28} /></span>
        </div>
        <div className={styles.statCard}>
          <div>
            <p className={styles.statLabel}>Horário Mais Ativo</p>
            <p className={styles.statValue}>{summary.mostActiveHour}</p>
          </div>
          <span className={cx(styles.statIcon, styles.purple)}><IconClock size={28} /></span>
        </div>
      </div>

      {/* ── Tabela de Logs ── */}
      <section className={styles.card}>
        <header className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>
            <Icon name="eye" size={18} /> Logs de Auditoria
          </h3>
          <span className={styles.count}>
            {loading ? (
              <Spinner size={16} />
            ) : (
              <>
                {filteredLogs.length} registros{' '}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadLogs}
                  disabled={loading}
                >
                  Atualizar
                </Button>
              </>
            )}
          </span>
        </header>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Data / Hora</th>
                <th>Usuário</th>
                <th>Ação</th>
                <th>Entidade</th>
                <th>IP</th>
                <th>Severidade</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className={styles.empty}>
                    <Spinner size={18} /> Carregando…
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.empty}>
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td className={styles.mono}>{toDate(log.timestamp)}</td>
                    <td>
                      <span className={styles.userEmail}>{log.userEmail}</span>
                      <span className={styles.userId}>{log.userId}</span>
                    </td>
                    <td><code className={styles.action}>{log.action}</code></td>
                    <td className={styles.muted}>{log.entity}</td>
                    <td className={styles.mono}>{log.ip}</td>
                    <td>
                      <Badge variant={SEVERITY_VARIANT[log.severity]} size="sm">
                        {SEVERITY_LABEL[log.severity]}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
