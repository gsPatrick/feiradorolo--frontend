'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './ProductSpecifications.module.css';
import { cx } from '@/lib/cx';
import { categoryService } from '@/lib/api';
import Input from '../../atoms/Input/Input';
import Icon from '../../atoms/Icon/Icon';
import Spinner from '../../atoms/Spinner/Spinner';
import Button from '../../atoms/Button/Button';
import Modal from '../../organisms/Modal/Modal';

/**
 * Especificações dinâmicas por categoria — réplica fiel do ProductSpecifications
 * do front antigo. Lê field_definitions de GET /categories/:id/fields e renderiza
 * por tipo: select/autocomplete (combobox com busca + "adicionar"), multi-select
 * (chips + busca), boolean (Sim/Não), text e text_with_unit.
 */

/** Converte o field_definition da API nova no formato interno (SpecField do antigo). */
function toSpecField(f) {
  let type = f.field_type;
  if (type === 'multiselect') type = 'multi-select';
  const widget = f.validation && f.validation.widget;
  if (type === 'text' && widget === 'text_with_unit') type = 'text_with_unit';
  return {
    name: f.name,
    label: f.label,
    type,
    required: !!f.is_required,
    options: Array.isArray(f.options) ? f.options : null,
    allowAdd: f.validation && f.validation.allowAdd != null ? f.validation.allowAdd : true,
    maxItems: (f.validation && f.validation.maxItems) || undefined,
    tooltip: f.help_text || undefined,
    units: (f.validation && f.validation.units) || (f.unit ? [f.unit] : undefined),
    unit: f.unit || undefined,
  };
}

/** Considera "vazio": ausente, string vazia/só-espaços, ou array vazio (multi-select). */
function isFieldEmpty(field, values) {
  const v = values ? values[field.name] : undefined;
  if (v == null) return true;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'string') return v.trim() === '';
  return false; // boolean "Não", número 0, etc. contam como preenchidos
}

/** Lista de itens a exibir no combobox (busca client-side, igual ao antigo). */
function computeItems(field, searchTerm) {
  let opts = field.options || [];
  if (field.name === 'brand') {
    const i = opts.findIndex((o) => String(o).toLowerCase() === 'sem marca');
    if (i > 0) opts = [opts[i], ...opts.slice(0, i), ...opts.slice(i + 1)];
  }
  const term = searchTerm.trim().toLowerCase();
  const filtered = term ? opts.filter((o) => String(o).toLowerCase().includes(term)) : opts;
  const limit = term ? 200 : 100;
  return { items: filtered.slice(0, limit), total: opts.length };
}

