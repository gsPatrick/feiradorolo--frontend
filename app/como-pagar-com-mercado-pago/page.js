import Link from 'next/link';
import Icon from '@/components/atoms/Icon/Icon';
import styles from './page.module.css';

export const metadata = {
  title: 'Como pagar com Mercado Pago — Feira do Rolo',
  description: 'Cartão em até 12x, Pix, boleto e Linha de Crédito. Pagamento seguro e fácil na Feira do Rolo.',
};

const METHODS = [
  { icon: 'card', title: 'Cartão de crédito', desc: 'Em até 12x sem juros, das principais bandeiras (Visa, Master, Elo, Amex).' },
  { icon: 'bolt', title: 'Pix', desc: 'Aprovação na hora e, em muitos anúncios, desconto especial no Pix.' },
  { icon: 'barcode', title: 'Boleto bancário', desc: 'Compensação em 1 a 2 dias úteis. O pedido é reservado até a confirmação.' },
  { icon: 'dollar', title: 'Linha de Crédito', desc: 'Pague em até 12x mesmo sem cartão, com a Linha de Crédito do Mercado Pago.' },
];

const STEPS = [
  'Escolha o produto e clique em "Comprar agora".',
  'No checkout, selecione o meio de pagamento (cartão, Pix ou boleto).',
  'Você é levado ao ambiente seguro do Mercado Pago para concluir.',
  'Assim que o pagamento é aprovado, o pedido é confirmado e o vendedor é avisado.',
];

export default function ComoPagarMercadoPago() {
  return (
    <main className={styles.wrap}>
      <header className={styles.hero}>
        <span className={styles.pill}><Icon name="card" size={15} /> Pagamento seguro e fácil</span>
        <h1 className={styles.title}>Como pagar com Mercado Pago</h1>
        <p className={styles.subtitle}>
          Na Feira do Rolo, todos os pagamentos passam pelo Mercado Pago — referência em segurança no Brasil.
          Você paga do jeito que preferir, com proteção de ponta a ponta.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.h2}>Meios de pagamento aceitos</h2>
        <div className={styles.grid}>
          {METHODS.map((m) => (
            <div key={m.title} className={styles.card}>
              <span className={styles.cardIcon}><Icon name={m.icon} size={22} /></span>
              <div>
                <strong>{m.title}</strong>
                <p>{m.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>Como funciona, passo a passo</h2>
        <ol className={styles.steps}>
          {STEPS.map((s, i) => (
            <li key={i}><span className={styles.stepNum}>{i + 1}</span><span>{s}</span></li>
          ))}
        </ol>
      </section>

      <section className={styles.note}>
        <Icon name="shield" size={22} />
        <div>
          <strong>Seus dados protegidos</strong>
          <p>
            O pagamento acontece no ambiente do Mercado Pago, com criptografia e monitoramento antifraude.
            A Feira do Rolo não armazena os dados do seu cartão. E, com a nossa proteção, o valor só é
            repassado ao vendedor depois que você confirma o recebimento.
          </p>
          <Link href="/como-te-protegemos" className={styles.link}>Veja como te protegemos →</Link>
        </div>
      </section>

      <div className={styles.cta}>
        <Link href="/" className={styles.btn}>Voltar para a loja</Link>
      </div>
    </main>
  );
}
