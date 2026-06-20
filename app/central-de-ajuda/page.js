'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import { cx } from '@/lib/cx';
import { contentService } from '@/lib/api';
import Button from '@/components/atoms/Button/Button';
import Input from '@/components/atoms/Input/Input';
import Icon from '@/components/atoms/Icon/Icon';
import Badge from '@/components/atoms/Badge/Badge';

/* ── Ícones ausentes no Icon atom — SVG inline (lucide 24x24, stroke currentColor) ── */
function PhoneIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}
function RefreshIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" />
    </svg>
  );
}
function ClockIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
    </svg>
  );
}
function HelpIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" />
    </svg>
  );
}

/* Resolve um ícone (nome do Icon atom ou fallback inline) */
function HelpGlyph({ name, size = 24 }) {
  if (name === 'phone') return <PhoneIcon size={size} />;
  if (name === 'refresh') return <RefreshIcon size={size} />;
  return <Icon name={name || 'package'} size={size} />;
}

const FALLBACK = {
  hero: {
    title: 'Como podemos ajudar você?',
    subtitle:
      'Nossa central de ajuda está aqui para resolver suas dúvidas rapidamente. Encontre respostas ou fale diretamente conosco.',
    searchPlaceholder: 'Digite sua dúvida aqui...',
  },
  quickActions: [
    { icon: 'package', color: 'blue', title: 'Rastrear Pedido', description: 'Acompanhe o status do seu pedido', action: 'Rastrear' },
    { icon: 'refresh', color: 'green', title: 'Trocas e Devoluções', description: 'Solicite troca ou devolução', action: 'Solicitar' },
    { icon: 'card', color: 'purple', title: 'Minhas Compras', description: 'Histórico de pedidos e faturas', action: 'Ver Histórico' },
    { icon: 'user', color: 'orange', title: 'Minha Conta', description: 'Gerenciar dados pessoais', action: 'Acessar' },
  ],
  faqTitle: 'Perguntas Frequentes',
  categories: [
    {
      title: 'Pedidos e Entregas',
      icon: 'truck',
      count: 12,
      questions: [
        { question: 'Como rastrear meu pedido?', answer: "Acesse 'Meus Pedidos' na sua conta ou use o código de rastreamento enviado por email. Você receberá atualizações em tempo real sobre o status da entrega." },
        { question: 'Qual o prazo de entrega?', answer: 'Os prazos variam conforme a região e modalidade:\n• Região Sudeste: 2-5 dias úteis\n• Demais regiões: 3-8 dias úteis\n• Entrega expressa: 1-2 dias úteis (disponível em capitais)' },
        { question: 'Posso alterar o endereço de entrega?', answer: "Sim, você pode alterar o endereço antes do produto ser enviado. Acesse 'Meus Pedidos' e clique em 'Alterar Endereço' ou entre em contato conosco." },
        { question: 'O que fazer se não estiver em casa na entrega?', answer: 'O transportador fará até 3 tentativas de entrega. Você pode reagendar através do código de rastreamento ou autorizar a entrega com vizinhos.' },
      ],
    },
    {
      title: 'Pagamentos',
      icon: 'card',
      count: 8,
      questions: [
        { question: 'Quais formas de pagamento vocês aceitam?', answer: 'Aceitamos:\n• PIX (aprovação instantânea)\n• Cartões de crédito (até 12x sem juros)\n• Boleto bancário (até 3 dias para compensar)\n• Débito online' },
        { question: 'É seguro fazer compras online?', answer: 'Sim! Usamos criptografia SSL 256 bits e somos certificados PCI DSS. Seus dados ficam protegidos e não armazenamos informações sensíveis do cartão.' },
        { question: 'Como funciona o PIX?', answer: 'No PIX, o pagamento é aprovado na hora! Escolha PIX no checkout, escaneie o QR Code ou copie o código, e pronto. Seu pedido será liberado automaticamente.' },
      ],
    },
    {
      title: 'Produtos',
      icon: 'package',
      count: 15,
      questions: [
        { question: 'Como encontrar produtos específicos?', answer: 'Use nossa busca avançada com filtros por categoria, preço, marca e avaliações. Você também pode navegar pelas categorias ou usar as sugestões personalizadas.' },
        { question: 'Como saber se um produto é original?', answer: "Todos os produtos são verificados pelos nossos vendedores parceiros. Procure pelo selo 'Produto Verificado' e leia as avaliações de outros compradores." },
        { question: 'Posso reservar um produto?', answer: 'Sim! Adicione ao carrinho para reservar por 30 minutos ou use a lista de desejos para acompanhar produtos de interesse.' },
      ],
    },
    {
      title: 'Conta e Cadastro',
      icon: 'user',
      count: 6,
      questions: [
        { question: 'Como criar uma conta?', answer: "Clique em 'Cadastrar' no topo da página, preencha seus dados básicos e confirme seu email. É rápido e gratuito!" },
        { question: 'Esqueci minha senha, como recuperar?', answer: "Na página de login, clique em 'Esqueci minha senha', digite seu email e siga as instruções enviadas para redefinir." },
        { question: 'Como alterar meus dados pessoais?', answer: "Acesse 'Minha Conta' > 'Dados Pessoais' para atualizar informações como nome, telefone, CPF e endereços." },
      ],
    },
  ],
  contactTitle: 'Fale Conosco',
  contactMethods: [
    { icon: 'chat', color: 'green', title: 'Chat Online', description: 'Atendimento instantâneo com nossos consultores', time: '24h por dia, 7 dias por semana', action: 'Iniciar Chat', badge: 'Mais Rápido' },
    { icon: 'phone', color: 'blue', title: 'Central de Atendimento', description: '0800 123 4567 (ligação gratuita)', time: 'Segunda a Sexta: 8h às 22h | Sábado: 8h às 18h', action: 'Ligar Agora', badge: null },
    { icon: 'mail', color: 'purple', title: 'E-mail Especializado', description: 'suporte@feiradorolo.com.br', time: 'Resposta garantida em até 4 horas', action: 'Enviar E-mail', badge: 'Detalhado' },
  ],
  tip: 'Para um atendimento mais rápido, tenha em mãos o número do seu pedido, CPF cadastrado e descrição detalhada da sua dúvida.',
  statsTitle: 'Nossos Números',
  stats: [
    { value: '98%', label: 'Satisfação dos clientes', color: 'blue' },
    { value: '2min', label: 'Tempo médio de resposta', color: 'green' },
    { value: '24/7', label: 'Atendimento online', color: 'purple' },
    { value: '50k+', label: 'Dúvidas resolvidas', color: 'orange' },
  ],
};

