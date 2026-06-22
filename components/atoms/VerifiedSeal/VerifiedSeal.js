'use client';

import { useEffect, useState } from 'react';
import styles from './VerifiedSeal.module.css';
import { cx } from '@/lib/cx';
import { userService } from '@/lib/api';

// Verificação facial desligada por enquanto — quando voltar, inclua
// `s.facial_verified` na condição de "totalmente verificado".
const FACIAL_ENABLED = false;

/** Está 100% verificado? (e-mail + WhatsApp + documento — e facial quando ligado) */
export function isFullyVerified(s) {
  if (!s) return false;
  const base = !!(s.email_verified && s.phone_verified && s.document_verified);
  return FACIAL_ENABLED ? base && !!s.facial_verified : base;
}

/**
 * Selo de "verificado" (estilo rede social) ao lado do nome do vendedor.
 * AZUL quando o vendedor concluiu todas as verificações; CINZA quando não.
 * Aceita `seller` (objeto com os flags) ou `sellerId` (auto-busca o perfil).
 */
export default function VerifiedSeal({ seller, sellerId, size = 17, overlay = false, className }) {
  const [data, setData] = useState(seller || null);

  useEffect(() => {
    let active = true;
    if (!seller && sellerId) {
      userService
        .sellerProfile(sellerId)
        .then((p) => active && setData(p))
        .catch(() => {});
    } else if (seller) {
      setData(seller);
    }
    return () => {
      active = false;
    };
  }, [seller, sellerId]);

  if (!data) return null;
  const full = isFullyVerified(data);
  const title = full ? 'Vendedor verificado' : 'Verificação incompleta';

  return (
    <span
      className={cx(styles.seal, full ? styles.full : styles.partial, overlay && styles.overlay, className)}
      title={title}
      aria-label={title}
      role="img"
    >
      <svg width={size} height={size} viewBox="0 0 22 22" aria-hidden="true">
        {/* fundo branco garante o "check" branco mesmo sobre cards coloridos */}
        <circle cx="11" cy="11" r="6.2" fill="#fff" />
        <path
          fill="currentColor"
          d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.018-1.273.215-1.813.567s-.969.85-1.24 1.44c-.608-.223-1.267-.27-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.083 1.29.14 1.896-.587.274-1.087.705-1.443 1.246-.356.541-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.223.607-.27 1.264-.14 1.897.13.634.433 1.218.878 1.687.47.443 1.055.747 1.69.876.633.132 1.29.084 1.896-.138.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.853 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"
        />
      </svg>
    </span>
  );
}
