'use client';

import { useState, useEffect } from 'react';
import styles from './AdminPlans.module.css';
import { cx } from '@/lib/cx';
import Button from '@/components/atoms/Button/Button';
import Input from '@/components/atoms/Input/Input';
import Badge from '@/components/atoms/Badge/Badge';
import Icon from '@/components/atoms/Icon/Icon';
import Modal from '@/components/organisms/Modal/Modal';
import { useToast } from '@/components/providers/ToastProvider';
import { adminService, categoryService, ApiError } from '@/lib/api';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const formatCurrency = (value) => BRL.format(Number(value) || 0);

/* — Tipos de plano (rótulos amigáveis) — */
const PLAN_TYPES = [
  { value: 'category_package', label: 'Pacote de categoria' },
  { value: 'seller_premium', label: 'Vendedor premium' },
  { value: 'service_upgrade', label: 'Upgrade de serviço' },
];
const typeLabel = (t) => PLAN_TYPES.find((p) => p.value === t)?.label || t || '—';

/* — Valores padrão de um novo plano — */
const DEFAULTS = {
  name: '',
  type: 'category_package',
  category_id: '',
  price: 0,
  duration_days: 30,
  listing_limit: '',
  is_active: true,
};

/* — Achata a árvore de categorias (caso categoryService.tree seja usado) — */
function flattenCategories(nodes, depth = 0, acc = []) {
  if (!Array.isArray(nodes)) return acc;
  nodes.forEach((node) => {
    if (!node) return;
    acc.push({ id: node.id, name: `${'— '.repeat(depth)}${node.name}` });
    const children = node.children || node.subcategories || node.childrenCategories;
    if (Array.isArray(children) && children.length) flattenCategories(children, depth + 1, acc);
  });
  return acc;
}

