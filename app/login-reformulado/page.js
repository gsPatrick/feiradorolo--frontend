import Link from 'next/link';
import styles from './page.module.css';
import AuthForm from '@/components/organisms/AuthForm/AuthForm';
import Icon from '@/components/atoms/Icon/Icon';

export const metadata = { title: 'Entrar · Feira do Rolo' };

const BENEFITS = [
  { icon: 'shield', title: 'Pagamento protegido', desc: 'Custódia de 7 dias em toda compra.' },
  { icon: 'truck', title: 'Frete integrado', desc: 'Cálculo na hora com o Melhor Envio.' },
  { icon: 'sparkle', title: 'Destaque seus anúncios', desc: 'Prata, Ouro e Diamante para vender mais.' },
  { icon: 'star', title: 'Compra garantida', desc: 'Receba o produto ou seu dinheiro de volta.' },
];

export default function LoginReformuladoPage({ searchParams }) {
  const mode = searchParams?.mode === 'register' ? 'register' : 'login';
  return (
    <main className={styles.page}>
      <aside className={styles.brand}>
        <span className={styles.glow} />
        <Link href="/" className={styles.logo}>
          Feira do Rolo
        </Link>
        <div className={styles.brandBody}>
          <h2 className={styles.headline}>
            O jeito mais <span className={styles.hl}>fácil e seguro</span> de comprar e vender.
          </h2>
          <ul className={styles.benefits}>
            {BENEFITS.map((b) => (
              <li key={b.title}>
                <span className={styles.bicon}>
                  <Icon name={b.icon} size={18} />
                </span>
                <div>
                  <strong>{b.title}</strong>
                  <span>{b.desc}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className={styles.fine}>+1 milhão de produtos · milhares de vendedores · 100% protegido</p>
      </aside>

      <section className={styles.panel}>
        <div className={styles.inner}>
          <AuthForm initialMode={mode} accent="gold" />
        </div>
      </section>
    </main>
  );
}
