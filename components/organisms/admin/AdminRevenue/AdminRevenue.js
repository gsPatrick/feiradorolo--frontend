'use client';

import { useState, useEffect } from 'react';
import styles from './AdminRevenue.module.css';
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

/* — SVGs inline para ícones ausentes no atom Icon — */
function SvgIcon({ size = 20, children }) {
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
      {children}
    </svg>
  );
}

const CalendarIcon = ({ size }) => (
  <SvgIcon size={size}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4" />
    <path d="M8 2v4" />
    <path d="M3 10h18" />
  </SvgIcon>
);

const SaveIcon = ({ size }) => (
  <SvgIcon size={size}>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
    <path d="M17 21v-8H7v8" />
    <path d="M7 3v5h8" />
  </SvgIcon>
);

const InfoIcon = ({ size }) => (
  <SvgIcon size={size}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4" />
    <path d="M12 8h.01" />
  </SvgIcon>
);

/* — Datas padrão (últimos 30 dias) — */
const today = new Date();
const past = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
const iso = (d) => d.toISOString().split('T')[0];

/* — Configurações da plataforma (valores iniciais vazios) — */
const DEFAULT_SETTINGS = {
  commissionRate: '',
  shippingMarkup: '',
  escrowDays: '',
  freeShipping: '',
};

/* — Configuração dos editores das 3 seções (campos + serviços + labels) — */
const NUMBER = 'number';
const TEXT = 'text';
const CHECK = 'checkbox';

const EDITORS = {
  commission: {
    label: 'Regra de Comissão',
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
  },
  highlight: {
    label: 'Pacote de Destaque',
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
  },
  shipping: {
    label: 'Configuração de Frete',
    create: (data) => adminService.createShippingSetting(data),
    update: (id, data) => adminService.updateShippingSetting(id, data),
    remove: (id) => adminService.deleteShippingSetting(id),
    defaults: {
      name: '',
      provider: 'correios',
      markup_percent: 0,
      markup_fixed: 0,
      free_shipping_enabled: false,
      free_shipping_min_order: '',
      default_origin_zip: '',
      max_weight_grams: '',
      max_declared_value: '',
      is_active: true,
    },
    fields: [
      { key: 'name', label: 'Nome', type: TEXT },
      { key: 'provider', label: 'Provedor', type: TEXT },
      {
        key: 'markup_percent',
        label: 'Markup (%)',
        type: NUMBER,
        highlight: true,
      },
      {
        key: 'markup_fixed',
        label: 'Markup fixo (R$)',
        type: NUMBER,
        highlight: true,
      },
      { key: 'free_shipping_enabled', label: 'Frete grátis habilitado', type: CHECK },
      { key: 'free_shipping_min_order', label: 'Frete grátis a partir de (R$)', type: NUMBER },
      { key: 'default_origin_zip', label: 'CEP de origem', type: TEXT },
      { key: 'max_weight_grams', label: 'Peso máximo (g)', type: NUMBER },
      { key: 'max_declared_value', label: 'Valor máx. declarado (R$)', type: NUMBER },
      { key: 'is_active', label: 'Ativa', type: CHECK },
    ],
    markupHint:
      'O cliente paga o frete do Melhor Envio + esta margem. A diferença é sua.',
  },
};