/** Combobox com busca (modo único ou múltiplo), painel sob o trigger. */
function Combobox({ field, multi, searchable, value, selected, onPick, onRemove, onAddClick }) {
  const [open, setOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setSearchTerm(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const { items, total } = useMemo(
    () => (searchable ? computeItems(field, searchTerm) : { items: field.options || [], total: (field.options || []).length }),
    [field, searchTerm, searchable]
  );

  const showBrandHint = field.name === 'brand' && !searchTerm && items.length === 100;
  const atMax = multi && field.maxItems && selected.length >= field.maxItems;

  return (
    <div className={styles.combo} ref={ref}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((v) => !v)}
        data-testid={`select-${field.name}`}
      >
        {multi ? (
          selected.length > 0 ? (
            <span className={styles.chips}>
              {selected.map((item, idx) => (
                <span key={idx} className={styles.chip}>
                  <span>{item}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`Remover ${item}`}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onRemove(item);
                    }}
                  >
                    <Icon name="close" size={12} />
                  </span>
                </span>
              ))}
            </span>
          ) : (
            <span className={styles.placeholder}>Selecione</span>
          )
        ) : value ? (
          <span className={styles.value}>{value}</span>
        ) : (
          <span className={styles.placeholder}>Selecione</span>
        )}
        <Icon name="chevron-down" size={16} className={styles.caret} />
      </button>

      {!multi && value && (
        <button
          type="button"
          className={styles.clear}
          aria-label="Limpar seleção"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onPick('');
          }}
        >
          <Icon name="close" size={14} />
        </button>
      )}

      {open && (
        <div className={styles.panel}>
          {searchable && (
            <div className={styles.searchRow}>
              <Icon name="search" size={15} className={styles.searchIcon} />
              <input
                className={styles.search}
                placeholder="Digite para buscar"
                value={searchInput}
                autoFocus
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
          )}

          <div className={styles.list}>
            {items.length === 0 ? (
              <div className={styles.empty}>
                {searchTerm ? 'Nenhum resultado encontrado' : searchable ? 'Digite para buscar' : 'Sem opções'}
              </div>
            ) : multi ? (
              [...items.filter((i) => selected.includes(i)), ...items.filter((i) => !selected.includes(i))].map(
                (item, idx) => {
                  const isSel = selected.includes(item);
                  return (
                    <div
                      key={`${item}-${idx}`}
                      className={cx(styles.item, isSel && styles.itemSelected)}
                      onClick={() => {
                        if (isSel) onRemove(item);
                        else if (!atMax) onPick(item);
                      }}
                    >
                      <span className={isSel ? styles.itemSelLabel : undefined}>{item}</span>
                      {isSel && <Icon name="check" size={15} className={styles.checkIcon} />}
                    </div>
                  );
                }
              )
            ) : (
              <>
                {items.map((item, idx) => (
                  <div
                    key={`${item}-${idx}`}
                    className={styles.item}
                    onClick={() => {
                      onPick(item);
                      setOpen(false);
                    }}
                  >
                    {item}
                  </div>
                ))}
                {showBrandHint && (
                  <div className={styles.hint}>Digite para buscar entre {total.toLocaleString('pt-BR')} marcas</div>
                )}
              </>
            )}
          </div>

          {field.allowAdd && (
            <div
              className={styles.addRow}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onAddClick(field.name);
              }}
              data-testid={`add-${field.name}`}
            >
              <Icon name="plus" size={15} />
              <span>Adicionar um novo item</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SpecField({ field, values, onChange, onAddClick, showErrors }) {
  const setValue = (v) => onChange({ ...values, [field.name]: v });

  const invalid = !!(showErrors && field.required && isFieldEmpty(field, values));

  const label = (
    <label className={styles.label} title={field.tooltip || undefined}>
      <span>
        {field.label} {field.required && <span className={styles.req}>*</span>}
        {field.type === 'multi-select' && field.maxItems && field.maxItems !== 1 && (
          <span className={styles.counter}>
            {' '}
            {(values[field.name] || []).length}/{field.maxItems}
          </span>
        )}
      </span>
    </label>
  );

  const errorMsg = invalid ? <p className={styles.errorMsg}>Campo obrigatório</p> : null;

  if (field.type === 'text') {
    return (
      <div className={cx(styles.field, invalid && styles.fieldInvalid)}>
        {label}
        <Input value={values[field.name] || ''} onChange={(e) => setValue(e.target.value)} placeholder="Insira" />
        {errorMsg}
      </div>
    );
  }

  if (field.type === 'text_with_unit') {
    const unitName = `${field.name}_unit`;
    const units = field.units || (field.unit ? [field.unit] : []);
    const selectedUnit = values[unitName] || units[0] || '';
    return (
      <div className={cx(styles.field, invalid && styles.fieldInvalid)}>
        {label}
        <div className={styles.unitRow}>
          <Input
            type="number"
            value={values[field.name] || ''}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Insira"
          />
          <select
            className={styles.unitSelect}
            value={selectedUnit}
            onChange={(e) => onChange({ ...values, [unitName]: e.target.value })}
          >
            {units.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
        {errorMsg}
      </div>
    );
  }

  if (field.type === 'boolean') {
    const boolField = { ...field, options: ['Sim', 'Não'], allowAdd: false };
    return (
      <div className={cx(styles.field, invalid && styles.fieldInvalid)}>
        {label}
        <Combobox field={boolField} multi={false} searchable={false} value={values[field.name] || ''} onPick={setValue} />
        {errorMsg}
      </div>
    );
  }

  if (field.type === 'select' || field.type === 'autocomplete') {
    return (
      <div className={cx(styles.field, invalid && styles.fieldInvalid)}>
        {label}
        <Combobox
          field={field}
          multi={false}
          searchable
          value={values[field.name] || ''}
          onPick={setValue}
          onAddClick={onAddClick}
        />
        {errorMsg}
      </div>
    );
  }

  if (field.type === 'multi-select') {
    const selected = values[field.name] || [];
    return (
      <div className={cx(styles.field, invalid && styles.fieldInvalid)}>
        {label}
        <Combobox
          field={field}
          multi
          searchable
          selected={selected}
          onPick={(item) => {
            if (field.maxItems && selected.length >= field.maxItems) return;
            if (!selected.includes(item)) setValue([...selected, item]);
          }}
          onRemove={(item) => setValue(selected.filter((v) => v !== item))}
          onAddClick={onAddClick}
        />
        {errorMsg}
      </div>
    );
  }

  return null;
}

export default function ProductSpecifications({
  categoryId,
  values = {},
  onChange,
  onValidityChange,
  showErrors = false,
}) {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [addField, setAddField] = useState(null);
  const [newValue, setNewValue] = useState('');

  useEffect(() => {
    if (!categoryId) {
      setFields([]);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    categoryService
      .fields(categoryId)
      .then((data) => {
        if (!active) return;
        const list = (Array.isArray(data) ? data : []).map(toSpecField);
        // dedup por nome (igual deduplicateFields do antigo)
        const seen = new Set();
        setFields(list.filter((f) => (seen.has(f.name) ? false : seen.add(f.name))));
      })
      .catch(() => active && setError('Não foi possível carregar as especificações.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [categoryId]);

  // Computa os campos OBRIGATÓRIOS ainda vazios e emite ao pai sempre que
  // os fields carregados ou os valores mudarem. Cada item: { name, label }.
  const missing = useMemo(
    () => fields.filter((f) => f.required && isFieldEmpty(f, values)).map((f) => ({ name: f.name, label: f.label })),
    [fields, values]
  );
  const missingKey = missing.map((m) => m.name).join('|');
  const onValidityRef = useRef(onValidityChange);
  onValidityRef.current = onValidityChange;
  useEffect(() => {
    if (onValidityRef.current) onValidityRef.current(missing);
    // missingKey resume a lista; evita re-emitir por nova referência de array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missingKey]);

  function confirmAdd() {
    const v = newValue.trim();
    if (!v || !addField) return;
    const field = fields.find((f) => f.name === addField);
    // adiciona o valor às opções locais e seleciona (não persiste no back)
    setFields((prev) =>
      prev.map((f) => (f.name === addField ? { ...f, options: [v, ...(f.options || []).filter((o) => o !== v)] } : f))
    );
    if (field && field.type === 'multi-select') {
      const current = values[addField] || [];
      if (!current.includes(v)) onChange({ ...values, [addField]: [...current, v] });
    } else {
      onChange({ ...values, [addField]: v });
    }
    setAddField(null);
    setNewValue('');
  }

  if (loading) {
    return (
      <div className={styles.state}>
        <Spinner size={18} /> Carregando especificações...
      </div>
    );
  }
  if (error) return <div className={styles.state}>{error}</div>;
  if (!fields.length) {
    return <p className={styles.state}>Esta categoria não possui especificações adicionais.</p>;
  }

  const addLabel = addField ? (fields.find((f) => f.name === addField) || {}).label : '';

  return (
    <div className={styles.grid}>
      {fields.map((field) => (
        <SpecField
          key={field.name}
          field={field}
          values={values}
          onChange={onChange}
          onAddClick={setAddField}
          showErrors={showErrors}
        />
      ))}

      <Modal
        open={!!addField}
        onClose={() => setAddField(null)}
        title={`Adicionar ${addLabel || ''}`}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setAddField(null)}>
              Cancelar
            </Button>
            <Button onClick={confirmAdd} disabled={!newValue.trim()}>
              Adicionar
            </Button>
          </>
        }
      >
        <label className={styles.label}>Novo {addLabel}</label>
        <Input
          value={newValue}
          autoFocus
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="Digite o valor"
          onKeyDown={(e) => e.key === 'Enter' && confirmAdd()}
        />
        <p className={styles.addHint}>Será adicionado em: {addLabel}</p>
      </Modal>
    </div>
  );
}
