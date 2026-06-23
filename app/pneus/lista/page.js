'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './page.module.css';
import Select from '@/components/atoms/Select/Select';
import Button from '@/components/atoms/Button/Button';
import Icon from '@/components/atoms/Icon/Icon';
import Breadcrumb from '@/components/molecules/Breadcrumb/Breadcrumb';
import ProductCard from '@/components/molecules/ProductCard/ProductCard';
import EmptyState from '@/components/molecules/EmptyState/EmptyState';
import { productService, mapProduct } from '@/lib/api';
import {
  CATEGORY_SLUG, LARGURAS, PERFIS, AROS, MARCAS,
} from '../tireOptions';

const SPEC_KEYS = ['spec_largura', 'spec_perfil', 'spec_aro', 'spec_marca'];

const FILTER_LABELS = {
  spec_largura: 'Largura',
  spec_perfil: 'Perfil',
  spec_aro: 'Aro',
  spec_marca: 'Marca',
  q: 'Busca',
  price_min: 'Preço mín.',
  price_max: 'Preço máx.',
};

// Faixas de preço estilo Mercado Livre.
const PRICE_RANGES = [
  { label: 'Até R$ 300', min: '', max: '300' },
  { label: 'R$ 300 a R$ 500', min: '300', max: '500' },
  { label: 'R$ 500 a R$ 800', min: '500', max: '800' },
  { label: 'R$ 800 a R$ 1.200', min: '800', max: '1200' },
  { label: 'Mais de R$ 1.200', min: '1200', max: '' },
];

