'use client';

/**
 * Caixas de busca compartilhadas da vertical de PNEUS.
 * Usado pela landing (/pneus) e pela listagem (/pneus/lista).
 *
 * Contrato de busca (NÃO alterar): navega para /pneus/lista com
 * ?spec_largura=&spec_perfil=&spec_aro=&spec_marca= ou ?q= (busca livre/veículo).
 *
 * Props:
 *  - variant: 'full' (4 caixas, default — landing) | 'compact' (3 caixas: medida/veículo/aro — listagem)
 *  - initial: { spec_largura, spec_perfil, spec_aro } para pré-preencher (listagem)
 */

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './TireSearchBoxes.module.css';
import Select from '@/components/atoms/Select/Select';
import Input from '@/components/atoms/Input/Input';
import Button from '@/components/atoms/Button/Button';
import {
  LARGURAS, PERFIS, AROS,
  VEICULO_MARCAS, VEICULO_MODELOS, ANOS, toOpts,
} from './tireOptions';

export default function TireSearchBoxes({ variant = 'full', initial = {} }) {
  const router = useRouter();

  // Busca por MEDIDA (pré-preenche a partir da URL na listagem).
  const [mLargura, setMLargura] = useState(initial.spec_largura || '');
  const [mPerfil, setMPerfil] = useState(initial.spec_perfil || '');
  const [mAro, setMAro] = useState(initial.spec_aro || '');

  // Busca por VEÍCULO
  const [vMarca, setVMarca] = useState('');
  const [vModelo, setVModelo] = useState('');
  const [vAno, setVAno] = useState('');

  // Busca por ARO
  const [aAro, setAAro] = useState(initial.spec_aro || '');
  const [aLargura, setALargura] = useState('');
  const [aPerfil, setAPerfil] = useState('');

  // Busca inteligente (texto livre) — só no variant full.
  const [q, setQ] = useState('');

  const modelosDoVeiculo = useMemo(
    () => (vMarca && VEICULO_MODELOS[vMarca]) || [],
    [vMarca]
  );

  function go(params) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && String(v).trim() !== '') qs.set(k, String(v).trim());
    });
    router.push(`/pneus/lista${qs.toString() ? `?${qs}` : ''}`, { scroll: false });
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

  const compact = variant === 'compact';

  return (
    <div className={`${styles.searchGrid} ${compact ? styles.searchGridCompact : ''}`}>
      {/* Por MEDIDA */}
      <form className={styles.box} onSubmit={submitMedida}>
        <h2 className={styles.boxTitle}>Pesquise pela medida</h2>
        <div className={styles.boxFields}>
          <label className={styles.field}>
            <span>Largura</span>
            <Select placeholder="Largura" options={larguraOpts}
              value={mLargura} onChange={(e) => setMLargura(e.target.value)} />
          </label>
          <label className={styles.field}>
            <span>Altura</span>
            <Select placeholder="Altura" options={perfilOpts}
              value={mPerfil} onChange={(e) => setMPerfil(e.target.value)} />
          </label>
          <label className={styles.field}>
            <span>Aro</span>
            <Select placeholder="Aro" options={aroOpts}
              value={mAro} onChange={(e) => setMAro(e.target.value)} />
          </label>
          <Button className={styles.searchBtn} type="submit" leftIcon="search">Pesquisar</Button>
        </div>
      </form>

      {/* Por VEÍCULO */}
      <form className={styles.box} onSubmit={submitVeiculo}>
        <h2 className={styles.boxTitle}>Pesquise pelo veículo</h2>
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
          <Button className={styles.searchBtn} type="submit" leftIcon="search">Pesquisar</Button>
        </div>
      </form>

      {/* Por ARO */}
      <form className={styles.box} onSubmit={submitAro}>
        <h2 className={styles.boxTitle}>Pesquise pelo aro</h2>
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
            <span>Altura</span>
            <Select placeholder="Opcional" options={perfilOpts}
              value={aPerfil} onChange={(e) => setAPerfil(e.target.value)} />
          </label>
          <Button className={styles.searchBtn} type="submit" leftIcon="search">Pesquisar</Button>
        </div>
      </form>

      {/* Busca INTELIGENTE — só no layout completo (landing) */}
      {!compact && (
        <form className={`${styles.box} ${styles.boxSmart}`} onSubmit={submitSmart}>
          <h2 className={styles.boxTitle}>Busca inteligente de pneus</h2>
          <div className={styles.boxFields}>
            <label className={styles.field}>
              <span>O que você procura?</span>
              <Input
                leftIcon="search"
                placeholder="Ex.: 205 55 R16 Michelin"
                aria-label="Busca inteligente de pneus"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
            <p className={styles.smartHint}>
              Digite medida, aro, veículo ou marca — nós encontramos pra você.
            </p>
            <Button className={styles.searchBtn} type="submit" leftIcon="bulb">Pesquisar</Button>
          </div>
        </form>
      )}
    </div>
  );
}
