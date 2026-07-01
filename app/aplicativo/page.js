import Link from 'next/link';
import Icon from '@/components/atoms/Icon/Icon';
import styles from './page.module.css';

export const metadata = {
  title: 'App Feira do Rolo — Em breve',
  description: 'O aplicativo da Feira do Rolo para Android e iOS está chegando.',
};

const FEATURES = [
  { icon: 'tag', title: 'Ofertas exclusivas', desc: 'Promoções que só aparecem no app.' },
  { icon: 'package', title: 'Acompanhe pedidos', desc: 'Status da compra e da entrega em tempo real.' },
  { icon: 'bolt', title: 'PIX instantâneo', desc: 'Pague em segundos, direto do celular.' },
];

export default function AplicativoPage() {
  return (
    <main className={styles.wrap}>
      <section className={styles.hero}>
        <span className={styles.pill}>🚀 Em breve</span>
        <h1 className={styles.title}>O App da Feira do Rolo está chegando</h1>
        <p className={styles.subtitle}>
          O aplicativo <strong>ainda não foi lançado</strong>. Estamos finalizando a versão para{' '}
          <strong>Android</strong> e <strong>iOS</strong> — em breve você terá a melhor experiência
          de compra e venda na palma da mão.
        </p>

        <ul className={styles.features}>
          {FEATURES.map((f) => (
            <li key={f.title} className={styles.feature}>
              <span className={styles.featureIcon}>
                <Icon name={f.icon} size={22} />
              </span>
              <div>
                <strong>{f.title}</strong>
                <span>{f.desc}</span>
              </div>
            </li>
          ))}
        </ul>

        <div className={styles.badges}>
          <span className={`${styles.badge} ${styles.badgeDisabled}`}>
            <img src="/app/googleplay.png" alt="" className={styles.badgeImg} />
            <span className={styles.badgeText}>
              <small>EM BREVE NO</small>
              <strong>Google Play</strong>
            </span>
          </span>
          <span className={`${styles.badge} ${styles.badgeDisabled}`}>
            <img src="/app/apple.png" alt="" className={`${styles.badgeImg} ${styles.badgeImgWhite}`} />
            <span className={styles.badgeText}>
              <small>EM BREVE NA</small>
              <strong>App Store</strong>
            </span>
          </span>
        </div>

        <p className={styles.note}>
          Enquanto isso, aproveite a versão web — completa e otimizada para o celular.
        </p>
        <Link href="/" className={styles.cta}>
          Voltar para a loja
        </Link>
      </section>
    </main>
  );
}
