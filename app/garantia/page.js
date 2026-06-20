'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import { contentService } from '@/lib/api';
import Button from '@/components/atoms/Button/Button';
import Icon from '@/components/atoms/Icon/Icon';
import Badge from '@/components/atoms/Badge/Badge';

/* Ícones ausentes no Icon atom — SVG inline (lucide-style). NÃO editar Icon.js. */
function ClockIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function WrenchIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}
function FileTextIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}

/* type → ícone (warrantyTypes do antigo: Shield, Wrench, FileText) */
const TYPE_ICONS = {
  shield: <Icon name="shield" size={32} />,
  wrench: <WrenchIcon size={32} />,
  'file-text': <FileTextIcon size={32} />,
};

const FALLBACK = {
  slug: 'garantia',
  title: 'Garantia',
  subtitle: 'Seus produtos protegidos com garantia legal, do fabricante e opções estendidas.',
  kind: 'content',
  icon: 'shield',
  content: {
    alert: 'Todos os produtos da Feira do Rolo possuem garantia legal e, quando aplicável, garantia do fabricante.',
    warrantyTypes: [
      {
        icon: 'shield',
        color: 'blue',
        title: 'Garantia Legal',
        period: '30-90 dias',
        description: 'Garantia obrigatória por lei contra defeitos de fabricação',
        coverage: ['Defeitos de fabricação', 'Vícios ocultos', 'Produtos que não funcionam'],
      },
      {
        icon: 'wrench',
        color: 'green',
        title: 'Garantia do Fabricante',
        period: '1-3 anos',
        description: 'Garantia oferecida pelo fabricante do produto',
        coverage: ['Defeitos de fabricação', 'Peças e componentes', 'Assistência técnica'],
      },
      {
        icon: 'file-text',
        color: 'purple',
        title: 'Garantia Estendida',
        period: 'Até 5 anos',
        description: 'Proteção adicional opcional para seus produtos',
        coverage: ['Acidentes', 'Danos por uso', 'Reposição rápida'],
      },
    ],
    categories: [
      { category: 'Eletrônicos', legalWarranty: '30 dias', manufacturerWarranty: '1-2 anos', examples: 'Smartphones, tablets, notebooks' },
      { category: 'Eletrodomésticos', legalWarranty: '90 dias', manufacturerWarranty: '1-3 anos', examples: 'Geladeiras, micro-ondas, lavadoras' },
      { category: 'Móveis', legalWarranty: '90 dias', manufacturerWarranty: '1-5 anos', examples: 'Sofás, camas, armários' },
      { category: 'Livros e Mídia', legalWarranty: '30 dias', manufacturerWarranty: 'N/A', examples: 'Livros, CDs, DVDs' },
      { category: 'Roupas e Calçados', legalWarranty: '30 dias', manufacturerWarranty: 'Varia', examples: 'Roupas, sapatos, acessórios' },
    ],
    howToClaim: [
      { title: 'Identifique o Problema', description: 'Verifique se é defeito de fabricação ou problema técnico' },
      { title: 'Entre em Contato', description: 'Acesse "Meus Pedidos" e solicite suporte técnico' },
      { title: 'Envie Documentos', description: 'Forneça nota fiscal e fotos do problema' },
      { title: 'Aguarde Análise', description: 'Analisaremos e direcionaremos para assistência técnica' },
    ],
    covered: ['Defeitos de fabricação', 'Problemas técnicos sem causa externa', 'Vícios ocultos do produto', 'Peças e componentes defeituosos'],
    notCovered: ['Danos por mau uso ou acidentes', 'Desgaste natural do produto', 'Danos por água ou queda', 'Modificações não autorizadas'],
    documents: ['Nota fiscal ou comprovante de compra', 'Certificado de garantia (quando aplicável)', 'Fotos do problema ou defeito', 'Número do pedido na Feira do Rolo'],
    cta: {
      title: 'Precisa Acionar a Garantia?',
      description: 'Estamos aqui para ajudar você',
      primary: 'Solicitar Suporte Técnico',
      secondary: 'Falar com Atendimento',
    },
  },
};

