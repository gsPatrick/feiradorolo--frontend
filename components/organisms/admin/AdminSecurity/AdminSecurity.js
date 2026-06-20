'use client';

import { useState, useEffect } from 'react';
import styles from './AdminSecurity.module.css';
import { cx } from '@/lib/cx';
import { adminService, ApiError } from '@/lib/api';
import Icon from '@/components/atoms/Icon/Icon';
import Button from '@/components/atoms/Button/Button';
import Input from '@/components/atoms/Input/Input';
import Select from '@/components/atoms/Select/Select';
import Badge from '@/components/atoms/Badge/Badge';
import { useToast } from '@/components/providers/ToastProvider';

/* — SVGs inline (lucide) para ícones ausentes no Icon.js — */
function ActivityIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />
    </svg>
  );
}
function ClockIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}
function MessageSquareIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function BanIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="m4.9 4.9 14.2 14.2" />
    </svg>
  );
}
function AlertTriangleIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

/* — Traduções e mapeamento de cores (Badge variants) — */
const SEVERITY_LABEL = { low: 'Baixa', medium: 'Média', high: 'Alta' };
const SEVERITY_VARIANT = { low: 'success', medium: 'brand', high: 'danger' };

/* — Logs de configuração (auditoria real) — */
const ENTITY_LABEL = {
  platform_setting: 'Configuração',
  commission_rule: 'Comissão',
  shipping_setting: 'Frete',
  highlight_package: 'Destaque',
  category_pricing: 'Preço por categoria',
  payment_gateway: 'Gateway',
};
const LOG_ACTION_LABEL = {
  create: 'Criação',
  update: 'Atualização',
  delete: 'Exclusão',
  restore_default: 'Restauração de padrão',
};
const LOG_ACTION_VARIANT = {
  create: 'success',
  update: 'info',
  delete: 'danger',
  restore_default: 'neutral',
};

const ACTION_LABEL = { flag: 'Sinalizar', block: 'Bloquear', mask: 'Mascarar' };
const ACTION_VARIANT = { flag: 'info', block: 'danger', mask: 'neutral' };

const SCOPE_LABEL = { all: 'Todos', chat: 'Chat', product: 'Produto', review: 'Avaliação' };
const SCOPE_VARIANT = { all: 'brand', chat: 'info', product: 'neutral', review: 'neutral' };

const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
];
const ACTION_OPTIONS = [
  { value: 'flag', label: 'Sinalizar' },
  { value: 'block', label: 'Bloquear' },
  { value: 'mask', label: 'Mascarar' },
];
const SCOPE_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'chat', label: 'Chat' },
  { value: 'product', label: 'Produto' },
  { value: 'review', label: 'Avaliação' },
];

const TABS = [
  { k: 'blocked-words', l: 'Palavras Bloqueadas' },
  { k: 'security-logs', l: 'Logs de Segurança' },
];

function fmtDate(s) {
  return new Date(s).toLocaleString('pt-BR');
}

