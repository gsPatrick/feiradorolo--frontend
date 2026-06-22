'use client';

import { useEffect, useState } from 'react';
import styles from './AdminHome.module.css';
import { cx } from '@/lib/cx';
import Icon from '@/components/atoms/Icon/Icon';

const STORAGE_KEY = 'fdr.adminQuickActions';

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

function readSelection() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const cleaned = parsed.filter((k) => VALID_KEYS.has(k));
    return cleaned.length ? cleaned : [];
  } catch {
    return null;
  }
}

function writeSelection(keys) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  } catch {
    /* armazenamento indisponível — segue sem persistir */
  }
}

const TODAY_FMT = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export default function AdminHome({ onNavigate }) {
  // Começa com o padrão para um render SSR estável; hidrata do localStorage no client.
  const [selected, setSelected] = useState(DEFAULT_KEYS);
  const [editing, setEditing] = useState(false);
  const [today, setToday] = useState('');

  useEffect(() => {
    const stored = readSelection();
    if (stored) setSelected(stored);
    try {
      setToday(TODAY_FMT.format(new Date()));
    } catch {
      setToday('');
    }
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
    if (typeof onNavigate === 'function') onNavigate(k);
  }

  // Mantém a ordem do catálogo nas ações visíveis.
  const visible = ACTIONS.filter((a) => selected.includes(a.k));

  return (
    <section className={styles.wrap}>
      <header className={styles.head}>
        <div className={styles.headText}>
          <h2 className={styles.title}>Bem-vindo ao painel</h2>
          <p className={styles.subtitle}>
            Acesso rápido às áreas que você mais usa. {today ? <span className={styles.date}>{today}</span> : null}
          </p>
        </div>
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
            <button type="button" className={styles.ghostBtn} onClick={() => setEditing(true)}>
              <Icon name="edit" size={16} /> Personalizar
            </button>
          )}
        </div>
      </header>

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
      ) : visible.length ? (
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
        </div>
      ) : (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>
            <Icon name="grid" size={28} />
          </span>
          <p>Nenhuma ação rápida selecionada.</p>
          <button type="button" className={styles.primaryBtn} onClick={() => setEditing(true)}>
            <Icon name="edit" size={16} /> Adicionar ações
          </button>
        </div>
      )}
    </section>
  );
}
