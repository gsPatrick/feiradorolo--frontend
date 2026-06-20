'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import { contentService } from '@/lib/api';
import Icon from '@/components/atoms/Icon/Icon';
import Badge from '@/components/atoms/Badge/Badge';

/* Ícones lucide-style ausentes no Icon atom — SVG inline. */
function CheckCircleIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  );
}
function ClockIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
function FileTextIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
      <path d="M10 9H8" />
    </svg>
  );
}

/* Resolve o ícone de um método a partir do nome serializável vindo do content. */
function MethodIcon({ name, color }) {
  const map = {
    pix: <Icon name="pix" size={32} />,
    card: <Icon name="card" size={32} />,
    smartphone: <Icon name="smartphone" size={32} />,
    'file-text': <FileTextIcon size={32} />,
  };
  return <div className={`${styles.methodIcon} ${styles[color] || ''}`}>{map[name] || <Icon name="card" size={32} />}</div>;
}
function FeatureIcon({ name, color }) {
  const map = {
    shield: <Icon name="shield" size={24} />,
    'check-circle': <CheckCircleIcon size={24} />,
    clock: <ClockIcon size={24} />,
  };
  return <div className={`${styles.featureIcon} ${styles[color] || ''}`}>{map[name] || <Icon name="shield" size={24} />}</div>;
}