export default function CentralDeAjudaPage() {
  const [content, setContent] = useState(FALLBACK);
  const [activeTab, setActiveTab] = useState(0);
  const [openItem, setOpenItem] = useState(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
    contentService
      .get('central-de-ajuda')
      .then((p) => p?.content && setContent(p.content))
      .catch(() => {});
  }, []);

  const categories = content.categories || [];
  const active = categories[activeTab] || categories[0] || { questions: [] };

  // Busca client-side: filtra perguntas/respostas da categoria ativa
  const q = query.trim().toLowerCase();
  const visibleQuestions = useMemo(() => {
    const list = active.questions || [];
    if (!q) return list;
    return list.filter(
      (item) =>
        item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q)
    );
  }, [active, q]);

  function toggleItem(i) {
    setOpenItem((cur) => (cur === i ? null : i));
  }

  return (
    <main className={styles.page}>
      {/* Breadcrumb */}
      <div className={styles.breadcrumbBar}>
        <div className={styles.container}>
          <nav className={styles.breadcrumb}>
            <Link href="/" className={styles.crumbLink}>Início</Link>
            <Icon name="arrow-right" size={16} className={styles.crumbSep} />
            <span className={styles.crumbCurrent}>Central de Ajuda</span>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.container}>
          <h1 className={styles.heroTitle}>{content.hero?.title}</h1>
          <p className={styles.heroSubtitle}>{content.hero?.subtitle}</p>
          <form className={styles.searchWrap} onSubmit={(e) => e.preventDefault()}>
            <Input
              leftIcon="search"
              type="text"
              placeholder={content.hero?.searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={styles.searchInput}
              wrapperClassName={styles.searchField}
            />
            <Button type="submit" className={styles.searchBtn}>Buscar</Button>
          </form>
        </div>
      </section>

      <div className={cx(styles.container, styles.content)}>
        {/* Ações Rápidas */}
        <section className={styles.block}>
          <h2 className={styles.blockTitle}>Ações Rápidas</h2>
          <div className={styles.quickGrid}>
            {(content.quickActions || []).map((action, i) => (
              <article key={i} className={styles.quickCard}>
                <div className={cx(styles.quickIcon, styles[action.color])}>
                  <HelpGlyph name={action.icon} size={32} />
                </div>
                <h3 className={styles.quickTitle}>{action.title}</h3>
                <p className={styles.quickDesc}>{action.description}</p>
                <Button variant="outline" size="sm" className={styles.quickBtn}>
                  {action.action}
                </Button>
              </article>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className={styles.block}>
          <h2 className={styles.blockTitle}>{content.faqTitle}</h2>
          <div className={styles.faqWrap}>
            <div className={styles.tabs} role="tablist">
              {categories.map((cat, i) => (
                <button
                  key={cat.title}
                  role="tab"
                  aria-selected={activeTab === i}
                  className={cx(styles.tab, activeTab === i && styles.tabActive)}
                  onClick={() => {
                    setActiveTab(i);
                    setOpenItem(null);
                  }}
                >
                  <HelpGlyph name={cat.icon} size={20} />
                  <span className={styles.tabLabel}>{cat.title}</span>
                  <Badge variant="neutral" size="sm" className={styles.tabBadge}>{cat.count}</Badge>
                </button>
              ))}
            </div>

            <div className={styles.accordion}>
              {visibleQuestions.length === 0 && (
                <p className={styles.noResults}>Nenhuma pergunta encontrada para “{query}”.</p>
              )}
              {visibleQuestions.map((item, i) => {
                const isOpen = openItem === i;
                return (
                  <div key={i} className={styles.accItem}>
                    <button
                      className={styles.accTrigger}
                      aria-expanded={isOpen}
                      onClick={() => toggleItem(i)}
                    >
                      <span className={styles.accQuestion}>{item.question}</span>
                      <Icon
                        name="chevron-down"
                        size={18}
                        className={cx(styles.accChevron, isOpen && styles.accChevronOpen)}
                      />
                    </button>
                    {isOpen && <div className={styles.accAnswer}>{item.answer}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Contato */}
        <section className={styles.block}>
          <h2 className={styles.blockTitle}>{content.contactTitle}</h2>
          <div className={styles.contactGrid}>
            {(content.contactMethods || []).map((method, i) => (
              <article key={i} className={styles.contactCard}>
                <div className={cx(styles.contactIcon, styles[method.color])}>
                  <HelpGlyph name={method.icon} size={24} />
                </div>
                <div className={styles.contactTitleRow}>
                  <h3 className={styles.contactName}>{method.title}</h3>
                  {method.badge && (
                    <Badge variant="success" size="sm">{method.badge}</Badge>
                  )}
                </div>
                <p className={styles.contactDesc}>{method.description}</p>
                <div className={styles.contactTime}>
                  <ClockIcon size={15} />
                  <span>{method.time}</span>
                </div>
                <Button fullWidth className={styles.contactBtn}>{method.action}</Button>
              </article>
            ))}
          </div>
        </section>

        {/* Dica */}
        <div className={styles.tip}>
          <span className={styles.tipIcon}><HelpIcon size={18} /></span>
          <p className={styles.tipText}>
            <strong>Dica:</strong> {content.tip}
          </p>
        </div>

        {/* Estatísticas */}
        <section className={cx(styles.block, styles.statsBlock)}>
          <h2 className={styles.blockTitle}>{content.statsTitle}</h2>
          <div className={styles.statsGrid}>
            {(content.stats || []).map((stat, i) => (
              <div key={i} className={styles.stat}>
                <div className={cx(styles.statValue, styles[`text_${stat.color}`])}>{stat.value}</div>
                <div className={styles.statLabel}>{stat.label}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
