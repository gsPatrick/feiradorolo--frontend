'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './LoginPromptModal.module.css';
import Button from '../../atoms/Button/Button';
import Icon from '../../atoms/Icon/Icon';

/**
 * Modal amigável que convida o visitante deslogado a entrar/cadastrar antes
 * de salvar favoritos. Usado centralmente pelo FavoritesProvider.
 */
export default function LoginPromptModal({ open, onClose }) {
  const router = useRouter();

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

  const go = (path) => {
    onClose && onClose();
    router.push(path);
  };

  return (
    <div className={styles.root} role="dialog" aria-modal="true" aria-labelledby="login-prompt-title">
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.container}>
        <button type="button" className={styles.close} aria-label="Fechar" onClick={onClose}>
          <Icon name="close" size={18} />
        </button>

        <div className={styles.heart}>
          <Icon name="heart" size={36} />
        </div>

        <h2 id="login-prompt-title" className={styles.title}>
          Entre para salvar seus favoritos
        </h2>
        <p className={styles.text}>
          Crie sua conta ou faça login para guardar os produtos que você ama e
          encontrá-los a qualquer momento.
        </p>

        <div className={styles.actions}>
          <Button variant="primary" onClick={() => go('/login')}>
            Entrar
          </Button>
          <Button variant="ghost" onClick={() => go('/login?mode=register')}>
            Criar conta
          </Button>
        </div>
      </div>
    </div>
  );
}
