'use client';

import { useEffect, useState } from 'react';
import styles from './page.module.css';
import Button from '@/components/atoms/Button/Button';
import Badge from '@/components/atoms/Badge/Badge';
import Breadcrumb from '@/components/molecules/Breadcrumb/Breadcrumb';
import Icon from '@/components/atoms/Icon/Icon';
import { contentService } from '@/lib/api';

function BookOpen({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function Play({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="6 3 20 12 6 21 6 3" />
    </svg>
  );
}

function Users({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function TrendingUpIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

function Award({ size = 64 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="7" />
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
    </svg>
  );
}

// Mapa de ícones por nome (string vinda do conteúdo) → componente.
const ICONS = {
  'book-open': (s) => <BookOpen size={s} />,
  play: (s) => <Play size={s} />,
  'trending-up': (s) => <TrendingUpIcon size={s} />,
  users: (s) => <Users size={s} />,
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
      title: 'Academia do Vendedor',
      subtitle:
        'Desenvolva suas habilidades e aumente suas vendas com nossos cursos e materiais gratuitos.',
    },
    stats: [
      { value: '50+', color: 'statBrand', label: 'Cursos Disponíveis' },
      { value: '25k+', color: 'statBlue', label: 'Vendedores Formados' },
      { value: '95%', color: 'statGreen', label: 'Taxa de Satisfação' },
      { value: '100%', color: 'statPurple', label: 'Gratuito' },
    ],
    coursesTitle: 'Cursos em Destaque',
    courses: [
      {
        title: 'Primeiros Passos no E-commerce',
        description: 'Aprenda os fundamentos para começar a vender online',
        duration: '2h 30min',
        lessons: 8,
        level: 'Iniciante',
        progress: 0,
        icon: 'book-open',
        badge: 'Essencial',
      },
      {
        title: 'Fotografias que Vendem',
        description: 'Técnicas para criar fotos profissionais dos seus produtos',
        duration: '1h 45min',
        lessons: 6,
        level: 'Intermediário',
        progress: 45,
        icon: 'play',
        badge: 'Popular',
      },
      {
        title: 'Estratégias de Precificação',
        description: 'Como definir preços competitivos e lucrativos',
        duration: '3h 15min',
        lessons: 10,
        level: 'Avançado',
        progress: 0,
        icon: 'trending-up',
        badge: 'Premium',
      },
      {
        title: 'Atendimento ao Cliente',
        description: 'Excelência no atendimento para fidelizar compradores',
        duration: '2h 00min',
        lessons: 7,
        level: 'Intermediário',
        progress: 80,
        icon: 'users',
        badge: 'Prático',
      },
    ],
    resourcesTitle: 'Materiais Gratuitos',
    resources: [
      {
        title: 'Guia de SEO para E-commerce',
        type: 'PDF',
        description: 'Como aparecer nas primeiras posições das buscas',
        downloads: '12.5k',
      },
      {
        title: 'Checklist de Lançamento',
        type: 'Planilha',
        description: 'Tudo que você precisa verificar antes de vender',
        downloads: '8.2k',
      },
      {
        title: 'Templates de E-mail Marketing',
        type: 'Kit',
        description: 'Modelos prontos para suas campanhas',
        downloads: '15.7k',
      },
    ],
    webinarsTitle: 'Próximos Webinars',
    webinars: [
      {
        title: 'Vendas Sazonais: Black Friday 2024',
        date: '15 Nov, 19h',
        speaker: 'Maria Silva',
        attendees: 1250,
      },
      {
        title: 'Logística Eficiente para E-commerce',
        date: '22 Nov, 14h',
        speaker: 'João Santos',
        attendees: 890,
      },
      {
        title: 'Marketing Digital para Iniciantes',
        date: '29 Nov, 20h',
        speaker: 'Ana Costa',
        attendees: 1680,
      },
    ],
    achievement: {
      title: 'Torne-se um Vendedor Certificado',
      text:
        'Complete nossos cursos e receba certificados reconhecidos no mercado. Destaque-se da concorrência e ganhe a confiança dos compradores.',
      buttonLabel: 'Ver Programa de Certificação',
    },
  },
};

export default function AcademiaDoVendedorPage() {
  const [content, setContent] = useState(FALLBACK.content);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    contentService
      .get('academia-do-vendedor')
      .then((p) => p?.content && setContent(p.content))
      .catch(() => {});
  }, []);

  const c = content;

  return (
    <main className={styles.page}>
      {/* Breadcrumb */}
      <div className={styles.breadcrumbBar}>
        <div className={styles.bcInner}>
          <Breadcrumb
            items={[
              { label: 'Início', href: '/' },
              { label: 'Academia do Vendedor' },
            ]}
          />
        </div>
      </div>

      <div className={styles.container}>
        {/* Header */}
        <div className={styles.head}>
          <h1>{c.header.title}</h1>
          <p>{c.header.subtitle}</p>
        </div>

        {/* Stats */}
        <div className={styles.stats}>
          {c.stats.map((stat, index) => (
            <div key={index} className={styles.statCard}>
              <div className={`${styles.statValue} ${styles[stat.color] || ''}`}>{stat.value}</div>
              <div className={styles.statLabel}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Featured Courses */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>{c.coursesTitle}</h2>
          <div className={styles.coursesGrid}>
            {c.courses.map((course, index) => (
              <div key={index} className={`${styles.card} ${styles.courseCard}`}>
                <div className={styles.courseHeader}>
                  <div className={styles.courseHeaderMain}>
                    <div className={styles.courseIcon}>{renderIcon(course.icon, 24)}</div>
                    <div>
                      <h3 className={styles.courseTitle}>{course.title}</h3>
                      <p className={styles.courseDesc}>{course.description}</p>
                    </div>
                  </div>
                  <Badge variant={course.badge === 'Premium' ? 'neutral' : 'neutral'}>
                    {course.badge}
                  </Badge>
                </div>

                <div className={styles.courseBody}>
                  <div className={styles.courseMeta}>
                    <span>{course.lessons} aulas</span>
                    <span>{course.duration}</span>
                    <span>{course.level}</span>
                  </div>

                  {course.progress > 0 && (
                    <div className={styles.progressWrap}>
                      <div className={styles.progressHead}>
                        <span>Progresso</span>
                        <span>{course.progress}%</span>
                      </div>
                      <div className={styles.progressTrack}>
                        <div
                          className={styles.progressBar}
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <Button variant="accent" fullWidth>
                    {course.progress > 0 ? 'Continuar Curso' : 'Iniciar Curso'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Resources + Webinars */}
        <div className={styles.twoCol}>
          {/* Resources */}
          <div>
            <h2 className={styles.sectionTitle}>{c.resourcesTitle}</h2>
            <div className={styles.list}>
              {c.resources.map((resource, index) => (
                <div key={index} className={`${styles.card} ${styles.itemCard}`}>
                  <div className={styles.itemRow}>
                    <div className={styles.itemMain}>
                      <div className={`${styles.itemIcon} ${styles.itemIconBrand}`}>
                        <Icon name="bulb" size={24} />
                      </div>
                      <div>
                        <h3 className={styles.itemTitle}>{resource.title}</h3>
                        <p className={styles.itemDesc}>{resource.description}</p>
                        <div className={styles.itemFoot}>
                          <Badge variant="outline" size="sm">{resource.type}</Badge>
                          <span className={styles.itemMuted}>
                            {resource.downloads} downloads
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">Baixar</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Webinars */}
          <div>
            <h2 className={styles.sectionTitle}>{c.webinarsTitle}</h2>
            <div className={styles.list}>
              {c.webinars.map((webinar, index) => (
                <div key={index} className={`${styles.card} ${styles.itemCard}`}>
                  <div className={styles.itemRow}>
                    <div className={styles.itemMain}>
                      <div className={`${styles.itemIcon} ${styles.itemIconBlue}`}>
                        <Play size={24} />
                      </div>
                      <div>
                        <h3 className={styles.itemTitle}>{webinar.title}</h3>
                        <p className={styles.itemDesc}>{webinar.date}</p>
                        <div className={styles.itemFoot}>
                          <span className={styles.itemMuted}>Por {webinar.speaker}</span>
                          <span className={styles.itemBlue}>
                            {webinar.attendees} inscritos
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button className={styles.blueBtn} size="sm">Inscrever-se</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Achievement Section */}
        <div className={styles.achievementWrap}>
          <div className={styles.achievement}>
            <div className={styles.achievementIcon}>
              <Award size={64} />
            </div>
            <h3 className={styles.achievementTitle}>{c.achievement.title}</h3>
            <p className={styles.achievementText}>{c.achievement.text}</p>
            <Button size="lg" className={styles.achievementBtn}>
              {c.achievement.buttonLabel}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
