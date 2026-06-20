'use client';

import { useRouter } from 'next/navigation';
import styles from './AdminStandalone.module.css';
import Icon from '../../../atoms/Icon/Icon';

/** Casca para páginas admin avulsas (analytics, chat, etc.) — link de volta + título. */
export default function AdminStandalone({ title, children }) {
  const router = useRouter();
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <button className={styles.back} onClick={() => router.push('/admin')}>
          <Icon name="arrow-left" size={18} /> Voltar ao painel
        </button>
        <h1 className={styles.title}>{title}</h1>
        {children}
      </div>
    </div>
  );
}
