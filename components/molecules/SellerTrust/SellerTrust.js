import styles from './SellerTrust.module.css';
import { cx } from '@/lib/cx';
import Icon from '../../atoms/Icon/Icon';

/* Ícone "documento" inline (lucide) — não existe no Icon.js. */
function DocIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M9 13h6M9 17h6M9 9h1" />
    </svg>
  );
}

/* Ícone "biometria facial" inline (lucide scan-face). */
function FaceIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
      <path d="M9 9h.01M15 9h.01M9.5 14a3.5 3.5 0 0 0 5 0" />
    </svg>
  );
}

/* Níveis de confiança gerais (verification_level 0-3). */
const TRUST_LEVELS = {
  0: { label: 'Não verificado', cls: 'lvl0', desc: 'Este vendedor ainda não validou seus dados.' },
  1: { label: 'Verificação básica', cls: 'lvl1', desc: 'Dados de contato confirmados.' },
  2: { label: 'Vendedor verificado', cls: 'lvl2', desc: 'Identidade confirmada — vendedor confiável.' },
  3: { label: 'Segurança máxima', cls: 'lvl3', desc: 'Todas as verificações concluídas.' },
};

/**
 * Checklist de segurança/verificação do vendedor.
 * @param {object} props.seller  Objeto seller enriquecido da API.
 * @param {boolean} props.compact  Versão enxuta (card do produto).
 */
export default function SellerTrust({ seller, compact = false, className }) {
  const s = seller || {};
  const level = Math.max(0, Math.min(3, Number(s.verification_level) || 0));
  const trust = TRUST_LEVELS[level] || TRUST_LEVELS[0];

  const items = [
    { key: 'email', label: 'E-mail', short: 'E-mail', ok: !!s.email_verified, icon: <Icon name="mail" size={compact ? 14 : 16} /> },
    { key: 'phone', label: 'Telefone', short: 'Telefone', ok: !!s.phone_verified, icon: <Icon name="smartphone" size={compact ? 14 : 16} /> },
    { key: 'document', label: 'Documento (CPF/CNPJ)', short: 'Documento', ok: !!s.document_verified, icon: <DocIcon size={compact ? 14 : 16} /> },
    { key: 'facial', label: 'Biometria facial', short: 'Biometria', ok: !!s.facial_verified, icon: <FaceIcon size={compact ? 14 : 16} /> },
  ];

  const doneCount = items.filter((i) => i.ok).length;

  if (compact) {
    return (
      <div className={cx(styles.root, styles.compact, className)}>
        <span className={cx(styles.seal, styles[trust.cls])} title={trust.desc}>
          <Icon name="shield" size={13} /> {trust.label}
        </span>
        <ul className={styles.compactItems} aria-label="Verificações do vendedor">
          {items.map((it) => (
            <li
              key={it.key}
              className={cx(styles.compactItem, it.ok ? styles.ok : styles.pending)}
              title={`${it.label}: ${it.ok ? 'verificado' : 'pendente'}`}
            >
              <span className={styles.compactIcon}>{it.icon}</span>
              <span className={styles.compactMark} aria-hidden="true">
                <Icon name={it.ok ? 'check' : 'close'} size={10} />
              </span>
            </li>
          ))}
        </ul>
        <span className={styles.summary}>{doneCount}/4 verificações</span>
      </div>
    );
  }

  return (
    <div className={cx(styles.root, className)}>
      <div className={cx(styles.sealRow, styles[trust.cls])}>
        <span className={styles.sealIcon}><Icon name="shield" size={18} /></span>
        <div className={styles.sealText}>
          <strong>{trust.label}</strong>
          <span>{trust.desc}</span>
        </div>
        <span className={styles.sealCount}>{doneCount}/4</span>
      </div>
      <ul className={styles.list} aria-label="Verificações de segurança do vendedor">
        {items.map((it) => (
          <li key={it.key} className={cx(styles.item, it.ok ? styles.ok : styles.pending)}>
            <span className={styles.itemIcon}>{it.icon}</span>
            <span className={styles.itemLabel}>{it.label}</span>
            <span className={styles.itemMark}>
              <Icon name={it.ok ? 'check' : 'close'} size={14} />
              <span className={styles.itemStatus}>{it.ok ? 'Validado' : 'Pendente'}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
