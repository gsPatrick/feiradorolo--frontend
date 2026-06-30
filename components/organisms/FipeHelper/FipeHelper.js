'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './FipeHelper.module.css';
import { cx } from '@/lib/cx';
import { fipeService } from '@/lib/api';
import Select from '@/components/atoms/Select/Select';
import Button from '@/components/atoms/Button/Button';
import Icon from '@/components/atoms/Icon/Icon';

/**
 * FipeHelper — bloco AUXILIAR de consulta à Tabela FIPE, exibido no formulário de
 * anúncio quando a categoria é de VEÍCULOS. Faz a cascata
 * Tipo → Marca → Modelo → Ano (selects dependentes via fipeService) e, ao final,
 * mostra o valor de referência FIPE com um botão "Preencher com a FIPE" que chama
 * `onFill({ marca, modelo, ano, valor })`.
 *
 * É opcional e nunca quebra o resto do form: se a FIPE estiver indisponível na
 * carga inicial, o bloco se esconde por completo (degrada para preenchimento
 * manual). Falhas em etapas posteriores mostram um aviso amigável.
 *
 * @param {boolean} active   Renderiza apenas quando true (categoria = veículos).
 * @param {(p:{marca:string,modelo:string,ano:string,valor:string|null})=>void} onFill
 */

const TIPOS = [
  { value: 'carros', label: 'Carro' },
  { value: 'motos', label: 'Moto' },
  { value: 'caminhoes', label: 'Caminhão' },
];