const FALLBACK = {
  slug: 'formas-de-pagamento',
  title: 'Formas de Pagamento',
  subtitle:
    'Escolha a forma de pagamento que mais convém para você. Segurança e facilidade em todas as opções.',
  kind: 'content',
  icon: 'card',
  content: {
    alert: {
      strong: '100% Seguro:',
      text: 'Todos os pagamentos são protegidos com criptografia SSL e monitoramento antifraude 24 horas por dia.',
    },
    methodsTitle: 'Métodos Aceitos',
    paymentMethods: [
      {
        icon: 'smartphone',
        color: 'green',
        title: 'PIX',
        description: 'Pagamento instantâneo 24 horas por dia',
        benefits: ['Aprovação imediata', 'Sem taxas extras', 'Disponível 24/7'],
        processingTime: 'Instantâneo',
        badge: 'Mais Rápido',
      },
      {
        icon: 'card',
        color: 'blue',
        title: 'Cartão de Crédito',
        description: 'Parcelamento em até 12x sem juros',
        benefits: ['Até 12x sem juros', 'Todas as bandeiras', 'Aprovação rápida'],
        processingTime: 'Até 2 dias úteis',
        badge: 'Popular',
      },
      {
        icon: 'card',
        color: 'purple',
        title: 'Cartão de Débito',
        description: 'Débito direto na conta com segurança',
        benefits: ['Aprovação imediata', 'Maior controle', 'Sem parcelamento'],
        processingTime: 'Instantâneo',
        badge: 'Seguro',
      },
      {
        icon: 'file-text',
        color: 'orange',
        title: 'Boleto Bancário',
        description: 'Pagamento tradicional brasileiro',
        benefits: ['Sem cartão necessário', 'Pague em qualquer banco', 'Prazo para pagamento'],
        processingTime: '1-3 dias úteis',
        badge: 'Tradicional',
      },
    ],
    creditCards: {
      title: 'Cartões Aceitos',
      description: 'Aceitamos as principais bandeiras do mercado',
      items: [
        { name: 'Visa', logo: '💳' },
        { name: 'Mastercard', logo: '💳' },
        { name: 'American Express', logo: '💳' },
        { name: 'Elo', logo: '💳' },
        { name: 'Hipercard', logo: '💳' },
        { name: 'Diners Club', logo: '💳' },
      ],
    },
    installments: {
      title: 'Parcelamento no Cartão',
      description: 'Simule o parcelamento para uma compra de R$ 100,00',
      options: [
        { parcels: '1x', fee: 'sem juros', total: 'R$ 100,00' },
        { parcels: '2x', fee: 'sem juros', total: 'R$ 50,00' },
        { parcels: '3x', fee: 'sem juros', total: 'R$ 33,33' },
        { parcels: '4x', fee: 'sem juros', total: 'R$ 25,00' },
        { parcels: '5x', fee: 'sem juros', total: 'R$ 20,00' },
        { parcels: '6x', fee: 'sem juros', total: 'R$ 16,67' },
        { parcels: '7x', fee: '1,99% a.m.', total: 'R$ 14,49' },
        { parcels: '8x', fee: '1,99% a.m.', total: 'R$ 12,79' },
        { parcels: '9x', fee: '1,99% a.m.', total: 'R$ 11,48' },
        { parcels: '10x', fee: '1,99% a.m.', total: 'R$ 10,43' },
        { parcels: '11x', fee: '1,99% a.m.', total: 'R$ 9,58' },
        { parcels: '12x', fee: '1,99% a.m.', total: 'R$ 8,88' },
      ],
    },
    security: {
      title: 'Segurança Garantida',
      description: 'Seus dados e pagamentos estão protegidos',
      features: [
        {
          icon: 'shield',
          color: 'green',
          title: 'Criptografia SSL',
          description: 'Todos os dados são protegidos com criptografia de ponta',
        },
        {
          icon: 'check-circle',
          color: 'blue',
          title: 'Certificação PCI DSS',
          description: 'Padrão internacional de segurança para pagamentos',
        },
        {
          icon: 'clock',
          color: 'purple',
          title: 'Monitoramento 24/7',
          description: 'Sistema de detecção de fraudes ativo constantemente',
        },
      ],
    },
    info: [
      {
        title: '📱 PIX',
        rows: [
          { label: 'Horário', value: '24 horas por dia' },
          { label: 'Aprovação', value: 'Instantânea' },
          { label: 'Taxa', value: 'Gratuita' },
          { label: 'Limite', value: 'Conforme seu banco' },
        ],
      },
      {
        title: '💳 Cartões',
        rows: [
          { label: 'Parcelamento', value: 'Até 12x' },
          { label: 'Sem juros', value: 'Até 6x' },
          { label: 'Aprovação', value: 'Até 2 dias úteis' },
          { label: 'Estorno', value: '5-10 dias úteis' },
        ],
      },
      {
        title: '📄 Boleto',
        rows: [
          { label: 'Vencimento', value: '3 dias úteis' },
          { label: 'Compensação', value: '1-3 dias úteis' },
          { label: 'Taxa', value: 'Gratuita' },
          { label: 'Pagamento', value: 'Qualquer banco' },
        ],
      },
    ],
    faq: {
      title: 'Perguntas Frequentes',
      items: [
        {
          question: 'Posso alterar a forma de pagamento?',
          answer:
            'Sim, você pode alterar antes de finalizar o pedido. Após a confirmação, entre em contato conosco.',
        },
        {
          question: 'O PIX é seguro?',
          answer:
            'Sim, o PIX é regulamentado pelo Banco Central e utiliza as mesmas medidas de segurança dos bancos.',
        },
        {
          question: 'Quando o cartão é debitado?',
          answer: 'O valor é reservado na aprovação e debitado apenas no envio do produto.',
        },
        {
          question: 'Posso usar múltiplos cartões?',
          answer:
            'Atualmente não, mas você pode usar diferentes formas de pagamento em pedidos separados.',
        },
      ],
    },
  },
};

