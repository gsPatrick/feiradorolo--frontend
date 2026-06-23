'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './page.module.css';
import Select from '@/components/atoms/Select/Select';
import Input from '@/components/atoms/Input/Input';
import Button from '@/components/atoms/Button/Button';
import Icon from '@/components/atoms/Icon/Icon';
import Breadcrumb from '@/components/molecules/Breadcrumb/Breadcrumb';
import ProductCard from '@/components/molecules/ProductCard/ProductCard';
import EmptyState from '@/components/molecules/EmptyState/EmptyState';
import { productService, mapProduct } from '@/lib/api';
import {
  CATEGORY_SLUG, LARGURAS, PERFIS, AROS, MARCAS, toOpts,
} from '../tireOptions';

const SPEC_KEYS = ['spec_largura', 'spec_perfil', 'spec_aro', 'spec_marca'];

const FILTER_LABELS = {
  spec_largura: 'Largura',
  spec_perfil: 'Perfil',
  spec_aro: 'Aro',
  spec_marca: 'Marca',
  q: 'Busca',
};

function PneusListaInner() {
  const router = useRouter();
  const search = useSearchParams();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sort, setSort] = useState('relevance');

  // Filtros derivados da URL (fonte da verdade).
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
  function setFilter(key, value) {
    const next = new URLSearchParams(search.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/pneus/lista${next.toString() ? `?${next}` : ''}`, { scroll: false });
  }

  function clearAll() {
    router.push('/pneus/lista', { scroll: false });
  }

  // Ordenação client-side (relevância = ordem da API com destaque já priorizado).
  const sorted = useMemo(() => {
    const list = [...products];
    if (sort === 'price_asc') list.sort((a, b) => a.price - b.price);
    else if (sort === 'price_desc') list.sort((a, b) => b.price - a.price);
    return list;
  }, [products, sort]);

  const activeChips = Object.entries(filters);

  const fields = (
    <>
      <FilterSelect label="Largura" value={filters.spec_largura}
        options={toOpts(LARGURAS)}
        onChange={(v) => setFilter('spec_largura', v)} />
      <FilterSelect label="Perfil" value={filters.spec_perfil}
        options={toOpts(PERFIS)}
        onChange={(v) => setFilter('spec_perfil', v)} />
      <FilterSelect label="Aro" value={filters.spec_aro}
        options={toOpts(AROS, '"')}
        onChange={(v) => setFilter('spec_aro', v)} />
      <FilterSelect label="Marca" value={filters.spec_marca}
        options={toOpts(MARCAS)}
        onChange={(v) => setFilter('spec_marca', v)} />
    </>
  );

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Breadcrumb items={[{ label: 'Início', href: '/' }, { label: 'Pneus', href: '/pneus' }, { label: 'Resultados' }]} />

        <header className={styles.head}>
          <h1 className={styles.title}>Pneus</h1>
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
              <span>Ordenar:</span>
              <Select
                size="sm"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                options={[
                  { value: 'relevance', label: 'Relevância' },
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
            {activeChips.map(([k, v]) => (
              <button
                key={k}
                type="button"
                className={styles.activeChip}
                onClick={() => setFilter(k, '')}
                title={`Remover filtro ${FILTER_LABELS[k] || k}`}
              >
                <span className={styles.activeChipKey}>{FILTER_LABELS[k] || k}:</span> {v}
                <Icon name="close" size={13} />
              </button>
            ))}
            <button type="button" className={styles.clearAll} onClick={clearAll}>
              Limpar tudo
            </button>
          </div>
        )}

        <div className={styles.layout}>
          {/* SIDEBAR DESKTOP */}
          <aside className={styles.sidebar}>
            <h2 className={styles.sideTitle}><Icon name="filter" size={16} /> Filtros</h2>
            {fields}
          </aside>

          {/* RESULTADOS */}
          <section className={styles.results}>
            <p className={styles.count}>
              {loading ? 'Carregando…' : `${sorted.length} ${sorted.length === 1 ? 'resultado' : 'resultados'}`}
            </p>

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
              <h2 className={styles.sideTitle}><Icon name="filter" size={16} /> Filtros</h2>
              <button className={styles.drawerClose} type="button" onClick={() => setDrawerOpen(false)} aria-label="Fechar">
                <Icon name="close" size={20} />
              </button>
            </div>
            <div className={styles.drawerBody}>{fields}</div>
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

function FilterSelect({ label, value, options, onChange }) {
  return (
    <label className={styles.filterField}>
      <span>{label}</span>
      <Select
        placeholder={`Todas`}
        options={options}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export default function PneusListaPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40 }}>Carregando…</div>}>
      <PneusListaInner />
    </Suspense>
  );
}