/** "R$ 50.000,00" → 50000 (número) | null. */
function parseValor(str) {
  if (!str) return null;
  const n = Number(String(str).replace(/[^\d,]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Extrai o ano (AAAA) do nome FIPE ("2014 Gasolina"); senão devolve o nome cru. */
function cleanAno(nome) {
  if (!nome) return '';
  const m = String(nome).match(/\b(19|20)\d{2}\b/);
  return m ? m[0] : String(nome);
}

export default function FipeHelper({ active = false, onFill }) {
  const [available, setAvailable] = useState(true); // FIPE off na carga → esconde
  const bootedRef = useRef(false);

  const [tipo, setTipo] = useState('carros');
  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [anos, setAnos] = useState([]);

  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [ano, setAno] = useState('');

  const [valor, setValor] = useState(null);
  const [loading, setLoading] = useState({ marcas: false, modelos: false, anos: false, valor: false });
  const [stepError, setStepError] = useState(null);

  const setLoad = (k, v) => setLoading((prev) => ({ ...prev, [k]: v }));

  // Marcas (recarrega quando o tipo muda). Se a primeira carga falhar, esconde o bloco.
  useEffect(() => {
    if (!active) return;
    let live = true;
    setLoad('marcas', true);
    setStepError(null);
    setMarcas([]);
    setMarca('');
    setModelo('');
    setAno('');
    setModelos([]);
    setAnos([]);
    setValor(null);
    fipeService
      .marcas(tipo)
      .then((list) => {
        if (!live) return;
        bootedRef.current = true;
        setMarcas(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!live) return;
        if (!bootedRef.current) setAvailable(false);
        else setStepError('Não foi possível carregar as marcas. Tente outro tipo.');
      })
      .finally(() => live && setLoad('marcas', false));
    return () => {
      live = false;
    };
  }, [tipo, active]);

  // Modelos (depende de marca).
  useEffect(() => {
    if (!active || !marca) return;
    let live = true;
    setLoad('modelos', true);
    setStepError(null);
    setModelos([]);
    setModelo('');
    setAno('');
    setAnos([]);
    setValor(null);
    fipeService
      .modelos(tipo, marca)
      .then((list) => live && setModelos(Array.isArray(list) ? list : []))
      .catch(() => live && setStepError('Não foi possível carregar os modelos desta marca.'))
      .finally(() => live && setLoad('modelos', false));
    return () => {
      live = false;
    };
  }, [marca, tipo, active]);

  // Anos (depende de modelo).
  useEffect(() => {
    if (!active || !marca || !modelo) return;
    let live = true;
    setLoad('anos', true);
    setStepError(null);
    setAnos([]);
    setAno('');
    setValor(null);
    fipeService
      .anos(tipo, marca, modelo)
      .then((list) => live && setAnos(Array.isArray(list) ? list : []))
      .catch(() => live && setStepError('Não foi possível carregar os anos deste modelo.'))
      .finally(() => live && setLoad('anos', false));
    return () => {
      live = false;
    };
  }, [modelo, marca, tipo, active]);

  // Valor de referência (depende de ano).
  useEffect(() => {
    if (!active || !marca || !modelo || !ano) return;
    let live = true;
    setLoad('valor', true);
    setStepError(null);
    setValor(null);
    fipeService
      .valor(tipo, marca, modelo, ano)
      .then((v) => live && setValor(v || null))
      .catch(() => live && setStepError('Não foi possível obter o valor FIPE. Você pode preencher manualmente.'))
      .finally(() => live && setLoad('valor', false));
    return () => {
      live = false;
    };
  }, [ano, modelo, marca, tipo, active]);

  if (!active || !available) return null;

  const marcaNome = (marcas.find((m) => String(m.codigo) === String(marca)) || {}).nome || '';
  const modeloNome = (modelos.find((m) => String(m.codigo) === String(modelo)) || {}).nome || '';
  const anoNome = (anos.find((a) => String(a.codigo) === String(ano)) || {}).nome || '';

  function handleFill() {
    if (!valor) return;
    onFill &&
      onFill({
        marca: valor.marca || marcaNome,
        modelo: valor.modelo || modeloNome,
        ano: cleanAno(valor.anoModelo ? String(valor.anoModelo) : anoNome),
        valor: valor.valor || null,
      });
  }

  const toOptions = (list) => list.map((o) => ({ value: String(o.codigo), label: o.nome }));

  return (
    <div className={styles.box}>
      <div className={styles.head}>
        <Icon name="search" size={18} className={styles.headIcon} />
        <h3 className={styles.title}>Consulta FIPE</h3>
        <span className={styles.badge}>opcional</span>
      </div>
      <p className={styles.hint}>
        Ajuda a preencher marca, modelo e ano automaticamente e mostra o valor de referência da
        tabela FIPE. Você pode ignorar e preencher manualmente abaixo.
      </p>

      <div className={styles.grid}>
        <div className={styles.field}>
          <label className={styles.label}>Tipo</label>
          <Select value={tipo} onChange={(e) => setTipo(e.target.value)} options={TIPOS} />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Marca</label>
          <Select
            value={marca}
            onChange={(e) => setMarca(e.target.value)}
            placeholder={loading.marcas ? 'Carregando...' : 'Selecione a marca'}
            disabled={loading.marcas || !marcas.length}
            options={toOptions(marcas)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Modelo</label>
          <Select
            value={modelo}
            onChange={(e) => setModelo(e.target.value)}
            placeholder={loading.modelos ? 'Carregando...' : marca ? 'Selecione o modelo' : 'Escolha a marca'}
            disabled={!marca || loading.modelos || !modelos.length}
            options={toOptions(modelos)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Ano</label>
          <Select
            value={ano}
            onChange={(e) => setAno(e.target.value)}
            placeholder={loading.anos ? 'Carregando...' : modelo ? 'Selecione o ano' : 'Escolha o modelo'}
            disabled={!modelo || loading.anos || !anos.length}
            options={toOptions(anos)}
          />
        </div>
      </div>

      {stepError && (
        <p className={styles.error}>
          <Icon name="alert-circle" size={14} /> {stepError}
        </p>
      )}

      {loading.valor && <p className={styles.loadingValor}>Consultando valor FIPE...</p>}

      {valor && valor.valor && (
        <div className={styles.result}>
          <div className={styles.resultInfo}>
            <span className={styles.resultLabel}>Valor de referência FIPE</span>
            <span className={styles.resultValue}>{valor.valor}</span>
            <span className={styles.resultMeta}>
              {[valor.marca, valor.modelo, valor.anoModelo].filter(Boolean).join(' · ')}
              {valor.codigoFipe ? ` · FIPE ${valor.codigoFipe}` : ''}
              {valor.mesReferencia ? ` · ${String(valor.mesReferencia).trim()}` : ''}
            </span>
          </div>
          <Button type="button" size="sm" onClick={handleFill} className={styles.fillBtn}>
            Preencher com a FIPE
          </Button>
        </div>
      )}
    </div>
  );
}
