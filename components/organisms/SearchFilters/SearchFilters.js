'use client';

import { useEffect, useState } from 'react';
import styles from './SearchFilters.module.css';
import { cx } from '@/lib/cx';
import Icon from '../../atoms/Icon/Icon';
import Checkbox from '../../atoms/Checkbox/Checkbox';

const CONDITION_LABELS = {
  new: 'Novo',
  used: 'Usado',
  refurbished: 'Recondicionado',
};

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function priceLabel(v) {
  if (v == null || v === '') return '';
  const n = Number(v);
  return Number.isFinite(n) ? BRL.format(n) : '';
}

/**
 * Sidebar de filtros (server-side). Recebe os `facets` da API e o estado atual
 * dos filtros; toda mudança chama os callbacks que disparam nova busca.
 */
export default function SearchFilters({
  facets,
  filters,
  onCategory,
  onPrice,
  onCondition,
  onState,
  onClear,
  loading = false,
}) {
  const f = facets || {};
  const categories = f.categories || [];
  const conditions = f.conditions || [];
  const states = f.states || [];

  const [priceMin, setPriceMin] = useState(filters.price_min || '');
  const [priceMax, setPriceMax] = useState(filters.price_max || '');

  // Sincroniza inputs locais quando os filtros mudam por fora (ex: limpar).
  useEffect(() => setPriceMin(filters.price_min || ''), [filters.price_min]);
  useEffect(() => setPriceMax(filters.price_max || ''), [filters.price_max]);

  const activeCategory = filters.category_id != null ? String(filters.category_id) : '';
  const selectedConditions = filters.condition || [];

  const hasFilters =
    activeCategory ||
    filters.price_min ||
    filters.price_max ||
    selectedConditions.length ||
    filters.state;

  function applyPrice() {
    onPrice({ price_min: priceMin || '', price_max: priceMax || '' });
  }

  function toggleCondition(value, checked) {
    const next = checked
      ? [...selectedConditions, value]
      : selectedConditions.filter((c) => c !== value);
    onCondition(next);
  }

  return (
    <aside className={cx(styles.sidebar, loading && styles.busy)} aria-label="Filtros de busca">
      <div className={styles.head}>
        <h2 className={styles.heading}>
          <Icon name="filter" size={16} /> Filtros
        </h2>
        {hasFilters ? (
          <button type="button" className={styles.clear} onClick={onClear}>
            Limpar filtros
          </button>
        ) : null}
      </div>

      {/* — Categoria — */}
      {categories.length > 0 && (
        <section className={styles.block}>
          <h3 className={styles.blockTitle}>Categoria</h3>
          <ul className={styles.list}>
            {activeCategory && (
              <li>
                <button
                  type="button"
                  className={styles.clearCat}
                  onClick={() => onCategory('')}
                >
                  <Icon name="arrow-left" size={13} /> Todas as categorias
                </button>
              </li>
            )}
            {categories.map((c) => {
              const active = String(c.id) === activeCategory;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    className={cx(styles.catItem, active && styles.catActive)}
                    aria-pressed={active}
                    onClick={() => onCategory(active ? '' : String(c.id))}
                  >
                    <span className={styles.catName}>{c.name}</span>
                    <span className={styles.count}>{c.count}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* — Faixa de preço — */}
      <section className={styles.block}>
        <h3 className={styles.blockTitle}>Faixa de preço</h3>
        <div className={styles.priceRow}>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            className={styles.priceInput}
            placeholder={f.priceMin != null ? String(Math.floor(f.priceMin)) : 'Mín'}
            aria-label="Preço mínimo"
            value={priceMin}
            onChange={(e) => setPriceMin(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyPrice()}
          />
          <span className={styles.priceSep}>—</span>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            className={styles.priceInput}
            placeholder={f.priceMax != null ? String(Math.ceil(f.priceMax)) : 'Máx'}
            aria-label="Preço máximo"
            value={priceMax}
            onChange={(e) => setPriceMax(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyPrice()}
          />
        </div>
        {(f.priceMin != null || f.priceMax != null) && (
          <p className={styles.priceHint}>
            {priceLabel(f.priceMin)} a {priceLabel(f.priceMax)}
          </p>
        )}
        <button type="button" className={styles.applyBtn} onClick={applyPrice}>
          Aplicar
        </button>
      </section>

      {/* — Condição — */}
      {conditions.length > 0 && (
        <section className={styles.block}>
          <h3 className={styles.blockTitle}>Condição</h3>
          <div className={styles.checks}>
            {conditions.map((c) => (
              <Checkbox
                key={c.value}
                checked={selectedConditions.includes(c.value)}
                onChange={(checked) => toggleCondition(c.value, checked)}
                label={CONDITION_LABELS[c.value] || c.value}
                count={c.count}
              />
            ))}
          </div>
        </section>
      )}

      {/* — Enviado de (UF) — */}
      {states.length > 0 && (
        <section className={styles.block}>
          <h3 className={styles.blockTitle}>
            <Icon name="map-pin" size={14} /> Enviado de
          </h3>
          <ul className={styles.list}>
            {filters.state && (
              <li>
                <button
                  type="button"
                  className={styles.clearCat}
                  onClick={() => onState('')}
                >
                  <Icon name="arrow-left" size={13} /> Qualquer UF
                </button>
              </li>
            )}
            {states.map((s) => {
              const active = filters.state === s.value;
              return (
                <li key={s.value}>
                  <button
                    type="button"
                    className={cx(styles.catItem, active && styles.catActive)}
                    aria-pressed={active}
                    onClick={() => onState(active ? '' : s.value)}
                  >
                    <span className={styles.catName}>{s.value}</span>
                    <span className={styles.count}>{s.count}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </aside>
  );
}
