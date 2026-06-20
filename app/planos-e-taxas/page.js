'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import { cx } from '@/lib/cx';
import Button from '@/components/atoms/Button/Button';
import Badge from '@/components/atoms/Badge/Badge';
import Icon from '@/components/atoms/Icon/Icon';
import { contentService } from '@/lib/api';

/* ----------------------------------------------------------------
   FALLBACK — fiel e completo ao front antigo.
---------------------------------------------------------------- */
const FALLBACK = {
  content: {
    header: {
      title: 'Planos e Taxas',
      subtitle:
        'Anuncie de graça e pague apenas quando vender. Conheça nossas comissões, planos de destaque e as regras por categoria.',
    },
    alertStrong: 'Anuncie sem mensalidade:',
    alertText:
      ' você só paga comissão quando uma venda é concluída. Causa Animal é 100% gratuita.',
    commissionsTitle: 'Comissões da Plataforma',
    commissionsSub: 'Aplicáveis a produtos gerais. Categorias especiais têm regras próprias.',
    // Comissões da plataforma (produtos gerais) — 3_regras_de_negocio.md §1
    commissions: [
      {
        type: 'Padrão',
        rate: '10%',
        icon: 'store',
        iconClass: 'iconNeutral',
        description: 'Vendedores em geral',
        badge: null,
        features: [
          'Comissão de 10% por venda',
          'Anúncios ilimitados de produtos',
          'Painel do vendedor completo',
          'Recebimento via Mercado Pago',
          'Suporte por e-mail',
        ],
      },
      {
        type: 'Premium',
        rate: '12%',
        icon: 'star',
        iconClass: 'iconBrand',
        description: 'Maior visibilidade e benefícios',
        badge: 'Recomendado',
        features: [
          'Comissão de 12% por venda',
          'Destaque prioritário nos resultados',
          'Selo Premium no perfil de vendedor',
          'Relatórios avançados de vendas',
          'Suporte prioritário',
        ],
      },
    ],
    commissionCta: 'Começar a vender',
    highlightsTitle: 'Planos de Destaque',
    highlightsSub: 'Upgrade opcional de visibilidade do seu anúncio. Cobrado por anúncio.',
    // Upsell de destaques (visibilidade do anúncio) — 3_regras_de_negocio.md §3
    highlights: [
      {
        name: 'Prata',
        price: 'R$ 7,99',
        period: '/anúncio',
        icon: 'shield',
        variant: 'silver',
        iconClass: 'iconSilver',
        description: 'Destaque básico para seu anúncio',
        features: ['Selo Prata no anúncio', 'Posição acima dos anúncios sem destaque', 'Mais visualizações'],
      },
      {
        name: 'Ouro',
        price: 'R$ 14,99',
        period: '/anúncio',
        icon: 'star',
        variant: 'gold',
        iconClass: 'iconGold',
        description: 'Visibilidade intermediária',
        badge: 'Mais Popular',
        features: ['Selo Ouro no anúncio', 'Posição em destaque na categoria', 'Aparece em vitrines de recomendação'],
      },
      {
        name: 'Diamante',
        price: 'R$ 21,99',
        period: '/anúncio',
        icon: 'gem',
        variant: 'diamond',
        iconClass: 'iconDiamond',
        description: 'Máxima visibilidade',
        features: ['Selo Diamante no anúncio', 'Topo dos resultados de busca', 'Destaque na página inicial', 'Maior alcance possível'],
      },
    ],
    highlightCta: 'Destacar anúncio',
    categoriesTable: {
      title: 'Regras por Categoria',
      subtitle: 'Algumas categorias seguem um modelo de monetização próprio.',
      headers: {
        category: 'Categoria',
        model: 'Modelo de monetização',
        detail: 'Observação',
      },
      // Regras por categoria — 3_regras_de_negocio.md §2
      rows: [
        { category: 'Imóveis', model: 'Pago por pacotes', detail: 'Não cobra comissão sobre a venda', icon: 'package' },
        { category: 'Veículos', model: 'Pago por pacotes', detail: 'Não cobra comissão sobre a venda', icon: 'truck' },
        { category: 'Serviços', model: 'Grátis', detail: 'Com opção de upgrade de destaque/visibilidade', icon: 'bolt' },
        { category: 'Causa Animal', model: '100% gratuita', detail: 'Com geolocalização obrigatória', icon: 'heart' },
      ],
    },
    payment: {
      title: 'Como você recebe',
      items: [
        {
          icon: 'card',
          title: 'Pagamento via Mercado Pago',
          text: 'O pagamento é processado com split, separando a comissão da plataforma do seu valor.',
        },
        {
          icon: 'shield',
          title: 'Custódia (escrow) de 7 dias',
          text: 'O valor do vendedor fica retido por 7 dias antes da liberação para sua conta.',
        },
        {
          icon: 'user',
          title: 'Verificação facial',
          text: 'Obrigatória após a sua primeira venda para liberar os valores.',
        },
      ],
    },
    faqTitle: 'Perguntas Frequentes',
    faq: [
      {
        q: 'Como funcionam as comissões?',
        a: 'A comissão é descontada automaticamente do valor da venda de produtos gerais: 10% para vendedores Padrão e 12% para Premium.',
      },
      {
        q: 'O que são os planos de destaque?',
        a: 'São upgrades opcionais de visibilidade do anúncio (Prata, Ouro e Diamante) que melhoram a posição do seu produto nos resultados.',
      },
      {
        q: 'Quando recebo pelas minhas vendas?',
        a: 'O valor do vendedor fica em custódia (escrow) por 7 dias antes da liberação, com pagamento processado via Mercado Pago.',
      },
      {
        q: 'Preciso fazer verificação facial?',
        a: 'Sim. A verificação facial é obrigatória e disparada após a sua primeira venda como vendedor.',
      },
    ],
    cta: {
      icon: 'trending-up',
      title: 'Pronto para começar a vender?',
      subtitle: 'Crie seus anúncios gratuitamente e pague apenas quando vender.',
      primaryLabel: 'Começar a vender',
      primaryIcon: 'store',
      primaryHref: '/anunciar-produtos',
      secondaryLabel: 'Saber mais',
      secondaryHref: '/como-vender',
    },
  },
};

