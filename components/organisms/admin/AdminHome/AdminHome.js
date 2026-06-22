'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './AdminHome.module.css';
import { cx } from '@/lib/cx';
import Icon from '@/components/atoms/Icon/Icon';
import Modal from '@/components/organisms/Modal/Modal';
import { adminService } from '@/lib/api';

const STORAGE_KEY = 'fdr.adminQuickActions';
const USAGE_KEY = 'fdr.adminActionUsage';
const ORDER_KEY = 'fdr.adminActionOrder';
const SHORTCUTS_KEY = 'fdr.adminCustomShortcuts';

// Catálogo de ações rápidas disponíveis (mapeia abas do painel).
// `k` deve casar com a chave da aba para que onNavigate(k) funcione.
const ACTIONS = [
  { k: 'orders', label: 'Pedidos', icon: 'package', desc: 'Acompanhe e gerencie todos os pedidos.' },
  { k: 'disputes', label: 'Disputas', icon: 'shield', desc: 'Resolva conflitos entre compradores e vendedores.' },
  { k: 'customization', label: 'Personalização', icon: 'sparkle', desc: 'Páginas, banners e identidade visual.' },
  { k: 'specifications', label: 'Especificações', icon: 'grid', desc: 'Atributos e campos das categorias.' },
  { k: 'integrations', label: 'Integrações', icon: 'bolt', desc: 'Conecte serviços e ferramentas externas.' },
  { k: 'plans', label: 'Planos', icon: 'package', desc: 'Configure planos e assinaturas.' },
  { k: 'users', label: 'Usuários', icon: 'user', desc: 'Contas, permissões e moderação.' },
  { k: 'finance', label: 'Financeiro', icon: 'dollar', desc: 'Saldos, repasses e movimentações.' },
  { k: 'emails', label: 'Emails', icon: 'mail', desc: 'Modelos e disparos de e-mail.' },
  { k: 'notifications', label: 'Push', icon: 'bell', desc: 'Notificações push para os usuários.' },
  { k: 'security', label: 'Segurança', icon: 'shield', desc: 'Acessos, sessões e proteção da conta.' },
  { k: 'analytics', label: 'Analytics', icon: 'trending-up', desc: 'Métricas e desempenho da plataforma.' },
  { k: 'revenue', label: 'Receitas', icon: 'dollar', desc: 'Faturamento e fontes de receita.' },
  { k: 'chat', label: 'Chat', icon: 'chat', desc: 'Moderação das conversas.' },
  { k: 'audit', label: 'Auditoria', icon: 'eye', desc: 'Histórico de ações no painel.' },
  { k: 'testing', label: 'Testes', icon: 'bolt', desc: 'Ferramentas de teste e diagnóstico.' },
  { k: 'performance', label: 'Performance', icon: 'sparkle', desc: 'Saúde e velocidade do sistema.' },
];

// Ações marcadas por padrão.
const DEFAULT_KEYS = [
  'orders',
  'disputes',
  'customization',
  'specifications',
  'integrations',
  'plans',
  'users',
  'finance',
];

const VALID_KEYS = new Set(ACTIONS.map((a) => a.k));
const ACTION_BY_KEY = ACTIONS.reduce((acc, a) => {
  acc[a.k] = a;
  return acc;
}, {});

// Ícones disponíveis para os atalhos personalizados.
const ICON_CHOICES = [
  'package', 'shield', 'user', 'chat', 'dollar', 'mail', 'bell', 'grid',
  'sparkle', 'bolt', 'truck', 'eye', 'star', 'heart', 'edit', 'trending-up',
  'lock', 'store', 'tag', 'cart', 'gem', 'bulb', 'camera', 'download',
];

const CURRENCY = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const NUMBER = new Intl.NumberFormat('pt-BR');

function brl(v) {
  const n = Number(v);
  return Number.isFinite(n) ? CURRENCY.format(n) : '—';
}
function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? NUMBER.format(n) : '—';
}

/* ---------- localStorage helpers (SSR-safe, try/catch) ---------- */
function readJSON(key) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function writeJSON(key, value) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* armazenamento indisponível — segue sem persistir */
  }
}

