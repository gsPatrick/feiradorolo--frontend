import Link from 'next/link';
import Icon from '@/components/atoms/Icon/Icon';
import styles from './page.module.css';

export const metadata = {
  title: 'Como te protegemos — Feira do Rolo',
  description: 'Compra garantida com custódia, verificação de identidade, retirada protegida por token e devolução. Compre e venda com segurança.',
};

const PILLARS = [
  {
    icon: 'shield',
    title: 'Compra garantida (custódia)',
    desc: 'O seu pagamento fica retido com a gente e só é repassado ao vendedor depois que você confirma o recebimento — ou após o prazo, se não houver disputa. Se algo der errado, o dinheiro volta.',
  },
  {
    icon: 'user',
    title: 'Verificação de identidade',
    desc: 'Vendedores e compradores passam por verificação facial nas primeiras operações. Isso reduz fraudes e dá mais confiança para todo mundo.',
  },
  {
    icon: 'lock',
    title: 'Retirada em mãos protegida',
    desc: 'Na retirada presencial, geramos um código de 6 dígitos que só você vê. Você só informa ao vendedor ao receber o produto — e avisamos para combinarem em local público e movimentado.',
  },
  {
    icon: 'truck',
    title: 'Devolução e disputas',
    desc: 'Não gostou ou o produto veio diferente? Você pode abrir uma disputa. Enquanto ela não é resolvida, o pagamento continua retido e protegido.',
  },
  {
    icon: 'chat',
    title: 'Chat seguro e moderado',
    desc: 'A conversa entre comprador e vendedor é monitorada por um filtro que bloqueia golpes e tentativas de negociar por fora da plataforma.',
  },
];

export default function ComoTeProtegemos() {
  return (
    <main className={styles.wrap}>
      <header className={styles.hero}>
        <span className={styles.pill}><Icon name="shield" size={15} /> Compra protegida</span>
        <h1 className={styles.title}>Como te protegemos</h1>
        <p className={styles.subtitle}>
          Comprar e vender entre pessoas pode dar medo — por isso a Feira do Rolo cuida da segurança
          de ponta a ponta. Você fica protegido em cada etapa.
        </p>
      </header>

      <section className={styles.pillars}>
        {PILLARS.map((p) => (
          <div key={p.title} className={styles.pillar}>
            <span className={styles.pillarIcon}><Icon name={p.icon} size={24} /></span>
            <div>
              <strong>{p.title}</strong>
              <p>{p.desc}</p>
            </div>
          </div>
        ))}
      </section>

      <section className={styles.note}>
        <Icon name="card" size={22} />
        <div>
          <strong>Pagamento seguro pelo Mercado Pago</strong>
          <p>
            Todo o pagamento passa pelo Mercado Pago, com criptografia e antifraude. Junto com a nossa
            custódia, isso garante que o seu dinheiro só chega ao vendedor quando a compra dá certo.
          </p>
          <Link href="/como-pagar-com-mercado-pago" className={styles.link}>Como pagar com Mercado Pago →</Link>
        </div>
      </section>

      <div className={styles.cta}>
        <Link href="/" className={styles.btn}>Voltar para a loja</Link>
      </div>
    </main>
  );
}
