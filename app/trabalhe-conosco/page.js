'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import { contentService } from '@/lib/api';
import Button from '@/components/atoms/Button/Button';
import Input from '@/components/atoms/Input/Input';
import Textarea from '@/components/atoms/Textarea/Textarea';
import Select from '@/components/atoms/Select/Select';
import Badge from '@/components/atoms/Badge/Badge';
import Icon from '@/components/atoms/Icon/Icon';
import { useToast } from '@/components/providers/ToastProvider';

/* Ícones ausentes no Icon atom — SVG inline (lucide-style). NÃO editar Icon.js. */
function BriefcaseIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}
function HeartIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
function CoffeeIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
      <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4Z" />
      <line x1="6" y1="2" x2="6" y2="4" />
      <line x1="10" y1="2" x2="10" y2="4" />
      <line x1="14" y1="2" x2="14" y2="4" />
    </svg>
  );
}
function GamepadIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="6" y1="11" x2="10" y2="11" />
      <line x1="8" y1="9" x2="8" y2="13" />
      <line x1="15" y1="12" x2="15.01" y2="12" />
      <line x1="18" y1="10" x2="18.01" y2="10" />
      <rect x="2" y="6" width="20" height="12" rx="2" />
    </svg>
  );
}

/* icon (do content) → componente */
const BENEFIT_ICONS = {
  heart: HeartIcon,
  coffee: CoffeeIcon,
  'trending-up': (p) => <Icon name="trending-up" size={p.size} />,
  gamepad: GamepadIcon,
};

const FALLBACK = {
  hero: {
    title: 'Por que a Feira do Rolo?',
    subtitle:
      'Somos uma das startups que mais cresce no Brasil. Aqui você terá a oportunidade de fazer a diferença em um ambiente dinâmico e inovador.',
    cta: 'Ver Vagas Abertas',
  },
  stats: [
    { value: '500+', label: 'Colaboradores', color: 'yellow' },
    { value: '15+', label: 'Escritórios', color: 'blue' },
    { value: '95%', label: 'Satisfação', color: 'green' },
    { value: '4.8', label: 'Glassdoor', color: 'purple' },
  ],
  beneficios: [
    { icon: 'heart', color: 'red', title: 'Plano de Saúde', description: 'Cobertura completa para você e sua família' },
    { icon: 'coffee', color: 'brown', title: 'Trabalho Híbrido', description: 'Flexibilidade para trabalhar de casa ou no escritório' },
    { icon: 'trending-up', color: 'green', title: 'Desenvolvimento', description: 'Cursos, certificações e plano de carreira' },
    { icon: 'gamepad', color: 'purple', title: 'Ambiente Descontraído', description: 'Jogos, eventos e espaços de relaxamento' },
  ],
  departamentos: [
    { name: 'Tecnologia', openings: 8, icon: '💻' },
    { name: 'Produto', openings: 3, icon: '🎯' },
    { name: 'Marketing', openings: 5, icon: '📈' },
    { name: 'Vendas', openings: 6, icon: '💼' },
    { name: 'Atendimento', openings: 4, icon: '🎧' },
    { name: 'Operações', openings: 2, icon: '⚙️' },
  ],
  vagas: [
    { title: 'Desenvolvedor Frontend React', department: 'Tecnologia', level: 'Pleno', location: 'São Paulo/SP', type: 'CLT', description: 'Desenvolvimento de interfaces modernas e responsivas usando React e TypeScript' },
    { title: 'Product Manager', department: 'Produto', level: 'Sênior', location: 'Remote', type: 'CLT', description: 'Liderar estratégia de produto e roadmap de funcionalidades' },
    { title: 'Designer UX/UI', department: 'Design', level: 'Pleno', location: 'São Paulo/SP', type: 'CLT', description: 'Criação de experiências excepcionais para milhões de usuários' },
    { title: 'Analista de Marketing Digital', department: 'Marketing', level: 'Júnior', location: 'Rio de Janeiro/RJ', type: 'CLT', description: 'Gestão de campanhas e análise de performance em canais digitais' },
    { title: 'Engenheiro de Dados', department: 'Tecnologia', level: 'Sênior', location: 'Remote', type: 'CLT', description: 'Arquitetura e implementação de pipelines de dados em grande escala' },
  ],
  cultura: [
    { title: 'Inovação Constante', description: 'Incentivamos ideias criativas e experimentação' },
    { title: 'Crescimento Conjunto', description: 'Seu sucesso é o nosso sucesso - crescemos juntos' },
    { title: 'Diversidade e Inclusão', description: 'Valorizamos diferentes perspectivas e experiências' },
    { title: 'Impacto Real', description: 'Seu trabalho impacta milhões de brasileiros' },
  ],
  processo: [
    { title: 'Candidatura', description: 'Envie seu currículo' },
    { title: 'Triagem', description: 'Análise do perfil' },
    { title: 'Entrevistas', description: 'Conversa com o time' },
    { title: 'Decisão', description: 'Feedback e proposta' },
  ],
  formTitle: 'Candidate-se a uma Vaga',
  formSubtitle: 'Preencha o formulário abaixo e nossa equipe entrará em contato',
};

