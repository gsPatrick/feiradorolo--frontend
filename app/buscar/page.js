'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './page.module.css';
import { cx } from '@/lib/cx';
import { productService, mapProduct } from '@/lib/api';
import ProductCard from '@/components/molecules/ProductCard/ProductCard';
import SearchFilters from '@/components/organisms/SearchFilters/SearchFilters';
import Icon from '@/components/atoms/Icon/Icon';
import Spinner from '@/components/atoms/Spinner/Spinner';

const PAGE_SIZE = 24;

const SORT_OPTIONS = [
  { value: '', label: 'Relevância' },
  { value: 'recent', label: 'Mais recente' },
  { value: 'price_asc', label: 'Menor preço' },
  { value: 'price_desc', label: 'Maior preço' },
];

const INITIAL_FILTERS = {
  category_id: '',
  price_min: '',
  price_max: '',
  condition: [],
  state: '',
  sort: '',
  page: 1,
};

const numberFmt = new Intl.NumberFormat('pt-BR');

function BuscarContent() {
  const searchParams = useSearchParams();
  const q = (searchParams.get('q') || '').trim();
  const urlCategory = searchParams.get('category_id') || '';
  // Busca por letra inicial (footer SEO): só letra A-Z.
  const inicial = (searchParams.get('inicial') || '').trim().slice(0, 1).toUpperCase();

  const [filters, setFilters] = useState({ ...INITIAL_FILTERS, category_id: urlCategory });
  const [products, setProducts] = useState([]);
  const [facets, setFacets] = useState(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const reqId = useRef(0);

  // Quando o termo (ou category_id / letra inicial da URL) muda, reseta filtros.
  useEffect(() => {
    setFilters({ ...INITIAL_FILTERS, category_id: urlCategory });
  }, [q, urlCategory, inicial]);

  // Executa a busca server-side a cada mudança de filtros / termo.
  useEffect(() => {
    const id = ++reqId.current;
    setLoading(true);
    setError(false);

    productService
      .search({
        q,
        inicial,
        category_id: filters.category_id,
        price_min: filters.price_min,
        price_max: filters.price_max,
        condition: filters.condition,
        state: filters.state,
        sort: filters.sort,
        page: filters.page,
        limit: PAGE_SIZE,
      })
      .then((data) => {
        if (id !== reqId.current) return;
        const list = Array.isArray(data?.products) ? data.products : [];
        setProducts(list.map(mapProduct).filter(Boolean));
        setTotal(Number(data?.total) || 0);
        if (data?.facets) setFacets(data.facets);
      })
      .catch(() => {
        if (id !== reqId.current) return;
        setError(true);
        setProducts([]);
        setTotal(0);
      })
      .finally(() => {
        if (id === reqId.current) setLoading(false);
      });
  }, [q, inicial, filters]);

  // Helpers que atualizam filtros e voltam para a página 1.
  const patch = useCallback((next) => {
    setFilters((prev) => ({ ...prev, ...next, page: 1 }));
  }, []);

  const handleCategory = useCallback((category_id) => patch({ category_id }), [patch]);
  const handlePrice = useCallback((p) => patch(p), [patch]);
  const handleCondition = useCallback((condition) => patch({ condition }), [patch]);
  const handleState = useCallback((state) => patch({ state }), [patch]);
  const handleSort = useCallback((sort) => patch({ sort }), [patch]);
  const handleClear = useCallback(
    () => setFilters({ ...INITIAL_FILTERS, category_id: '' }),
    [],
  );

  function goToPage(page) {
    setFilters((prev) => ({ ...prev, page }));
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const limit = PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const page = filters.page;
  const showEmpty = !loading && !error && products.length === 0;

  const filterPanel = (
    <SearchFilters
      facets={facets}
      filters={filters}
      onCategory={handleCategory}
      onPrice={handlePrice}
      onCondition={handleCondition}
      onState={handleState}
      onClear={handleClear}
      loading={loading}
    />
  );

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* — Cabeçalho — */}
        <header className={styles.header}>
          <h1 className={styles.title}>
            {q ? (
              <>
                Resultado da pesquisa para <span className={styles.term}>“{q}”</span>
              </>
            ) : inicial ? (
              <>
                Produtos começando com <span className={styles.term}>“{inicial}”</span>
              </>
            ) : (
              'Buscar produtos'
            )}
          </h1>
          {!loading && !error && (
            <span className={styles.count}>
              {numberFmt.format(total)} {total === 1 ? 'resultado' : 'resultados'}
            </span>
          )}
        </header>

        {/* — Barra de ordenação + botão de filtros mobile — */}
        <div className={styles.toolbar}>
          <button
            type="button"
            className={styles.filterToggle}
            onClick={() => setDrawerOpen(true)}
          >
            <Icon name="filter" size={16} /> Filtros
          </button>

          <div className={styles.sortBar}>
            <span className={styles.sortLabel}>Ordenar por</span>
            <div className={styles.sortBtns} role="group" aria-label="Ordenação">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value || 'relevance'}
                  type="button"
                  className={cx(styles.sortBtn, filters.sort === opt.value && styles.sortActive)}
                  aria-pressed={filters.sort === opt.value}
                  onClick={() => handleSort(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* — Layout: sidebar + resultados — */}
        <div className={styles.layout}>
          <div className={styles.sidebarWrap}>{filterPanel}</div>

          <div className={styles.results}>
            {error ? (
              <div className={styles.state}>
                <Icon name="bolt" size={36} className={styles.stateIcon} />
                <h2 className={styles.stateTitle}>Algo deu errado</h2>
                <p className={styles.stateText}>
                  Não foi possível carregar os resultados. Verifique sua conexão e tente
                  novamente.
                </p>
                <button
                  type="button"
                  className={styles.retry}
                  onClick={() => setFilters((prev) => ({ ...prev }))}
                >
                  Tentar novamente
                </button>
              </div>
            ) : loading ? (
              <>
                <div className={styles.loadingRow}>
                  <Spinner size={18} /> Carregando produtos…
                </div>
                <div className={styles.grid}>
                  {Array.from({ length: 10 }).map((_, i) => (
                    <ProductCard key={i} loading />
                  ))}
                </div>
              </>
            ) : showEmpty ? (
              <div className={styles.state}>
                <Icon name="search" size={36} className={styles.stateIcon} />
                <h2 className={styles.stateTitle}>Nenhum produto encontrado</h2>
                <p className={styles.stateText}>
                  {q
                    ? `Nenhum produto encontrado para “${q}”. Tente outros termos.`
                    : 'Tente buscar por outro termo ou ajuste os filtros.'}
                </p>
                <button type="button" className={styles.retry} onClick={handleClear}>
                  Limpar filtros
                </button>
              </div>
            ) : (
              <>
                <div className={styles.grid}>
                  {products.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <nav className={styles.pagination} aria-label="Paginação">
                    <button
                      type="button"
                      className={styles.pageBtn}
                      disabled={page <= 1}
                      onClick={() => goToPage(page - 1)}
                    >
                      <Icon name="chevron-left" size={16} /> Anterior
                    </button>
                    <span className={styles.pageInfo}>
                      Página {page} de {totalPages}
                    </span>
                    <button
                      type="button"
                      className={styles.pageBtn}
                      disabled={page >= totalPages}
                      onClick={() => goToPage(page + 1)}
                    >
                      Próxima <Icon name="arrow-right" size={16} />
                    </button>
                  </nav>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* — Drawer de filtros (mobile) — */}
      <div className={cx(styles.drawer, drawerOpen && styles.drawerOpen)} aria-hidden={!drawerOpen}>
        <div className={styles.drawerOverlay} onClick={() => setDrawerOpen(false)} />
        <div className={styles.drawerPanel} role="dialog" aria-label="Filtros">
          <div className={styles.drawerHead}>
            <strong>Filtros</strong>
            <button
              type="button"
              className={styles.drawerClose}
              aria-label="Fechar filtros"
              onClick={() => setDrawerOpen(false)}
            >
              <Icon name="close" size={20} />
            </button>
          </div>
          <div className={styles.drawerBody}>{filterPanel}</div>
          <div className={styles.drawerFoot}>
            <button
              type="button"
              className={styles.drawerApply}
              onClick={() => setDrawerOpen(false)}
            >
              Ver {numberFmt.format(total)} {total === 1 ? 'resultado' : 'resultados'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BuscarPage() {
  return (
    <main>
      <Suspense fallback={null}>
        <BuscarContent />
      </Suspense>
    </main>
  );
}