export default function AdminPlans() {
  const { toast } = useToast();

  const [plans, setPlans] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editor, setEditor] = useState(null); // { mode, id, values }
  const [saving, setSaving] = useState(false);

  const loadAll = (active = { current: true }) => {
    setLoading(true);
    return Promise.all([
      adminService.plans().catch(() => []),
      categoryService.tree().catch(() => categoryService.list().catch(() => [])),
    ])
      .then(([plansRes, catsRes]) => {
        if (!active.current) return;
        const list = Array.isArray(plansRes) ? plansRes : plansRes?.items || [];
        setPlans(Array.isArray(list) ? list : []);
        // tree() devolve árvore; list() devolve flat — normaliza nos dois casos.
        const flat = flattenCategories(catsRes);
        setCategories(flat.length ? flat : Array.isArray(catsRes) ? catsRes.map((c) => ({ id: c.id, name: c.name })) : []);
      })
      .catch(() => {
        if (!active.current) return;
        setPlans([]);
        setCategories([]);
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

  const categoryName = (plan) => {
    if (plan.category?.name) return plan.category.name;
    if (plan.category_id == null || plan.category_id === '') return null;
    const found = categories.find((c) => String(c.id) === String(plan.category_id));
    return found ? found.name.replace(/^(?:— )+/, '') : `#${plan.category_id}`;
  };

  /* — Abre o editor (item existente ou novo) — */
  const openEditor = (item) => {
    const base = item || DEFAULTS;
    setEditor({
      mode: item ? 'edit' : 'create',
      id: item ? item.id : null,
      values: {
        name: base.name ?? '',
        type: base.type ?? 'category_package',
        category_id: base.category_id == null ? '' : String(base.category_id),
        price: base.price == null ? '' : String(base.price),
        duration_days: base.duration_days == null ? '' : String(base.duration_days),
        listing_limit: base.listing_limit == null ? '' : String(base.listing_limit),
        is_active: item ? Boolean(base.is_active) : true,
      },
    });
  };

  const closeEditor = () => {
    if (!saving) setEditor(null);
  };

  const setValue = (key, value) =>
    setEditor((prev) => (prev ? { ...prev, values: { ...prev.values, [key]: value } } : prev));

  /* — Serializa: number vazio → null, checkbox → bool, category vazio → null — */
  const serialize = (values) => ({
    name: values.name?.trim() ? values.name.trim() : null,
    type: values.type || null,
    category_id: values.category_id === '' || values.category_id == null ? null : Number(values.category_id),
    price: values.price === '' || values.price == null ? null : Number(values.price),
    duration_days:
      values.duration_days === '' || values.duration_days == null ? null : Number(values.duration_days),
    listing_limit:
      values.listing_limit === '' || values.listing_limit == null ? null : Number(values.listing_limit),
    is_active: Boolean(values.is_active),
  });

  const handleSave = async () => {
    if (!editor) return;
    const payload = serialize(editor.values);
    setSaving(true);
    try {
      if (editor.mode === 'edit') {
        await adminService.updatePlan(editor.id, payload);
      } else {
        await adminService.createPlan(payload);
      }
      toast({
        title: `Plano ${editor.mode === 'edit' ? 'atualizado' : 'criado'}`,
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

  const handleDelete = async (plan) => {
    setSaving(true);
    try {
      await adminService.deletePlan(plan.id);
      toast({
        title: 'Plano removido',
        description: 'O plano foi excluído.',
        variant: 'success',
      });
      if (editor && editor.id === plan.id) setEditor(null);
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
      {/* — Aviso sobre planos vinculados a categoria — */}
      <p className={styles.notice}>
        <Icon name="package" size={18} />
        <span>
          Planos vinculados a uma categoria liberam a publicação em categorias que exigem plano
          (ex.: Imóveis, Veículos).
        </span>
      </p>

      <section className={styles.card}>
        <header className={cx(styles.cardHeader, styles.cardHeaderRow)}>
          <h2 className={styles.cardTitle}>
            <Icon name="package" size={20} />
            <span>Planos</span>
          </h2>
          <Button size="sm" variant="primary" leftIcon="plus" onClick={() => openEditor(null)}>
            Novo plano
          </Button>
        </header>

        <div className={styles.cardBody}>
          {loading ? (
            <div className={styles.listLoading}>
              <span className={styles.spinner} aria-hidden="true" />
              <span>Carregando…</span>
            </div>
          ) : plans.length === 0 ? (
            <p className={styles.emptyState}>Nenhum plano cadastrado</p>
          ) : (
            <div className={styles.list}>
              {plans.map((plan) => {
                const cat = categoryName(plan);
                return (
                  <div key={plan.id} className={styles.row}>
                    <div className={styles.rowLeft}>
                      <Badge variant="neutral" size="md" className={styles.rowBadge}>
                        {typeLabel(plan.type)}
                      </Badge>
                      <div className={styles.rowInfo}>
                        <p className={styles.rowTitle}>{plan.name || '—'}</p>
                        <p className={styles.rowMeta}>
                          {cat ? `Categoria: ${cat}` : 'Global (todas)'}
                          {plan.duration_days != null ? ` · ${plan.duration_days} dias` : ''}
                          {plan.listing_limit != null
                            ? ` · ${plan.listing_limit} anúncios`
                            : ''}
                        </p>
                      </div>
                    </div>
                    <div className={styles.rowRight}>
                      <p className={styles.rowValue}>{formatCurrency(plan.price)}</p>
                      <Badge variant={plan.is_active ? 'success' : 'neutral'} size="sm">
                        {plan.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        leftIcon="edit"
                        onClick={() => openEditor(plan)}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        leftIcon="trash"
                        onClick={() => handleDelete(plan)}
                        disabled={saving}
                      >
                        Remover
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* — Modal de criar/editar — */}
      {editor && (
        <Modal
          open
          onClose={closeEditor}
          title={editor.mode === 'edit' ? 'Editar plano' : 'Novo plano'}
          footer={
            <div className={styles.editorFooter}>
              {editor.mode === 'edit' && (
                <Button
                  variant="ghost"
                  leftIcon="trash"
                  onClick={() => handleDelete({ id: editor.id })}
                  disabled={saving}
                >
                  Remover
                </Button>
              )}
              <div className={styles.editorFooterRight}>
                <Button variant="ghost" onClick={closeEditor} disabled={saving}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} loading={saving} disabled={saving}>
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
              handleSave();
            }}
          >
            <div className={styles.editorGrid}>
              <div className={cx(styles.settingField, styles.editorFull)}>
                <label htmlFor="plan-name" className={styles.label}>
                  Nome
                </label>
                <Input
                  id="plan-name"
                  type="text"
                  value={editor.values.name}
                  onChange={(e) => setValue('name', e.target.value)}
                />
              </div>

              <div className={styles.settingField}>
                <label htmlFor="plan-type" className={styles.label}>
                  Tipo
                </label>
                <select
                  id="plan-type"
                  className={styles.select}
                  value={editor.values.type}
                  onChange={(e) => setValue('type', e.target.value)}
                >
                  {PLAN_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.settingField}>
                <label htmlFor="plan-category" className={styles.label}>
                  Categoria
                </label>
                <select
                  id="plan-category"
                  className={styles.select}
                  value={editor.values.category_id}
                  onChange={(e) => setValue('category_id', e.target.value)}
                >
                  <option value="">Global (todas)</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={cx(styles.settingField, styles.editorHighlight)}>
                <label htmlFor="plan-price" className={styles.label}>
                  Preço (R$)
                </label>
                <Input
                  id="plan-price"
                  type="number"
                  value={editor.values.price}
                  onChange={(e) => setValue('price', e.target.value)}
                />
              </div>

              <div className={styles.settingField}>
                <label htmlFor="plan-duration" className={styles.label}>
                  Duração (dias)
                </label>
                <Input
                  id="plan-duration"
                  type="number"
                  value={editor.values.duration_days}
                  onChange={(e) => setValue('duration_days', e.target.value)}
                />
              </div>

              <div className={styles.settingField}>
                <label htmlFor="plan-limit" className={styles.label}>
                  Limite de anúncios (opcional)
                </label>
                <Input
                  id="plan-limit"
                  type="number"
                  value={editor.values.listing_limit}
                  onChange={(e) => setValue('listing_limit', e.target.value)}
                />
              </div>

              <label className={cx(styles.editorCheck, styles.editorFull)}>
                <input
                  type="checkbox"
                  checked={Boolean(editor.values.is_active)}
                  onChange={(e) => setValue('is_active', e.target.checked)}
                />
                <span>Ativo</span>
              </label>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