const EMPTY_FORM = { name: '', email: '', phone: '', position: '', message: '', file: '' };

export default function TrabalheConoscoPage() {
  const { toast } = useToast();
  const [content, setContent] = useState(FALLBACK);

  // Filtros de busca (client-side)
  const [keyword, setKeyword] = useState('');
  const [dept, setDept] = useState('');
  const [loc, setLoc] = useState('');

  // Formulário de candidatura (estático)
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    contentService
      .get('trabalhe-conosco')
      .then((p) => p?.content && setContent(p.content))
      .catch(() => {});
  }, []);

  const vagas = content.vagas || [];
  const beneficios = content.beneficios || [];
  const departamentos = content.departamentos || [];
  const cultura = content.cultura || [];
  const processo = content.processo || [];
  const stats = content.stats || [];

  const deptOptions = useMemo(
    () => [...new Set(vagas.map((v) => v.department))].map((d) => ({ value: d, label: d })),
    [vagas]
  );
  const locOptions = useMemo(
    () => [...new Set(vagas.map((v) => v.location))].map((l) => ({ value: l, label: l })),
    [vagas]
  );
  const positionOptions = useMemo(() => vagas.map((v) => ({ value: v.title, label: v.title })), [vagas]);

  const filtered = useMemo(
    () =>
      vagas.filter((v) => {
        const k = keyword.trim().toLowerCase();
        const matchK =
          !k ||
          v.title.toLowerCase().includes(k) ||
          v.description.toLowerCase().includes(k) ||
          v.department.toLowerCase().includes(k);
        const matchD = !dept || v.department === dept;
        const matchL = !loc || v.location === loc;
        return matchK && matchD && matchL;
      }),
    [vagas, keyword, dept, loc]
  );

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  function applyTo(title) {
    setForm((f) => ({ ...f, position: title }));
    if (typeof document !== 'undefined') {
      document.getElementById('apply-form')?.scrollIntoView({ behavior: 'smooth' });
    }
    toast({ title: `Vaga selecionada: ${title}`, variant: 'success', duration: 2500 });
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.position) {
      toast({ title: 'Preencha nome, e-mail e selecione a vaga.', variant: 'destructive' });
      return;
    }
    toast({
      title: 'Candidatura enviada com sucesso!',
      description: 'Nossa equipe entrará em contato em breve.',
      variant: 'success',
      duration: 3000,
    });
    setForm(EMPTY_FORM);
  }

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
            <span className={styles.crumbCurrent}>Trabalhe Conosco</span>
          </nav>
        </div>
      </div>

      <div className={`${styles.container} ${styles.content}`}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Trabalhe Conosco</h1>
          <p className={styles.subtitle}>
            Venha transformar o e-commerce brasileiro conosco! Oferecemos um ambiente inovador, benefícios incríveis e
            a oportunidade de impactar milhões de vidas.
          </p>
        </div>

        {/* Hero */}
        <div className={styles.hero}>
          <h2 className={styles.heroTitle}>{content.hero?.title}</h2>
          <p className={styles.heroText}>{content.hero?.subtitle}</p>
          <Button size="lg" href="#vagas" className={styles.heroBtn}>
            {content.hero?.cta}
          </Button>
        </div>

        {/* Stats */}
        <div className={styles.statsGrid}>
          {stats.map((s, i) => (
            <article key={i} className={styles.statCard}>
              <div className={`${styles.statValue} ${styles[`stat_${s.color}`] || ''}`}>{s.value}</div>
              <div className={styles.statLabel}>{s.label}</div>
            </article>
          ))}
        </div>

        {/* Benefícios */}
        <section className={styles.block}>
          <h2 className={styles.blockTitle}>Benefícios e Vantagens</h2>
          <div className={styles.benefitsGrid}>
            {beneficios.map((b, i) => {
              const Cmp = BENEFIT_ICONS[b.icon];
              return (
                <article key={i} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div className={`${styles.benefitIcon} ${styles[b.color] || ''}`}>
                      {Cmp ? <Cmp size={32} /> : <BriefcaseIcon size={32} />}
                    </div>
                    <h3 className={styles.cardTitle}>{b.title}</h3>
                  </div>
                  <p className={styles.cardText}>{b.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        {/* Departamentos */}
        <section className={styles.block}>
          <h2 className={`${styles.blockTitle} ${styles.blockTitleLeft}`}>Áreas com Vagas</h2>
          <div className={styles.deptGrid}>
            {departamentos.map((d, i) => (
              <article key={i} className={styles.deptCard}>
                <div className={styles.deptLeft}>
                  <span className={styles.deptEmoji}>{d.icon}</span>
                  <div>
                    <h3 className={styles.deptName}>{d.name}</h3>
                    <p className={styles.deptSub}>{d.openings} vagas abertas</p>
                  </div>
                </div>
                <Badge variant="brand" className={styles.deptBadge}>
                  {d.openings}
                </Badge>
              </article>
            ))}
          </div>
        </section>

        {/* Busca de vagas */}
        <section className={styles.searchCard}>
          <div className={styles.searchHead}>
            <h3 className={styles.searchTitle}>
              <span className={styles.searchTitleIcon}>
                <BriefcaseIcon size={20} />
              </span>
              Buscar Vagas
            </h3>
            <p className={styles.searchDesc}>Encontre a oportunidade perfeita para você</p>
          </div>
          <div className={styles.searchGrid}>
            <Input
              placeholder="Cargo ou palavra-chave"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <Select
              placeholder="Departamento"
              value={dept}
              onChange={(e) => setDept(e.target.value)}
              options={deptOptions}
            />
            <Select
              placeholder="Localização"
              value={loc}
              onChange={(e) => setLoc(e.target.value)}
              options={locOptions}
            />
          </div>
          {(keyword || dept || loc) && (
            <button
              type="button"
              className={styles.clearFilters}
              onClick={() => {
                setKeyword('');
                setDept('');
                setLoc('');
              }}
            >
              Limpar filtros
            </button>
          )}
        </section>

        {/* Vagas disponíveis */}
        <section id="vagas" className={styles.block}>
          <h2 className={`${styles.blockTitle} ${styles.blockTitleLeft}`}>Vagas Disponíveis</h2>
          <div className={styles.vagaList}>
            {filtered.length === 0 ? (
              <p className={styles.empty}>Nenhuma vaga encontrada para os filtros selecionados.</p>
            ) : (
              filtered.map((v, i) => (
                <article key={i} className={styles.vagaCard}>
                  <div className={styles.vagaBody}>
                    <div className={styles.vagaTitleRow}>
                      <h3 className={styles.vagaTitle}>{v.title}</h3>
                      <Badge variant="outline">{v.level}</Badge>
                      <Badge variant="info">{v.type}</Badge>
                    </div>
                    <p className={styles.vagaDesc}>{v.description}</p>
                    <div className={styles.vagaMeta}>
                      <span className={styles.vagaMetaItem}>
                        <BriefcaseIcon size={16} /> {v.department}
                      </span>
                      <span className={styles.vagaMetaItem}>
                        <Icon name="map-pin" size={16} /> {v.location}
                      </span>
                    </div>
                  </div>
                  <Button className={styles.vagaBtn} onClick={() => applyTo(v.title)}>
                    Candidatar-se
                  </Button>
                </article>
              ))
            )}
          </div>
        </section>

        {/* Cultura */}
        <section className={styles.block}>
          <h2 className={styles.blockTitle}>Nossa Cultura</h2>
          <div className={styles.cultureGrid}>
            {cultura.map((c, i) => (
              <article key={i} className={styles.cultureCard}>
                <h3 className={styles.cultureTitle}>{c.title}</h3>
                <p className={styles.cardText}>{c.description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Processo seletivo */}
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h3 className={styles.panelTitle}>Processo Seletivo</h3>
            <p className={styles.panelDesc}>Nosso processo é transparente e focado em suas habilidades</p>
          </div>
          <div className={styles.processGrid}>
            {processo.map((p, i) => (
              <div key={i} className={styles.processStep}>
                <div className={styles.processNum}>{i + 1}</div>
                <h4 className={styles.processTitle}>{p.title}</h4>
                <p className={styles.processText}>{p.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Formulário de candidatura (estático) */}
        <section id="apply-form" className={styles.formCard}>
          <div className={styles.formHead}>
            <h2 className={styles.formTitle}>
              <span className={styles.formTitleIcon}>
                <BriefcaseIcon size={20} />
              </span>
              {content.formTitle || FALLBACK.formTitle}
            </h2>
            <p className={styles.formSubtitle}>{content.formSubtitle || FALLBACK.formSubtitle}</p>
          </div>
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="name">
                  Nome completo *
                </label>
                <Input id="name" placeholder="Seu nome" value={form.name} onChange={setField('name')} />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="email">
                  E-mail *
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="voce@email.com"
                  value={form.email}
                  onChange={setField('email')}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="phone">
                  Telefone
                </label>
                <Input id="phone" placeholder="(11) 99999-9999" value={form.phone} onChange={setField('phone')} />
              </div>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="position">
                  Vaga de interesse *
                </label>
                <Select
                  id="position"
                  placeholder="Selecione uma vaga"
                  value={form.position}
                  onChange={setField('position')}
                  options={positionOptions}
                />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="message">
                Mensagem
              </label>
              <Textarea
                id="message"
                rows={4}
                placeholder="Conte um pouco sobre você e por que quer fazer parte do time..."
                value={form.message}
                onChange={setField('message')}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="file">
                Currículo (anexo opcional)
              </label>
              <Input
                id="file"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setForm((f) => ({ ...f, file: e.target.value }))}
              />
              <p className={styles.fieldHint}>PDF, DOC ou DOCX (até 5MB)</p>
            </div>
            <Button type="submit" size="lg" className={styles.submitBtn}>
              Enviar Candidatura
            </Button>
          </form>
        </section>
      </div>
    </main>
  );
}
