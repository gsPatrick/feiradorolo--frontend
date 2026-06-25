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

const CATEGORY_SLUG = 'imoveis';

// Hero padrão (usado quando o admin ainda não definiu/gerou o banner).
const HERO_FALLBACK = {
  title: 'IMÓVEIS',
  subtitle: 'Seu descanso merecido',
  image_url: '',
};

const OPERACOES = ['Venda', 'Aluguel', 'Temporada'];

const TIPOS = [
  'Apartamento',
  'Casa',
  'Chácara',
  'Terreno',
  'Sala Comercial',
  'Sítio',
  'Fazenda',
  'Galpão',
  'Flat/Apart Hotel',
  'Loja Comercial',
];

// Serviços complementares para a casa → categorias/buscas internas.
const SERVICOS = [
  { label: 'Casa e Decoração', icon: 'store', href: '/categoria/casa-e-decoracao', accent: '#0ea5e9' },
  { label: 'Pisos e Revestimentos', icon: 'grid', href: '/buscar?q=pisos+revestimentos', accent: '#f59e0b' },
  { label: 'Mudanças e Carretos', icon: 'truck', href: '/buscar?q=mudancas+carretos', accent: '#10b981' },
  { label: 'Iluminação', icon: 'bulb', href: '/buscar?q=iluminacao', accent: '#a855f7' },
];

// Dicas imobiliárias (conteúdo estático/placeholder).
const DICAS = [
  { title: 'Como financiar seu primeiro imóvel', tag: 'Financiamento', accent: '#1d4ed8' },
  { title: 'Aluguel x compra: o que vale mais a pena?', tag: 'Decisão', accent: '#0f766e' },
  { title: 'Documentos necessários para comprar', tag: 'Documentação', accent: '#b45309' },
  { title: 'Dicas para valorizar seu imóvel', tag: 'Valorização', accent: '#9333ea' },
];

// Lugares mais procurados → /imoveis/lista?state=<UF>.
const LUGARES = [
  { label: 'São Paulo', uf: 'SP', accent: '#dc2626' },
  { label: 'Rio de Janeiro', uf: 'RJ', accent: '#2563eb' },
  { label: 'Minas Gerais', uf: 'MG', accent: '#15803d' },
  { label: 'Paraná', uf: 'PR', accent: '#0891b2' },
  { label: 'Santa Catarina', uf: 'SC', accent: '#ea580c' },
  { label: 'Bahia', uf: 'BA', accent: '#7c3aed' },
];

// SEO footer — tipos de imóvel × operação.
const SEO_TIPOS = [
  'Apartamentos',
  'Casas',
  'Chácaras',
  'Sítios',
  'Flat/Apart Hotel',
  'Fazendas',
  'Galpões',
  'Salas Comerciais',
  'Terrenos',
  'Lojas Comerciais',
  'Outros Imóveis',
];
const SEO_OPS = ['Aluguel', 'Temporada', 'Venda'];

function listHref(params) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== '') qs.set(k, v);
  });
  const s = qs.toString();
  return `/imoveis/lista${s ? `?${s}` : ''}`;
}

