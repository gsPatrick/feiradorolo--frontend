import styles from './not-found.module.css';
import Button from '@/components/atoms/Button/Button';

function Compass({ size = 64 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" />
    </svg>
  );
}

export default function NotFound() {
  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.iconWrap}>
          <Compass size={56} />
        </div>

        <span className={styles.code}>404</span>
        <h1 className={styles.title}>Página não encontrada</h1>
        <p className={styles.desc}>
          A página que você procura não existe ou foi movida. Que tal voltar para
          o início ou procurar o que precisa?
        </p>

        <div className={styles.actions}>
          <Button href="/" leftIcon="arrow-left" className={styles.primaryBtn}>
            Voltar para a Home
          </Button>
          <Button href="/buscar" variant="ghost" leftIcon="search">
            Buscar produtos
          </Button>
        </div>
      </div>
    </main>
  );
}