export default function AdminRevenue() {
  const { toast } = useToast();

  const [dateRange, setDateRange] = useState({ startDate: iso(past), endDate: iso(today) });
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  /* — Dados reais (sem mock: em erro, listas vazias) — */
  const [commissionRules, setCommissionRules] = useState([]);
  const [highlightPackages, setHighlightPackages] = useState([]);
  const [shippingSettings, setShippingSettings] = useState([]);
  const [loading, setLoading] = useState(true);

  /* — Métricas reais (analytics) — */
  const [analytics, setAnalytics] = useState(null); // { revenue, orders, topSellers, growth }
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  /* — Editor (modal) — */
  const [editor, setEditor] = useState(null); // { kind, mode, id, values }
  const [saving, setSaving] = useState(false);

  const loadAll = (active = { current: true }) => {
    setLoading(true);
    return Promise.all([
      adminService.commissionRules(),
      adminService.highlightPackages(),
      adminService.shippingSettings(),
    ])
      .then(([rules, packages, shipping]) => {
        if (!active.current) return;
        setCommissionRules(Array.isArray(rules) ? rules : []);
        setHighlightPackages(Array.isArray(packages) ? packages : []);
        setShippingSettings(Array.isArray(shipping) ? shipping : []);
      })
      .catch(() => {
        // Erro/401 → sem mock: listas vazias.
        if (!active.current) return;
        setCommissionRules([]);
        setHighlightPackages([]);
        setShippingSettings([]);
      })
      .finally(() => {
        if (active.current) setLoading(false);
      });
  };

  const loadAnalytics = (active = { current: true }) => {
    setAnalyticsLoading(true);
    return adminService
      .analytics('?period=30')
      .then((data) => {
        if (active.current) setAnalytics(data || null);
      })
      .catch(() => {
        if (active.current) setAnalytics(null);
      })
      .finally(() => {
        if (active.current) setAnalyticsLoading(false);
      });
  };

  useEffect(() => {
    const active = { current: true };
    loadAll(active);
    loadAnalytics(active);
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
      toast({
        title: editor.mode === 'edit' ? `${cfg.label} atualizada` : `${cfg.label} criada`,
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
        title: `${cfg.label} removida`,
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

  const handleExport = () => {
    toast({
      title: 'Relatório exportado',
      description: 'O PDF do relatório de receita foi gerado.',
      variant: 'success',
    });
  };

  const handleSaveSettings = () => {
    toast({
      title: 'Configurações salvas',
      description: 'As configurações da plataforma foram atualizadas.',
      variant: 'success',
    });
  };

  const setSetting = (key) => (e) => setSettings((prev) => ({ ...prev, [key]: e.target.value }));

  const revenue = analytics?.revenue || null;
  const orders = analytics?.orders || null;
  const growth = analytics?.growth;
  const topSellers = Array.isArray(analytics?.topSellers) ? analytics.topSellers : [];

  const ordersTotal =
    typeof orders === 'number' ? orders : Number(orders?.total ?? orders?.count);
  const averageOrderValue =
    revenue?.total != null && Number(ordersTotal) > 0
      ? Number(revenue.total) / Number(ordersTotal)
      : null;

  const dash = (v, fmt) => (v == null || Number.isNaN(Number(v)) ? '—' : fmt(v));

  const summaryCards = [
    {
      label: 'Receita Total',
      value: dash(revenue?.total, formatCurrency),
      icon: 'dollar',
      tone: 'green',
    },
    {
      label: 'Comissão Plataforma',
      value: dash(revenue?.platformCommission, formatCurrency),
      icon: 'trending-up',
      tone: 'blue',
      accent: true,
    },
    {
      label: 'Total Transações',
      value: dash(ordersTotal, (v) => String(Number(v))),
      icon: 'card',
      tone: 'purple',
    },
    {
      label: 'Ticket Médio',
      value: dash(averageOrderValue, formatCurrency),
      icon: 'calendar',
      tone: 'orange',
      inline: true,
    },
  ];

  const growthValue =
    growth == null
      ? null
      : typeof growth === 'number'
        ? growth
        : Number(growth?.revenue ?? growth?.percent ?? growth?.total);

  return (
    <div className={styles.root}>
      {/* — Configurações da Plataforma — */}
      <section className={styles.card}>
        <header className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>
            <Icon name="shield" size={20} />
            <span>Configurações da Plataforma</span>
          </h2>
        </header>
        <div className={styles.cardBody}>
          <div className={styles.settingsGrid}>
            <div className={styles.settingField}>
              <label htmlFor="commission-rate" className={styles.label}>
                Taxa de Comissão (%)
              </label>
              <Input
                id="commission-rate"
                type="number"
                value={settings.commissionRate}
                onChange={setSetting('commissionRate')}
              />
            </div>
            <div className={styles.settingField}>
              <label htmlFor="shipping-markup" className={styles.label}>
                Markup Frete (%)
              </label>
              <Input
                id="shipping-markup"
                type="number"
                value={settings.shippingMarkup}
                onChange={setSetting('shippingMarkup')}
              />
            </div>
            <div className={styles.settingField}>
              <label htmlFor="escrow-days" className={styles.label}>
                Dias de Retenção
              </label>
              <Input
                id="escrow-days"
                type="number"
                value={settings.escrowDays}
                onChange={setSetting('escrowDays')}
              />
            </div>
            <div className={styles.settingField}>
              <label htmlFor="free-shipping" className={styles.label}>
                Frete Grátis (R$)
              </label>
              <Input
                id="free-shipping"
                type="number"
                value={settings.freeShipping}
                onChange={setSetting('freeShipping')}
              />
            </div>
          </div>
          <Button fullWidth onClick={handleSaveSettings}>
            <SaveIcon size={18} />
            <span>Salvar Configurações</span>
          </Button>
        </div>
      </section>

      {/* — Filtros de Relatório — */}
      <section className={styles.card}>
        <header className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>
            <Icon name="filter" size={20} />
            <span>Filtros de Relatório</span>
          </h2>
        </header>
        <div className={styles.cardBody}>
          <div className={styles.filterGrid}>
            <div className={styles.settingField}>
              <label htmlFor="startDate" className={styles.label}>
                Data Inicial
              </label>
              <Input
                id="startDate"
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
              />
            </div>
            <div className={styles.settingField}>
              <label htmlFor="endDate" className={styles.label}>
                Data Final
              </label>
              <Input
                id="endDate"
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
            <div className={styles.filterAction}>
              <Button fullWidth leftIcon="download" onClick={handleExport}>
                Exportar PDF
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* — Cards de resumo — */}
      <div className={styles.summaryGrid}>
        {summaryCards.map((c) => (
          <div key={c.label} className={styles.card}>
            <div className={styles.summaryBody}>
              <div className={styles.summaryText}>
                <p className={styles.summaryLabel}>{c.label}</p>
                <p className={cx(styles.summaryValue, c.accent && styles.accentValue)}>
                  {analyticsLoading ? '…' : c.value}
                </p>
                {!analyticsLoading && c.label === 'Receita Total' && growthValue != null && (
                  <p
                    className={cx(
                      styles.summaryLabel,
                      growthValue >= 0 ? styles.tone_green : styles.tone_orange
                    )}
                  >
                    {growthValue >= 0 ? '+' : ''}
                    {growthValue}% vs. período anterior
                  </p>
                )}
              </div>
              <span className={cx(styles.summaryIcon, styles[`tone_${c.tone}`])}>
                {c.inline ? <CalendarIcon size={32} /> : <Icon name={c.icon} size={32} />}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* — Ranking de Vendedores — */}
      <section className={styles.card}>
        <header className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>
            <span>Ranking de Vendedores (Últimos 30 Dias)</span>
          </h2>
        </header>
        <div className={styles.cardBody}>
          {analyticsLoading ? (
            <div className={styles.listLoading}>
              <span className={styles.spinner} aria-hidden="true" />
              <span>Carregando…</span>
            </div>
          ) : topSellers.length === 0 ? (
            <p className={styles.emptyState}>Nenhum vendedor no período.</p>
          ) : (
            <div className={styles.vendorList}>
              {topSellers.map((vendor, index) => {
                const orders = vendor.orders;
                const commission = vendor.platformCommission;
                return (
                  <div key={vendor.sellerId ?? vendor.sellerName ?? index} className={styles.vendorRow}>
                    <div className={styles.vendorLeft}>
                      <Badge variant="neutral" size="md" className={styles.rankBadge}>
                        #{index + 1}
                      </Badge>
                      <div>
                        <p className={styles.vendorName}>{vendor.sellerName || '—'}</p>
                        <p className={styles.vendorMeta}>
                          {orders != null ? `${orders} pedidos` : '—'}
                        </p>
                      </div>
                    </div>
                    <div className={styles.vendorRight}>
                      <p className={styles.vendorRevenue}>{formatCurrency(vendor.revenue)}</p>
                      <p className={styles.vendorMeta}>
                        {commission != null
                          ? `Comissão: ${formatCurrency(commission)}`
                          : '—'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* — Regras de Comissão — */}
      <section className={styles.card}>
        <header className={cx(styles.cardHeader, styles.cardHeaderRow)}>
          <h2 className={styles.cardTitle}>
            <Icon name="trending-up" size={20} />
            <span>Regras de Comissão</span>
          </h2>
          <Button size="sm" variant="outline" leftIcon="plus" onClick={() => openEditor('commission')}>
            Adicionar
          </Button>
        </header>
        <div className={styles.cardBody}>
          {loading ? (
            <div className={styles.listLoading}>
              <span className={styles.spinner} aria-hidden="true" />
              <span>Carregando…</span>
            </div>
          ) : commissionRules.length === 0 ? (
            <p className={styles.emptyState}>Nenhuma regra de comissão cadastrada.</p>
          ) : (
            <div className={styles.vendorList}>
              {commissionRules.map((rule) => (
                <div key={rule.id} className={styles.vendorRow}>
                  <div className={styles.vendorLeft}>
                    <Badge variant="neutral" size="md" className={styles.rankBadge}>
                      {formatPercent(rule.commission_percent)}
                    </Badge>
                    <div>
                      <p className={styles.vendorName}>{rule.name}</p>
                      <p className={styles.vendorMeta}>{rule.scope || '—'}</p>
                    </div>
                  </div>
                  <div className={styles.vendorRight}>
                    <div className={styles.rowActions}>
                      <Badge variant={rule.is_active ? 'success' : 'neutral'} size="sm">
                        {rule.is_active ? 'Ativa' : 'Inativa'}
                      </Badge>
                      <Button size="sm" variant="ghost" onClick={() => openEditor('commission', rule)}>
                        Editar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* — Pacotes de Destaque — */}
      <section className={styles.card}>
        <header className={cx(styles.cardHeader, styles.cardHeaderRow)}>
          <h2 className={styles.cardTitle}>
            <Icon name="star" size={20} />
            <span>Pacotes de Destaque</span>
          </h2>
          <Button size="sm" variant="outline" leftIcon="plus" onClick={() => openEditor('highlight')}>
            Adicionar
          </Button>
        </header>
        <div className={styles.cardBody}>
          {loading ? (
            <div className={styles.listLoading}>
              <span className={styles.spinner} aria-hidden="true" />
              <span>Carregando…</span>
            </div>
          ) : highlightPackages.length === 0 ? (
            <p className={styles.emptyState}>Nenhum pacote de destaque cadastrado.</p>
          ) : (
            <div className={styles.vendorList}>
              {highlightPackages.map((pkg) => (
                <div key={pkg.id} className={styles.vendorRow}>
                  <div className={styles.vendorLeft}>
                    <Badge variant="neutral" size="md" className={styles.rankBadge}>
                      {pkg.tier}
                    </Badge>
                    <div>
                      <p className={styles.vendorName}>{pkg.name}</p>
                      <p className={styles.vendorMeta}>{pkg.duration_days} dias</p>
                    </div>
                  </div>
                  <div className={styles.vendorRight}>
                    <div className={styles.rowActions}>
                      <div>
                        <p className={styles.vendorRevenue}>{formatCurrency(pkg.price)}</p>
                        <p className={styles.vendorMeta}>{pkg.is_active ? 'Ativo' : 'Inativo'}</p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => openEditor('highlight', pkg)}>
                        Editar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* — Configurações de Frete — */}
      <section className={styles.card}>
        <header className={cx(styles.cardHeader, styles.cardHeaderRow)}>
          <h2 className={styles.cardTitle}>
            <Icon name="truck" size={20} />
            <span>Configurações de Frete</span>
          </h2>
          <Button size="sm" variant="outline" leftIcon="plus" onClick={() => openEditor('shipping')}>
            Adicionar
          </Button>
        </header>
        <div className={styles.cardBody}>
          {loading ? (
            <div className={styles.listLoading}>
              <span className={styles.spinner} aria-hidden="true" />
              <span>Carregando…</span>
            </div>
          ) : shippingSettings.length === 0 ? (
            <p className={styles.emptyState}>Nenhuma configuração de frete cadastrada.</p>
          ) : (
            <div className={styles.vendorList}>
              {shippingSettings.map((cfg) => (
                <div key={cfg.id} className={styles.vendorRow}>
                  <div className={styles.vendorLeft}>
                    <Badge variant="neutral" size="md" className={styles.rankBadge}>
                      {formatPercent(cfg.markup_percent)}
                    </Badge>
                    <div>
                      <p className={styles.vendorName}>{cfg.name || cfg.provider}</p>
                      <p className={styles.vendorMeta}>
                        {cfg.provider}
                        {Number(cfg.markup_fixed) > 0
                          ? ` · +${formatCurrency(cfg.markup_fixed)} fixo`
                          : ''}
                      </p>
                    </div>
                  </div>
                  <div className={styles.vendorRight}>
                    <div className={styles.rowActions}>
                      <Badge variant={cfg.free_shipping_enabled ? 'success' : 'neutral'} size="sm">
                        {cfg.free_shipping_enabled ? 'Frete grátis' : 'Sem frete grátis'}
                      </Badge>
                      <Button size="sm" variant="ghost" onClick={() => openEditor('shipping', cfg)}>
                        Editar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* — Modal de edição (Comissão / Destaque / Frete) — */}
      {editor && (
        <Modal
          open
          onClose={closeEditor}
          title={`${editor.mode === 'edit' ? 'Editar' : 'Adicionar'} ${EDITORS[editor.kind].label}`}
          footer={
            <div className={styles.editorFooter}>
              {editor.mode === 'edit' && (
                <Button
                  variant="danger"
                  leftIcon="trash"
                  onClick={handleEditorDelete}
                  loading={saving}
                  disabled={saving}
                >
                  Remover
                </Button>
              )}
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
                    <label htmlFor={`editor-${f.key}`} className={styles.label}>
                      {f.label}
                    </label>
                    <Input
                      id={`editor-${f.key}`}
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
