'use client';

import { useMemo, useState } from 'react';
import styles from './ProductListing.module.css';
import { cx } from '@/lib/cx';
import Icon from '../../atoms/Icon/Icon';
import Checkbox from '../../atoms/Checkbox/Checkbox';
import Breadcrumb from '../../molecules/Breadcrumb/Breadcrumb';
import ProductCard from '../../molecules/ProductCard/ProductCard';
import EmptyState from '../../molecules/EmptyState/EmptyState';

const SORTS = [
  { v: 'relevance', l: 'Mais relevantes' },
  { v: 'price_asc', l: 'Menor preço' },
  { v: 'price_desc', l: 'Maior preço' },
  { v: 'rating', l: 'Melhor avaliação' },
  { v: 'newest', l: 'Mais recentes' },
];

export default function ProductListing({ title, breadcrumb = [], products = [], loading = false }) {
  const maxPriceData = useMemo(
    () => Math.ceil(Math.max(100, ...products.map((p) => p.price)) / 100) * 100,
    [products]
  );
  const brands = useMemo(() => Array.from(new Set(products.map((p) => p.brand))).sort(), [products]);

  const [priceMax, setPriceMax] = useState(maxPriceData);
  const [conditions, setConditions] = useState(new Set());
  const [freeOnly, setFreeOnly] = useState(false);
  const [brandSet, setBrandSet] = useState(new Set());
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState('relevance');
  const [view, setView] = useState('grid');
  const [mobileFilters, setMobileFilters] = useState(false);

  function toggleSet(setter, set, value) {
    const next = new Set(set);
    next.has(value) ? next.delete(value) : next.add(value);
    setter(next);
  }

  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      if (p.price > priceMax) return false;
      if (conditions.size && !conditions.has(p.condition)) return false;
      if (freeOnly && !p.freeShipping) return false;
      if (brandSet.size && !brandSet.has(p.brand)) return false;
      if (minRating && p.rating < minRating) return false;
      return true;
    });
    const by = {
      price_asc: (a, b) => a.price - b.price,
      price_desc: (a, b) => b.price - a.price,
      rating: (a, b) => b.rating - a.rating,
      newest: (a, b) => Number(b.id) - Number(a.id),
    };
    if (by[sort]) list = [...list].sort(by[sort]);
    return list;
  }, [products, priceMax, conditions, freeOnly, brandSet, minRating, sort]);

  const filters = (
    <>
      <div className={styles.group}>
        <h4>Preço</h4>
        <input
          type="range"
          min={0}
          max={maxPriceData}
          step={50}
          value={priceMax}
          onChange={(e) => setPriceMax(Number(e.target.value))}
          className={styles.range}
        />
        <div className={styles.rangeLabel}>Até R$ {priceMax.toLocaleString('pt-BR')}</div>
      </div>

      <div className={styles.group}>
        <h4>Condição</h4>
        <Checkbox label="Novo" checked={conditions.has('new')} onChange={() => toggleSet(setConditions, conditions, 'new')} />
        <Checkbox label="Usado" checked={conditions.has('used')} onChange={() => toggleSet(setConditions, conditions, 'used')} />
      </div>

      <div className={styles.group}>
        <h4>Entrega</h4>
        <Checkbox label="Frete grátis" checked={freeOnly} onChange={setFreeOnly} />
      </div>

      <div className={styles.group}>
        <h4>Marca</h4>
        {brands.map((b) => (
          <Checkbox key={b} label={b} checked={brandSet.has(b)} onChange={() => toggleSet(setBrandSet, brandSet, b)} />
        ))}
      </div>

      <div className={styles.group}>
        <h4>Avaliação</h4>
        <select className={styles.select} value={minRating} onChange={(e) => setMinRating(Number(e.target.value))}>
          <option value={0}>Qualquer avaliação</option>
          <option value={4}>4+ estrelas</option>
          <option value={3}>3+ estrelas</option>
          <option value={2}>2+ estrelas</option>
        </select>
      </div>
    </>
  );

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Breadcrumb items={breadcrumb} className={styles.crumb} />
        <header className={styles.header}>
          <h1 className={styles.title}>{title}</h1>
          <span className={styles.count}>{loading ? 'Carregando…' : `${filtered.length} produto(s)`}</span>
        </header>

        <div className={styles.layout}>
          <aside className={cx(styles.sidebar, mobileFilters && styles.sidebarOpen)}>
            <div className={styles.sidebarHead}>
              <h3>Filtros</h3>
              <button className={styles.closeFilters} onClick={() => setMobileFilters(false)}>
                <Icon name="close" size={18} />
              </button>
            </div>
            {filters}
          </aside>

          <div className={styles.main}>
            <div className={styles.toolbar}>
              <button className={styles.filterBtn} onClick={() => setMobileFilters(true)}>
                <Icon name="filter" size={16} /> Filtros
              </button>
              <div className={styles.toolbarRight}>
                <select className={styles.sort} value={sort} onChange={(e) => setSort(e.target.value)}>
                  {SORTS.map((s) => (
                    <option key={s.v} value={s.v}>
                      {s.l}
                    </option>
                  ))}
                </select>
                <div className={styles.viewToggle}>
                  <button className={cx(view === 'grid' && styles.viewActive)} onClick={() => setView('grid')} aria-label="Grade">
                    <Icon name="grid" size={18} />
                  </button>
                  <button className={cx(view === 'list' && styles.viewActive)} onClick={() => setView('list')} aria-label="Lista">
                    <Icon name="menu" size={18} />
                  </button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className={styles.grid}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <ProductCard key={`sk-${i}`} loading />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon="package"
                title={products.length === 0 ? 'Nenhum produto por aqui ainda' : 'Nenhum produto encontrado'}
                description={
                  products.length === 0
                    ? 'Em breve novos anúncios aparecerão aqui. Que tal anunciar o seu?'
                    : 'Ajuste os filtros para ver mais resultados.'
                }
              />
            ) : (
              <div className={cx(styles.grid, view === 'list' && styles.listView)}>
                {filtered.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
