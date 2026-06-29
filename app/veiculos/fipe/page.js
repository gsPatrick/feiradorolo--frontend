'use client';

import { useEffect, useState } from 'react';
import styles from './page.module.css';
import Icon from '@/components/atoms/Icon/Icon';
import Select from '@/components/atoms/Select/Select';
import Button from '@/components/atoms/Button/Button';
import Spinner from '@/components/atoms/Spinner/Spinner';
import Breadcrumb from '@/components/molecules/Breadcrumb/Breadcrumb';
import { fipeService } from '@/lib/api';

// Tipos de veículo suportados pela FIPE (value = parâmetro da API).
const TIPOS = [
  { value: 'carros', label: 'Carros' },
  { value: 'motos', label: 'Motos' },
  { value: 'caminhoes', label: 'Caminhões' },
];

const ERRO_FIPE = 'Consulta FIPE indisponível no momento, tente novamente';

// Garante uma lista [{codigo, nome}] mesmo que a API varie o envelope.
function asList(d) {
  if (Array.isArray(d)) return d;
  if (d && Array.isArray(d.items)) return d.items;
  return [];
}

export default function FipePage() {
  const [tipo, setTipo] = useState('carros');

  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [anos, setAnos] = useState([]);

  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [ano, setAno] = useState('');

  const [loadingMarcas, setLoadingMarcas] = useState(false);
  const [loadingModelos, setLoadingModelos] = useState(false);
  const [loadingAnos, setLoadingAnos] = useState(false);

  const [consultando, setConsultando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState('');

  // Limpa tudo abaixo de "marca" (modelo, ano, resultado).
  function resetFromModelo() {
    setModelos([]);
    setAnos([]);
    setModelo('');
    setAno('');
    setResultado(null);
    setErro('');
  }

  // Limpa tudo abaixo de "modelo" (ano, resultado).
  function resetFromAno() {
    setAnos([]);
    setAno('');
    setResultado(null);
    setErro('');
  }

  // 1 — Carrega marcas sempre que o tipo muda (e ao montar).
  useEffect(() => {
    let alive = true;
    setLoadingMarcas(true);
    setMarcas([]);
    setMarca('');
    resetFromModelo();
    fipeService
      .marcas(tipo)
      .then((d) => {
        if (alive) setMarcas(asList(d));
      })
      .catch(() => {
        if (alive) setErro(ERRO_FIPE);
      })
      .finally(() => {
        if (alive) setLoadingMarcas(false);
      });
    return () => {
      alive = false;
    };
  }, [tipo]);

  // 2 — Ao escolher a marca, carrega modelos.
  function onMarcaChange(e) {
    const value = e.target.value;
    setMarca(value);
    resetFromModelo();
    if (!value) return;
    let alive = true;
    setLoadingModelos(true);
    fipeService
      .modelos(tipo, value)
      .then((d) => {
        if (alive) setModelos(asList(d));
      })
      .catch(() => {
        if (alive) setErro(ERRO_FIPE);
      })
      .finally(() => {
        if (alive) setLoadingModelos(false);
      });
  }

  // 3 — Ao escolher o modelo, carrega anos.
  function onModeloChange(e) {
    const value = e.target.value;
    setModelo(value);
    resetFromAno();
    if (!value) return;
    let alive = true;
    setLoadingAnos(true);
    fipeService
      .anos(tipo, marca, value)
      .then((d) => {
        if (alive) setAnos(asList(d));
      })
      .catch(() => {
        if (alive) setErro(ERRO_FIPE);
      })
      .finally(() => {
        if (alive) setLoadingAnos(false);
      });
  }

  function onAnoChange(e) {
    setAno(e.target.value);
    setResultado(null);
    setErro('');
  }

  // 4 — Consulta o valor.
  function onConsultar(e) {
    e.preventDefault();
    if (!marca || !modelo || !ano) return;
    setConsultando(true);
    setErro('');
    setResultado(null);
    fipeService
      .valor(tipo, marca, modelo, ano)
      .then((d) => {
        if (d) setResultado(d);
        else setErro(ERRO_FIPE);
      })
      .catch(() => setErro(ERRO_FIPE))
      .finally(() => setConsultando(false));
  }

  const podeConsultar = !!(marca && modelo && ano) && !consultando;

  // Nomes legíveis (para o CTA e o card) a partir dos códigos selecionados.
  const marcaNome = marcas.find((m) => String(m.codigo) === String(marca))?.nome || '';
  const modeloNome = modelos.find((m) => String(m.codigo) === String(modelo))?.nome || '';

  const anunciosHref =
    '/veiculos/lista?spec_marca=' +
    encodeURIComponent(resultado?.marca || marcaNome) +
    '&q=' +
    encodeURIComponent(resultado?.modelo || modeloNome);

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Breadcrumb
          items={[
            { label: 'Início', href: '/' },
            { label: 'Veículos', href: '/veiculos' },
            { label: 'Tabela FIPE' },
          ]}
        />
      </div>

      {/* Cabeçalho temático */}
      <section className={styles.header}>
        <div className={`${styles.container} ${styles.headerInner}`}>
          <span className={styles.headerIcon}>
            <Icon name="trending-up" size={30} />
          </span>
          <div>
            <h1 className={styles.headerTitle}>Tabela FIPE</h1>
            <p className={styles.headerSub}>
              Consulte o valor de mercado do veículo antes de comprar ou vender.
            </p>
          </div>
        </div>
      </section>

      <section className={`${styles.container} ${styles.body}`}>
        {/* Formulário em cascata */}
        <form className={styles.formCard} onSubmit={onConsultar}>
          <div className={styles.fields}>
            <label className={styles.field}>
              <span>Tipo</span>
              <Select value={tipo} onChange={(e) => setTipo(e.target.value)} options={TIPOS} />
            </label>

            <label className={styles.field}>
              <span>
                Marca {loadingMarcas && <Spinner size={13} className={styles.fieldSpin} />}
              </span>
              <Select
                value={marca}
                onChange={onMarcaChange}
                disabled={loadingMarcas || !marcas.length}
                placeholder={loadingMarcas ? 'Carregando...' : 'Selecione a marca'}
                options={marcas.map((m) => ({ value: String(m.codigo), label: m.nome }))}
              />
            </label>

            <label className={styles.field}>
              <span>
                Modelo {loadingModelos && <Spinner size={13} className={styles.fieldSpin} />}
              </span>
              <Select
                value={modelo}
                onChange={onModeloChange}
                disabled={!marca || loadingModelos || !modelos.length}
                placeholder={loadingModelos ? 'Carregando...' : 'Selecione o modelo'}
                options={modelos.map((m) => ({ value: String(m.codigo), label: m.nome }))}
              />
            </label>

            <label className={styles.field}>
              <span>
                Ano {loadingAnos && <Spinner size={13} className={styles.fieldSpin} />}
              </span>
              <Select
                value={ano}
                onChange={onAnoChange}
                disabled={!modelo || loadingAnos || !anos.length}
                placeholder={loadingAnos ? 'Carregando...' : 'Selecione o ano'}
                options={anos.map((a) => ({ value: String(a.codigo), label: a.nome }))}
              />
            </label>
          </div>

          <div className={styles.formActions}>
            <Button
              type="submit"
              variant="primary"
              leftIcon="search"
              loading={consultando}
              disabled={!podeConsultar}
              className={styles.consultarBtn}
            >
              Consultar valor
            </Button>
          </div>
        </form>

        {/* Erro amigável */}
        {erro && (
          <div className={styles.errorBox} role="alert">
            <span className={styles.errorIcon}>!</span>
            <span>{erro}</span>
          </div>
        )}

        {/* Card de resultado */}
        {resultado && !erro && (
          <div className={styles.resultCard}>
            <div className={styles.resultTop}>
              <span className={styles.resultLabel}>Valor de mercado (FIPE)</span>
              <strong className={styles.resultValue}>{resultado.valor}</strong>
              {resultado.mesReferencia && (
                <span className={styles.resultRef}>
                  Referência: {resultado.mesReferencia}
                </span>
              )}
            </div>

            <dl className={styles.resultGrid}>
              {resultado.marca && (
                <div className={styles.resultItem}>
                  <dt>Marca</dt>
                  <dd>{resultado.marca}</dd>
                </div>
              )}
              {resultado.modelo && (
                <div className={styles.resultItem}>
                  <dt>Modelo</dt>
                  <dd>{resultado.modelo}</dd>
                </div>
              )}
              {resultado.anoModelo && (
                <div className={styles.resultItem}>
                  <dt>Ano</dt>
                  <dd>{resultado.anoModelo}</dd>
                </div>
              )}
              {resultado.combustivel && (
                <div className={styles.resultItem}>
                  <dt>Combustível</dt>
                  <dd>{resultado.combustivel}</dd>
                </div>
              )}
              {resultado.codigoFipe && (
                <div className={styles.resultItem}>
                  <dt>Código FIPE</dt>
                  <dd>{resultado.codigoFipe}</dd>
                </div>
              )}
            </dl>

            <a href={anunciosHref} className={styles.cta}>
              <Icon name="search" size={16} />
              Ver anúncios deste modelo no Feira do Rolo
              <Icon name="arrow-right" size={16} />
            </a>
          </div>
        )}
      </section>
    </main>
  );
}