export default function PlanosETaxas() {
  const [content, setContent] = useState(FALLBACK.content);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    contentService
      .get('planos-e-taxas')
      .then((p) => p?.content && setContent(p.content))
      .catch(() => {});
  }, []);

  const c = content;

  return (
    <main className={styles.page}>
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <div className={styles.container}>
          <nav className={styles.crumbNav}>
            <Link href="/" className={styles.crumbLink}>Início</Link>
            <Icon name="chevron-left" size={16} className={styles.crumbChevron} />
            <span className={styles.crumbCurrent}>Planos e Taxas</span>
          </nav>
        </div>
      </div>

      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h1>{c.header.title}</h1>
          <p>{c.header.subtitle}</p>
        </div>

        {/* Aviso */}
        <div className={styles.alert}>
          <Icon name="sparkle" size={18} className={styles.alertIcon} />
          <p>
            <strong>{c.alertStrong}</strong>{c.alertText}
          </p>
        </div>

        {/* Comissões */}
        <h2 className={styles.sectionTitle}>{c.commissionsTitle}</h2>
        <p className={styles.sectionSub}>{c.commissionsSub}</p>
        <div className={styles.commissionGrid}>
          {c.commissions.map((plan) => (
            <div key={plan.type} className={cx(styles.card, plan.badge && styles.cardFeatured)}>
              {plan.badge && (
                <Badge variant="brand" className={styles.cardBadge}>{plan.badge}</Badge>
              )}
              <div className={styles.cardHead}>
                <span className={cx(styles.cardIcon, styles[plan.iconClass])}>
                  <Icon name={plan.icon} size={30} />
                </span>
                <h3>{plan.type}</h3>
                <p className={styles.cardDesc}>{plan.description}</p>
                <div className={styles.priceRow}>
                  <span className={styles.price}>{plan.rate}</span>
                  <span className={styles.period}>por venda</span>
                </div>
              </div>
              <ul className={styles.featureList}>
                {plan.features.map((f) => (
                  <li key={f}>
                    <Icon name="check" size={18} className={styles.checkIcon} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button fullWidth variant={plan.badge ? 'primary' : 'outline'} className={styles.cardCta}>
                {c.commissionCta}
              </Button>
            </div>
          ))}
        </div>

        {/* Planos de destaque */}
        <h2 className={styles.sectionTitle}>{c.highlightsTitle}</h2>
        <p className={styles.sectionSub}>{c.highlightsSub}</p>
        <div className={styles.highlightGrid}>
          {c.highlights.map((plan) => (
            <div key={plan.name} className={cx(styles.card, plan.badge && styles.cardFeatured)}>
              {plan.badge && (
                <Badge variant={plan.variant} className={styles.cardBadge}>{plan.badge}</Badge>
              )}
              <div className={styles.cardHead}>
                <span className={cx(styles.cardIcon, styles[plan.iconClass])}>
                  <Icon name={plan.icon} size={30} />
                </span>
                <h3>{plan.name}</h3>
                <p className={styles.cardDesc}>{plan.description}</p>
                <div className={styles.priceRow}>
                  <span className={styles.price}>{plan.price}</span>
                  <span className={styles.period}>{plan.period}</span>
                </div>
              </div>
              <ul className={styles.featureList}>
                {plan.features.map((f) => (
                  <li key={f}>
                    <Icon name="check" size={18} className={styles.checkIcon} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button fullWidth variant={plan.badge ? 'primary' : 'outline'} className={styles.cardCta}>
                {c.highlightCta}
              </Button>
            </div>
          ))}
        </div>

        {/* Regras por categoria */}
        <div className={styles.tableCard}>
          <div className={styles.tableHead}>
            <h2>{c.categoriesTable.title}</h2>
            <p>{c.categoriesTable.subtitle}</p>
          </div>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{c.categoriesTable.headers.category}</th>
                  <th>{c.categoriesTable.headers.model}</th>
                  <th>{c.categoriesTable.headers.detail}</th>
                </tr>
              </thead>
              <tbody>
                {c.categoriesTable.rows.map((row) => (
                  <tr key={row.category}>
                    <td className={styles.catCell}>
                      <Icon name={row.icon} size={18} className={styles.catIcon} />
                      <span>{row.category}</span>
                    </td>
                    <td className={styles.modelCell}>{row.model}</td>
                    <td className={styles.detailCell}>{row.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.bottomGrid}>
          {/* Como funciona o pagamento */}
          <div className={styles.infoCard}>
            <h2>{c.payment.title}</h2>
            <ul className={styles.infoList}>
              {c.payment.items.map((item) => (
                <li key={item.title}>
                  <Icon name={item.icon} size={20} className={styles.infoIcon} />
                  <div>
                    <h4>{item.title}</h4>
                    <p>{item.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* FAQ */}
          <div className={styles.infoCard}>
            <h2>{c.faqTitle}</h2>
            <div className={styles.faqList}>
              {c.faq.map((item) => (
                <div key={item.q} className={styles.faqItem}>
                  <h4>{item.q}</h4>
                  <p>{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className={styles.ctaCard}>
          <span className={styles.ctaIcon}>
            <Icon name={c.cta.icon} size={32} />
          </span>
          <h2>{c.cta.title}</h2>
          <p>{c.cta.subtitle}</p>
          <div className={styles.ctaActions}>
            <Button size="lg" leftIcon={c.cta.primaryIcon} href={c.cta.primaryHref}>{c.cta.primaryLabel}</Button>
            <Button size="lg" variant="outline" href={c.cta.secondaryHref}>{c.cta.secondaryLabel}</Button>
          </div>
        </div>
      </div>
    </main>
  );
}
