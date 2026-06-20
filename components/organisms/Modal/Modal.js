'use client';

import { useEffect } from 'react';
import styles from './Modal.module.css';
import { cx } from '@/lib/cx';
import Icon from '../../atoms/Icon/Icon';

export default function Modal({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose && onClose();
    }
    if (open) {
      document.addEventListener('keydown', onKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.root}>
      <div className={styles.overlay} onClick={onClose} />
      <div className={cx(styles.dialog, styles[size])} role="dialog" aria-modal="true">
        <header className={styles.head}>
          <h3>{title}</h3>
          <button className={styles.close} onClick={onClose} aria-label="Fechar">
            <Icon name="close" size={20} />
          </button>
        </header>
        <div className={styles.body}>{children}</div>
        {footer && <footer className={styles.footer}>{footer}</footer>}
      </div>
    </div>
  );
}
