'use client';

import { createContext, useContext, useState, useCallback, useRef } from 'react';
import styles from './ToastProvider.module.css';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [current, setCurrent] = useState(null);
  const timer = useRef(null);

  const toast = useCallback(({ title, description, variant = 'default', duration = 3000 }) => {
    if (timer.current) clearTimeout(timer.current);
    const id = Date.now();
    setCurrent({ id, title, description, variant });
    timer.current = setTimeout(() => setCurrent(null), duration);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className={styles.viewport} aria-live="polite">
        {current && (
          <div key={current.id} className={`${styles.toast} ${styles[current.variant]}`} role="status">
            {current.title && <strong className={styles.title}>{current.title}</strong>}
            {current.description && <span className={styles.desc}>{current.description}</span>}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast deve ser usado dentro de ToastProvider');
  return ctx;
}
