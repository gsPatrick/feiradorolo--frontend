'use client';

import { useState, useEffect } from 'react';
import styles from './AdminFinance.module.css';
import { cx } from '@/lib/cx';
import Button from '@/components/atoms/Button/Button';
import Input from '@/components/atoms/Input/Input';
import Badge from '@/components/atoms/Badge/Badge';
import Icon from '@/components/atoms/Icon/Icon';
import Modal from '@/components/organisms/Modal/Modal';
import { useToast } from '@/components/providers/ToastProvider';
import { adminService, ApiError } from '@/lib/api';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const formatCurrency = (value) => BRL.format(Number(value) || 0);
const formatPercent = (value) => `${Number(value) || 0}%`;

/* — SVG inline (ícone "info" não existe no atom Icon) — */
function InfoIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  );
}

/* — Tipos de campo — */
const NUMBER = 'number';
const TEXT = 'text';
const CHECK = 'checkbox';

/* — Configuração declarativa das 3 seções (lista + form + serviços) — */
const EDITORS = {
  commission: {
    icon: 'dollar',
    sectionTitle: 'Comissão da plataforma',
    label: 'Regra de Comissão',
    feminine: true,
    emptyText: 'Nenhuma regra de comissão cadastrada.',
    addLabel: 'Adicionar regra',
    list: () => adminService.commissionRules(),
    create: (data) => adminService.createCommissionRule(data),
    update: (id, data) => adminService.updateCommissionRule(id, data),
    remove: (id) => adminService.deleteCommissionRule(id),
    defaults: {
      name: '',
      scope: 'global',
      seller_tier: '',
      commission_percent: 10,
      min_commission_amount: '',
      max_commission_amount: '',
      escrow_hold_days: 7,
      priority: 0,
      is_active: true,
    },
    fields: [
      { key: 'name', label: 'Nome', type: TEXT },
      {
        key: 'commission_percent',
        label: 'Comissão da plataforma (%)',
        type: NUMBER,
        highlight: true,
        hint: 'Percentual que a plataforma retém de cada venda.',
      },
      { key: 'scope', label: 'Escopo', type: TEXT },
      { key: 'seller_tier', label: 'Nível do vendedor (tier)', type: TEXT },
      { key: 'min_commission_amount', label: 'Comissão mínima (R$)', type: NUMBER },
      { key: 'max_commission_amount', label: 'Comissão máxima (R$)', type: NUMBER },
      { key: 'escrow_hold_days', label: 'Dias de retenção (escrow)', type: NUMBER },
      { key: 'priority', label: 'Prioridade', type: NUMBER },
      { key: 'is_active', label: 'Ativa', type: CHECK },
    ],
    /* — Como cada item aparece na lista — */
    row: (rule) => ({
      badge: formatPercent(rule.commission_percent),
      title: rule.name || '—',
      meta: rule.seller_tier ? `tier: ${rule.seller_tier}` : rule.scope || '—',
      active: rule.is_active,
      activeLabel: rule.is_active ? 'Ativa' : 'Inativa',
    }),
  },

  shipping: {
    icon: 'truck',
    sectionTitle: 'Frete & Margem',
    label: 'Configuração de Frete',
    feminine: true,
    emptyText: 'Nenhuma configuração de frete cadastrada.',
    addLabel: 'Adicionar frete',
    markupHint: 'O cliente paga o frete do Melhor Envio + esta margem. A diferença é sua.',
    list: () => adminService.shippingSettings(),
    create: (data) => adminService.createShippingSetting(data),
    update: (id, data) => adminService.updateShippingSetting(id, data),
    remove: (id) => adminService.deleteShippingSetting(id),
    defaults: {
      name: '',
      provider: 'melhor_envio',
      markup_percent: 0,
      markup_fixed: 0,
      free_shipping_enabled: false,
      free_shipping_min_order: '',
      default_origin_zip: '',
      is_active: true,
    },
    fields: [
      { key: 'name', label: 'Nome', type: TEXT },
      { key: 'provider', label: 'Provedor', type: TEXT },
      {
        key: 'markup_percent',
        label: 'Margem sobre o frete (%)',
        type: NUMBER,
        highlight: true,
      },
      {
        key: 'markup_fixed',
        label: 'Margem fixa (R$)',
        type: NUMBER,
        highlight: true,
      },
      { key: 'free_shipping_enabled', label: 'Frete grátis habilitado', type: CHECK },
      { key: 'free_shipping_min_order', label: 'Frete grátis a partir de (R$)', type: NUMBER },
      { key: 'default_origin_zip', label: 'CEP de origem', type: TEXT },
      { key: 'is_active', label: 'Ativa', type: CHECK },
    ],
    row: (cfg) => ({
      badge: formatPercent(cfg.markup_percent),
      title: cfg.name || cfg.provider || '—',
      meta:
        (cfg.provider || '—') +
        (Number(cfg.markup_fixed) > 0 ? ` · +${formatCurrency(cfg.markup_fixed)} fixo` : ''),
      active: cfg.free_shipping_enabled,
      activeLabel: cfg.free_shipping_enabled ? 'Frete grátis' : 'Sem frete grátis',
    }),
  },

  highlight: {
    icon: 'star',
    sectionTitle: 'Planos de Destaque',
    label: 'Plano de Destaque',
    feminine: false,
    emptyText: 'Nenhum plano de destaque cadastrado.',
    addLabel: 'Adicionar plano',
    list: () => adminService.highlightPackages(),
    create: (data) => adminService.createHighlightPackage(data),
    update: (id, data) => adminService.updateHighlightPackage(id, data),
    remove: (id) => adminService.deleteHighlightPackage(id),
    defaults: {
      tier: 'silver',
      name: '',
      price: 0,
      currency: 'BRL',
      duration_days: 7,
      is_active: true,
    },
    fields: [
      { key: 'name', label: 'Nome do plano', type: TEXT },
      { key: 'price', label: 'Preço (R$)', type: NUMBER, highlight: true },
      { key: 'duration_days', label: 'Duração (dias)', type: NUMBER },
      { key: 'tier', label: 'Tier', type: TEXT },
      { key: 'currency', label: 'Moeda', type: TEXT },
      { key: 'is_active', label: 'Ativo', type: CHECK },
    ],
    row: (pkg) => ({
      badge: pkg.tier || '—',
      title: pkg.name || '—',
      meta: pkg.duration_days != null ? `${pkg.duration_days} dias` : '—',
      value: formatCurrency(pkg.price),
      active: pkg.is_active,
      activeLabel: pkg.is_active ? 'Ativo' : 'Inativo',
    }),
  },
};

