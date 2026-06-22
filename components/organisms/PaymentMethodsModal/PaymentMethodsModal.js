'use client';

import { useEffect, useState } from 'react';
import styles from './PaymentMethodsModal.module.css';
import Modal from '../Modal/Modal';
import Icon from '../../atoms/Icon/Icon';
import { configService } from '@/lib/api';

/* Cache simples em módulo: evita refetch das taxas a cada abertura do modal. */
let feesCache = null;

/* Mini-badge colorido de uma bandeira de cartão. Como o Icon atom não tem as
 * logomarcas das bandeiras, desenhamos chips com o nome e a cor da marca. */
function BrandBadge({ name, color, textColor = '#fff' }) {
  return (
    <span className={styles.brand} style={{ background: color, color: textColor }}>
      {name}
    </span>
  );
}

const CREDIT_BRANDS = [
  { name: 'Visa', color: '#1a1f71' },
  { name: 'Mastercard', color: '#1f2937' },
  { name: 'Elo', color: '#000000' },
  { name: 'American Express', color: '#2e77bc' },
  { name: 'Hipercard', color: '#b3131b' },
];

const DEBIT_BRANDS = [
  { name: 'Visa Débito', color: '#1a1f71' },
  { name: 'Mastercard Débito', color: '#1f2937' },
  { name: 'Elo Débito', color: '#000000' },
];

export default function PaymentMethodsModal({ open, onClose }) {
  const [fees, setFees] = useState(feesCache);

  useEffect(() => {
    if (!open || feesCache) return;
    let active = true;
    configService
      .fees()
      .then((res) => {
        if (!active || !res) return;
        feesCache = res;
        setFees(res);
      })
      .catch(() => {
        /* Sem dados: usamos o padrão (12x) no render. Nunca quebra. */
      });
    return () => {
      active = false;
    };
  }, [open]);

  const maxInstallments = Number(fees && fees.max_installments) || 12;
  const installmentsLabel = `Até ${maxInstallments}x sem juros`;

  return (
    <Modal open={open} onClose={onClose} title="Meios de pagamento para este produto" size="md">
      <div className={styles.body}>
        <p className={styles.intro}>
          <span className={styles.introIcon} aria-hidden="true">
            <Icon name="shield" size={18} />
          </span>
          <span>
            Pagar com o <strong>Mercado Pago</strong> é escolher qualquer um destes meios. Rápido,
            seguro e sem custo adicional.
          </span>
        </p>

        {/* ── Cartões de crédito ── */}
        <section className={styles.section}>
          <div className={styles.secHead}>
            <span className={`${styles.secIcon} ${styles.iconCredit}`}>
              <Icon name="card" size={18} />
            </span>
            <div>
              <h4 className={styles.secTitle}>Cartões de crédito</h4>
              <span className={styles.secSub}>Aprovação imediata.</span>
            </div>
            <span className={styles.secTag}>{installmentsLabel}</span>
          </div>
          <ul className={styles.brandList}>
            {CREDIT_BRANDS.map((b) => (
              <li key={b.name} className={styles.brandItem}>
                <BrandBadge name={b.name} color={b.color} />
                <span className={styles.brandNote}>{maxInstallments} parcelas</span>
              </li>
            ))}
          </ul>
        </section>

        <div className={styles.divider} />

        {/* ── Cartões de débito ── */}
        <section className={styles.section}>
          <div className={styles.secHead}>
            <span className={`${styles.secIcon} ${styles.iconDebit}`}>
              <Icon name="card" size={18} />
            </span>
            <div>
              <h4 className={styles.secTitle}>Cartões de débito</h4>
              <span className={styles.secSub}>Aprovação imediata.</span>
            </div>
          </div>
          <ul className={styles.brandList}>
            {DEBIT_BRANDS.map((b) => (
              <li key={b.name} className={styles.brandItem}>
                <BrandBadge name={b.name} color={b.color} />
              </li>
            ))}
          </ul>
        </section>

        <div className={styles.divider} />

        {/* ── Pix ── */}
        <section className={styles.section}>
          <div className={styles.secHead}>
            <span className={`${styles.secIcon} ${styles.iconPix}`}>
              <Icon name="pix" size={18} />
            </span>
            <div>
              <h4 className={styles.secTitle}>Pix</h4>
              <span className={styles.secSub}>Aprovação imediata.</span>
            </div>
          </div>
          <p className={styles.secText}>Pague na hora com QR Code ou copia-e-cola.</p>
        </section>

        <div className={styles.divider} />

        {/* ── Boleto bancário ── */}
        <section className={styles.section}>
          <div className={styles.secHead}>
            <span className={`${styles.secIcon} ${styles.iconBoleto}`}>
              <Icon name="barcode" size={18} />
            </span>
            <div>
              <h4 className={styles.secTitle}>Boleto bancário</h4>
              <span className={styles.secSub}>Pagamento em 1-2 dias úteis.</span>
            </div>
          </div>
        </section>
      </div>
    </Modal>
  );
}
