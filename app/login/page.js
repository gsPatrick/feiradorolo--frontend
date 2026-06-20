import Link from 'next/link';
import styles from './page.module.css';
import AuthForm from '@/components/organisms/AuthForm/AuthForm';

export const metadata = { title: 'Entrar · Feira do Rolo' };

export default function LoginPage({ searchParams }) {
  const mode = searchParams?.mode === 'register' ? 'register' : 'login';
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.cardHead}>
          <Link href="/" className={styles.brand}>
            Feira do Rolo
          </Link>
          <p className={styles.tag}>Sua conta no maior rolo do Brasil</p>
        </div>
        <div className={styles.cardBody}>
          <AuthForm initialMode={mode} showTestAccounts />
        </div>
      </div>
      <Link href="/" className={styles.backHome}>
        ← Voltar para a loja
      </Link>
    </main>
  );
}
