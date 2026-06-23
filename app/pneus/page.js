'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import Select from '@/components/atoms/Select/Select';
import Input from '@/components/atoms/Input/Input';
import Button from '@/components/atoms/Button/Button';
import Icon from '@/components/atoms/Icon/Icon';
import Breadcrumb from '@/components/molecules/Breadcrumb/Breadcrumb';
import ProductCard from '@/components/molecules/ProductCard/ProductCard';
import { productService, mapProduct } from '@/lib/api';
import {
  CATEGORY_SLUG, LARGURAS, PERFIS, AROS, MARCAS,
  VEICULO_MARCAS, VEICULO_MODELOS, ANOS, toOpts,
} from './tireOptions';

export default function PneusLanding() {
  const router = useRouter();

  // Busca por MEDIDA
  const [mLargura, setMLargura] = useState('');
  const [mPerfil, setMPerfil] = useState('');
  const [mAro, setMAro] = useState('');

  // Busca por VEÍCULO
  const [vMarca, setVMarca] = useState('');
  const [vModelo, setVModelo] = useState('');
  const [vAno, setVAno] = useState('');

  // Busca por ARO
  const [aAro, setAAro] = useState('');
  const [aLargura, setALargura] = useState('');
  const [aPerfil, setAPerfil] = useState('');

  // Busca inteligente (texto livre)
  const [q, setQ] = useState('');

  // Promoções
  const [promos, setPromos] = useState([]);
  const [loadingPromos, setLoadingPromos] = useState(true);

  useEffect(() => {
    let alive = true;
    productService
      .list(`?category_slug=${CATEGORY_SLUG}&limit=8`)
      .then((d) => {
        if (!alive) return;
        const list = (Array.isArray(d) ? d : []).map(mapProduct).filter(Boolean);
        // Destaque primeiro (diamante > ouro > prata), depois preço.
        const rank = { diamond: 3, gold: 2, silver: 1 };
        list.sort(
          (a, b) =>
            (rank[b.highlightTier] || 0) - (rank[a.highlightTier] || 0) ||
            a.price - b.price
        );
        setPromos(list);
      })
      .catch(() => alive && setPromos([]))
      .finally(() => alive && setLoadingPromos(false));
    return () => {
      alive = false;
    };
  }, []);

  const modelosDoVeiculo = useMemo(
    () => (vMarca && VEICULO_MODELOS[vMarca]) || [],
    [vMarca]
  );

  function go(params) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && String(v).trim() !== '') qs.set(k, String(v).trim());
    });
    router.push(`/pneus/lista${qs.toString() ? `?${qs}` : ''}`);
  }

  const submitMedida = (e) => {
    e.preventDefault();
    go({ spec_largura: mLargura, spec_perfil: mPerfil, spec_aro: mAro });
  };

  const submitVeiculo = (e) => {
    e.preventDefault();
    const partes = [vMarca, vModelo, vAno].filter(Boolean).join(' ');
    go({ q: `${partes} pneu`.trim() });
  };

  const submitAro = (e) => {
    e.preventDefault();
    go({ spec_aro: aAro, spec_largura: aLargura, spec_perfil: aPerfil });
  };

  const submitSmart = (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    go({ q });
  };

  const larguraOpts = toOpts(LARGURAS);
  const perfilOpts = toOpts(PERFIS);
  const aroOpts = toOpts(AROS, '"');
  const marcaVeicOpts = toOpts(VEICULO_MARCAS);
  const modeloOpts = toOpts(modelosDoVeiculo);
  const anoOpts = toOpts(ANOS);

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Breadcrumb items={[{ label: 'Início', href: '/' }, { label: 'Pneus' }]} />
      </div>

      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.container}>
          <div className={styles.heroInner}>
            <span className={styles.heroKicker}>
              <Icon name="truck" size={16} /> Vertical de Pneus
            </span>
            <h1 className={styles.heroTitle}>Encontre o pneu certo para você</h1>
            <p className={styles.heroLead}>
              Busque por medida, aro, veículo ou marca e compare os melhores preços.
            </p>

            {/* Busca inteligente */}
            <form className={styles.smartSearch} onSubmit={submitSmart} role="search">
              <Input
                leftIcon="search"
                placeholder="Busque por medida, aro, veículo ou marca"
                aria-label="Busca inteligente de pneus"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                wrapperClassName={styles.smartInput}
              />
              <Button type="submit" leftIcon="search">Buscar</Button>
            </form>
          </div>
        </div>
      </section>

      {/* 3 CAIXAS DE BUSCA */}
      <section className={styles.container}>
        <div className={styles.searchGrid}>
          {/* Por MEDIDA */}
          <form className={styles.box} onSubmit={submitMedida}>
            <h2 className={styles.boxTitle}><Icon name="filter" size={18} /> Buscar por medida</h2>
            <p className={styles.boxHint}>Ex.: 205 / 55 R16</p>
            <div className={styles.boxFields}>
              <label className={styles.field}>
                <span>Largura</span>
                <Select placeholder="Largura" options={larguraOpts}
                  value={mLargura} onChange={(e) => setMLargura(e.target.value)} />
              </label>
              <label className={styles.field}>
                <span>Perfil</span>
                <Select placeholder="Altura" options={perfilOpts}
                  value={mPerfil} onChange={(e) => setMPerfil(e.target.value)} />
              </label>
              <label className={styles.field}>
                <span>Aro</span>
                <Select placeholder="Aro" options={aroOpts}
                  value={mAro} onChange={(e) => setMAro(e.target.value)} />
              </label>
            </div>
            <Button type="submit" fullWidth leftIcon="search">Pesquisar</Button>
          </form>

          {/* Por VEÍCULO */}
          <form className={styles.box} onSubmit={submitVeiculo}>
            <h2 className={styles.boxTitle}><Icon name="truck" size={18} /> Buscar por veículo</h2>
            <p className={styles.boxHint}>Selecione marca, modelo e ano</p>
            <div className={styles.boxFields}>
              <label className={styles.field}>
                <span>Marca</span>
                <Select placeholder="Marca" options={marcaVeicOpts}
                  value={vMarca}
                  onChange={(e) => { setVMarca(e.target.value); setVModelo(''); }} />
              </label>
              <label className={styles.field}>
                <span>Modelo</span>
                <Select placeholder="Modelo" options={modeloOpts}
                  disabled={!vMarca}
                  value={vModelo} onChange={(e) => setVModelo(e.target.value)} />
              </label>
              <label className={styles.field}>
                <span>Ano</span>
                <Select placeholder="Ano" options={anoOpts}
                  value={vAno} onChange={(e) => setVAno(e.target.value)} />
              </label>
            </div>
            <Button type="submit" fullWidth variant="secondary" leftIcon="search">Pesquisar</Button>
            <p className={styles.note}>Busca exata por veículo em integração</p>
          </form>

          {/* Por ARO */}
          <form className={styles.box} onSubmit={submitAro}>
            <h2 className={styles.boxTitle}><Icon name="gem" size={18} /> Buscar por aro</h2>
            <p className={styles.boxHint}>Aro obrigatório, medidas opcionais</p>
            <div className={styles.boxFields}>
              <label className={styles.field}>
                <span>Aro</span>
                <Select placeholder="Aro" options={aroOpts}
                  value={aAro} onChange={(e) => setAAro(e.target.value)} />
              </label>
              <label className={styles.field}>
                <span>Largura</span>
                <Select placeholder="Opcional" options={larguraOpts}
                  value={aLargura} onChange={(e) => setALargura(e.target.value)} />
              </label>
              <label className={styles.field}>
                <span>Perfil</span>
                <Select placeholder="Opcional" options={perfilOpts}
                  value={aPerfil} onChange={(e) => setAPerfil(e.target.value)} />
              </label>
            </div>
            <Button type="submit" fullWidth variant="secondary" leftIcon="search">Pesquisar</Button>
          </form>
        </div>
      </section>

      {/* PNEUS EM PROMOÇÃO */}
      <section className={styles.container}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Pneus em promoção</h2>
          <a className={styles.seeAll} href={`/pneus/lista`}>
            Ver todos <Icon name="arrow-right" size={15} />
          </a>
        </div>
        <div className={styles.carousel}>
          {loadingPromos
            ? Array.from({ length: 4 }).map((_, i) => (
                <ProductCard key={i} loading className={styles.carouselCard} />
              ))
            : promos.length
            ? promos.map((p) => (
                <ProductCard key={p.id} product={p} className={styles.carouselCard} />
              ))
            : <p className={styles.emptyInline}>Sem promoções no momento.</p>}
        </div>
      </section>

      {/* MARCAS DE PNEUS */}
      <section className={styles.container}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Marcas de pneus</h2>
        </div>
        <div className={styles.brandsGrid}>
          {MARCAS.map((m) => (
            <a
              key={m}
              className={styles.brandChip}
              href={`/pneus/lista?spec_marca=${encodeURIComponent(m)}`}
            >
              <span className={styles.brandMono}>{m.charAt(0)}</span>
              <span className={styles.brandName}>{m}</span>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
