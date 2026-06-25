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
import { productService } from '@/lib/api';

const CATEGORY_SLUG = 'veiculos';

// Opções da vertical de VEÍCULOS (espelham os field_definitions da categoria).
const TIPOS_VEICULO = ['Carro', 'Moto', 'Caminhão', 'Ônibus', 'Van/Utilitário', 'Barco/Aeronave'];

const CARROCERIAS = [
  'SUV', 'Hatch', 'Sedã', 'Picape', 'Cupê', 'Conversível', 'Crossover', 'Híbrido', 'Elétrico',
];

const MARCAS = [
  'Chevrolet', 'Volkswagen', 'Fiat', 'Ford', 'Toyota', 'Honda', 'Hyundai',
  'Renault', 'Jeep', 'Nissan', 'Peugeot', 'Citroën', 'BMW', 'Mercedes-Benz',
  'Audi', 'BYD', 'GWM', 'Mitsubishi', 'Kia', 'Volvo',
];

const COMBUSTIVEIS = ['Flex', 'Gasolina', 'Etanol', 'Diesel', 'Elétrico', 'Híbrido', 'GNV'];
const CAMBIOS = ['Manual', 'Automático', 'Automatizado', 'CVT'];
const CONDICOES = ['Novo', 'Usado', 'Seminovo'];

// UFs do Brasil (mesma lista usada nos endereços).
const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

// Faixas de ano (de/até) estilo OLX.
const YEAR_RANGES = [
  { label: '2023 ou mais novo', min: '2023', max: '' },
  { label: '2018 a 2022', min: '2018', max: '2022' },
  { label: '2013 a 2017', min: '2013', max: '2017' },
  { label: '2008 a 2012', min: '2008', max: '2012' },
  { label: 'Até 2007', min: '', max: '2007' },
];

// Faixas de preço estilo Mercado Livre.
const PRICE_RANGES = [
  { label: 'Até R$ 30 mil', min: '', max: '30000' },
  { label: 'R$ 30 mil a R$ 60 mil', min: '30000', max: '60000' },
  { label: 'R$ 60 mil a R$ 100 mil', min: '60000', max: '100000' },
  { label: 'R$ 100 mil a R$ 200 mil', min: '100000', max: '200000' },
  { label: 'Mais de R$ 200 mil', min: '200000', max: '' },
];

// KM máximo (até).
const KM_RANGES = [
  { label: 'Até 20.000 km', value: '20000' },
  { label: 'Até 50.000 km', value: '50000' },
  { label: 'Até 100.000 km', value: '100000' },
  { label: 'Até 150.000 km', value: '150000' },
];

// Specs que viram querystring de API (contrato: spec_<chave>).
const SPEC_KEYS = [
  'spec_tipo_veiculo', 'spec_carroceria', 'spec_marca', 'spec_modelo',
  'spec_combustivel', 'spec_cambio', 'spec_condicao',
];

const FILTER_LABELS = {
  spec_tipo_veiculo: 'Tipo',
  spec_carroceria: 'Carroceria',
  spec_marca: 'Marca',
  spec_modelo: 'Modelo',
  spec_combustivel: 'Combustível',
  spec_cambio: 'Câmbio',
  spec_condicao: 'Condição',
  spec_ano: 'Ano',
  city: 'Cidade',
  state: 'UF',
  q: 'Busca',
};

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const KM_FMT = new Intl.NumberFormat('pt-BR');

/** Lê uma spec do produto cru, tolerante a variações de chave. */
function spec(p, keys) {
  const s = (p && p.specifications) || {};
  for (const k of keys) {
    if (s[k] != null && s[k] !== '') return String(s[k]);
  }
  return '';
}

/** Mapeia produto cru → objeto do ProductCard + meta de veículo para o card. */
function mapVeiculo(p) {
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
    // Meta específica de veículo (mostrada abaixo do card).
    veiculo: {
      ano: spec(p, ['ano']),
      km: spec(p, ['km', 'quilometragem']),
      cambio: spec(p, ['cambio', 'câmbio']),
      combustivel: spec(p, ['combustivel', 'combustível']),
      city: p.city || '',
      state: p.state || '',
    },
  };
}