function SearchBar() {
  const [operacao, setOperacao] = useState('Venda');
  const [tipo, setTipo] = useState('');
  const [local, setLocal] = useState('');

  function onSearch(e) {
    e.preventDefault();
    window.location.href = listHref({
      spec_operacao: operacao,
      spec_tipo_imovel: tipo,
      city: local.trim(),
    });
  }

  return (
    <form className={styles.searchCard} onSubmit={onSearch}>
      <div className={styles.searchFields}>
        <label className={styles.field}>
          <span>Operação</span>
          <Select
            value={operacao}
            onChange={(e) => setOperacao(e.target.value)}
            options={OPERACOES.map((o) => ({ value: o, label: o }))}
          />
        </label>

        <label className={styles.field}>
          <span>Tipo de imóvel</span>
          <Select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            placeholder="Todos os tipos"
            options={TIPOS.map((t) => ({ value: t, label: t }))}
          />
        </label>

        <label className={`${styles.field} ${styles.fieldWide}`}>
          <span>Localização</span>
          <Input
            leftIcon="map-pin"
            placeholder="Informe bairro ou cidade"
            value={local}
            onChange={(e) => setLocal(e.target.value)}
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

export default function ImoveisLanding() {
  const [hero, setHero] = useState(HERO_FALLBACK);
  const [vendas, setVendas] = useState([]);
  const [loadingVendas, setLoadingVendas] = useState(true);

  // HERO editável pelo admin (content page "imoveis").
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

  // Imóveis à venda anunciados hoje.
  useEffect(() => {
    let alive = true;
    productService
      .list(`?category_slug=${CATEGORY_SLUG}&spec_operacao=Venda&limit=8`)
      .then((d) => {
        if (!alive) return;
        const list = (Array.isArray(d) ? d : (d?.products || [])).map(mapProduct).filter(Boolean);
        setVendas(list);
      })
      .catch(() => alive && setVendas([]))
      .finally(() => alive && setLoadingVendas(false));
    return () => {
      alive = false;
    };
  }, []);

  const hasHeroImage = !!(hero && hero.image_url);

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Breadcrumb items={[{ label: 'Início', href: '/' }, { label: 'Imóveis' }]} />
      </div>

      {/* 1 — HERO (banner editável pelo admin / fallback gradiente) */}
      <section
        className={`${styles.hero} ${hasHeroImage ? styles.heroImage : styles.heroPlaceholder}`}
        style={hasHeroImage ? { backgroundImage: `url(${hero.image_url})` } : undefined}
      >
        <div className={styles.heroOverlay} />
        <div className={`${styles.container} ${styles.heroInner}`}>
          <h1 className={styles.heroTitle}>{hero.title || 'IMÓVEIS'}</h1>
          <p className={styles.heroSubtitle}>{hero.subtitle || 'Seu descanso merecido'}</p>
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

      {/* 3 — Anuncie no Feira do Rolo */}
      <section className={styles.container}>
        <div className={styles.announceCard}>
          <div className={styles.announceText}>
            <h2 className={styles.announceTitle}>Anuncie no Feira do Rolo</h2>
            <p className={styles.announceSub}>
              Publique sua propriedade gratuitamente e alcance milhares de interessados na sua região.
            </p>
            <Button href="/adicionar-produto" variant="primary" rightIcon="arrow-right">
              Publicar propriedade
            </Button>
          </div>
          <div className={styles.announceArt} aria-hidden="true">
            <Icon name="store" size={72} />
          </div>
        </div>
      </section>

      {/* 4 — Imóveis à venda anunciados hoje */}
      <section className={styles.container}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Imóveis à venda anunciados hoje</h2>
          <a className={styles.seeAll} href={listHref({ spec_operacao: 'Venda' })}>
            Ver mais <Icon name="arrow-right" size={15} />
          </a>
        </div>
        <div className={styles.carousel}>
          {loadingVendas ? (
            Array.from({ length: 4 }).map((_, i) => (
              <ProductCard key={i} loading className={styles.carouselCard} />
            ))
          ) : vendas.length ? (
            vendas.map((p) => (
              <ProductCard key={p.id} product={p} className={styles.carouselCard} />
            ))
          ) : (
            <p className={styles.emptyInline}>Nenhum imóvel à venda anunciado no momento.</p>
          )}
        </div>
      </section>

      {/* 5 — Serviços complementares para sua casa */}
      <section className={styles.container}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Serviços complementares para sua casa</h2>
        </div>
        <div className={styles.servicesGrid}>
          {SERVICOS.map((s) => (
            <a
              key={s.label}
              href={s.href}
              className={styles.serviceCard}
              style={{ '--accent': s.accent }}
            >
              <span className={styles.serviceIcon}>
                <Icon name={s.icon} size={26} />
              </span>
              <span className={styles.serviceLabel}>{s.label}</span>
            </a>
          ))}
        </div>
      </section>

      {/* 6 — Dicas imobiliárias */}
      <section className={styles.container}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Dicas imobiliárias</h2>
        </div>
        <div className={styles.tipsGrid}>
          {DICAS.map((d) => (
            <article key={d.title} className={styles.tipCard}>
              <div className={styles.tipImage} style={{ '--accent': d.accent }} aria-hidden="true">
                <Icon name="tag" size={30} />
              </div>
              <div className={styles.tipBody}>
                <span className={styles.tipTag} style={{ '--accent': d.accent }}>{d.tag}</span>
                <h3 className={styles.tipTitle}>{d.title}</h3>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* 7 — Os lugares mais procurados do Brasil */}
      <section className={styles.container}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Os lugares mais procurados do Brasil</h2>
        </div>
        <div className={styles.placesRow}>
          {LUGARES.map((l) => (
            <a
              key={l.uf}
              href={listHref({ state: l.uf })}
              className={styles.placeItem}
            >
              <span className={styles.placeCircle} style={{ '--accent': l.accent }} aria-hidden="true">
                <Icon name="map-pin" size={26} />
              </span>
              <span className={styles.placeLabel}>{l.label}</span>
            </a>
          ))}
        </div>
      </section>

      {/* 8 — SEO footer: tipos × operação */}
      <section className={`${styles.container} ${styles.seoSection}`}>
        <h2 className={styles.seoHeading}>Imóveis</h2>
        <div className={styles.seoGrid}>
          {SEO_TIPOS.map((tipo) => (
            <div key={tipo} className={styles.seoCol}>
              <h3 className={styles.seoColTitle}>{tipo}</h3>
              <ul className={styles.seoLinks}>
                {SEO_OPS.map((op) => (
                  <li key={op}>
                    <a href={listHref({ spec_tipo_imovel: tipo, spec_operacao: op })}>{op}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