export default function AdminSecurity() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('blocked-words');
  const [blockedWords, setBlockedWords] = useState([]);
  const [loadingWords, setLoadingWords] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [flaggedMessages, setFlaggedMessages] = useState(null);
  const [securityLogs, setSecurityLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [newWord, setNewWord] = useState('');
  const [newSeverity, setNewSeverity] = useState('medium');
  const [newAction, setNewAction] = useState('flag');
  const [newScope, setNewScope] = useState('all');

  // Carrega palavras bloqueadas reais da API (sem fallback mock).
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await adminService.blockedWords();
        if (alive && Array.isArray(data)) setBlockedWords(data);
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[AdminSecurity] falha ao carregar palavras bloqueadas:', err instanceof ApiError ? err.status : err);
        }
      } finally {
        if (alive) setLoadingWords(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Métricas reais do dashboard (apenas mensagens sinalizadas).
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await adminService.dashboard();
        if (alive && data) setFlaggedMessages(Number(data.flaggedMessages) || 0);
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[AdminSecurity] falha ao carregar dashboard:', err instanceof ApiError ? err.status : err);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Logs de auditoria reais (setting-logs).
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await adminService.settingLogs('?limit=50');
        const rows = Array.isArray(data?.rows) ? data.rows : Array.isArray(data) ? data : [];
        if (alive) setSecurityLogs(rows);
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[AdminSecurity] falha ao carregar logs:', err instanceof ApiError ? err.status : err);
        }
      } finally {
        if (alive) setLoadingLogs(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const activeBlockedWords = blockedWords.filter((w) => w.is_active).length;

  async function refreshWords() {
    try {
      const data = await adminService.blockedWords();
      if (Array.isArray(data)) setBlockedWords(data);
    } catch {
      /* mantém estado atual */
    }
  }

  async function addBlockedWord() {
    const value = newWord.trim();
    if (!value || submitting) return;
    setSubmitting(true);
    try {
      await adminService.createBlockedWord({
        word: value,
        severity: newSeverity,
        action: newAction,
        scope: newScope,
      });
      setNewWord('');
      await refreshWords();
      toast({ title: '✅ Palavra adicionada', description: `"${value}" foi bloqueada.`, variant: 'success', duration: 2000 });
    } catch (err) {
      toast({
        title: 'Erro ao adicionar',
        description: err instanceof ApiError ? err.message : 'Não foi possível adicionar a palavra.',
        variant: 'destructive',
        duration: 3000,
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleWordStatus(id) {
    const current = blockedWords.find((w) => w.id === id);
    if (!current) return;
    const next = !current.is_active;
    try {
      await adminService.updateBlockedWord(id, { is_active: next });
      setBlockedWords((prev) => prev.map((w) => (w.id === id ? { ...w, is_active: next } : w)));
      toast({
        title: next ? '👁️ Palavra ativada' : '🚫 Palavra desativada',
        description: next ? 'Voltará a filtrar mensagens.' : 'Não filtrará mais mensagens.',
        duration: 2000,
      });
    } catch (err) {
      toast({
        title: 'Erro ao atualizar',
        description: err instanceof ApiError ? err.message : 'Não foi possível atualizar a palavra.',
        variant: 'destructive',
        duration: 3000,
      });
    }
  }

  async function deleteWord(id) {
    const removed = blockedWords.find((w) => w.id === id);
    try {
      await adminService.deleteBlockedWord(id);
      setBlockedWords((prev) => prev.filter((w) => w.id !== id));
      toast({ title: '🗑️ Palavra excluída', description: removed ? `"${removed.word}" removida.` : 'Removida.', duration: 2000 });
    } catch (err) {
      toast({
        title: 'Erro ao excluir',
        description: err instanceof ApiError ? err.message : 'Não foi possível excluir a palavra.',
        variant: 'destructive',
        duration: 3000,
      });
    }
  }

  return (
    <div className={styles.wrap}>
      {/* — Cards de estatística (apenas dados reais) — */}
      <div className={styles.statsGrid}>
        <div className={styles.stat}>
          <span className={cx(styles.statIcon, styles.iconRed)}><MessageSquareIcon size={18} /></span>
          <div>
            <p className={styles.statLabel}>Msgs Bloqueadas</p>
            <p className={styles.statValue}>{flaggedMessages == null ? '—' : flaggedMessages}</p>
          </div>
        </div>
        <div className={styles.stat}>
          <span className={cx(styles.statIcon, styles.iconGreen)}><Icon name="shield" size={18} /></span>
          <div>
            <p className={styles.statLabel}>Palavras Ativas</p>
            <p className={styles.statValue}>{loadingWords ? '—' : activeBlockedWords}</p>
          </div>
        </div>
      </div>

      {/* — Sub-abas — */}
      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t.k}
            type="button"
            className={cx(styles.tab, activeTab === t.k && styles.tabActive)}
            onClick={() => setActiveTab(t.k)}
          >
            {t.l}
          </button>
        ))}
      </div>

      <div className={styles.tabContent} key={activeTab}>
        {/* — Palavras Bloqueadas — */}
        {activeTab === 'blocked-words' && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                <Icon name="shield" size={20} />
                <span>Gerenciar Palavras Bloqueadas</span>
              </h2>
            </div>
            <div className={styles.cardBody}>
              {/* Adicionar nova palavra */}
              <div className={styles.addRow}>
                <div className={styles.addInput}>
                  <Input
                    placeholder="Nova palavra a bloquear..."
                    value={newWord}
                    onChange={(e) => setNewWord(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addBlockedWord()}
                  />
                </div>
                <Select
                  value={newSeverity}
                  onChange={(e) => setNewSeverity(e.target.value)}
                  options={SEVERITY_OPTIONS}
                  className={styles.addSelect}
                  aria-label="Severidade"
                />
                <Select
                  value={newAction}
                  onChange={(e) => setNewAction(e.target.value)}
                  options={ACTION_OPTIONS}
                  className={styles.addSelect}
                  aria-label="Ação"
                />
                <Select
                  value={newScope}
                  onChange={(e) => setNewScope(e.target.value)}
                  options={SCOPE_OPTIONS}
                  className={styles.addSelect}
                  aria-label="Escopo"
                />
                <Button leftIcon="plus" onClick={addBlockedWord} disabled={!newWord.trim() || submitting}>
                  Adicionar
                </Button>
              </div>

              {/* Lista de palavras */}
              {loadingWords ? (
                <div className={styles.alert}>
                  <ClockIcon size={18} />
                  <p>Carregando palavras bloqueadas…</p>
                </div>
              ) : blockedWords.length === 0 ? (
                <div className={styles.alert}>
                  <AlertTriangleIcon size={18} />
                  <p>
                    Nenhuma palavra bloqueada configurada. Adicione palavras para filtrar
                    automaticamente mensagens no chat.
                  </p>
                </div>
              ) : (
                <div className={styles.list}>
                  {blockedWords.map((word) => (
                    <div key={word.id} className={styles.wordRow}>
                      <div className={styles.wordMeta}>
                        <code className={styles.code}>{word.word}</code>
                        <Badge variant={SEVERITY_VARIANT[word.severity] || 'neutral'} size="sm">
                          {SEVERITY_LABEL[word.severity] || word.severity}
                        </Badge>
                        <Badge variant={ACTION_VARIANT[word.action] || 'neutral'} size="sm">
                          {ACTION_LABEL[word.action] || word.action}
                        </Badge>
                        <Badge variant={SCOPE_VARIANT[word.scope] || 'neutral'} size="sm">
                          {SCOPE_LABEL[word.scope] || word.scope}
                        </Badge>
                        {!word.is_active && (
                          <Badge variant="outline" size="sm">Inativo</Badge>
                        )}
                      </div>
                      <div className={styles.actions}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleWordStatus(word.id)}
                        >
                          {word.is_active ? <BanIcon size={16} /> : <Icon name="eye" size={16} />}
                          {word.is_active ? 'Desativar' : 'Ativar'}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          leftIcon="trash"
                          aria-label="Excluir palavra"
                          onClick={() => deleteWord(word.id)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* — Logs de Segurança — */}
        {activeTab === 'security-logs' && (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>
                <ActivityIcon size={20} />
                <span>Logs de Segurança</span>
              </h2>
            </div>
            <div className={styles.cardBody}>
              {loadingLogs ? (
                <div className={styles.alert}>
                  <ClockIcon size={18} />
                  <p>Carregando logs de segurança…</p>
                </div>
              ) : securityLogs.length === 0 ? (
                <div className={styles.alert}>
                  <ActivityIcon size={18} />
                  <p>Nenhum evento de segurança registrado recentemente.</p>
                </div>
              ) : (
                <div className={styles.list}>
                  {securityLogs.map((log) => (
                    <div key={log.id} className={styles.logRow}>
                      <div className={styles.logMeta}>
                        <Badge variant={LOG_ACTION_VARIANT[log.action] || 'neutral'} size="sm">
                          {LOG_ACTION_LABEL[log.action] || log.action}
                        </Badge>
                        <span className={styles.logAction}>
                          {ENTITY_LABEL[log.entity] || log.entity}
                          {log.setting_key ? ` · ${log.setting_key}` : ''}
                        </span>
                        <span className={styles.date}>{fmtDate(log.created_at)}</span>
                      </div>
                      <div className={styles.logInfo}>
                        IP: {log.ip_address || '—'} | Por: {log.changed_by || 'Sistema'}
                      </div>
                      {(log.old_value || log.new_value) && (
                        <div className={styles.logDetails}>
                          {JSON.stringify(log.new_value ?? log.old_value).substring(0, 120)}…
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
