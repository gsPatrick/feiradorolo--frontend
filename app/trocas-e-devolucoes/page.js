'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import { contentService } from '@/lib/api';
import Button from '@/components/atoms/Button/Button';
import Icon from '@/components/atoms/Icon/Icon';
import Badge from '@/components/atoms/Badge/Badge';

/* Ícones ausentes no Icon atom — SVG inline (lucide-style). */
function RefreshCwIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" />
    </svg>
  );
}
function ArrowLeftIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
    </svg>
  );
}
function AlertCircleIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" />
    </svg>
  );
}
function CheckCircleIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="M22 4 12 14.01l-3-3" />
    </svg>
  );
}
function FileTextIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" />
      <path d="M16 13H8" /><path d="M16 17H8" /><path d="M10 9H8" />
    </svg>
  );
}
function ClockIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
    </svg>
  );
}
function PackageIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" />
    </svg>
  );
}

const STEP_ICONS = {
  'file-text': FileTextIcon,
  clock: ClockIcon,
  'check-circle': CheckCircleIcon,
  package: PackageIcon,
  'refresh-cw': RefreshCwIcon,
};
const TIPO_ICONS = {
  'refresh-cw': RefreshCwIcon,
  'arrow-left': ArrowLeftIcon,
  'alert-circle': AlertCircleIcon,
};

