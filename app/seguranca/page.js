'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import { contentService } from '@/lib/api';
import Button from '@/components/atoms/Button/Button';
import Icon from '@/components/atoms/Icon/Icon';

// Ícones lucide ausentes no Icon atom — SVG inline.
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
function AlertTriangleIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

// Mapa de ícones (string -> render). Mantém o conteúdo serializável (admin/API).
function MeasureIcon({ name, size = 32 }) {
  if (name === 'shield') return <Icon name="shield" size={size} />;
  if (name === 'lock') return <Icon name="lock" size={size} />;
  if (name === 'eye') return <Icon name="eye" size={size} />;
  if (name === 'file-text') return <FileTextIcon size={size} />;
  return <Icon name="shield" size={size} />;
}

const FALLBACK = {
  content: {
    header: {
      title: 'Segurança e Privacidade',
      subtitle:
        'Sua segurança é nossa prioridade. Conheça as medidas que adotamos para proteger seus dados e garantir transações 100% seguras.',
    },
    promise: {
      strong: 'Compromisso com a Segurança:',
      text:
        'Investimos continuamente em tecnologia e processos para manter seus dados protegidos com os mais altos padrões de segurança.',
    },
    securityMeasures: [
      {
        icon: 'shield',
        color: 'green',
        title: 'Criptografia SSL/TLS',
        description: 'Todos os dados são protegidos com criptografia de última geração',
        details: ['Certificado SSL 256-bit', 'Protocolo TLS 1.3', 'Verificação contínua'],
      },
      {
        icon: 'lock',
        color: 'blue',
        title: 'Autenticação Segura',
        description: 'Sistema robusto de verificação de identidade',
        details: ['Autenticação de dois fatores', 'Senhas criptografadas', 'Bloqueio automático'],
      },
      {
        icon: 'eye',
        color: 'purple',
        title: 'Monitoramento 24/7',
        description: 'Vigilância constante contra ameaças e fraudes',
        details: ['Detecção de anomalias', 'Alertas em tempo real', 'Equipe especializada'],
      },
      {
        icon: 'file-text',
        color: 'orange',
        title: 'Compliance e Auditoria',
        description: 'Conformidade com regulamentações nacionais e internacionais',
        details: ['Certificação PCI DSS', 'LGPD compliance', 'Auditorias regulares'],
      },
    ],
    dataProtectionTitle: 'Proteção de Dados (LGPD)',
    dataProtection: [
      { icon: '📊', title: 'Coleta de Dados', description: 'Coletamos apenas dados necessários para o funcionamento dos serviços' },
      { icon: '🔒', title: 'Armazenamento Seguro', description: 'Dados criptografados em servidores seguros com backup redundante' },
      { icon: '🤝', title: 'Compartilhamento Limitado', description: 'Nunca vendemos seus dados. Compartilhamento apenas quando autorizado' },
      { icon: '⚙️', title: 'Controle do Usuário', description: 'Você pode acessar, editar ou excluir seus dados a qualquer momento' },
    ],
    certifications: {
      title: 'Certificações e Compliance',
      description: 'Atendemos aos mais rigorosos padrões de segurança da indústria',
      items: [
        { icon: '🏆', name: 'PCI DSS Level 1', description: 'Padrão de segurança para cartões' },
        { icon: '📋', name: 'ISO 27001', description: 'Gestão de segurança da informação' },
        { icon: '🔍', name: 'SOC 2 Type II', description: 'Controles de segurança auditados' },
        { icon: '🛡️', name: 'LGPD Compliance', description: 'Proteção de dados pessoais' },
      ],
    },
    userTips: {
      title: 'Dicas de Segurança',
      description: 'Como você pode se proteger online',
      items: [
        { title: 'Use senhas fortes', description: 'Combine letras, números e símbolos. Evite informações pessoais' },
        { title: 'Ative a autenticação de dois fatores', description: 'Adicione uma camada extra de segurança à sua conta' },
        { title: 'Verifique URLs', description: 'Sempre confirme que está no site oficial antes de inserir dados' },
        { title: 'Mantenha-se atualizado', description: 'Use versões atualizadas do navegador e sistema operacional' },
        { title: 'Monitore sua conta', description: 'Verifique regularmente suas transações e atividades' },
        { title: 'Desconfie de phishing', description: 'Nunca forneça dados pessoais por email ou telefone' },
      ],
    },
    incident: {
      title: 'Resposta a Incidentes',
      description: 'Como agimos em caso de problemas de segurança',
      steps: [
        { tone: 'red', title: 'Detecção Imediata', description: 'Sistemas automatizados detectam ameaças em tempo real' },
        { tone: 'orange', title: 'Contenção Rápida', description: 'Isolamento imediato para prevenir propagação' },
        { tone: 'blue', title: 'Investigação Completa', description: 'Análise forense para entender o incidente' },
        { tone: 'green', title: 'Comunicação Transparente', description: 'Notificação imediata aos usuários afetados' },
      ],
    },
    privacyControls: {
      title: 'Controles de Privacidade',
      items: [
        { title: '📊 Seus Dados', description: 'Acesse e visualize todos os dados que temos sobre você', action: 'Baixar Meus Dados' },
        { title: '✏️ Editar Dados', description: 'Corrija ou atualize suas informações pessoais', action: 'Gerenciar Dados' },
        { title: '🗑️ Excluir Conta', description: 'Remova permanentemente sua conta e dados', action: 'Solicitar Exclusão' },
      ],
    },
    contact: {
      title: 'Encontrou um Problema de Segurança?',
      description: 'Relate vulnerabilidades responsavelmente',
      primaryAction: 'Reportar Vulnerabilidade',
      secondaryAction: 'Contatar Equipe de Segurança',
      note: 'Para questões urgentes de segurança: security@feiradojogo.com.br',
    },
  },
};

