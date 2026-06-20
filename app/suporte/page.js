'use client';

import { useEffect, useState } from 'react';
import styles from './page.module.css';
import { contentService } from '@/lib/api';
import { useToast } from '@/components/providers/ToastProvider';
import Button from '@/components/atoms/Button/Button';
import Input from '@/components/atoms/Input/Input';
import Textarea from '@/components/atoms/Textarea/Textarea';
import Select from '@/components/atoms/Select/Select';
import Icon from '@/components/atoms/Icon/Icon';
import Badge from '@/components/atoms/Badge/Badge';

// Ícones ausentes no Icon atom — SVG inline (lucide-style).
function PhoneIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}
function ClockIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function HelpCircleIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12" y2="17" />
    </svg>
  );
}
function RefreshIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

// Renderiza ícone por nome (Icon atom) com fallback para SVG inline.
function NamedIcon({ name, size = 32 }) {
  if (name === 'phone') return <PhoneIcon size={size} />;
  if (name === 'refresh') return <RefreshIcon size={size} />;
  return <Icon name={name} size={size} />;
}

const FALLBACK = {
  hero: {
    title: 'Central de Suporte',
    subtitle: 'Estamos aqui para ajudar você! Encontre respostas ou entre em contato conosco.',
  },
  canais: [
    { icon: 'chat', title: 'Chat Online', description: 'Atendimento imediato', badge: 'Online' },
    { icon: 'phone', title: 'Telefone', description: '(11) 3000-0000', extra: 'Seg-Sex 8h às 18h' },
    { icon: 'mail', title: 'E-mail', description: 'suporte@feiraorolo.com.br', extra: 'Resposta em 24h' },
  ],
  formTitle: 'Envie sua Mensagem',
  formSubtitle: 'Preencha o formulário abaixo e nossa equipe entrará em contato',
  categorias: [
    { value: 'pedido', label: 'Problemas com Pedido' },
    { value: 'pagamento', label: 'Dúvidas sobre Pagamento' },
    { value: 'entrega', label: 'Questões de Entrega' },
    { value: 'devolucao', label: 'Devolução/Troca' },
    { value: 'conta', label: 'Problemas na Conta' },
    { value: 'vendedor', label: 'Quero ser Vendedor' },
    { value: 'outro', label: 'Outro Assunto' },
  ],
  faqTitle: 'Perguntas Frequentes',
  faqSubtitle: 'Veja se sua dúvida já foi respondida',
  faq: [
    { q: 'Como posso rastrear meu pedido?', a: "Você pode rastrear seu pedido na área 'Meus Pedidos' ou através do código de rastreamento enviado por email.", categoria: 'Pedidos' },
    { q: 'Qual o prazo para devolução?', a: 'Você tem até 7 dias corridos para solicitar a devolução conforme o Código de Defesa do Consumidor.', categoria: 'Devoluções' },
    { q: 'Como me tornar um vendedor?', a: "Acesse a área 'Vender' no menu principal e siga o processo de cadastro de vendedor.", categoria: 'Vendas' },
    { q: 'Quais formas de pagamento aceitas?', a: 'Aceitamos cartões de crédito, débito, PIX, boleto bancário e parcelamento em até 12x.', categoria: 'Pagamentos' },
    { q: 'Como alterar dados da minha conta?', a: "Acesse 'Minha Conta' > 'Dados Pessoais' para atualizar suas informações.", categoria: 'Conta' },
    { q: 'Taxa de entrega é grátis?', a: 'A taxa de entrega varia conforme o vendedor, localização e valor do pedido. Alguns vendedores oferecem frete grátis.', categoria: 'Entrega' },
  ],
  horario: {
    title: 'Horário de Atendimento',
    linhas: [
      { dia: 'Segunda a Sexta', horas: '8h às 18h' },
      { dia: 'Sábado', horas: '9h às 15h' },
      { dia: 'Domingo', horas: 'Fechado' },
    ],
  },
  links: {
    title: 'Links Úteis',
    items: [
      { icon: 'cart', label: 'Meus Pedidos', href: '/meus-pedidos' },
      { icon: 'card', label: 'Formas de Pagamento', href: '/politica-privacidade' },
      { icon: 'truck', label: 'Política de Entrega', href: '#' },
      { icon: 'refresh', label: 'Trocas e Devoluções', href: '#' },
    ],
  },
  denuncias: {
    title: 'Denúncias',
    description: 'Para denunciar produtos suspeitos ou vendedores fraudulentos:',
    email: 'denuncia@feiraorolo.com.br',
  },
};