export default function GarantiaPage() {
  const [content, setContent] = useState(FALLBACK.content);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    contentService
      .get('garantia')
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
            <span className={styles.crumbCurrent}>Garantia</span>
          </nav>
        </div>
      </div>

      <div className={`${styles.container} ${styles.content}`}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Garantia</h1>
          <p className={styles.subtitle}>{FALLBACK.subtitle}</p>
        </div>

        {/* Alert */}
        <div className={styles.alert}>
          <span className={styles.alertIcon}>
            <Icon name="shield" size={18} />
          </span>
          <span className={styles.alertText}>
            <strong>Proteção Completa:</strong> {content.alert}
          </span>
        </div>

        {/* Warranty Types */}
        <section className={styles.block}>
          <h2 className={`${styles.blockTitle} ${styles.blockTitleLeft}`}>Tipos de Garantia</h2>
          <div className={styles.typesGrid}>
            {content.warrantyTypes.map((w, i) => (
              <article key={i} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={`${styles.typeIcon} ${styles[w.color] || ''}`}>
                    {TYPE_ICONS[w.icon] || <Icon name="shield" size={32} />}
                  </div>
                  <h3 className={styles.cardTitle}>{w.title}</h3>
                  <Badge variant="neutral" className={styles.periodBadge}>
                    {w.period}
                  </Badge>
                  <p className={styles.cardDesc}>{w.description}</p>
                </div>
                <h4 className={styles.coverageTitle}>Cobertura:</h4>
                <ul className={styles.coverageList}>
                  {w.coverage.map((item, idx) => (
                    <li key={idx} className={styles.coverageItem}>
                      <span className={styles.coverageDot} />
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        {/* Warranty by Category */}
        <article className={styles.panel}>
          <div className={styles.panelHead}>
            <h3 className={styles.panelTitle}>Garantia por Categoria</h3>
            <p className={styles.panelDesc}>Consulte os prazos de garantia por tipo de produto</p>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Categoria</th>
                  <th>Garantia Legal</th>
                  <th>Garantia Fabricante</th>
                  <th>Exemplos</th>
                </tr>
              </thead>
              <tbody>
                {content.categories.map((cat, i) => (
                  <tr key={i}>
                    <td className={styles.tdName}>{cat.category}</td>
                    <td className={styles.tdLegal}>{cat.legalWarranty}</td>
                    <td className={styles.tdManu}>{cat.manufacturerWarranty}</td>
                    <td className={styles.tdExamples}>{cat.examples}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        {/* How to claim + Important info */}
        <div className={styles.twoCols}>
          {/* How to Claim */}
          <article className={styles.panel}>
            <div className={styles.panelHead}>
              <h3 className={`${styles.panelTitle} ${styles.panelTitleIcon}`}>
                <span className={styles.clockIcon}>
                  <ClockIcon size={20} />
                </span>
                Como Acionar a Garantia
              </h3>
            </div>
            <div className={styles.steps}>
              {content.howToClaim.map((step, i) => (
                <div key={i} className={styles.step}>
                  <div className={styles.stepNum}>{i + 1}</div>
                  <div>
                    <h4 className={styles.stepTitle}>{step.title}</h4>
                    <p className={styles.stepText}>{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>

          {/* Important Information */}
          <article className={styles.panel}>
            <div className={styles.panelHead}>
              <h3 className={styles.panelTitle}>Informações Importantes</h3>
            </div>
            <div className={styles.infoGroups}>
              <div>
                <h4 className={`${styles.infoTitle} ${styles.infoGreen}`}>✅ Coberto pela Garantia</h4>
                <ul className={styles.infoList}>
                  {content.covered.map((item, i) => (
                    <li key={i}>• {item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className={`${styles.infoTitle} ${styles.infoRed}`}>❌ Não Coberto</h4>
                <ul className={styles.infoList}>
                  {content.notCovered.map((item, i) => (
                    <li key={i}>• {item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className={`${styles.infoTitle} ${styles.infoBlue}`}>📋 Documentos Necessários</h4>
                <ul className={styles.infoList}>
                  {content.documents.map((item, i) => (
                    <li key={i}>• {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </article>
        </div>

        {/* CTA */}
        <div className={styles.ctaWrap}>
          <article className={styles.ctaCard}>
            <div className={styles.panelHead}>
              <h3 className={styles.ctaTitle}>{content.cta.title}</h3>
              <p className={styles.ctaDesc}>{content.cta.description}</p>
            </div>
            <Button className={styles.ctaPrimary}>{content.cta.primary}</Button>
            <Button variant="outline" className={styles.ctaSecondary}>
              {content.cta.secondary}
            </Button>
          </article>
        </div>
      </div>
    </main>
  );
}
