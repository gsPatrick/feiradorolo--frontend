'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './AdminSpecifications.module.css';
import { cx } from '@/lib/cx';
import { categoryService } from '@/lib/api';
import { useToast } from '@/components/providers/ToastProvider';
import Button from '@/components/atoms/Button/Button';
import Input from '@/components/atoms/Input/Input';
import Select from '@/components/atoms/Select/Select';
import Badge from '@/components/atoms/Badge/Badge';
import Checkbox from '@/components/atoms/Checkbox/Checkbox';
import Icon from '@/components/atoms/Icon/Icon';
import Spinner from '@/components/atoms/Spinner/Spinner';

/* chevron-right não existe no Icon atom (não editar). SVG inline. */
function ChevronRight({ size = 16, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

/* Tipos de campo suportados pela API (FieldDefinition.field_type). */
const FIELD_TYPES = [
  { value: 'text', label: 'Texto' },
  { value: 'number', label: 'Número' },
  { value: 'boolean', label: 'Sim/Não' },
  { value: 'select', label: 'Seleção' },
  { value: 'multiselect', label: 'Múltipla Seleção' },
  { value: 'date', label: 'Data' },
  { value: 'range', label: 'Intervalo' },
];

const TYPE_LABELS = FIELD_TYPES.reduce((acc, t) => {
  acc[t.value] = t.label;
  return acc;
}, {});

function getTypeLabel(type) {
  return TYPE_LABELS[type] || type;
}

const NEEDS_OPTIONS = (type) => type === 'select' || type === 'multiselect';

/* Gera um `name` (slug) a partir do label. */
function slugify(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const EMPTY_FORM = {
  label: '',
  name: '',
  field_type: 'text',
  optionsText: '',
  unit: '',
  is_required: false,
  is_filterable: false,
};

export default function AdminSpecifications() {
  const { toast } = useToast();

  const [tree, setTree] = useState([]);
  const [showModal, setShowModal] = useState(false);

  const [selectedCat1, setSelectedCat1] = useState(null);
  const [selectedCat2, setSelectedCat2] = useState(null);
  const [selectedCat3, setSelectedCat3] = useState(null);
  const [selectedCat4, setSelectedCat4] = useState(null);

  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  /* form de adição (inline) */
  const [form, setForm] = useState(EMPTY_FORM);
  const [nameTouched, setNameTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  /* edição (modal) */
  const [editing, setEditing] = useState(null); // field em edição
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editSaving, setEditSaving] = useState(false);

  const selectedCategory =
    selectedCat4 || selectedCat3 || selectedCat2 || selectedCat1 || null;
  const selectedCategoryId = selectedCategory?.id || null;

  /* --- carrega árvore real (read-only) --- */
  useEffect(() => {
    let alive = true;
    categoryService
      .tree()
      .then((data) => {
        if (alive) setTree(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (alive) setTree([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  const childrenOf = (node) => (node && Array.isArray(node.children) ? node.children : []);

  /* --- carrega field definitions reais da categoria selecionada --- */
  function loadFields(categoryId) {
    if (!categoryId) {
      setFields([]);
      return Promise.resolve();
    }
    setLoading(true);
    return categoryService
      .fields(categoryId)
      .then((data) => {
        setFields(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        setFields([]);
        toast({
          title: 'Não foi possível carregar os campos.',
          description: err?.message,
          variant: 'error',
        });
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    setSearchTerm('');
    setForm(EMPTY_FORM);
    setNameTouched(false);
    if (!selectedCategoryId) {
      setFields([]);
      return;
    }
    loadFields(selectedCategoryId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategoryId]);

  const filteredFields = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return fields;
    return fields.filter(
      (f) =>
        (f.label || '').toLowerCase().includes(term) ||
        (f.name || '').toLowerCase().includes(term)
    );
  }, [fields, searchTerm]);

  /* --- helpers de payload --- */
  function buildPayload(f) {
    const payload = {
      label: f.label.trim(),
      name: (f.name || '').trim() || slugify(f.label),
      field_type: f.field_type,
      unit: f.unit.trim() || null,
      is_required: !!f.is_required,
      is_filterable: !!f.is_filterable,
    };
    if (NEEDS_OPTIONS(f.field_type)) {
      payload.options = (f.optionsText || '')
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);
    } else {
      payload.options = null;
    }
    return payload;
  }

  function fieldToEditForm(f) {
    return {
      label: f.label || '',
      name: f.name || '',
      field_type: f.field_type || 'text',
      optionsText: Array.isArray(f.options) ? f.options.join(', ') : '',
      unit: f.unit || '',
      is_required: !!f.is_required,
      is_filterable: !!f.is_filterable,
    };
  }

  /* --- ações reais (persistem + recarregam) --- */
  async function handleAdd() {
    if (!selectedCategoryId || !form.label.trim() || saving) return;
    setSaving(true);
    try {
      await categoryService.addField(selectedCategoryId, buildPayload(form));
      setForm(EMPTY_FORM);
      setNameTouched(false);
      await loadFields(selectedCategoryId);
      toast({ title: 'Campo adicionado!', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Não foi possível adicionar o campo.',
        description: err?.message,
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  }

  function openEdit(field) {
    setEditing(field);
    setEditForm(fieldToEditForm(field));
  }

  async function handleUpdate() {
    if (!editing || !editForm.label.trim() || editSaving) return;
    setEditSaving(true);
    try {
      await categoryService.updateField(editing.id, buildPayload(editForm));
      setEditing(null);
      await loadFields(selectedCategoryId);
      toast({ title: 'Campo atualizado!', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Não foi possível atualizar o campo.',
        description: err?.message,
        variant: 'error',
      });
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(field) {
    if (!field) return;
    try {
      await categoryService.removeField(field.id);
      await loadFields(selectedCategoryId);
      toast({ title: 'Campo removido!', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Não foi possível remover o campo.',
        description: err?.message,
        variant: 'error',
      });
    }
  }

  /* form de adição reage à digitação do label (auto-slug do name) */
  function onAddLabelChange(value) {
    setForm((prev) => ({
      ...prev,
      label: value,
      name: nameTouched ? prev.name : slugify(value),
    }));
  }

  const crumbLabel = selectedCategoryId ? (
    <>
      Categoria: {selectedCat1?.name}
      {selectedCat2 && (
        <>
          <span className={styles.crumbSep}>→</span>
          {selectedCat2.name}
        </>
      )}
      {selectedCat3 && (
        <>
          <span className={styles.crumbSep}>→</span>
          {selectedCat3.name}
        </>
      )}
      {selectedCat4 && (
        <>
          <span className={styles.crumbSep}>→</span>
          {selectedCat4.name}
        </>
      )}
    </>
  ) : (
    'Selecione uma Categoria'
  );

  /* helper de coluna */
  function renderColumn({ level, list, parentChosen, selected, onSelect, emptyHint }) {
    if (!parentChosen) {
      return <div className={styles.colEmpty}>{emptyHint}</div>;
    }
    if (!list.length) {
      return <div className={styles.colEmpty}>Sem subcategorias</div>;
    }
    return list.map((cat) => {
      const hasChildren = childrenOf(cat).length > 0;
      return (
        <div
          key={cat.id}
          onClick={() => onSelect(cat)}
          className={cx(
            styles.catItem,
            styles[`n${level}`],
            selected?.id === cat.id && styles.active
          )}
        >
          <span className={styles.catItemName}>{cat.name}</span>
          {hasChildren && <ChevronRight size={16} className={styles.catChevron} />}
        </div>
      );
    });
  }

  return (
    <div className={styles.root}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>
            <Icon name="grid" size={20} />
            Gerenciador de Especificações
          </h3>
        </div>

        <div className={styles.cardBody}>
          <Button
            variant="outline"
            className={styles.catTrigger}
            onClick={() => setShowModal(true)}
          >
            <span className={styles.catTriggerLabel}>{crumbLabel}</span>
            <ChevronRight size={16} />
          </Button>

          {selectedCategoryId && (
            <div className={styles.content}>
              {/* --- form de adição --- */}
              <div className={styles.formGrid}>
                <div className={styles.filterCol}>
                  <label className={styles.fieldLabel}>Rótulo (exibido)</label>
                  <Input
                    placeholder="Ex.: Marca"
                    value={form.label}
                    onChange={(e) => onAddLabelChange(e.target.value)}
                  />
                </div>
                <div className={styles.filterCol}>
                  <label className={styles.fieldLabel}>Nome (interno)</label>
                  <Input
                    placeholder="ex.: marca"
                    value={form.name}
                    onChange={(e) => {
                      setNameTouched(true);
                      setForm((p) => ({ ...p, name: e.target.value }));
                    }}
                  />
                </div>
                <div className={styles.filterCol}>
                  <label className={styles.fieldLabel}>Tipo de Campo</label>
                  <Select
                    value={form.field_type}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, field_type: e.target.value }))
                    }
                    options={FIELD_TYPES}
                  />
                </div>
                <div className={styles.filterCol}>
                  <label className={styles.fieldLabel}>Unidade (opcional)</label>
                  <Input
                    placeholder="ex.: cm, kg"
                    value={form.unit}
                    onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
                  />
                </div>
                {NEEDS_OPTIONS(form.field_type) && (
                  <div className={cx(styles.filterCol, styles.formFull)}>
                    <label className={styles.fieldLabel}>
                      Opções (separadas por vírgula)
                    </label>
                    <Input
                      placeholder="ex.: P, M, G, GG"
                      value={form.optionsText}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, optionsText: e.target.value }))
                      }
                    />
                  </div>
                )}
                <div className={cx(styles.checkRow, styles.formFull)}>
                  <Checkbox
                    checked={form.is_required}
                    onChange={(v) => setForm((p) => ({ ...p, is_required: v }))}
                    label="Obrigatório"
                  />
                  <Checkbox
                    checked={form.is_filterable}
                    onChange={(v) => setForm((p) => ({ ...p, is_filterable: v }))}
                    label="Filtrável"
                  />
                  <Button
                    className={styles.addBtn}
                    leftIcon="plus"
                    onClick={handleAdd}
                    loading={saving}
                    disabled={!form.label.trim()}
                  >
                    Adicionar Campo
                  </Button>
                </div>
              </div>

              {/* --- busca --- */}
              <div className={styles.searchRow}>
                <Input
                  leftIcon="search"
                  placeholder="Buscar campo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* --- lista de field definitions --- */}
              <div className={styles.itemsSection}>
                <h4 className={styles.itemsTitle}>Campos ({filteredFields.length})</h4>
                {loading ? (
                  <div className={styles.loadingState}>
                    <Spinner size={20} />
                    <span>Carregando campos...</span>
                  </div>
                ) : filteredFields.length === 0 ? (
                  <p className={styles.itemsHint}>
                    {fields.length === 0
                      ? 'Nenhum campo nesta categoria'
                      : 'Nenhum campo encontrado'}
                  </p>
                ) : (
                  <div className={styles.itemsList}>
                    {filteredFields.map((field) => (
                      <div key={field.id} className={styles.item}>
                        <span className={styles.itemValue}>
                          <span className={styles.itemLabel}>{field.label}</span>
                          <span className={styles.itemName}>{field.name}</span>
                          <Badge variant="neutral" size="sm">
                            {getTypeLabel(field.field_type)}
                            {field.unit ? ` · ${field.unit}` : ''}
                          </Badge>
                          {field.is_required && (
                            <Badge variant="danger" size="sm">
                              Obrigatório
                            </Badge>
                          )}
                          {field.is_filterable && (
                            <Badge variant="info" size="sm">
                              Filtrável
                            </Badge>
                          )}
                        </span>
                        <div className={styles.itemActions}>
                          <Button
                            size="sm"
                            variant="ghost"
                            leftIcon="edit"
                            onClick={() => openEdit(field)}
                            aria-label="Editar"
                            title="Editar"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            leftIcon="trash"
                            onClick={() => handleDelete(field)}
                            aria-label="Excluir"
                            title="Excluir"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- modal de seleção de categoria --- */}
      {showModal && (
        <div className={styles.overlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Selecionar Categoria</h3>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.columns}>
                {/* Col 1 (N1) */}
                <div className={styles.column}>
                  {renderColumn({
                    level: 1,
                    list: tree,
                    parentChosen: true,
                    selected: selectedCat1,
                    onSelect: (cat) => {
                      setSelectedCat1(cat);
                      setSelectedCat2(null);
                      setSelectedCat3(null);
                      setSelectedCat4(null);
                    },
                  })}
                </div>
                {/* Col 2 (N2) */}
                <div className={styles.column}>
                  {renderColumn({
                    level: 2,
                    list: childrenOf(selectedCat1),
                    parentChosen: !!selectedCat1,
                    selected: selectedCat2,
                    emptyHint: 'Selecione uma categoria',
                    onSelect: (cat) => {
                      setSelectedCat2(cat);
                      setSelectedCat3(null);
                      setSelectedCat4(null);
                    },
                  })}
                </div>
                {/* Col 3 (N3) */}
                <div className={styles.column}>
                  {renderColumn({
                    level: 3,
                    list: childrenOf(selectedCat2),
                    parentChosen: !!selectedCat2,
                    selected: selectedCat3,
                    emptyHint: 'Selecione acima',
                    onSelect: (cat) => {
                      setSelectedCat3(cat);
                      setSelectedCat4(null);
                    },
                  })}
                </div>
                {/* Col 4 (N4) */}
                <div className={styles.column}>
                  {renderColumn({
                    level: 4,
                    list: childrenOf(selectedCat3),
                    parentChosen: !!selectedCat3,
                    selected: selectedCat4,
                    emptyHint: 'Selecione acima',
                    onSelect: (cat) => setSelectedCat4(cat),
                  })}
                </div>
              </div>

              <div className={styles.modalFooter}>
                <Button variant="outline" onClick={() => setShowModal(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => setShowModal(false)} disabled={!selectedCategoryId}>
                  Confirmar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- modal de edição de campo --- */}
      {editing && (
        <div className={styles.overlay} onClick={() => setEditing(null)}>
          <div
            className={cx(styles.modal, styles.editModal)}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Editar Campo</h3>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGrid}>
                <div className={styles.filterCol}>
                  <label className={styles.fieldLabel}>Rótulo (exibido)</label>
                  <Input
                    value={editForm.label}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, label: e.target.value }))
                    }
                  />
                </div>
                <div className={styles.filterCol}>
                  <label className={styles.fieldLabel}>Nome (interno)</label>
                  <Input
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, name: e.target.value }))
                    }
                  />
                </div>
                <div className={styles.filterCol}>
                  <label className={styles.fieldLabel}>Tipo de Campo</label>
                  <Select
                    value={editForm.field_type}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, field_type: e.target.value }))
                    }
                    options={FIELD_TYPES}
                  />
                </div>
                <div className={styles.filterCol}>
                  <label className={styles.fieldLabel}>Unidade (opcional)</label>
                  <Input
                    value={editForm.unit}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, unit: e.target.value }))
                    }
                  />
                </div>
                {NEEDS_OPTIONS(editForm.field_type) && (
                  <div className={cx(styles.filterCol, styles.formFull)}>
                    <label className={styles.fieldLabel}>
                      Opções (separadas por vírgula)
                    </label>
                    <Input
                      value={editForm.optionsText}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, optionsText: e.target.value }))
                      }
                    />
                  </div>
                )}
                <div className={cx(styles.checkRow, styles.formFull)}>
                  <Checkbox
                    checked={editForm.is_required}
                    onChange={(v) => setEditForm((p) => ({ ...p, is_required: v }))}
                    label="Obrigatório"
                  />
                  <Checkbox
                    checked={editForm.is_filterable}
                    onChange={(v) => setEditForm((p) => ({ ...p, is_filterable: v }))}
                    label="Filtrável"
                  />
                </div>
              </div>

              <div className={styles.modalFooter}>
                <Button variant="outline" onClick={() => setEditing(null)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleUpdate}
                  loading={editSaving}
                  disabled={!editForm.label.trim()}
                >
                  Salvar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