export default function FormasDePagamentoPage() {
  const [content, setContent] = useState(FALLBACK.content);

  useEffect(() => {
    window.scrollTo(0, 0);
    contentService
      .get('formas-de-pagamento')
      .then((p) => p?.content && setContent(p.content))
      .catch(() => {});
  }, []);

  return (
    <main className={styles.page}>
      {/* Breadcrumb */}
      <div className={styles.breadcrumbBar}>
        <div className={styles.container}>
          <nav className={styles.breadcrumb}>
            <Link href="/" className={styles.crumbLink}>
              Início
            </Link>
            <Icon name="arrow-right" size={16} className={styles.crumbSep} />
            <span className={styles.crumbCurrent}>Formas de Pagamento</span>
          </nav>
        </div>
      </div>

      <div className={`${styles.container} ${styles.content}`}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>{FALLBACK.title}</h1>
          <p className={styles.subtitle}>{FALLBACK.subtitle}</p>
        </div>

        {/* Security Alert */}
        <div className={styles.alert}>
          <span className={styles.alertIcon}>
            <Icon name="shield" size={18} />
          </span>
          <span className={styles.alertText}>
            <strong>{content.alert.strong}</strong> {content.alert.text}
          </span>
        </div>

        {/* Payment Methods */}
        <section className={styles.block}>
          <h2 className={styles.blockTitle}>{content.methodsTitle}</h2>
          <div className={styles.methodsGrid}>
            {content.paymentMethods.map((method, i) => (
              <article key={i} className={styles.methodCard}>
                <Badge variant="brand" className={styles.methodBadge}>
                  {method.badge}
                </Badge>
                <div className={styles.methodHeader}>
                  <MethodIcon name={method.icon} color={method.color} />
                  <h3 className={styles.methodTitle}>{method.title}</h3>
                  <p className={styles.methodDesc}>{method.description}</p>
                </div>
                <div className={styles.benefits}>
                  {method.benefits.map((benefit, idx) => (
                    <div key={idx} className={styles.benefitRow}>
                      <span className={styles.benefitCheck}>
                        <CheckCircleIcon size={16} />
                      </span>
                      {benefit}
                    </div>
                  ))}
                </div>
                <div className={styles.processing}>
                  <div className={styles.processingLabel}>Processamento</div>
                  <div className={styles.processingValue}>{method.processingTime}</div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Credit Cards */}
        <article className={styles.panel} style={{ marginBottom: 32 }}>
          <div className={styles.panelHead}>
            <h3 className={styles.panelTitle}>{content.creditCards.title}</h3>
            <p className={styles.panelDesc}>{content.creditCards.description}</p>
          </div>
          <div className={styles.cardsGrid}>
            {content.creditCards.items.map((card, i) => (
              <div key={i} className={styles.brandCard}>
                <div className={styles.brandLogo}>{card.logo}</div>
                <div className={styles.brandName}>{card.name}</div>
              </div>
            ))}
          </div>
        </article>

        {/* Installments + Security */}
        <div className={styles.twoCols}>
          {/* Installments */}
          <article className={styles.panel}>
            <div className={styles.panelHead}>
              <h3 className={styles.panelTitle}>{content.installments.title}</h3>
              <p className={styles.panelDesc}>{content.installments.description}</p>
            </div>
            <div className={styles.installList}>
              {content.installments.options.map((option, i) => (
                <div key={i} className={styles.installRow}>
                  <div className={styles.installParcels}>{option.parcels}</div>
                  <div className={styles.installFee}>{option.fee}</div>
                  <div className={styles.installTotal}>{option.total}</div>
                </div>
              ))}
            </div>
          </article>

          {/* Security */}
          <article className={styles.panel}>
            <div className={styles.panelHead}>
              <h3 className={styles.panelTitle}>{content.security.title}</h3>
              <p className={styles.panelDesc}>{content.security.description}</p>
            </div>
            <div className={styles.securityList}>
              {content.security.features.map((feature, i) => (
                <div key={i} className={styles.securityRow}>
                  <FeatureIcon name={feature.icon} color={feature.color} />
                  <div>
                    <h4 className={styles.securityTitle}>{feature.title}</h4>
                    <p className={styles.securityText}>{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>

        {/* Additional Information */}
        <div className={styles.infoGrid}>
          {content.info.map((card, i) => (
            <article key={i} className={styles.panel}>
              <div className={styles.panelHead}>
                <h3 className={styles.infoTitle}>{card.title}</h3>
              </div>
              <div className={styles.infoRows}>
                {card.rows.map((row, idx) => (
                  <div key={idx} className={styles.infoRow}>
                    <strong>{row.label}:</strong> {row.value}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>

        {/* FAQ */}
        <article className={styles.panel} style={{ marginTop: 32 }}>
          <div className={styles.panelHead}>
            <h3 className={styles.panelTitle}>{content.faq.title}</h3>
          </div>
          <div className={styles.faqGrid}>
            {content.faq.items.map((item, i) => (
              <div key={i} className={styles.faqItem}>
                <h4 className={styles.faqQuestion}>{item.question}</h4>
                <p className={styles.faqAnswer}>{item.answer}</p>
              </div>
            ))}
          </div>
        </article>
      </div>
    </main>
  );
}