function PneusListaInner() {
  const router = useRouter();
  const search = useSearchParams();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sort, setSort] = useState('relevance');

  // Filtros derivados da URL (fonte da verdade) — só os que viram querystring de API.
  const filters = useMemo(() => {
    const f = {};
    SPEC_KEYS.forEach((k) => {
      const v = search.get(k);
      if (v) f[k] = v;
    });
    const q = search.get('q');
    if (q) f.q = q;
    return f;
  }, [search]);

  // Filtros de preço (aplicados no cliente — não fazem parte do contrato de API).
  const priceMin = search.get('price_min') || '';
  const priceMax = search.get('price_max') || '';

  // Monta a querystring para a API a partir dos filtros ativos.
  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    qs.set('category_slug', CATEGORY_SLUG);
    qs.set('limit', '48');
    Object.entries(filters).forEach(([k, v]) => qs.set(k, v));
    productService
      .list(`?${qs.toString()}`)
      .then((d) => setProducts((Array.isArray(d) ? d : []).map(mapProduct).filter(Boolean)))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [filters]);

  // Atualiza a URL com um filtro (preserva os demais).
  function setParam(key, value) {
    const next = new URLSearchParams(search.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/pneus/lista${next.toString() ? `?${next}` : ''}`, { scroll: false });
  }

  // Liga/desliga um valor (toggle) — clicar no ativo remove.
  function toggleParam(key, value) {
    setParam(key, filters[key] === value ? '' : value);
  }

  function setPriceRange(r) {
    const next = new URLSearchParams(search.toString());
    const active = priceMin === r.min && priceMax === r.max;
    if (active) { next.delete('price_min'); next.delete('price_max'); }
    else {
      if (r.min) next.set('price_min', r.min); else next.delete('price_min');
      if (r.max) next.set('price_max', r.max); else next.delete('price_max');
    }
    router.push(`/pneus/lista${next.toString() ? `?${next}` : ''}`, { scroll: false });
  }

  function clearAll() {
    router.push('/pneus/lista', { scroll: false });
  }

  // Aplica preço no cliente, depois ordena.
  const sorted = useMemo(() => {
    let list = products;
    const min = priceMin ? Number(priceMin) : null;
    const max = priceMax ? Number(priceMax) : null;
    if (min != null || max != null) {
      list = list.filter((p) =>
        (min == null || p.price >= min) && (max == null || p.price <= max));
    }
    list = [...list];
    if (sort === 'price_asc') list.sort((a, b) => a.price - b.price);
    else if (sort === 'price_desc') list.sort((a, b) => b.price - a.price);
    return list;
  }, [products, sort, priceMin, priceMax]);

  // Chips de filtros ativos (specs/busca + preço).
  const activeChips = [
    ...Object.entries(filters),
    ...((priceMin || priceMax)
      ? [['__price', priceLabel(priceMin, priceMax)]]
      : []),
  ];

  function removeChip(key) {
    if (key === '__price') {
      const next = new URLSearchParams(search.toString());
      next.delete('price_min'); next.delete('price_max');
      router.push(`/pneus/lista${next.toString() ? `?${next}` : ''}`, { scroll: false });
    } else {
      setParam(key, '');
    }
  }

  const filterSections = (
    <>
      <FacetSection title="Largura" valueKey="spec_largura"
        options={LARGURAS} active={filters.spec_largura} onPick={toggleParam} />
      <FacetSection title="Perfil" valueKey="spec_perfil"
        options={PERFIS} active={filters.spec_perfil} onPick={toggleParam} />
      <FacetSection title="Aro" valueKey="spec_aro" suffix={'"'}
        options={AROS} active={filters.spec_aro} onPick={toggleParam} />
      <FacetSection title="Marca" valueKey="spec_marca"
        options={MARCAS} active={filters.spec_marca} onPick={toggleParam} scroll />
      <section className={styles.facet}>
        <h3 className={styles.facetTitle}>Preço</h3>
        <ul className={styles.facetList}>
          {PRICE_RANGES.map((r) => {
            const on = priceMin === r.min && priceMax === r.max;
            return (
              <li key={r.label}>
                <button
                  type="button"
                  className={`${styles.facetItem} ${on ? styles.facetItemOn : ''}`}
                  onClick={() => setPriceRange(r)}
                >
                  {on && <Icon name="check" size={13} className={styles.facetCheck} />}
                  {r.label}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Breadcrumb items={[{ label: 'Início', href: '/' }, { label: 'Pneus', href: '/pneus' }, { label: 'Resultados' }]} />

        <header className={styles.head}>
          <div>
            <h1 className={styles.title}>Pneus</h1>
            <p className={styles.count}>
              {loading ? 'Carregando…' : `${sorted.length} ${sorted.length === 1 ? 'resultado' : 'resultados'} encontrados`}
            </p>
          </div>
          <div className={styles.headControls}>
            <Button
              className={styles.filterBtn}
              variant="secondary"
              size="sm"
              leftIcon="filter"
              onClick={() => setDrawerOpen(true)}
            >
              Filtrar
            </Button>
            <label className={styles.sortLabel}>
              <span>Ordenar por</span>
              <Select
                size="sm"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                options={[
                  { value: 'relevance', label: 'Mais relevantes' },
                  { value: 'price_asc', label: 'Menor preço' },
                  { value: 'price_desc', label: 'Maior preço' },
                ]}
              />
            </label>
          </div>
        </header>

        {/* Filtros ativos */}
        {activeChips.length > 0 && (
          <div className={styles.activeBar}>
            <span className={styles.activeLabel}>Filtros:</span>
            {activeChips.map(([k, v]) => (
              <button
                key={k}
                type="button"
                className={styles.activeChip}
                onClick={() => removeChip(k)}
                title={`Remover filtro ${FILTER_LABELS[k] || 'Preço'}`}
              >
                <span className={styles.activeChipKey}>{k === '__price' ? 'Preço' : (FILTER_LABELS[k] || k)}:</span> {v}
                <Icon name="close" size={13} />
              </button>
            ))}
            <button type="button" className={styles.clearAll} onClick={clearAll}>
              Limpar tudo
            </button>
          </div>
        )}

        <div className={styles.layout}>
          {/* SIDEBAR DESKTOP — estilo Mercado Livre */}
          <aside className={styles.sidebar}>
            <h2 className={styles.sideTitle}>Filtrar resultados</h2>
            {filterSections}
          </aside>

          {/* RESULTADOS */}
          <section className={styles.results}>
            {loading ? (
              <div className={styles.grid}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <ProductCard key={i} loading />
                ))}
              </div>
            ) : sorted.length ? (
              <div className={styles.grid}>
                {sorted.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon="search"
                title="Nenhum pneu encontrado com esses filtros"
                description="Tente remover algum filtro ou ajustar a medida."
                action={<Button variant="secondary" onClick={clearAll}>Limpar filtros</Button>}
              />
            )}
          </section>
        </div>
      </div>

      {/* DRAWER MOBILE */}
      {drawerOpen && (
        <div className={styles.drawerOverlay} onClick={() => setDrawerOpen(false)}>
          <div className={styles.drawer} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Filtros">
            <div className={styles.drawerHead}>
              <h2 className={styles.sideTitle}>Filtrar resultados</h2>
              <button className={styles.drawerClose} type="button" onClick={() => setDrawerOpen(false)} aria-label="Fechar">
                <Icon name="close" size={20} />
              </button>
            </div>
            <div className={styles.drawerBody}>{filterSections}</div>
            <div className={styles.drawerFoot}>
              {activeChips.length > 0 && (
                <Button variant="ghost" onClick={clearAll}>Limpar</Button>
              )}
              <Button fullWidth onClick={() => setDrawerOpen(false)}>
                Ver {sorted.length} {sorted.length === 1 ? 'pneu' : 'pneus'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function priceLabel(min, max) {
  if (min && max) return `R$ ${min} a R$ ${max}`;
  if (min) return `Acima de R$ ${min}`;
  if (max) return `Até R$ ${max}`;
  return '';
}

/** Seção de faceta com itens clicáveis (estilo Mercado Livre). */
function FacetSection({ title, valueKey, options, active, onPick, suffix = '', scroll = false }) {
  return (
    <section className={styles.facet}>
      <h3 className={styles.facetTitle}>{title}</h3>
      <ul className={`${styles.facetList} ${scroll ? styles.facetScroll : ''}`}>
        {options.map((o) => {
          const v = String(o);
          const on = active === v;
          return (
            <li key={v}>
              <button
                type="button"
                className={`${styles.facetItem} ${on ? styles.facetItemOn : ''}`}
                onClick={() => onPick(valueKey, v)}
              >
                {on && <Icon name="check" size={13} className={styles.facetCheck} />}
                {suffix ? `${v}${suffix}` : v}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function PneusListaPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40 }}>Carregando…</div>}>
      <PneusListaInner />
    </Suspense>
  );
}