const SECTIONS = ['commission', 'shipping', 'highlight'];

export default function AdminFinance() {
  const { toast } = useToast();

  /* — Dados reais (sem mock: em erro, listas vazias) — */
  const [data, setData] = useState({ commission: [], shipping: [], highlight: [] });
  const [loading, setLoading] = useState(true);

  /* — Editor (modal) — */
  const [editor, setEditor] = useState(null); // { kind, mode, id, values }
  const [saving, setSaving] = useState(false);

  const loadAll = (active = { current: true }) => {
    setLoading(true);
    return Promise.all([
      EDITORS.commission.list(),
      EDITORS.shipping.list(),
      EDITORS.highlight.list(),
    ])
      .then(([commission, shipping, highlight]) => {
        if (!active.current) return;
        setData({
          commission: Array.isArray(commission) ? commission : [],
          shipping: Array.isArray(shipping) ? shipping : [],
          highlight: Array.isArray(highlight) ? highlight : [],
        });
      })
      .catch(() => {
        // Erro/401 → sem mock: listas vazias.
        if (!active.current) return;
        setData({ commission: [], shipping: [], highlight: [] });
      })
      .finally(() => {
        if (active.current) setLoading(false);
      });
  };

  useEffect(() => {
    const active = { current: true };
    loadAll(active);
    return () => {
      active.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* — Abre o editor de uma seção (item existente ou novo) — */
  const openEditor = (kind, item) => {
    const cfg = EDITORS[kind];
    const base = item || cfg.defaults;
    const values = {};
    cfg.fields.forEach((f) => {
      const v = base[f.key];
      values[f.key] = f.type === CHECK ? Boolean(v) : v == null ? '' : String(v);
    });
    setEditor({ kind, mode: item ? 'edit' : 'create', id: item ? item.id : null, values });
  };

  const closeEditor = () => {
    if (!saving) setEditor(null);
  };

  const setEditorValue = (key, value) =>
    setEditor((prev) => (prev ? { ...prev, values: { ...prev.values, [key]: value } } : prev));

  /* — Serializa: number vazio → null, checkbox → bool, número → Number — */
  const serialize = (kind, values) => {
    const cfg = EDITORS[kind];
    const out = {};
    cfg.fields.forEach((f) => {
      const raw = values[f.key];
      if (f.type === CHECK) {
        out[f.key] = Boolean(raw);
      } else if (f.type === NUMBER) {
        out[f.key] = raw === '' || raw == null ? null : Number(raw);
      } else {
        out[f.key] = raw === '' ? null : raw;
      }
    });
    return out;
  };

  const handleEditorSave = async () => {
    if (!editor) return;
    const cfg = EDITORS[editor.kind];
    const payload = serialize(editor.kind, editor.values);
    setSaving(true);
    try {
      if (editor.mode === 'edit') {
        await cfg.update(editor.id, payload);
      } else {
        await cfg.create(payload);
      }
      const suffix = cfg.feminine
        ? editor.mode === 'edit'
          ? 'atualizada'
          : 'criada'
        : editor.mode === 'edit'
          ? 'atualizado'
          : 'criado';
      toast({
        title: `${cfg.label} ${suffix}`,
        description: 'As alterações foram salvas com sucesso.',
        variant: 'success',
      });
      setEditor(null);
      await loadAll();
    } catch (err) {
      toast({
        title: 'Não foi possível salvar',
        description: err instanceof ApiError ? err.message : 'Tente novamente.',
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEditorDelete = async () => {
    if (!editor || editor.mode !== 'edit') return;
    const cfg = EDITORS[editor.kind];
    setSaving(true);
    try {
      await cfg.remove(editor.id);
      toast({
        title: `${cfg.label} ${cfg.feminine ? 'removida' : 'removido'}`,
        description: 'O item foi excluído.',
        variant: 'success',
      });
      setEditor(null);
      await loadAll();
    } catch (err) {
      toast({
        title: 'Não foi possível remover',
        description: err instanceof ApiError ? err.message : 'Tente novamente.',
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.root}>
      {/* — Aviso sobre o gateway de pagamento — */}
      <p className={styles.notice}>
        <InfoIcon size={18} />
        <span>As chaves do gateway de pagamento (Mercado Pago) ficam na aba Integrações.</span>
      </p>

      {/* — As 3 seções (Comissão / Frete & Margem / Planos de Destaque) — */}
      {SECTIONS.map((kind) => {
        const cfg = EDITORS[kind];
        const items = data[kind];
        return (
          <section key={kind} className={styles.card}>
            <header className={cx(styles.cardHeader, styles.cardHeaderRow)}>
              <h2 className={styles.cardTitle}>
                <Icon name={cfg.icon} size={20} />
                <span>{cfg.sectionTitle}</span>
              </h2>
            </header>
            <div className={styles.cardBody}>
              {kind === 'shipping' && (
                <p className={styles.markupHint}>
                  <InfoIcon size={18} />
                  <span>{cfg.markupHint}</span>
                </p>
              )}
              {loading ? (
                <div className={styles.listLoading}>
                  <span className={styles.spinner} aria-hidden="true" />
                  <span>Carregando…</span>
                </div>
              ) : items.length === 0 ? (
                <p className={styles.emptyState}>Nenhum registro</p>
              ) : (
                <div className={styles.list}>
                  {items.map((item) => {
                    const r = cfg.row(item);
                    return (
                      <div key={item.id} className={styles.row}>
                        <div className={styles.rowLeft}>
                          <Badge variant="neutral" size="md" className={styles.rowBadge}>
                            {r.badge}
                          </Badge>
                          <div className={styles.rowInfo}>
                            <p className={styles.rowTitle}>{r.title}</p>
                            <p className={styles.rowMeta}>{r.meta}</p>
                          </div>
                        </div>
                        <div className={styles.rowRight}>
                          {r.value != null && <p className={styles.rowValue}>{r.value}</p>}
                          <Badge variant={r.active ? 'success' : 'neutral'} size="sm">
                            {r.activeLabel}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            leftIcon="edit"
                            onClick={() => openEditor(kind, item)}
                          >
                            Editar
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        );
      })}

      {/* — Modal de edição (Comissão / Frete / Plano) — */}
      {editor && (
        <Modal
          open
          onClose={closeEditor}
          title={`Editar ${EDITORS[editor.kind].label}`}
          footer={
            <div className={styles.editorFooter}>
              <div className={styles.editorFooterRight}>
                <Button variant="ghost" onClick={closeEditor} disabled={saving}>
                  Cancelar
                </Button>
                <Button onClick={handleEditorSave} loading={saving} disabled={saving}>
                  Salvar
                </Button>
              </div>
            </div>
          }
        >
          <form
            className={styles.editorForm}
            onSubmit={(e) => {
              e.preventDefault();
              handleEditorSave();
            }}
          >
            {editor.kind === 'shipping' && (
              <p className={styles.markupHint}>
                <InfoIcon size={18} />
                <span>{EDITORS.shipping.markupHint}</span>
              </p>
            )}
            <div className={styles.editorGrid}>
              {EDITORS[editor.kind].fields.map((f) =>
                f.type === CHECK ? (
                  <label key={f.key} className={cx(styles.editorCheck, styles.editorFull)}>
                    <input
                      type="checkbox"
                      checked={Boolean(editor.values[f.key])}
                      onChange={(e) => setEditorValue(f.key, e.target.checked)}
                    />
                    <span>{f.label}</span>
                  </label>
                ) : (
                  <div
                    key={f.key}
                    className={cx(styles.settingField, f.highlight && styles.editorHighlight)}
                  >
                    <label htmlFor={`finance-editor-${f.key}`} className={styles.label}>
                      {f.label}
                    </label>
                    <Input
                      id={`finance-editor-${f.key}`}
                      type={f.type === NUMBER ? 'number' : 'text'}
                      value={editor.values[f.key]}
                      onChange={(e) => setEditorValue(f.key, e.target.value)}
                    />
                    {f.hint && <p className={styles.fieldHint}>{f.hint}</p>}
                  </div>
                )
              )}
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