function readSelection() {
  const parsed = readJSON(STORAGE_KEY);
  if (!Array.isArray(parsed)) return null;
  const cleaned = parsed.filter((k) => VALID_KEYS.has(k));
  return cleaned.length ? cleaned : [];
}
function writeSelection(keys) {
  writeJSON(STORAGE_KEY, keys);
}

function readUsage() {
  const parsed = readJSON(USAGE_KEY);
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
}
function bumpUsage(key) {
  const usage = readUsage();
  usage[key] = (Number(usage[key]) || 0) + 1;
  writeJSON(USAGE_KEY, usage);
  return usage;
}

function readShortcuts() {
  const parsed = readJSON(SHORTCUTS_KEY);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((s) => s && typeof s === 'object' && s.title && s.target && (s.kind === 'tab' || s.kind === 'url'))
    .map((s) => ({
      id: String(s.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`),
      title: String(s.title),
      icon: ICON_CHOICES.includes(s.icon) ? s.icon : 'star',
      kind: s.kind === 'url' ? 'url' : 'tab',
      target: String(s.target),
    }));
}
function writeShortcuts(list) {
  writeJSON(SHORTCUTS_KEY, list);
}

const TODAY_FMT = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/* ---------- Métricas ---------- */
function buildMetrics(d) {
  if (!d) return [];
  return [
    { key: 'revenueToday', label: 'Receita hoje', value: brl(d.revenueToday), nav: 'revenue' },
    { key: 'ordersToday', label: 'Pedidos hoje', value: num(d.ordersToday), nav: 'orders' },
    { key: 'pendingOrders', label: 'Pedidos pendentes', value: num(d.pendingOrders), nav: 'orders', alert: Number(d.pendingOrders) > 0 },
    { key: 'openDisputes', label: 'Disputas abertas', value: num(d.openDisputes), nav: 'disputes', alert: Number(d.openDisputes) > 0 },
    { key: 'pendingPayments', label: 'Pagamentos pendentes', value: num(d.pendingPayments), nav: 'finance', alert: Number(d.pendingPayments) > 0 },
    {
      key: 'totalUsers',
      label: 'Usuários',
      value: num(d.totalUsers),
      hint: d.newUsersToday != null ? `+${num(d.newUsersToday)} hoje` : null,
      nav: 'users',
    },
    { key: 'flaggedMessages', label: 'Mensagens sinalizadas', value: num(d.flaggedMessages), nav: 'chat', alert: Number(d.flaggedMessages) > 0 },
    { key: 'lowStock', label: 'Estoque baixo', value: num(d.lowStock), nav: 'orders', alert: Number(d.lowStock) > 0 },
    { key: 'avgOrderValue', label: 'Ticket médio', value: brl(d.avgOrderValue), nav: 'analytics' },
  ];
}

const ICON_BY_METRIC = {
  revenueToday: 'dollar',
  ordersToday: 'package',
  pendingOrders: 'package',
  openDisputes: 'shield',
  pendingPayments: 'dollar',
  totalUsers: 'user',
  flaggedMessages: 'chat',
  lowStock: 'bolt',
  avgOrderValue: 'trending-up',
};

const EMPTY_DRAFT = { id: null, title: '', icon: 'star', kind: 'tab', tab: 'orders', url: '' };

export default function AdminHome({ onNavigate }) {
  // Começa com o padrão para um render SSR estável; hidrata do localStorage no client.
  const [selected, setSelected] = useState(DEFAULT_KEYS);
  const [editing, setEditing] = useState(false);
  const [today, setToday] = useState('');
  const [sortByUsage, setSortByUsage] = useState(false);
  const [usage, setUsage] = useState({});
  const [shortcuts, setShortcuts] = useState([]);

  // Métricas
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState(false);

  // Modal de atalho próprio
  const [shortcutModal, setShortcutModal] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [draftError, setDraftError] = useState('');

  useEffect(() => {
    const stored = readSelection();
    if (stored) setSelected(stored);
    setUsage(readUsage());
    setShortcuts(readShortcuts());
    const order = readJSON(ORDER_KEY);
    if (order === 'usage') setSortByUsage(true);
    try {
      setToday(TODAY_FMT.format(new Date()));
    } catch {
      setToday('');
    }

    let alive = true;
    (async () => {
      try {
        const data = await adminService.dashboard();
        if (!alive) return;
        setMetrics(data && typeof data === 'object' ? data : null);
        setMetricsError(false);
      } catch {
        if (!alive) return;
        setMetricsError(true);
      } finally {
        if (alive) setMetricsLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  function toggle(k) {
    setSelected((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  }

  function finishEditing() {
    writeSelection(selected);
    setEditing(false);
  }

  function restoreDefault() {
    setSelected(DEFAULT_KEYS);
    writeSelection(DEFAULT_KEYS);
  }

  function go(k) {
    if (editing) {
      toggle(k);
      return;
    }
    setUsage(bumpUsage(k));
    if (typeof onNavigate === 'function') onNavigate(k);
  }

  function toggleSort() {
    setSortByUsage((prev) => {
      const next = !prev;
      writeJSON(ORDER_KEY, next ? 'usage' : 'default');
      return next;
    });
  }

  function goMetric(nav) {
    if (!nav) return;
    setUsage(bumpUsage(nav));
    if (typeof onNavigate === 'function') onNavigate(nav);
  }

  /* ---------- Atalhos próprios ---------- */
  function openCreateShortcut() {
    setDraft(EMPTY_DRAFT);
    setDraftError('');
    setShortcutModal(true);
  }
  function openEditShortcut(sc) {
    setDraft({
      id: sc.id,
      title: sc.title,
      icon: sc.icon,
      kind: sc.kind,
      tab: sc.kind === 'tab' ? sc.target : 'orders',
      url: sc.kind === 'url' ? sc.target : '',
    });
    setDraftError('');
    setShortcutModal(true);
  }
  function saveShortcut() {
    const title = draft.title.trim();
    const target = draft.kind === 'tab' ? draft.tab : draft.url.trim();
    if (!title) {
      setDraftError('Informe um título.');
      return;
    }
    if (!target) {
      setDraftError(draft.kind === 'tab' ? 'Escolha uma seção.' : 'Informe um link de destino.');
      return;
    }
    const entry = {
      id: draft.id || `sc-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title,
      icon: draft.icon,
      kind: draft.kind,
      target,
    };
    setShortcuts((prev) => {
      const exists = prev.some((s) => s.id === entry.id);
      const next = exists ? prev.map((s) => (s.id === entry.id ? entry : s)) : [...prev, entry];
      writeShortcuts(next);
      return next;
    });
    setShortcutModal(false);
  }
  function removeShortcut(id) {
    setShortcuts((prev) => {
      const next = prev.filter((s) => s.id !== id);
      writeShortcuts(next);
      return next;
    });
  }
  function openShortcut(sc) {
    if (editing) return;
    if (sc.kind === 'tab' && VALID_KEYS.has(sc.target)) {
      go(sc.target);
      return;
    }
    if (sc.kind === 'url' && typeof window !== 'undefined') {
      const isExternal = /^https?:\/\//i.test(sc.target);
      if (isExternal) {
        window.open(sc.target, '_blank', 'noopener,noreferrer');
      } else {
        window.location.href = sc.target;
      }
    }
  }

  // Ordem das ações visíveis: catálogo ou "mais usados".
  const visible = useMemo(() => {
    const list = ACTIONS.filter((a) => selected.includes(a.k));
    if (!sortByUsage) return list;
    return [...list].sort((a, b) => (Number(usage[b.k]) || 0) - (Number(usage[a.k]) || 0));
  }, [selected, sortByUsage, usage]);

  const metricCards = metrics ? buildMetrics(metrics) : [];

  return (
    <section className={styles.wrap}>
      <header className={styles.head}>
        <div className={styles.headText}>
          <h2 className={styles.title}>Bem-vindo ao painel</h2>
          <p className={styles.subtitle}>
            Métricas, atalhos e acesso rápido às áreas que você mais usa.{' '}
            {today ? <span className={styles.date}>{today}</span> : null}
          </p>
        </div>
      </header>

      {/* ---------- MÉTRICAS ---------- */}
      {!metricsError ? (
        <div className={styles.metrics}>
          {metricsLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={cx(styles.metric, styles.metricSkeleton)} aria-hidden="true">
                  <span className={styles.skelBar} />
                  <span className={styles.skelBarSm} />
                </div>
              ))
            : metricCards.map((m) => {
                const clickable = !!m.nav;
                const Tag = clickable ? 'button' : 'div';
                return (
                  <Tag
                    key={m.key}
                    type={clickable ? 'button' : undefined}
                    className={cx(styles.metric, clickable && styles.metricClickable, m.alert && styles.metricAlert)}
                    onClick={clickable ? () => goMetric(m.nav) : undefined}
                  >
                    <span className={styles.metricIcon}>
                      <Icon name={ICON_BY_METRIC[m.key] || 'grid'} size={18} />
                    </span>
                    <span className={styles.metricLabel}>{m.label}</span>
                    <span className={styles.metricValue}>{m.value}</span>
                    {m.hint ? <span className={styles.metricHint}>{m.hint}</span> : null}
                  </Tag>
                );
              })}
        </div>
      ) : null}

      {/* ---------- AÇÕES RÁPIDAS ---------- */}
      <div className={styles.sectionHead}>
        <h3 className={styles.sectionTitle}>Ações rápidas</h3>
        <div className={styles.headActions}>
          {editing ? (
            <>
              <button type="button" className={styles.ghostBtn} onClick={restoreDefault}>
                <Icon name="sparkle" size={16} /> Restaurar padrão
              </button>
              <button type="button" className={styles.primaryBtn} onClick={finishEditing}>
                <Icon name="check" size={16} /> Concluir
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className={cx(styles.ghostBtn, sortByUsage && styles.ghostBtnOn)}
                onClick={toggleSort}
                aria-pressed={sortByUsage}
                title="Alternar ordenação"
              >
                <Icon name="trending-up" size={16} /> {sortByUsage ? 'Mais usados' : 'Padrão'}
              </button>
              <button type="button" className={styles.ghostBtn} onClick={openCreateShortcut}>
                <Icon name="plus" size={16} /> Criar atalho
              </button>
              <button type="button" className={styles.ghostBtn} onClick={() => setEditing(true)}>
                <Icon name="edit" size={16} /> Personalizar
              </button>
            </>
          )}
        </div>
      </div>

      {editing ? (
        <p className={styles.editHint}>
          Marque as ações que devem aparecer na sua página inicial. As alterações são salvas neste navegador.
        </p>
      ) : null}

      {editing ? (
        <div className={styles.grid}>
          {ACTIONS.map((a) => {
            const on = selected.includes(a.k);
            return (
              <button
                key={a.k}
                type="button"
                className={cx(styles.card, styles.cardEdit, on && styles.cardOn)}
                onClick={() => toggle(a.k)}
                aria-pressed={on}
              >
                <span className={cx(styles.checkbox, on && styles.checkboxOn)}>
                  {on ? <Icon name="check" size={14} /> : null}
                </span>
                <span className={styles.cardIcon}>
                  <Icon name={a.icon} size={22} />
                </span>
                <span className={styles.cardBody}>
                  <span className={styles.cardTitle}>{a.label}</span>
                  <span className={styles.cardDesc}>{a.desc}</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : visible.length || shortcuts.length ? (
        <div className={styles.grid}>
          {visible.map((a) => (
            <button key={a.k} type="button" className={styles.card} onClick={() => go(a.k)}>
              <span className={styles.cardIcon}>
                <Icon name={a.icon} size={22} />
              </span>
              <span className={styles.cardBody}>
                <span className={styles.cardTitle}>{a.label}</span>
                <span className={styles.cardDesc}>{a.desc}</span>
              </span>
              <span className={styles.cardArrow} aria-hidden="true">
                <Icon name="arrow-right" size={18} />
              </span>
            </button>
          ))}

          {shortcuts.map((sc) => {
            const destLabel =
              sc.kind === 'tab'
                ? `Seção: ${(ACTION_BY_KEY[sc.target] && ACTION_BY_KEY[sc.target].label) || sc.target}`
                : sc.target;
            return (
              <div
                key={sc.id}
                className={cx(styles.card, styles.cardCustom)}
                role="button"
                tabIndex={0}
                onClick={() => openShortcut(sc)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openShortcut(sc);
                  }
                }}
              >
                <span className={styles.customBadge}>Personalizado</span>
                <span className={styles.cardIcon}>
                  <Icon name={sc.icon} size={22} />
                </span>
                <span className={styles.cardBody}>
                  <span className={styles.cardTitle}>{sc.title}</span>
                  <span className={styles.cardDesc}>{destLabel}</span>
                </span>
                <span className={styles.customActions}>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    title="Editar atalho"
                    aria-label="Editar atalho"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditShortcut(sc);
                    }}
                  >
                    <Icon name="edit" size={15} />
                  </button>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    title="Remover atalho"
                    aria-label="Remover atalho"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeShortcut(sc.id);
                    }}
                  >
                    <Icon name="trash" size={15} />
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>
            <Icon name="grid" size={28} />
          </span>
          <p>Nenhuma ação rápida selecionada.</p>
          <div className={styles.emptyActions}>
            <button type="button" className={styles.primaryBtn} onClick={() => setEditing(true)}>
              <Icon name="edit" size={16} /> Adicionar ações
            </button>
            <button type="button" className={styles.ghostBtn} onClick={openCreateShortcut}>
              <Icon name="plus" size={16} /> Criar atalho
            </button>
          </div>
        </div>
      )}

      {/* ---------- MODAL: criar/editar atalho próprio ---------- */}
      <Modal
        open={shortcutModal}
        onClose={() => setShortcutModal(false)}
        title={draft.id ? 'Editar atalho' : 'Criar atalho'}
        footer={
          <div className={styles.modalFooter}>
            <button type="button" className={styles.ghostBtn} onClick={() => setShortcutModal(false)}>
              Cancelar
            </button>
            <button type="button" className={styles.primaryBtn} onClick={saveShortcut}>
              <Icon name="check" size={16} /> Salvar
            </button>
          </div>
        }
      >
        <div className={styles.form}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Título</span>
            <input
              type="text"
              className={styles.input}
              value={draft.title}
              maxLength={40}
              placeholder="Ex.: Pedidos urgentes"
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            />
          </label>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Ícone</span>
            <div className={styles.iconPicker}>
              {ICON_CHOICES.map((name) => (
                <button
                  key={name}
                  type="button"
                  className={cx(styles.iconChoice, draft.icon === name && styles.iconChoiceOn)}
                  onClick={() => setDraft((d) => ({ ...d, icon: name }))}
                  aria-label={name}
                  aria-pressed={draft.icon === name}
                >
                  <Icon name={name} size={20} />
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.fieldLabel}>Destino</span>
            <div className={styles.kindToggle}>
              <button
                type="button"
                className={cx(styles.kindBtn, draft.kind === 'tab' && styles.kindBtnOn)}
                onClick={() => setDraft((d) => ({ ...d, kind: 'tab' }))}
                aria-pressed={draft.kind === 'tab'}
              >
                Seção do painel
              </button>
              <button
                type="button"
                className={cx(styles.kindBtn, draft.kind === 'url' && styles.kindBtnOn)}
                onClick={() => setDraft((d) => ({ ...d, kind: 'url' }))}
                aria-pressed={draft.kind === 'url'}
              >
                Link / URL
              </button>
            </div>

            {draft.kind === 'tab' ? (
              <select
                className={styles.input}
                value={draft.tab}
                onChange={(e) => setDraft((d) => ({ ...d, tab: e.target.value }))}
              >
                {ACTIONS.map((a) => (
                  <option key={a.k} value={a.k}>
                    {a.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                className={styles.input}
                value={draft.url}
                placeholder="/admin ou https://exemplo.com"
                onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
              />
            )}
          </div>

          {draftError ? <p className={styles.formError}>{draftError}</p> : null}
        </div>
      </Modal>
    </section>
  );
}