export default function SegurancaPage() {
  const [content, setContent] = useState(FALLBACK.content);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    contentService
      .get('seguranca')
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
            <span className={styles.crumbCurrent}>Segurança</span>
          </nav>
        </div>
      </div>

      <div className={`${styles.container} ${styles.content}`}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>{content.header.title}</h1>
          <p className={styles.subtitle}>{content.header.subtitle}</p>
        </div>

        {/* Security Promise */}
        <div className={styles.alert}>
          <span className={styles.alertIcon}>
            <Icon name="shield" size={18} />
          </span>
          <span className={styles.alertText}>
            <strong>{content.promise.strong}</strong> {content.promise.text}
          </span>
        </div>

        {/* Security Measures */}
        <section className={styles.block}>
          <h2 className={`${styles.blockTitle} ${styles.blockTitleLeft}`}>Medidas de Segurança</h2>
          <div className={styles.measuresGrid}>
            {content.securityMeasures.map((measure, i) => (
              <article key={i} className={styles.card}>
                <div className={styles.measureHead}>
                  <div className={`${styles.measureIcon} ${styles[measure.color]}`}>
                    <MeasureIcon name={measure.icon} size={32} />
                  </div>
                  <div>
                    <h3 className={styles.cardTitle}>{measure.title}</h3>
                    <p className={styles.cardDesc}>{measure.description}</p>
                  </div>
                </div>
                <div className={styles.detailsList}>
                  {measure.details.map((detail, idx) => (
                    <div key={idx} className={styles.detailItem}>
                      <Icon name="check" size={16} className={styles.detailCheck} />
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Data Protection */}
        <section className={styles.block}>
          <h2 className={`${styles.blockTitle} ${styles.blockTitleLeft}`}>{content.dataProtectionTitle}</h2>
          <div className={styles.protectionGrid}>
            {content.dataProtection.map((item, i) => (
              <article key={i} className={`${styles.card} ${styles.cardCenter}`}>
                <div className={styles.bigEmoji}>{item.icon}</div>
                <h3 className={styles.cardTitle}>{item.title}</h3>
                <p className={styles.cardText}>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Certifications */}
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h3 className={styles.panelTitle}>{content.certifications.title}</h3>
            <p className={styles.panelDesc}>{content.certifications.description}</p>
          </div>
          <div className={styles.certGrid}>
            {content.certifications.items.map((cert, i) => (
              <div key={i} className={styles.certCard}>
                <div className={styles.midEmoji}>{cert.icon}</div>
                <h4 className={styles.certName}>{cert.name}</h4>
                <p className={styles.cardText}>{cert.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Tips + Incident */}
        <div className={styles.twoCols}>
          {/* User Security Tips */}
          <article className={styles.panel}>
            <div className={styles.panelHead}>
              <h3 className={`${styles.panelTitle} ${styles.panelTitleIcon}`}>
                <span className={styles.warnIcon}>
                  <AlertTriangleIcon size={20} />
                </span>
                {content.userTips.title}
              </h3>
              <p className={styles.panelDesc}>{content.userTips.description}</p>
            </div>
            <div className={styles.tipsList}>
              {content.userTips.items.map((tip, i) => (
                <div key={i} className={styles.tipItem}>
                  <span className={styles.tipDot} />
                  <div>
                    <h4 className={styles.tipTitle}>{tip.title}</h4>
                    <p className={styles.tipText}>{tip.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>

          {/* Incident Response */}
          <article className={styles.panel}>
            <div className={styles.panelHead}>
              <h3 className={styles.panelTitle}>{content.incident.title}</h3>
              <p className={styles.panelDesc}>{content.incident.description}</p>
            </div>
            <div className={styles.incidentList}>
              {content.incident.steps.map((step, i) => (
                <div key={i} className={styles.incidentItem}>
                  <div className={`${styles.incidentNum} ${styles[`num_${step.tone}`]}`}>{i + 1}</div>
                  <div>
                    <h4 className={styles.incidentTitle}>{step.title}</h4>
                    <p className={styles.incidentText}>{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>

        {/* Privacy Controls */}
        <section className={styles.block}>
          <h2 className={`${styles.blockTitle} ${styles.blockTitleLeft}`}>{content.privacyControls.title}</h2>
          <div className={styles.controlsGrid}>
            {content.privacyControls.items.map((item, i) => (
              <article key={i} className={styles.panel}>
                <div className={styles.panelHead}>
                  <h3 className={styles.cardTitle}>{item.title}</h3>
                </div>
                <p className={styles.controlText}>{item.description}</p>
                <Button variant="outline" className={styles.controlBtn}>
                  {item.action}
                </Button>
              </article>
            ))}
          </div>
        </section>

        {/* Contact Security Team */}
        <div className={styles.contactWrap}>
          <article className={styles.contactCard}>
            <div className={styles.panelHead}>
              <h3 className={styles.contactTitle}>{content.contact.title}</h3>
              <p className={styles.panelDesc}>{content.contact.description}</p>
            </div>
            <div className={styles.contactActions}>
              <Button className={styles.reportBtn}>{content.contact.primaryAction}</Button>
              <Button variant="outline" className={styles.controlBtn}>
                {content.contact.secondaryAction}
              </Button>
            </div>
            <p className={styles.contactNote}>{content.contact.note}</p>
          </article>
        </div>
      </div>
    </main>
  );
}
