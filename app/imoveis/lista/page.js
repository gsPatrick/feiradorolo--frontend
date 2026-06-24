'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';
import Select from '@/components/atoms/Select/Select';
import Input from '@/components/atoms/Input/Input';
import Button from '@/components/atoms/Button/Button';
import Icon from '@/components/atoms/Icon/Icon';
import Breadcrumb from '@/components/molecules/Breadcrumb/Breadcrumb';
import ProductCard from '@/components/molecules/ProductCard/ProductCard';
import { productService } from '@/lib/api';

const CATEGORY_SLUG = 'imoveis';

// Opções da vertical de IMÓVEIS (espelham os field_definitions da categoria).
const OPERACOES = ['Venda', 'Aluguel', 'Temporada'];

const TIPOS = [
  'Apartamento', 'Casa', 'Chácara', 'Sítio', 'Fazenda', 'Terreno',
  'Sala Comercial', 'Loja Comercial', 'Galpão', 'Flat', 'Outros',
];

const QUARTOS = ['1', '2', '3', '4+'];
const BANHEIROS = ['1', '2', '3+'];
const VAGAS = ['0', '1', '2', '3+'];

// UFs do Brasil (mesma lista usada nos endereços).
const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

// Faixas de preço (Venda) estilo Mercado Livre.
const PRICE_RANGES = [
  { label: 'Até R$ 200 mil', min: '', max: '200000' },
  { label: 'R$ 200 mil a R$ 400 mil', min: '200000', max: '400000' },
  { label: 'R$ 400 mil a R$ 700 mil', min: '400000', max: '700000' },
  { label: 'R$ 700 mil a R$ 1 mi', min: '700000', max: '1000000' },
  { label: 'Mais de R$ 1 mi', min: '1000000', max: '' },
];

// Specs que viram querystring de API (contrato: spec_<chave>).
const SPEC_KEYS = ['spec_operacao', 'spec_tipo_imovel', 'spec_quartos', 'spec_banheiros', 'spec_vagas'];

const FILTER_LABELS = {
  spec_operacao: 'Operação',
  spec_tipo_imovel: 'Tipo',
  spec_quartos: 'Quartos',
  spec_banheiros: 'Banheiros',
  spec_vagas: 'Vagas',
  city: 'Cidade',
  state: 'UF',
  q: 'Busca',
};

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Lê uma spec do produto cru, tolerante a variações de chave. */
function spec(p, keys) {
  const s = (p && p.specifications) || {};
  for (const k of keys) {
    if (s[k] != null && s[k] !== '') return String(s[k]);
  }
  return '';
}

/** Mapeia produto cru → objeto do ProductCard + meta de imóvel para o card. */
function mapImovel(p) {
  if (!p) return null;
  const price = Number(p.price) || 0;
  const promo = p.promotional_price != null ? Number(p.promotional_price) : null;
  const images = Array.isArray(p.images) ? p.images : [];
  return {
    id: p.id,
    title: p.title,
    price: promo != null ? promo : price,
    oldPrice: promo != null ? price : null,
    image: images[0] || p.cover_image_url || '',
    seller: (p.seller && (p.seller.name || p.seller.email)) || 'Vendedor',
    sellerInfo: p.seller && typeof p.seller === 'object' ? p.seller : null,
    sellerId: (p.seller && p.seller.id) || p.seller_id || null,
    category: (p.category && p.category.slug) || '',
    condition: p.condition || 'new',
    rating: Number(p.rating) || 0,
    reviewsCount: Number(p.reviews_count) || 0,
    sold: Number(p.sold) || 0,
    highlightTier: p.highlight_tier && p.highlight_tier !== 'none' ? p.highlight_tier : null,
    // Meta específica de imóvel (mostrada abaixo do card).
    imovel: {
      operacao: spec(p, ['operacao', 'operação']),
      tipo: spec(p, ['tipo_imovel', 'tipo']),
      quartos: spec(p, ['quartos', 'dormitorios', 'dormitórios']),
      banheiros: spec(p, ['banheiros']),
      vagas: spec(p, ['vagas']),
      area: spec(p, ['area', 'área', 'area_util', 'metragem']),
      city: p.city || '',
      state: p.state || '',
    },
  };
}