const FALLBACK = {
  slug: 'trocas-e-devolucoes',
  title: 'Trocas e Devoluções',
  subtitle:
    'Não ficou satisfeito? Sem problemas! Nosso processo de troca e devolução é simples, rápido e totalmente seguro para você.',
  kind: 'content',
  icon: 'refresh-cw',
  content: {
    hero: {
      title: 'Trocas e Devoluções',
      subtitle:
        'Não ficou satisfeito? Sem problemas! Nosso processo de troca e devolução é simples, rápido e totalmente seguro para você.',
      primaryCta: { label: 'Solicitar Troca/Devolução', href: '/conta/pedidos' },
      secondaryCta: { label: 'Rastrear Solicitação', href: '/conta/pedidos' },
    },
    tiposTitle: 'Tipos de Solicitação',
    tipos: [
      {
        icon: 'refresh-cw',
        color: 'blue',
        title: 'Troca',
        description: 'Trocar por outro produto',
        prazo: '30 dias',
        condicoes: ['Produto sem uso', 'Embalagem original', 'Nota fiscal'],
        processo: 'Solicite > Aguarde aprovação > Envie o produto > Receba o novo',
      },
      {
        icon: 'arrow-left',
        color: 'green',
        title: 'Devolução',
        description: 'Reembolso do valor pago',
        prazo: '7 dias',
        condicoes: ['Arrependimento da compra', 'Produto conforme anunciado', 'Embalagem lacrada'],
        processo: 'Solicite > Envie o produto > Aprovação > Reembolso',
      },
      {
        icon: 'alert-circle',
        color: 'red',
        title: 'Defeito',
        description: 'Produto com problemas',
        prazo: '90 dias',
        condicoes: ['Defeito de fabricação', 'Produto diferente do anúncio', 'Avarias no transporte'],
        processo: 'Relate o problema > Análise técnica > Solução imediata',
      },
    ],
    passosTitle: 'Como Funciona',
    passos: [
      { numero: '01', titulo: 'Solicitar', descricao: "Acesse 'Meus Pedidos' e clique em 'Solicitar troca/devolução'", icon: 'file-text', tempo: 'Imediato' },
      { numero: '02', titulo: 'Análise', descricao: 'Nossa equipe analisa sua solicitação em até 24 horas', icon: 'clock', tempo: '24h' },
      { numero: '03', titulo: 'Aprovação', descricao: 'Você recebe uma etiqueta de envio gratuita por e-mail', icon: 'check-circle', tempo: 'Imediato' },
      { numero: '04', titulo: 'Envio', descricao: 'Embale o produto e envie usando nossa etiqueta', icon: 'package', tempo: 'Até você' },
      { numero: '05', titulo: 'Finalização', descricao: 'Processamos sua troca/devolução em até 5 dias úteis', icon: 'refresh-cw', tempo: '5 dias úteis' },
    ],
    categoriasTitle: 'Prazos por Categoria',
    categorias: [
      { categoria: 'Eletrônicos', prazoTroca: '30 dias', prazoDefeito: '90 dias', observacoes: 'Devem estar em embalagem original com todos os acessórios', reembolso: 'Dinheiro ou cartão' },
      { categoria: 'Roupas e Calçados', prazoTroca: '30 dias', prazoDefeito: '90 dias', observacoes: 'Sem sinais de uso, com etiquetas originais', reembolso: 'Dinheiro ou vale-compra' },
      { categoria: 'Casa e Decoração', prazoTroca: '30 dias', prazoDefeito: '90 dias', observacoes: 'Embalagem original preservada', reembolso: 'Dinheiro ou cartão' },
      { categoria: 'Livros e Mídia', prazoTroca: '7 dias', prazoDefeito: '30 dias', observacoes: 'Apenas se lacrados ou com defeito comprovado', reembolso: 'Vale-compra preferencialmente' },
      { categoria: 'Móveis', prazoTroca: '7 dias', prazoDefeito: '1 ano', observacoes: 'Desmontagem por conta do cliente', reembolso: 'Dinheiro (taxa de 10% de restocking)' },
    ],
    faqTitle: 'Perguntas Frequentes',
    faq: [
      {
        pergunta: 'Posso trocar um produto por outro de valor diferente?',
        resposta:
          'Sim! Se o novo produto for mais caro, você paga a diferença. Se for mais barato, devolvemos a diferença em vale-compra ou no cartão usado na compra original.',
      },
      {
        pergunta: 'Quem paga o frete da troca/devolução?',
        resposta:
          '• Defeito ou erro nosso: Frete por nossa conta\n• Troca por tamanho/cor: Frete por nossa conta (primeira troca gratuita)\n• Arrependimento: Frete por conta do cliente\n• Produto danificado no transporte: Frete por nossa conta',
      },
      {
        pergunta: 'Quanto tempo demora para receber o reembolso?',
        resposta:
          '• Cartão de crédito: 1-2 faturas\n• Cartão de débito: 5-10 dias úteis\n• PIX: 1-3 dias úteis\n• Vale-compra: Imediato após aprovação',
      },
      {
        pergunta: 'Posso devolver apenas parte do pedido?',
        resposta:
          'Sim, você pode devolver itens individuais de um pedido. O reembolso será proporcional aos itens devolvidos, e o frete pode ser recalculado se aplicável.',
      },
    ],
    alertas: [
      {
        tone: 'green',
        text: 'Sua primeira troca por tamanho ou cor tem frete gratuito. Queremos que você fique 100% satisfeito com sua compra.',
        strong: 'Primeira troca grátis!',
      },
      {
        tone: 'blue',
        text: 'Você tem o direito de desistir da compra em até 7 dias após o recebimento, conforme Art. 49 do CDC.',
        strong: 'Código de Defesa do Consumidor:',
      },
    ],
  },
};

