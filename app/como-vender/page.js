'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import Button from '@/components/atoms/Button/Button';
import Icon from '@/components/atoms/Icon/Icon';
import Badge from '@/components/atoms/Badge/Badge';
import { contentService } from '@/lib/api';

// Ícone "users" não existe no Icon atom — SVG inline (lucide-style).
function UsersIcon({ size = 32 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

// Mapa de ícones por nome (string vinda do conteúdo) → elemento.
const ICONS = {
  users: (s) => <UsersIcon size={s} />,
};

function renderIcon(name, size) {
  const fn = ICONS[name];
  return fn ? fn(size) : <Icon name={name || 'star'} size={size} />;
}

/* ----------------------------------------------------------------
   FALLBACK — fiel e completo ao front antigo.
---------------------------------------------------------------- */
const FALLBACK = {
  content: {
    header: {
      title: 'Como Vender na Feira do Rolo',
      subtitle:
        'Transforme seus produtos em negócio! Venda para milhões de pessoas com segurança e facilidade.',
    },
    alert: {
      strong: 'Comece hoje mesmo!',
      text: ' Cadastro gratuito e comissão baixa. Seus primeiros 30 dias são por nossa conta!',
      buttonLabel: 'Quero Vender',
      buttonHref: '/adicionar-produto',
    },
    benefitsTitle: 'Por que Vender Conosco?',
    benefits: [
      {
        icon: 'users',
        color: 'blue',
        title: 'Milhões de Compradores',
        description: 'Alcance milhões de pessoas em todo o Brasil',
      },
      {
        icon: 'shield',
        color: 'green',
        title: 'Vendas Protegidas',
        description: 'Sistema de pagamento seguro e proteção contra fraudes',
      },
      {
        icon: 'trending-up',
        color: 'purple',
        title: 'Ferramentas de Gestão',
        description: 'Painel completo para gerenciar vendas e estoque',
      },
    ],
    stepsTitle: 'Como Começar',
    steps: [
      {
        number: 1,
        title: 'Cadastre-se como Vendedor',
        description: 'Crie sua conta gratuita e complete seu perfil',
        icon: 'store',
      },
      {
        number: 2,
        title: 'Configure sua Loja',
        description: 'Personalize sua loja com logo, banner e descrição',
        icon: 'package',
      },
      {
        number: 3,
        title: 'Cadastre seus Produtos',
        description: 'Adicione produtos com fotos e descrições detalhadas',
        icon: 'dollar',
      },
      {
        number: 4,
        title: 'Comece a Vender',
        description: 'Publique seus anúncios e acompanhe as vendas',
        icon: 'trending-up',
      },
    ],
    requirements: {
      title: 'Requisitos para Vender',
      description: 'Você precisa atender aos seguintes critérios:',
      items: [
        'Ser maior de 18 anos ou empresa constituída',
        'Possuir CPF ou CNPJ válido',
        'Ter produtos próprios para venda',
        'Concordar com os termos de uso',
        'Fornecer dados bancários para recebimento',
      ],
    },
    pricing: {
      title: 'Taxas e Comissões',
      description: 'Transparência total nos nossos preços',
      rows: [
        { tone: 'green', title: 'Cadastro', sub: 'Criação da conta', value: 'GRÁTIS' },
        { tone: 'blue', title: 'Comissão por Venda', sub: 'Apenas quando vender', value: '5-12%' },
        { tone: 'purple', title: 'Taxa de Pagamento', sub: 'Processamento seguro', value: '2,99%' },
      ],
    },
    featuresTitle: 'Ferramentas Incluídas',
    features: [
      { emoji: '📊', title: 'Painel de Vendas', description: 'Acompanhe vendas, estoque e performance em tempo real' },
      { emoji: '📱', title: 'App Mobile', description: 'Gerencie sua loja pelo celular, a qualquer hora e lugar' },
      { emoji: '💳', title: 'Múltiplos Pagamentos', description: 'PIX, cartão, boleto - receba de todas as formas' },
      { emoji: '📦', title: 'Gestão de Estoque', description: 'Controle automático de estoque e alertas' },
      { emoji: '🚚', title: 'Logística Integrada', description: 'Parcerias com transportadoras para melhor frete' },
      { emoji: '📈', title: 'Relatórios', description: 'Relatórios detalhados de vendas e performance' },
    ],
    cta: {
      title: 'Pronto para Começar?',
      subtitle: 'Junte-se a milhares de vendedores que já faturam conosco',
      buttonLabel: 'Criar Conta de Vendedor',
      buttonHref: '/adicionar-produto',
    },
  },
};

export default function ComoVenderPage() {
  const [content, setContent] = useState(FALLBACK.content);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    contentService
      .get('como-vender')
      .then((p) => p?.content && setContent(p.content))
      .catch(() => {});
  }, []);

  const c = content;

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
            <span className={styles.crumbCurrent}>Como Vender</span>
          </nav>
        </div>
      </div>

      <div className={`${styles.container} ${styles.content}`}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>{c.header.title}</h1>
          <p className={styles.subtitle}>{c.header.subtitle}</p>
        </div>

        {/* CTA Banner */}
        <div className={styles.alert}>
          <span className={styles.alertIcon}>
            <Icon name="store" size={18} />
          </span>
          <div className={styles.alertBody}>
            <span className={styles.alertText}>
              <strong>{c.alert.strong}</strong>{c.alert.text}
            </span>
            <Button href={c.alert.buttonHref} className={styles.alertBtn}>
              {c.alert.buttonLabel}
            </Button>
          </div>
        </div>

        {/* Benefits */}
        <section className={styles.block}>
          <h2 className={styles.blockTitle}>{c.benefitsTitle}</h2>
          <div className={styles.benefitsGrid}>
            {c.benefits.map((benefit, i) => (
              <article key={i} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={`${styles.benefitIcon} ${styles[benefit.color]}`}>
                    {renderIcon(benefit.icon, 32)}
                  </div>
                  <h3 className={styles.cardTitle}>{benefit.title}</h3>
                </div>
                <p className={styles.cardText}>{benefit.description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* How to start */}
        <section className={styles.block}>
          <h2 className={styles.blockTitle}>{c.stepsTitle}</h2>
          <div className={styles.stepsGrid}>
            {c.steps.map((step) => (
              <article key={step.number} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.stepIcon}>
                    <Icon name={step.icon} size={24} />
                  </div>
                  <Badge variant="neutral" className={styles.stepBadge}>
                    Passo {step.number}
                  </Badge>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                </div>
                <p className={styles.stepText}>{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Requirements + Pricing */}
        <div className={styles.twoCols}>
          {/* Requirements */}
          <article className={styles.panel}>
            <div className={styles.panelHead}>
              <h3 className={styles.panelTitle}>{c.requirements.title}</h3>
              <p className={styles.panelDesc}>{c.requirements.description}</p>
            </div>
            <ul className={styles.reqList}>
              {c.requirements.items.map((req, i) => (
                <li key={i} className={styles.reqItem}>
                  <span className={styles.reqDot} />
                  <span>{req}</span>
                </li>
              ))}
            </ul>
          </article>

          {/* Pricing */}
          <article className={styles.panel}>
            <div className={styles.panelHead}>
              <h3 className={styles.panelTitle}>{c.pricing.title}</h3>
              <p className={styles.panelDesc}>{c.pricing.description}</p>
            </div>
            <div className={styles.pricingList}>
              {c.pricing.rows.map((row, i) => (
                <div key={i} className={`${styles.pricingRow} ${styles[`tone_${row.tone}`]}`}>
                  <div>
                    <div className={styles.pricingTitle}>{row.title}</div>
                    <div className={styles.pricingSub}>{row.sub}</div>
                  </div>
                  <div className={`${styles.pricingValue} ${styles[`value_${row.tone}`]}`}>{row.value}</div>
                </div>
              ))}
            </div>
          </article>
        </div>

        {/* Features */}
        <section className={styles.block}>
          <h2 className={`${styles.blockTitle} ${styles.blockTitleLeft}`}>{c.featuresTitle}</h2>
          <div className={styles.featuresGrid}>
            {c.features.map((feature, i) => (
              <article key={i} className={styles.featureCard}>
                <h3 className={styles.featureTitle}>
                  <span className={styles.featureEmoji}>{feature.emoji}</span> {feature.title}
                </h3>
                <p className={styles.cardText}>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className={styles.ctaWrap}>
          <div className={styles.ctaCard}>
            <h3 className={styles.ctaTitle}>{c.cta.title}</h3>
            <p className={styles.ctaText}>{c.cta.subtitle}</p>
            <Button size="lg" href={c.cta.buttonHref} className={styles.ctaBtn}>
              {c.cta.buttonLabel}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
