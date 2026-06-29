'use client';

import { useEffect, useState } from 'react';
import styles from './page.module.css';
import Icon from '@/components/atoms/Icon/Icon';
import Select from '@/components/atoms/Select/Select';
import Input from '@/components/atoms/Input/Input';
import Button from '@/components/atoms/Button/Button';
import Breadcrumb from '@/components/molecules/Breadcrumb/Breadcrumb';
import ProductCard from '@/components/molecules/ProductCard/ProductCard';
import { productService, contentService, mapProduct } from '@/lib/api';

const CATEGORY_SLUG = 'veiculos';

// Hero padrão (usado quando o admin ainda não definiu/gerou o banner).
const HERO_FALLBACK = {
  title: 'VEÍCULOS',
  subtitle: 'Encontre o carro ideal',
  image_url: '',
};

// Tipos de veículo (busca e SEO footer).
const TIPOS = ['Carros', 'Motos', 'Caminhões', 'Ônibus', 'Barcos', 'Vans'];

const CONDICOES = ['Novo', 'Usado'];

// Marcas — usadas no select de busca e no grid de marcas.
const MARCAS = [
  'Chevrolet', 'Volkswagen', 'Fiat', 'Ford', 'Toyota', 'Honda', 'Hyundai',
  'Renault', 'Jeep', 'Nissan', 'Peugeot', 'Citroën', 'BMW', 'Mercedes-Benz',
  'Audi', 'BYD', 'GWM', 'Mitsubishi', 'Kia', 'Volvo',
];

// Cores de "logo" estilizada por marca (card branco com nome forte e colorido).
const MARCA_ACCENT = {
  Chevrolet: '#c8961e',
  Volkswagen: '#001e50',
  Fiat: '#9b1c2e',
  Ford: '#1b3a8a',
  Toyota: '#d50000',
  Honda: '#cc0000',
  Hyundai: '#002c5f',
  Renault: '#efb700',
  Jeep: '#2c5234',
  Nissan: '#c3002f',
  Peugeot: '#0a1f44',
  Citroën: '#a3001b',
  BMW: '#0066b1',
  'Mercedes-Benz': '#111111',
  Audi: '#bb0a30',
  BYD: '#d40000',
  GWM: '#c8961e',
  Mitsubishi: '#e60012',
  Kia: '#05141f',
  Volvo: '#1c3a5e',
};

// Comprar por carroceria → /veiculos/lista?spec_carroceria=<>.
const CARROCERIAS = [
  { label: 'SUV', icon: 'truck', accent: '#1d4ed8' },
  { label: 'Hatch', icon: 'package', accent: '#0891b2' },
  { label: 'Sedã', icon: 'card', accent: '#15803d' },
  { label: 'Picape', icon: 'truck', accent: '#b45309' },
  { label: 'Cupê', icon: 'bolt', accent: '#9333ea' },
  { label: 'Crossover', icon: 'grid', accent: '#0f766e' },
  { label: 'Híbrido', icon: 'sparkle', accent: '#059669' },
  { label: 'Elétrico', icon: 'bolt', accent: '#16a34a' },
];

// Comprar por preço → /veiculos/lista?price_max=<>.
const FAIXAS_PRECO = [10000, 15000, 20000, 30000, 40000, 50000, 60000, 100000];

// SEO footer — "Carros, Motos e Outros".
const SEO_TIPOS = [
  'Carros', 'Caminhões', 'Motos', 'Ônibus', 'Vans', 'Barcos', 'Autopeças',
];

function brl(v) {
  try {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(v);
  } catch {
    return `R$ ${v}`;
  }
}

function listHref(params) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== '') qs.set(k, v);
  });
  const s = qs.toString();
  return `/veiculos/lista${s ? `?${s}` : ''}`;
}