function ImoveisListaInner() {
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
    ['city', 'state', 'price_min', 'price_max', 'q'].forEach((k) => {
      const v = search.get(k);
      if (v) f[k] = v;
    });
    return f;
  }, [search]);

  const city = filters.city || '';
  const state = filters.state || '';
  const priceMin = filters.price_min || '';
  const priceMax = filters.price_max || '';

  // Busca server-side: TODOS os filtros vão na querystring (contrato da API).
  useEffect(() => {
    setLoading(true);
    const qs = new URLSearchParams();
    qs.set('category_slug', CATEGORY_SLUG);
    qs.set('limit', '48');
    Object.entries(filters).forEach(([k, v]) => qs.set(k, v));
    if (sort && sort !== 'relevance') qs.set('sort', sort);
    productService
      .list(`?${qs.toString()}`)
      .then((d) => setProducts((Array.isArray(d) ? d : []).map(mapImovel).filter(Boolean)))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [filters, sort]);

  // Atualiza a URL com um filtro (preserva os demais).
  function setParam(key, value) {
    const next = new URLSearchParams(search.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/imoveis/lista${next.toString() ? `?${next}` : ''}`, { scroll: false });
  }

  // Liga/desliga um valor (toggle) — clicar no ativo remove.
  function toggleParam(key, value) {
    setParam(key, filters[key] === value ? '' : value);
  }

  function setPriceRange(r) {
    const next = new URLSearchParams(search.toString());
    const active = priceMin === r.min && priceMax === r.max;
    if (active) {
      next.delete('price_min');
      next.delete('price_max');
    } else {
      if (r.min) next.set('price_min', r.min); else next.delete('price_min');
      if (r.max) next.set('price_max', r.max); else next.delete('price_max');
    }
    router.push(`/imoveis/lista${next.toString() ? `?${next}` : ''}`, { scroll: false });
  }

  function clearAll() {
    router.push('/imoveis/lista', { scroll: false });
  }

  const sorted = products; // ordenação é server-side (sort na querystring).

  // Chips de filtros ativos.
  const activeChips = [
    ...Object.entries(filters).filter(([k]) => k !== 'price_min' && k !== 'price_max'),
    ...((priceMin || priceMax) ? [['__price', priceLabel(priceMin, priceMax)]] : []),
  ];

  function removeChip(key) {
    if (key === '__price') {
      const next = new URLSearchParams(search.toString());
      next.delete('price_min');
      next.delete('price_max');
      router.push(`/imoveis/lista${next.toString() ? `?${next}` : ''}`, { scroll: false });
    } else {
      setParam(key, '');
    }
  }

  // Título dinâmico: tipo + operação ativos, ou "Imóveis".
  const heroTitle =
    [filters.spec_tipo_imovel, filters.spec_operacao && `à ${filters.spec_operacao.toLowerCase()}`]
      .filter(Boolean)
      .join(' ') || 'Imóveis';

  const filterSections = (
    <>
      <FacetSection title="Operação" valueKey="spec_operacao"
        options={OPERACOES} active={filters.spec_operacao} onPick={toggleParam} />
      <FacetSection title="Tipo de imóvel" valueKey="spec_tipo_imovel"
        options={TIPOS} active={filters.spec_tipo_imovel} onPick={toggleParam} scroll />

      <section className={styles.facet}>
        <h3 className={styles.facetTitle}>Localização</h3>
        <div className={styles.locFields}>
          <Input
            size="sm"
            leftIcon="map-pin"
            placeholder="Cidade"
            defaultValue={city}
            key={`city-${city}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setParam('city', e.currentTarget.value.trim());
            }}
            onBlur={(e) => {
              const v = e.currentTarget.value.trim();
              if (v !== city) setParam('city', v);
            }}
          />
          <Select
            size="sm"
            value={state}
            onChange={(e) => setParam('state', e.target.value)}
            options={[{ value: '', label: 'UF' }, ...UFS.map((u) => ({ value: u, label: u }))]}
          />
        </div>
      </section>

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
        <div className={styles.priceInputs}>
          <Input
            size="sm"
            type="number"
            min="0"
            placeholder="Mín"
            defaultValue={priceMin}
            key={`pmin-${priceMin}`}
            onBlur={(e) => {
              const v = e.currentTarget.value.trim();
              if (v !== priceMin) setParam('price_min', v);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setParam('price_min', e.currentTarget.value.trim());
            }}
          />
          <span className={styles.priceDash}>—</span>
          <Input
            size="sm"
            type="number"
            min="0"
            placeholder="Máx"
            defaultValue={priceMax}
            key={`pmax-${priceMax}`}
            onBlur={(e) => {
              const v = e.currentTarget.value.trim();
              if (v !== priceMax) setParam('price_max', v);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setParam('price_max', e.currentTarget.value.trim());
            }}
          />
        </div>
      </section>

      <FacetChips title="Quartos" valueKey="spec_quartos"
        options={QUARTOS} active={filters.spec_quartos} onPick={toggleParam} />
      <FacetChips title="Banheiros" valueKey="spec_banheiros"
        options={BANHEIROS} active={filters.spec_banheiros} onPick={toggleParam} />
      <FacetChips title="Vagas" valueKey="spec_vagas"
        options={VAGAS} active={filters.spec_vagas} onPick={toggleParam} />
    </>
  );

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Breadcrumb items={[{ label: 'Início', href: '/' }, { label: 'Imóveis', href: '/imoveis' }, { label: 'Resultados' }]} />

        {/* CABEÇALHO TEMÁTICO — vertical de imóveis */}
        <section className={styles.hero}>
          <div className={styles.heroText}>
            <span className={styles.heroBadge}>
              <Icon name="map-pin" size={13} /> Feira do Rolo • Imóveis
            </span>
            <h1 className={styles.title}>{heroTitle}</h1>
            <p className={styles.count}>
              {loading ? 'Carregando…' : `${sorted.length} ${sorted.length === 1 ? 'resultado' : 'resultados'} encontrados`}
            </p>
          </div>
        </section>

        <header className={styles.head}>
          <div>
            <h2 className={styles.resultsTitle}>Resultados</h2>
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
                  <div key={p.id} className={styles.cardWrap}>
                    <ProductCard product={p} />
                    <ImovelMeta data={p.imovel} />
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.empty}>
                <span className={styles.emptyIcon} aria-hidden="true">
                  <Icon name="map-pin" size={30} />
                </span>
                <h3 className={styles.emptyTitle}>Nenhum imóvel encontrado com esses filtros</h3>
                <p className={styles.emptyDesc}>Tente remover algum filtro ou ampliar a localização.</p>
                <Button variant="secondary" onClick={clearAll}>Limpar filtros</Button>
              </div>
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
                Ver {sorted.length} {sorted.length === 1 ? 'imóvel' : 'imóveis'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function priceLabel(min, max) {
  const fmt = (v) => BRL.format(Number(v)).replace(/ /g, ' ');
  if (min && max) return `${fmt(min)} a ${fmt(max)}`;
  if (min) return `Acima de ${fmt(min)}`;
  if (max) return `Até ${fmt(max)}`;
  return '';
}

/** Linha de meta do imóvel (quartos/banheiros/área + cidade/UF) abaixo do card. */
function ImovelMeta({ data }) {
  if (!data) return null;
  const bits = [];
  if (data.quartos) bits.push(`${data.quartos} quartos`);
  if (data.banheiros) bits.push(`${data.banheiros} banheiros`);
  if (data.area) bits.push(`${data.area} m²`);
  const local = [data.city, data.state].filter(Boolean).join(' - ');
  if (!bits.length && !local) return null;
  return (
    <div className={styles.cardMeta}>
      {bits.length > 0 && <span className={styles.cardSpecs}>{bits.join(' • ')}</span>}
      {local && (
        <span className={styles.cardLocal}>
          <Icon name="map-pin" size={12} /> {local}
        </span>
      )}
    </div>
  );
}

/** Seção de faceta com itens em lista (estilo Mercado Livre). */
function FacetSection({ title, valueKey, options, active, onPick, scroll = false }) {
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
                {v}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Faceta em "pílulas" (Quartos/Banheiros/Vagas — opções curtas). */
function FacetChips({ title, valueKey, options, active, onPick }) {
  return (
    <section className={styles.facet}>
      <h3 className={styles.facetTitle}>{title}</h3>
      <div className={styles.pills}>
        {options.map((o) => {
          const v = String(o);
          const on = active === v;
          return (
            <button
              key={v}
              type="button"
              className={`${styles.pill} ${on ? styles.pillOn : ''}`}
              onClick={() => onPick(valueKey, v)}
            >
              {v}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default function ImoveisListaPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40 }}>Carregando…</div>}>
      <ImoveisListaInner />
    </Suspense>
  );
}
