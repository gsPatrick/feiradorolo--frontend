'use client';

import styles from './HighlightBadge.module.css';
import { cx } from '@/lib/cx';

// Selos de destaque (upsell): Prata / Ouro / Diamante. Ouro também ganha o
// selo "Impulsionado" (conforme o pacote). Usado nos cards de produto.
const TIERS = {
  silver: { label: 'Prata', icon: '🥈' },
  gold: { label: 'Ouro', icon: '🥇' },
  diamond: { label: 'Diamante', icon: '💎' },
};

export default function HighlightBadge({ tier, className, size = 'md' }) {
  const t = TIERS[tier];
  if (!t) return null;
  return (
    <span className={cx(styles.wrap, className)}>
      <span className={cx(styles.badge, styles[tier], size === 'sm' && styles.sm)}>
        <span className={styles.icon}>{t.icon}</span>
        {t.label}
      </span>
      {tier === 'gold' && <span className={cx(styles.boost, size === 'sm' && styles.sm)}>Impulsionado</span>}
    </span>
  );
}