export default function SuportePage() {
  const { toast } = useToast();
  const [content, setContent] = useState(FALLBACK);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    categoria: '',
    assunto: '',
    mensagem: '',
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    contentService
      .get('suporte')
      .then((p) => p?.content && setContent(p.content))
      .catch(() => {});
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    toast({
      title: 'Mensagem enviada com sucesso!',
      description: 'Nossa equipe entrará em contato em breve.',
      variant: 'success',
    });
    setFormData({ nome: '', email: '', categoria: '', assunto: '', mensagem: '' });
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.head}>
          <Button variant="ghost" size="sm" leftIcon="arrow-left" href="/" className={styles.back}>
            Voltar ao início
          </Button>
          <h1 className={styles.title}>{content.hero.title}</h1>
          <p className={styles.subtitle}>{content.hero.subtitle}</p>
        </div>

        <div className={styles.grid}>
          {/* Main column */}
          <div className={styles.main}>
            {/* Quick contact */}
            <div className={styles.canais}>
              {content.canais.map((canal, i) => (
                <div key={i} className={styles.canalCard}>
                  <span className={styles.canalIcon}>
                    <NamedIcon name={canal.icon} size={32} />
                  </span>
                  <h3 className={styles.canalTitle}>{canal.title}</h3>
                  <p className={styles.canalDesc}>{canal.description}</p>
                  {canal.badge ? (
                    <Badge variant="success" className={styles.canalBadge}>
                      {canal.badge}
                    </Badge>
                  ) : (
                    canal.extra && <p className={styles.canalExtra}>{canal.extra}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Contact form */}
            <div className={styles.card}>
              <div className={styles.cardHead}>
                <h2 className={styles.cardTitle}>{content.formTitle}</h2>
                <p className={styles.cardDesc}>{content.formSubtitle}</p>
              </div>
              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Nome Completo</label>
                    <Input
                      type="text"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>E-mail</label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Categoria</label>
                    <Select
                      placeholder="Selecione uma categoria"
                      value={formData.categoria}
                      onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                      options={content.categorias}
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Assunto</label>
                    <Input
                      type="text"
                      value={formData.assunto}
                      onChange={(e) => setFormData({ ...formData, assunto: e.target.value })}
                      placeholder="Descreva brevemente o problema"
                      required
                    />
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>Mensagem</label>
                  <Textarea
                    value={formData.mensagem}
                    onChange={(e) => setFormData({ ...formData, mensagem: e.target.value })}
                    placeholder="Descreva detalhadamente sua dúvida ou problema..."
                    rows={4}
                    required
                  />
                </div>

                <Button type="submit" fullWidth className={styles.submitBtn}>
                  Enviar Mensagem
                </Button>
              </form>
            </div>

            {/* FAQ */}
            <div className={styles.card}>
              <div className={styles.cardHead}>
                <h2 className={styles.cardTitle}>{content.faqTitle}</h2>
                <p className={styles.cardDesc}>{content.faqSubtitle}</p>
              </div>
              <div className={styles.faqList}>
                {content.faq.map((item, i) => (
                  <div key={i} className={styles.faqItem}>
                    <span className={styles.faqIcon}>
                      <HelpCircleIcon size={20} />
                    </span>
                    <div className={styles.faqBody}>
                      <h4 className={styles.faqQuestion}>{item.q}</h4>
                      <p className={styles.faqAnswer}>{item.a}</p>
                      {item.categoria && (
                        <Badge variant="outline" size="sm" className={styles.faqBadge}>
                          {item.categoria}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <aside className={styles.sidebar}>
            {/* Service hours */}
            <div className={styles.card}>
              <div className={styles.cardHead}>
                <h2 className={`${styles.cardTitle} ${styles.cardTitleIcon}`}>
                  <ClockIcon size={20} />
                  {content.horario.title}
                </h2>
              </div>
              <div className={styles.horarioList}>
                {content.horario.linhas.map((linha, i) => (
                  <div key={i} className={styles.horarioRow}>
                    <span className={styles.horarioDia}>{linha.dia}</span>
                    <span className={styles.horarioHoras}>{linha.horas}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick links */}
            <div className={styles.card}>
              <div className={styles.cardHead}>
                <h2 className={styles.cardTitle}>{content.links.title}</h2>
              </div>
              <div className={styles.linksList}>
                {content.links.items.map((link, i) => (
                  <a key={i} href={link.href} className={styles.linkItem}>
                    <NamedIcon name={link.icon} size={16} />
                    {link.label}
                  </a>
                ))}
              </div>
            </div>

            {/* Denúncias */}
            <div className={`${styles.card} ${styles.denunciaCard}`}>
              <div className={styles.cardHead}>
                <h2 className={`${styles.cardTitle} ${styles.denunciaTitle}`}>
                  {content.denuncias.title}
                </h2>
              </div>
              <p className={styles.denunciaText}>{content.denuncias.description}</p>
              <Button
                variant="ghost"
                fullWidth
                href={`mailto:${content.denuncias.email}`}
                className={styles.denunciaBtn}
              >
                {content.denuncias.email}
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
