'use client';

import { useEffect, useState } from 'react';
import styles from './SellerTrust.module.css';
import { cx } from '@/lib/cx';
import Icon from '../../atoms/Icon/Icon';
import { userService } from '@/lib/api';

// Verificação facial desligada por enquanto — true para reativar.
const FACIAL_ENABLED = false;

/* Logo do WhatsApp inline (glifo oficial, verde #25D366). A verificação de
   telefone é feita por WhatsApp, então usamos o símbolo do app. */
function WhatsAppIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#25D366" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51-.17-.01-.37-.01-.57-.01-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49 0 1.47 1.07 2.89 1.22 3.09.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35zM12.04 21.5h-.01a9.45 9.45 0 0 1-4.82-1.32l-.35-.21-3.58.94.96-3.49-.23-.36a9.44 9.44 0 0 1-1.45-5.04c0-5.22 4.25-9.47 9.48-9.47 2.53 0 4.91.99 6.7 2.78a9.42 9.42 0 0 1 2.77 6.7c0 5.22-4.25 9.47-9.47 9.47zM20.52 3.49A11.78 11.78 0 0 0 12.04 0C5.5 0 .18 5.32.18 11.86c0 2.09.55 4.13 1.59 5.93L.08 24l6.36-1.67a11.85 11.85 0 0 0 5.6 1.42h.01c6.54 0 11.86-5.32 11.86-11.86 0-3.17-1.23-6.15-3.39-8.4z" />
    </svg>
  );
}

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
  1: { label: 'Básico', cls: 'lvl1', desc: 'Dados de contato confirmados.' },
  2: { label: 'Confiável', cls: 'lvl2', desc: 'Identidade confirmada — vendedor confiável.' },
  // Nível 3 ("Máximo") só é alcançável com verificação facial — ver FACIAL_ENABLED.
  3: { label: 'Máximo', cls: 'lvl3', desc: 'Todas as verificações concluídas.' },
};

/**
 * Checklist de segurança/verificação do vendedor.
 * @param {object} props.seller   Objeto seller enriquecido da API (uso direto).
 * @param {string|number} props.sellerId  Se passado sem `seller`, busca o perfil
 *   público via userService.sellerProfile e renderiza ao carregar.
 * @param {boolean} props.compact  Versão enxuta (card do produto/header).
 */
export default function SellerTrust({ seller, sellerId, compact = false, className }) {
  // Auto-fetch: só dispara quando há sellerId e NÃO há objeto seller pronto.
  const needsFetch = !seller && sellerId != null && sellerId !== '';
  const [fetched, setFetched] = useState(null);
  const [loading, setLoading] = useState(needsFetch);

  useEffect(() => {
    if (!needsFetch) return;
    let active = true;
    setLoading(true);
    setFetched(null);
    userService
      .sellerProfile(sellerId)
      .then((data) => {
        if (active) setFetched(data || null);
      })
      .catch(() => {
        if (active) setFetched(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [needsFetch, sellerId]);

  const resolved = seller || fetched;

  // Loading discreto enquanto busca pelo sellerId.
  if (needsFetch && loading && !resolved) {
    return (
      <div className={cx(styles.root, compact && styles.compact, styles.skeleton, className)} aria-hidden="true">
        <span className={styles.skeletonSeal} />
      </div>
    );
  }

  // Sem dado nenhum (id/seller ausente ou fetch falhou) → não quebra: não renderiza.
  if (!resolved) return null;

  const s = resolved;
  const level = Math.max(0, Math.min(3, Number(s.verification_level) || 0));
  const trust = TRUST_LEVELS[level] || TRUST_LEVELS[0];

  const items = [
    { key: 'email', label: 'E-mail', short: 'E-mail', ok: !!s.email_verified, icon: <Icon name="mail" size={compact ? 14 : 16} /> },
    { key: 'phone', label: 'WhatsApp', short: 'WhatsApp', ok: !!s.phone_verified, icon: <WhatsAppIcon size={compact ? 14 : 16} /> },
    { key: 'document', label: 'Documento (CPF/CNPJ)', short: 'Documento', ok: !!s.document_verified, icon: <DocIcon size={compact ? 14 : 16} /> },
    // Item facial mantido atrás do flag — religa trocando FACIAL_ENABLED para true.
    FACIAL_ENABLED && { key: 'facial', label: 'Biometria facial', short: 'Biometria', ok: !!s.facial_verified, icon: <FaceIcon size={compact ? 14 : 16} /> },
  ].filter(Boolean);

  const totalCount = items.length;
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
              {/* Verificado = só check verde. Não-verificado = sem marca (cinza/apagado),
                  para não confundir com um "X" de erro ao lado do que está validado. */}
              {it.ok && (
                <span className={styles.compactMark} aria-hidden="true">
                  <Icon name="check" size={10} />
                </span>
              )}
            </li>
          ))}
        </ul>
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
        <span className={styles.sealCount}>{doneCount}/{totalCount}</span>
      </div>
      <ul className={styles.list} aria-label="Verificações de segurança do vendedor">
        {items.map((it) => (
          <li key={it.key} className={cx(styles.item, it.ok ? styles.ok : styles.pending)}>
            <span className={styles.itemIcon}>{it.icon}</span>
            <span className={styles.itemLabel}>{it.label}</span>
            <span className={styles.itemMark}>
              {/* Verificado = check verde; pendente = só o texto, sem "X" de erro. */}
              {it.ok && <Icon name="check" size={14} />}
              <span className={styles.itemStatus}>{it.ok ? 'Validado' : 'Pendente'}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
