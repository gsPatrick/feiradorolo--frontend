'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './AddressSelectionModal.module.css';
import { cx } from '@/lib/cx';
import Modal from '../Modal/Modal';
import Icon from '../../atoms/Icon/Icon';

function maskCep(v) {
  const d = v.replace(/\D/g, '').slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}
function fmtCep(c) {
  const d = String(c || '').replace(/\D/g, '');
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : c;
}

/**
 * Modal "Selecione onde quer receber suas compras" — réplica fiel do
 * AddressSelectionModal do front antigo: endereços salvos (radio + Principal),
 * Ver todos / Editar endereços, e busca por CEP (ViaCEP) em "Em outro lugar".
 */
export default function AddressSelectionModal({ open, onClose, addresses = [], onConfirm }) {
  const defaultId = (addresses.find((a) => a.isDefault) || addresses[0] || {}).id || null;
  const [selectedId, setSelectedId] = useState(defaultId);
  const [cepInput, setCepInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cepResult, setCepResult] = useState(null); // {cep, city, state, neighborhood, street}

  useEffect(() => {
    if (open) {
      setSelectedId(defaultId);
      setCepInput('');
      setError('');
      setCepResult(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const cepDigits = cepInput.replace(/\D/g, '');

  async function buscar() {
    if (cepDigits.length !== 8) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);
      const data = await res.json();
      if (data.erro) {
        setError('CEP não encontrado.');
        return;
      }
      setCepResult({
        cep: cepDigits,
        city: data.localidade || '',
        state: data.uf || '',
        neighborhood: data.bairro || '',
        street: data.logradouro || '',
      });
      setSelectedId(null);
    } catch {
      setError('Não foi possível consultar o CEP.');
    } finally {
      setLoading(false);
    }
  }

  function salvar() {
    let payload = null;
    if (cepResult) {
      payload = { cep: cepResult.cep, city: `${cepResult.city}/${cepResult.state}` };
    } else {
      const a = addresses.find((x) => x.id === selectedId);
      if (a) payload = { cep: a.cep, city: `${a.city}/${a.state}` };
    }
    onConfirm && onConfirm(payload);
    onClose && onClose();
  }

  const title = (
    <span className={styles.title}>
      <Icon name="map-pin" size={20} className={styles.titleIcon} />
      Selecione onde quer receber suas compras
    </span>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="md"
      footer={
        <>
          <button type="button" className={styles.btnCancel} onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className={styles.btnSave} onClick={salvar}>
            Salvar alterações
          </button>
        </>
      }
    >
      <p className={styles.subtitle}>
        Você poderá ver custos e prazos de entrega precisos em tudo que procurar.
      </p>

      {addresses.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Em um dos seus endereços</h3>
          <div className={styles.cards}>
            {addresses.map((a) => {
              const sel = selectedId === a.id && !cepResult;
              return (
                <button
                  key={a.id}
                  type="button"
                  className={cx(styles.card, sel && styles.cardSel)}
                  onClick={() => {
                    setSelectedId(a.id);
                    setCepResult(null);
                  }}
                >
                  <span className={cx(styles.radio, sel && styles.radioOn)}>
                    {sel && <span className={styles.radioDot} />}
                  </span>
                  <span className={styles.cardBody}>
                    <span className={styles.cardTop}>
                      <strong>{a.street} {a.number}</strong>
                      {a.isDefault && <span className={styles.principal}>Principal</span>}
                    </span>
                    <span className={styles.cardLine}>
                      CEP: {fmtCep(a.cep)} - {a.neighborhood}, {a.city}
                    </span>
                    <span className={styles.cardSub}>
                      {a.street} - {fmtCep(a.cep)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className={styles.linkRow}>
            <Link className={styles.linkBtn} href="/minha-conta?tab=enderecos">Ver todos</Link>
            <Link className={styles.linkBtn} href="/minha-conta?tab=enderecos">
              <Icon name="edit" size={14} /> Editar endereços
            </Link>
          </div>
        </div>
      )}

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Em outro lugar</h3>
        <label className={styles.cepLabel}>CEP</label>
        <div className={styles.cepRow}>
          <input
            className={styles.cepInput}
            placeholder="12345-678 ou 12345678"
            value={cepInput}
            inputMode="numeric"
            maxLength={9}
            onChange={(e) => {
              setCepInput(maskCep(e.target.value));
              setError('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && buscar()}
          />
          <button
            type="button"
            className={styles.btnBuscar}
            onClick={buscar}
            disabled={cepDigits.length !== 8 || loading}
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
        {error && <p className={styles.err}>{error}</p>}
        {cepResult && !error && (
          <p className={styles.ok}>
            Entregar em <strong>{cepResult.neighborhood ? `${cepResult.neighborhood}, ` : ''}{cepResult.city}/{cepResult.state}</strong>
          </p>
        )}
        <a
          className={styles.dontKnow}
          href="https://buscacepinter.correios.com.br/app/endereco/index.php"
          target="_blank"
          rel="noreferrer"
        >
          Não sei o meu CEP
        </a>
      </div>
    </Modal>
  );
}
