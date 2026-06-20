'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import Button from '@/components/atoms/Button/Button';
import Icon from '@/components/atoms/Icon/Icon';
import Badge from '@/components/atoms/Badge/Badge';
import { contentService } from '@/lib/api';

/* ----------------------------------------------------------------
   Ícones que não existem no Icon atom — SVG inline (lucide-style).
   NÃO editar Icon.js.
---------------------------------------------------------------- */
function svgBase(size, children) {
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
      {children}
    </svg>
  );
}

function UsersIcon({ size = 32 }) {
  return svgBase(size, (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ));
}

function TargetIcon({ size = 32 }) {
  return svgBase(size, (
    <>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </>
  ));
}

function AwardIcon({ size = 32 }) {
  return svgBase(size, (
    <>
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
    </>
  ));
}

function GlobeIcon({ size = 32 }) {
  return svgBase(size, (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </>
  ));
}

// Mapa de ícones por nome (string vinda do conteúdo) → componente/elemento.
const ICONS = {
  heart: (s) => <Icon name="heart" size={s} />,
  award: (s) => <AwardIcon size={s} />,
  users: (s) => <UsersIcon size={s} />,
  globe: (s) => <GlobeIcon size={s} />,
  target: (s) => <TargetIcon size={s} />,
  'trending-up': (s) => <Icon name="trending-up" size={s} />,
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
      title: 'Quem Somos',
      subtitle:
        'Somos a maior feira online do Brasil, conectando milhões de pessoas através do comércio eletrônico e democratizando o acesso ao empreendedorismo digital.',
    },
    mission: {
      title: 'Nossa Missão',
      text:
        'Democratizar o e-commerce no Brasil, oferecendo oportunidades para que qualquer pessoa possa empreender e encontrar o que precisa de forma simples e segura.',
    },
    stats: [
      { number: '10M+', label: 'Clientes Ativos' },
      { number: '500K+', label: 'Vendedores' },
      { number: '50M+', label: 'Produtos' },
      { number: '1M+', label: 'Pedidos/Mês' },
    ],
    valuesTitle: 'Nossos Valores',
    values: [
      { icon: 'heart', color: 'red', title: 'Paixão pelo Cliente', description: 'Colocamos nossos clientes no centro de tudo que fazemos' },
      { icon: 'award', color: 'yellow', title: 'Excelência', description: 'Buscamos sempre a melhor experiência e qualidade' },
      { icon: 'users', color: 'blue', title: 'Colaboração', description: 'Acreditamos no poder das parcerias e do trabalho em equipe' },
      { icon: 'globe', color: 'green', title: 'Responsabilidade', description: 'Comprometidos com a sustentabilidade e impacto social' },
    ],
    timelineTitle: 'Nossa Jornada',
    timeline: [
      { year: '2018', title: 'Fundação', description: 'Nasce a Feira do Rolo com o sonho de democratizar o e-commerce no Brasil' },
      { year: '2019', title: 'Primeiro Milhão', description: 'Atingimos a marca de 1 milhão de produtos cadastrados' },
      { year: '2020', title: 'Expansão', description: 'Lançamento em todas as regiões do Brasil' },
      { year: '2021', title: 'Marketplace', description: 'Abertura da plataforma para vendedores parceiros' },
      { year: '2022', title: 'Mobile First', description: 'Lançamento do app mobile e foco na experiência móvel' },
      { year: '2023', title: 'Sustentabilidade', description: 'Programa de neutralização de carbono e embalagens ecológicas' },
      { year: '2024', title: 'IA & Tech', description: 'Implementação de IA para personalização e melhor experiência' },
    ],
    teamTitle: 'Nossa Liderança',
    team: [
      { name: 'Ana Silva', role: 'CEO & Fundadora', description: '20 anos de experiência em e-commerce e tecnologia' },
      { name: 'Carlos Santos', role: 'CTO', description: 'Especialista em arquitetura de sistemas escaláveis' },
      { name: 'Maria Oliveira', role: 'CPO', description: 'Focada na experiência do usuário e inovação em produtos' },
      { name: 'João Costa', role: 'CMO', description: 'Expert em marketing digital e crescimento sustentável' },
    ],
    vision: {
      title: 'Nossa Visão',
      paragraphs: [
        'Ser a principal plataforma de e-commerce do Brasil, reconhecida pela excelência no atendimento, inovação tecnológica e compromisso com o desenvolvimento econômico e social do país.',
        'Queremos ser o lugar onde cada brasileiro pode encontrar o que precisa e realizar seus sonhos empreendedores.',
      ],
    },
    sustainability: {
      title: 'Sustentabilidade',
      items: [
        'Embalagens 100% recicláveis',
        'Programa de carbono neutro',
        'Parcerias com ONGs ambientais',
        'Incentivo ao comércio local',
      ],
    },
    awards: {
      title: 'Reconhecimentos',
      subtitle: 'Prêmios e certificações que recebemos ao longo dos anos',
      items: [
        { icon: 'award', color: 'yellow', title: 'Melhor E-commerce 2023', source: 'Prêmio E-commerce Brasil' },
        { icon: 'trending-up', color: 'blue', title: 'Startup do Ano 2022', source: 'Revista Época Negócios' },
        { icon: 'users', color: 'green', title: 'Melhor Lugar para Trabalhar', source: 'Great Place to Work' },
      ],
    },
    cta: {
      title: 'Quer Fazer Parte da Nossa História?',
      subtitle: 'Venha construir o futuro do e-commerce brasileiro conosco',
      primaryLabel: 'Ver Vagas Abertas',
      primaryHref: '/quem-somos',
      secondaryLabel: 'Seja um Vendedor',
      secondaryHref: '/adicionar-produto',
    },
  },
};