function VeiculosListaInner() {
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
    ['city', 'state', 'price_min', 'price_max', 'km_max', 'q'].forEach((k) => {
      const v = search.get(k);
      if (v) f[k] = v;
    });
    // Ano: faixa via spec_ano (de/até) — mantém compatível com ?spec_ano= simples.
    const yMin = search.get('year_min');
    const yMax = search.get('year_max');
    if (yMin) f.year_min = yMin;
    if (yMax) f.year_max = yMax;
    return f;
  }, [search]);

  const city = filters.city || '';
  const state = filters.state || '';
  const priceMin = filters.price_min || '';
  const priceMax = filters.price_max || '';
  const yearMin = filters.year_min || '';
  const yearMax = filters.year_max || '';
  const kmMax = filters.km_max || '';

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
      .then((d) => setProducts((Array.isArray(d) ? d : []).map(mapVeiculo).filter(Boolean)))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [filters, sort]);

  // Atualiza a URL com um filtro (preserva os demais).
  function setParam(key, value) {
    const next = new URLSearchParams(search.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/veiculos/lista${next.toString() ? `?${next}` : ''}`, { scroll: false });
  }

  // Liga/desliga um valor (toggle) — clicar no ativo remove.
  function toggleParam(key, value) {
    setParam(key, filters[key] === value ? '' : value);
  }

  // Aplica/remove uma faixa de dois parâmetros (preço/ano).
  function setRange(keyMin, keyMax, r, curMin, curMax) {
    const next = new URLSearchParams(search.toString());
    const active = curMin === r.min && curMax === r.max;
    if (active) {
      next.delete(keyMin);
      next.delete(keyMax);
    } else {
      if (r.min) next.set(keyMin, r.min); else next.delete(keyMin);
      if (r.max) next.set(keyMax, r.max); else next.delete(keyMax);
    }
    router.push(`/veiculos/lista${next.toString() ? `?${next}` : ''}`, { scroll: false });
  }

  function clearAll() {
    router.push('/veiculos/lista', { scroll: false });
  }

  const sorted = products; // ordenação é server-side (sort na querystring).

  // Chips de filtros ativos.
  const rangeKeys = ['price_min', 'price_max', 'year_min', 'year_max'];
  const activeChips = [
    ...Object.entries(filters).filter(([k]) => !rangeKeys.includes(k)),
    ...((priceMin || priceMax) ? [['__price', priceLabel(priceMin, priceMax)]] : []),
    ...((yearMin || yearMax) ? [['__year', yearLabel(yearMin, yearMax)]] : []),
  ];

  function removeChip(key) {
    if (key === '__price' || key === '__year') {
      const next = new URLSearchParams(search.toString());
      const [a, b] = key === '__price' ? ['price_min', 'price_max'] : ['year_min', 'year_max'];
      next.delete(a);
      next.delete(b);
      router.push(`/veiculos/lista${next.toString() ? `?${next}` : ''}`, { scroll: false });
    } else {
      setParam(key, '');
    }
  }

  function chipLabel(key) {
    if (key === '__price') return 'Preço';
    if (key === '__year') return 'Ano';
    if (key === 'km_max') return 'KM';
    return FILTER_LABELS[key] || key;
  }

  function chipValue(key, value) {
    if (key === 'km_max') return `até ${KM_FMT.format(Number(value))} km`;
    return value;
  }

  // Título dinâmico: marca + modelo, ou tipo, ou "Veículos".
  const heroTitle =
    [filters.spec_marca, filters.spec_modelo].filter(Boolean).join(' ') ||
    (filters.spec_tipo_veiculo ? `${filters.spec_tipo_veiculo} à venda` : 'Veículos');

  const filterSections = (
    <>
      <FacetSection title="Tipo de veículo" valueKey="spec_tipo_veiculo"
        options={TIPOS_VEICULO} active={filters.spec_tipo_veiculo} onPick={toggleParam} />
      <FacetSection title="Marca" valueKey="spec_marca"
        options={MARCAS} active={filters.spec_marca} onPick={toggleParam} scroll />

      <section className={styles.facet}>
        <h3 className={styles.facetTitle}>Modelo</h3>
        <Input
          size="sm"
          leftIcon="search"
          placeholder="Ex.: Civic, Onix…"
          defaultValue={filters.spec_modelo || ''}
          key={`modelo-${filters.spec_modelo || ''}`}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setParam('spec_modelo', e.currentTarget.value.trim());
          }}
          onBlur={(e) => {
            const v = e.currentTarget.value.trim();
            if (v !== (filters.spec_modelo || '')) setParam('spec_modelo', v);
          }}
        />
      </section>

      <FacetSection title="Carroceria" valueKey="spec_carroceria"
        options={CARROCERIAS} active={filters.spec_carroceria} onPick={toggleParam} scroll />

      <section className={styles.facet}>
        <h3 className={styles.facetTitle}>Ano</h3>
        <ul className={styles.facetList}>
          {YEAR_RANGES.map((r) => {
            const on = yearMin === r.min && yearMax === r.max;
            return (
              <li key={r.label}>
                <button
                  type="button"
                  className={`${styles.facetItem} ${on ? styles.facetItemOn : ''}`}
                  onClick={() => setRange('year_min', 'year_max', r, yearMin, yearMax)}
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
            min="1990"
            placeholder="De"
            defaultValue={yearMin}
            key={`ymin-${yearMin}`}
            onBlur={(e) => {
              const v = e.currentTarget.value.trim();
              if (v !== yearMin) setParam('year_min', v);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setParam('year_min', e.currentTarget.value.trim());
            }}
          />
          <span className={styles.priceDash}>—</span>
          <Input
            size="sm"
            type="number"
            min="1990"
            placeholder="Até"
            defaultValue={yearMax}
            key={`ymax-${yearMax}`}
            onBlur={(e) => {
              const v = e.currentTarget.value.trim();
              if (v !== yearMax) setParam('year_max', v);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setParam('year_max', e.currentTarget.value.trim());
            }}
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
                  onClick={() => setRange('price_min', 'price_max', r, priceMin, priceMax)}
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

      <FacetChips title="Condição" valueKey="spec_condicao"
        options={CONDICOES} active={filters.spec_condicao} onPick={toggleParam} />

      <section className={styles.facet}>
        <h3 className={styles.facetTitle}>Quilometragem</h3>
        <ul className={styles.facetList}>
          {KM_RANGES.map((r) => {
            const on = kmMax === r.value;
            return (
              <li key={r.value}>
                <button
                  type="button"
                  className={`${styles.facetItem} ${on ? styles.facetItemOn : ''}`}
                  onClick={() => toggleParam('km_max', r.value)}
                >
                  {on && <Icon name="check" size={13} className={styles.facetCheck} />}
                  {r.label}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <FacetSection title="Combustível" valueKey="spec_combustivel"
        options={COMBUSTIVEIS} active={filters.spec_combustivel} onPick={toggleParam} />
      <FacetChips title="Câmbio" valueKey="spec_cambio"
        options={CAMBIOS} active={filters.spec_cambio} onPick={toggleParam} />

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
    </>
  );

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Breadcrumb items={[{ label: 'Início', href: '/' }, { label: 'Veículos', href: '/veiculos' }, { label: 'Resultados' }]} />

        {/* CABEÇALHO TEMÁTICO — vertical de veículos */}
        <section className={styles.hero}>
          <div className={styles.heroText}>
            <span className={styles.heroBadge}>
              <Icon name="truck" size={13} /> Feira do Rolo • Veículos
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
                  { value: 'year_desc', label: 'Ano: mais novo' },
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
                title={`Remover filtro ${chipLabel(k)}`}
              >
                <span className={styles.activeChipKey}>{chipLabel(k)}:</span> {chipValue(k, v)}
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
                    <VeiculoMeta data={p.veiculo} />
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.empty}>
                <span className={styles.emptyIcon} aria-hidden="true">
                  <Icon name="truck" size={30} />
                </span>
                <h3 className={styles.emptyTitle}>Nenhum veículo encontrado com esses filtros</h3>
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
                Ver {sorted.length} {sorted.length === 1 ? 'veículo' : 'veículos'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function priceLabel(min, max) {
  const fmt = (v) => BRL.format(Number(v)).replace(/ /g, ' ');
  if (min && max) return `${fmt(min)} a ${fmt(max)}`;
  if (min) return `Acima de ${fmt(min)}`;
  if (max) return `Até ${fmt(max)}`;
  return '';
}

function yearLabel(min, max) {
  if (min && max) return `${min} a ${max}`;
  if (min) return `${min} ou mais novo`;
  if (max) return `Até ${max}`;
  return '';
}

/** Linha de meta do veículo (ano/km/câmbio/combustível + cidade/UF) abaixo do card. */
function VeiculoMeta({ data }) {
  if (!data) return null;
  const bits = [];
  if (data.ano) bits.push(data.ano);
  if (data.km) bits.push(`${KM_FMT.format(Number(data.km))} km`);
  if (data.cambio) bits.push(data.cambio);
  if (data.combustivel) bits.push(data.combustivel);
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

/** Faceta em "pílulas" (Condição/Câmbio — opções curtas). */
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

export default function VeiculosListaPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40 }}>Carregando…</div>}>
      <VeiculosListaInner />
    </Suspense>
  );
}