export default function TrocasEDevolucoesPage() {
  const [content, setContent] = useState(FALLBACK.content);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    contentService
      .get('trocas-e-devolucoes')
      .then((p) => p?.content && setContent(p.content))
      .catch(() => {});
  }, []);

  const c = content || FALLBACK.content;

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
            <span className={styles.crumbCurrent}>Trocas e Devoluções</span>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.container}>
          <h1 className={styles.heroTitle}>{c.hero?.title}</h1>
          <p className={styles.heroSubtitle}>{c.hero?.subtitle}</p>
          <div className={styles.heroActions}>
            {c.hero?.primaryCta && (
              <Button size="lg" href={c.hero.primaryCta.href} className={styles.heroBtnPrimary}>
                {c.hero.primaryCta.label}
              </Button>
            )}
            {c.hero?.secondaryCta && (
              <Button size="lg" variant="outline" href={c.hero.secondaryCta.href} className={styles.heroBtnOutline}>
                {c.hero.secondaryCta.label}
              </Button>
            )}
          </div>
        </div>
      </section>

      <div className={`${styles.container} ${styles.content}`}>
        {/* Tipos de Solicitação */}
        <section className={styles.block}>
          <h2 className={styles.blockTitle}>{c.tiposTitle}</h2>
          <div className={styles.tiposGrid}>
            {(c.tipos || []).map((tipo, i) => {
              const TipoIcon = TIPO_ICONS[tipo.icon] || RefreshCwIcon;
              return (
                <article key={i} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <div className={`${styles.tipoIconWrap} ${styles[tipo.color] || ''}`}>
                      <TipoIcon size={32} />
                    </div>
                    <h3 className={styles.cardTitle}>{tipo.title}</h3>
                    <p className={styles.cardDesc}>{tipo.description}</p>
                    <Badge variant="neutral" className={styles.prazoBadge}>
                      Prazo: {tipo.prazo}
                    </Badge>
                  </div>
                  <div className={styles.cardBody}>
                    <h4 className={styles.subHead}>Condições:</h4>
                    <ul className={styles.condList}>
                      {(tipo.condicoes || []).map((cond, idx) => (
                        <li key={idx} className={styles.condItem}>
                          <span className={styles.condIcon}>
                            <CheckCircleIcon size={16} />
                          </span>
                          {cond}
                        </li>
                      ))}
                    </ul>
                    <h4 className={styles.subHead}>Processo:</h4>
                    <p className={styles.processo}>{tipo.processo}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Como Funciona */}
        <section className={styles.block}>
          <h2 className={styles.blockTitle}>{c.passosTitle}</h2>
          <div className={styles.steps}>
            {(c.passos || []).map((passo, i) => {
              const StepIcon = STEP_ICONS[passo.icon] || FileTextIcon;
              return (
                <div key={i} className={styles.stepRow}>
                  <div className={styles.stepNumber}>{passo.numero}</div>
                  <div className={styles.stepMain}>
                    <div className={styles.stepHead}>
                      <h3 className={styles.stepTitle}>{passo.titulo}</h3>
                      <Badge variant="neutral" className={styles.stepBadge}>
                        {passo.tempo}
                      </Badge>
                    </div>
                    <p className={styles.stepText}>{passo.descricao}</p>
                  </div>
                  <div className={styles.stepGlyph}>
                    <StepIcon size={24} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Prazos por Categoria */}
        <section className={styles.block}>
          <h2 className={styles.blockTitle}>{c.categoriasTitle}</h2>
          <div className={styles.tableCard}>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.thLeft}>Categoria</th>
                    <th className={styles.thCenter}>Troca</th>
                    <th className={styles.thCenter}>Defeito</th>
                    <th className={styles.thLeft}>Observações</th>
                    <th className={styles.thCenter}>Reembolso</th>
                  </tr>
                </thead>
                <tbody>
                  {(c.categorias || []).map((p, i) => (
                    <tr key={i} className={styles.tr}>
                      <td className={styles.tdName}>{p.categoria}</td>
                      <td className={`${styles.tdCenter} ${styles.tdTroca}`}>{p.prazoTroca}</td>
                      <td className={`${styles.tdCenter} ${styles.tdDefeito}`}>{p.prazoDefeito}</td>
                      <td className={styles.tdObs}>{p.observacoes}</td>
                      <td className={styles.tdCenter}>{p.reembolso}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className={styles.block}>
          <h2 className={styles.blockTitle}>{c.faqTitle}</h2>
          <div className={styles.faqList}>
            {(c.faq || []).map((item, i) => (
              <article key={i} className={styles.faqCard}>
                <h3 className={styles.faqQ}>{item.pergunta}</h3>
                <p className={styles.faqA}>{item.resposta}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Alertas */}
        <div className={styles.alerts}>
          {(c.alertas || []).map((al, i) => (
            <div key={i} className={`${styles.alert} ${styles[`alert_${al.tone}`]}`}>
              <span className={styles.alertIcon}>
                {al.tone === 'green' ? <CheckCircleIcon size={18} /> : <AlertCircleIcon size={18} />}
              </span>
              <p className={styles.alertText}>
                {al.strong && <strong>{al.strong}</strong>} {al.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