export default function QuemSomosPage() {
  const [content, setContent] = useState(FALLBACK.content);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    contentService
      .get('quem-somos')
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
            <span className={styles.crumbCurrent}>Quem Somos</span>
          </nav>
        </div>
      </div>

      <div className={`${styles.container} ${styles.content}`}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>{c.header.title}</h1>
          <p className={styles.subtitle}>{c.header.subtitle}</p>
        </div>

        {/* Mission Hero */}
        <div className={styles.missionHero}>
          <h2 className={styles.missionTitle}>{c.mission.title}</h2>
          <p className={styles.missionText}>{c.mission.text}</p>
        </div>

        {/* Stats */}
        <div className={styles.statsGrid}>
          {c.stats.map((stat, i) => (
            <div key={i} className={styles.statCard}>
              <div className={styles.statNumber}>{stat.number}</div>
              <div className={styles.statLabel}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Values */}
        <section className={styles.block}>
          <h2 className={styles.blockTitle}>{c.valuesTitle}</h2>
          <div className={styles.cardsGrid4}>
            {c.values.map((value, i) => (
              <article key={i} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={`${styles.valueIcon} ${styles[value.color] || ''}`}>
                    {renderIcon(value.icon, 32)}
                  </div>
                  <h3 className={styles.cardTitle}>{value.title}</h3>
                </div>
                <p className={styles.cardText}>{value.description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Timeline */}
        <section className={styles.block}>
          <h2 className={styles.blockTitle}>{c.timelineTitle}</h2>
          <div className={styles.timelineWrap}>
            {c.timeline.map((milestone, i) => (
              <div key={i} className={styles.timelineRow}>
                <div className={styles.timelineYear}>
                  <Badge className={styles.yearBadge}>{milestone.year}</Badge>
                </div>
                <div className={styles.timelineBody}>
                  <article className={styles.timelineCard}>
                    <h3 className={styles.timelineTitle}>{milestone.title}</h3>
                    <p className={styles.cardText}>{milestone.description}</p>
                  </article>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Leadership Team */}
        <section className={styles.block}>
          <h2 className={styles.blockTitle}>{c.teamTitle}</h2>
          <div className={styles.cardsGrid4}>
            {c.team.map((member, i) => (
              <article key={i} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.avatar}>
                    <UsersIcon size={40} />
                  </div>
                  <h3 className={styles.cardTitle}>{member.name}</h3>
                  <Badge variant="neutral" className={styles.roleBadge}>
                    {member.role}
                  </Badge>
                </div>
                <p className={styles.cardText}>{member.description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Vision + Sustainability */}
        <div className={styles.twoCols}>
          <article className={styles.panel}>
            <h3 className={styles.panelTitle}>
              <span className={`${styles.panelIcon} ${styles.yellow}`}>
                <TargetIcon size={20} />
              </span>
              {c.vision.title}
            </h3>
            {c.vision.paragraphs.map((p, i) => (
              <p key={i} className={styles.panelParagraph}>
                {p}
              </p>
            ))}
          </article>

          <article className={styles.panel}>
            <h3 className={styles.panelTitle}>
              <span className={`${styles.panelIcon} ${styles.green}`}>
                <GlobeIcon size={20} />
              </span>
              {c.sustainability.title}
            </h3>
            <ul className={styles.susList}>
              {c.sustainability.items.map((item, i) => (
                <li key={i} className={styles.susItem}>
                  <span className={styles.susDot} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>

        {/* Awards */}
        <article className={styles.awardsCard}>
          <div className={styles.awardsHead}>
            <h3 className={styles.awardsTitle}>{c.awards.title}</h3>
            <p className={styles.awardsSubtitle}>{c.awards.subtitle}</p>
          </div>
          <div className={styles.awardsGrid}>
            {c.awards.items.map((item, i) => (
              <div key={i} className={styles.awardItem}>
                <div className={`${styles.awardIcon} ${styles[item.color] || ''}`}>
                  {renderIcon(item.icon, 48)}
                </div>
                <h4 className={styles.awardName}>{item.title}</h4>
                <p className={styles.awardSource}>{item.source}</p>
              </div>
            ))}
          </div>
        </article>

        {/* CTA */}
        <div className={styles.ctaWrap}>
          <div className={styles.ctaCard}>
            <h3 className={styles.ctaTitle}>{c.cta.title}</h3>
            <p className={styles.ctaText}>{c.cta.subtitle}</p>
            <div className={styles.ctaButtons}>
              <Button href={c.cta.primaryHref} className={styles.ctaPrimary}>
                {c.cta.primaryLabel}
              </Button>
              <Button variant="outline" href={c.cta.secondaryHref} className={styles.ctaSecondary}>
                {c.cta.secondaryLabel}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