function SearchBar() {
  const [tipo, setTipo] = useState('Carros');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [precoMin, setPrecoMin] = useState('');
  const [precoMax, setPrecoMax] = useState('');
  const [condicao, setCondicao] = useState('');

  function onSearch(e) {
    e.preventDefault();
    window.location.href = listHref({
      spec_tipo_veiculo: tipo,
      spec_marca: marca,
      spec_modelo: modelo.trim(),
      price_min: precoMin,
      price_max: precoMax,
      spec_condicao: condicao,
    });
  }

  return (
    <form className={styles.searchCard} onSubmit={onSearch}>
      <div className={styles.searchFields}>
        <label className={styles.field}>
          <span>Tipo</span>
          <Select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            options={TIPOS.map((t) => ({ value: t, label: t }))}
          />
        </label>

        <label className={styles.field}>
          <span>Marca</span>
          <Select
            value={marca}
            onChange={(e) => setMarca(e.target.value)}
            placeholder="Todas as marcas"
            options={MARCAS.map((m) => ({ value: m, label: m }))}
          />
        </label>

        <label className={styles.field}>
          <span>Modelo</span>
          <Input
            placeholder="Ex.: Onix, Corolla..."
            value={modelo}
            onChange={(e) => setModelo(e.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span>De R$</span>
          <Input
            type="number"
            min="0"
            placeholder="Mínimo"
            value={precoMin}
            onChange={(e) => setPrecoMin(e.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span>Até R$</span>
          <Input
            type="number"
            min="0"
            placeholder="Máximo"
            value={precoMax}
            onChange={(e) => setPrecoMax(e.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span>Condição</span>
          <Select
            value={condicao}
            onChange={(e) => setCondicao(e.target.value)}
            placeholder="Novo/Usado"
            options={CONDICOES.map((c) => ({ value: c, label: c }))}
          />
        </label>
      </div>

      <div className={styles.searchActions}>
        <Button type="submit" variant="primary" leftIcon="search" className={styles.searchBtn}>
          Buscar
        </Button>
      </div>
    </form>
  );
}

export default function VeiculosLanding() {
  const [hero, setHero] = useState(HERO_FALLBACK);
  const [populares, setPopulares] = useState([]);
  const [loadingPop, setLoadingPop] = useState(true);

  // HERO editável pelo admin (content page "veiculos").
  useEffect(() => {
    let alive = true;
    contentService
      .get(CATEGORY_SLUG)
      .then((p) => {
        if (!alive) return;
        const h = p?.content?.hero;
        if (h) setHero({ ...HERO_FALLBACK, ...h });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Carros mais populares / mais procurados.
  useEffect(() => {
    let alive = true;
    productService
      .list(`?category_slug=${CATEGORY_SLUG}&limit=8`)
      .then((d) => {
        if (!alive) return;
        const list = (Array.isArray(d) ? d : (d?.products || [])).map(mapProduct).filter(Boolean);
        setPopulares(list);
      })
      .catch(() => alive && setPopulares([]))
      .finally(() => alive && setLoadingPop(false));
    return () => {
      alive = false;
    };
  }, []);

  const hasHeroImage = !!(hero && hero.image_url);

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Breadcrumb items={[{ label: 'Início', href: '/' }, { label: 'Veículos' }]} />
      </div>

      {/* 1 — HERO (banner editável pelo admin / fallback gradiente) */}
      <section
        className={`${styles.hero} ${hasHeroImage ? styles.heroImage : styles.heroPlaceholder}`}
        style={hasHeroImage ? { backgroundImage: `url(${hero.image_url})` } : undefined}
      >
        <div className={styles.heroOverlay} />
        <div className={`${styles.container} ${styles.heroInner}`}>
          <h1 className={styles.heroTitle}>{hero.title || 'VEÍCULOS'}</h1>
          <p className={styles.heroSubtitle}>{hero.subtitle || 'Encontre o carro ideal'}</p>
          {!hasHeroImage && (
            <span className={styles.heroBadge}>
              <Icon name="camera" size={14} /> Área do banner — personalize pelo painel
            </span>
          )}
        </div>
      </section>

      {/* 2 — Barra de busca */}
      <section className={`${styles.container} ${styles.searchWrap}`}>
        <SearchBar />
      </section>

      {/* 3 — Comprar por carroceria */}
      <section className={styles.container}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Comprar por carroceria</h2>
        </div>
        <div className={styles.bodyRow}>
          {CARROCERIAS.map((c) => (
            <a
              key={c.label}
              href={listHref({ spec_carroceria: c.label })}
              className={styles.bodyCard}
              style={{ '--accent': c.accent }}
            >
              <span className={styles.bodyIcon}>
                <Icon name={c.icon} size={26} />
              </span>
              <span className={styles.bodyLabel}>{c.label}</span>
            </a>
          ))}
        </div>
      </section>

      {/* 4 — As melhores marcas (grid de "logos" estilizadas) */}
      <section className={styles.container}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>As melhores marcas</h2>
        </div>
        <div className={styles.brandsGrid}>
          {MARCAS.map((m) => (
            <a
              key={m}
              href={listHref({ spec_marca: m })}
              className={styles.brandCard}
              style={{ '--accent': MARCA_ACCENT[m] || 'var(--feira-gray)' }}
            >
              <span className={styles.brandName}>{m}</span>
            </a>
          ))}
        </div>
      </section>

      {/* 5 — Carros mais populares / mais procurados */}
      <section className={styles.container}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Carros mais populares</h2>
          <a className={styles.seeAll} href={listHref({ spec_tipo_veiculo: 'Carros' })}>
            Ver mais <Icon name="arrow-right" size={15} />
          </a>
        </div>
        <div className={styles.carousel}>
          {loadingPop ? (
            Array.from({ length: 4 }).map((_, i) => (
              <ProductCard key={i} loading className={styles.carouselCard} />
            ))
          ) : populares.length ? (
            populares.map((p) => (
              <ProductCard key={p.id} product={p} className={styles.carouselCard} />
            ))
          ) : (
            <p className={styles.emptyInline}>Nenhum veículo anunciado no momento.</p>
          )}
        </div>
      </section>

      {/* 6 — Comprar por preço */}
      <section className={styles.container}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Comprar por preço</h2>
        </div>
        <div className={styles.priceGrid}>
          {FAIXAS_PRECO.map((v) => (
            <a key={v} href={listHref({ price_max: v })} className={styles.priceCard}>
              <span className={styles.priceLabel}>Carros até</span>
              <span className={styles.priceValue}>{brl(v)}</span>
            </a>
          ))}
        </div>
      </section>

      {/* 7 — Categorias de veículos */}
      <section className={styles.container}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Categorias de veículos</h2>
        </div>
        <div className={styles.bodyRow}>
          {[
            { label: 'Carros', icon: 'card', accent: '#1d4ed8' },
            { label: 'Caminhões', icon: 'truck', accent: '#b45309' },
            { label: 'Motos', icon: 'bolt', accent: '#dc2626' },
            { label: 'Ônibus', icon: 'package', accent: '#0f766e' },
            { label: 'Barcos', icon: 'sparkle', accent: '#0891b2' },
          ].map((c) => (
            <a
              key={c.label}
              href={listHref({ spec_tipo_veiculo: c.label })}
              className={styles.bodyCard}
              style={{ '--accent': c.accent }}
            >
              <span className={styles.bodyIcon}>
                <Icon name={c.icon} size={26} />
              </span>
              <span className={styles.bodyLabel}>{c.label}</span>
            </a>
          ))}
        </div>
      </section>

      {/* 8 — Tabela FIPE + cross-sell de peças */}
      <section className={styles.container}>
        <div className={styles.fipeRow}>
          <a href="/veiculos/fipe" className={`${styles.toolCard} ${styles.fipeCard}`}>
            <span className={styles.toolIcon}>
              <Icon name="trending-up" size={30} />
            </span>
            <div className={styles.toolBody}>
              <h3 className={styles.toolTitle}>Tabela FIPE</h3>
              <p className={styles.toolSub}>
                Consulte o valor de mercado do veículo antes de comprar ou vender.
              </p>
              <span className={styles.toolBtn}>
                <Icon name="search" size={15} /> Consultar tabela FIPE
                <Icon name="arrow-right" size={15} />
              </span>
            </div>
          </a>

          <a href="/buscar?q=peças" className={`${styles.toolCard} ${styles.partsCard}`}>
            <span className={styles.toolIcon}>
              <Icon name="package" size={30} />
            </span>
            <div className={styles.toolBody}>
              <h3 className={styles.toolTitle}>Encontre peças para seu carro</h3>
              <p className={styles.toolSub}>
                Autopeças, acessórios e itens de manutenção com entrega na sua região.
              </p>
              <span className={styles.toolBtn}>
                Ver autopeças <Icon name="arrow-right" size={15} />
              </span>
            </div>
          </a>
        </div>
      </section>

      {/* 9 — SEO footer: Carros, Motos e Outros */}
      <section className={`${styles.container} ${styles.seoSection}`}>
        <h2 className={styles.seoHeading}>Carros, Motos e Outros</h2>
        <div className={styles.seoGrid}>
          {SEO_TIPOS.map((tipo) => (
            <div key={tipo} className={styles.seoCol}>
              <h3 className={styles.seoColTitle}>{tipo}</h3>
              <ul className={styles.seoLinks}>
                <li>
                  <a href={tipo === 'Autopeças' ? '/buscar?q=peças' : listHref({ spec_tipo_veiculo: tipo })}>
                    Ver {tipo.toLowerCase()}
                  </a>
                </li>
                {tipo !== 'Autopeças' && (
                  <>
                    <li>
                      <a href={tipo === 'Autopeças' ? '/buscar?q=peças' : listHref({ spec_tipo_veiculo: tipo, spec_condicao: 'Novo' })}>
                        {tipo} novos
                      </a>
                    </li>
                    <li>
                      <a href={listHref({ spec_tipo_veiculo: tipo, spec_condicao: 'Usado' })}>
                        {tipo} usados
                      </a>
                    </li>
                  </>
                )}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
