'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import { cx } from '@/lib/cx';
import Button from '@/components/atoms/Button/Button';
import { contentService } from '@/lib/api';

/* Inline lucide SVGs (icons not present in Icon.js) */
function Shield({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    </svg>
  );
}
function Eye({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function Lock({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
function Cookie({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" /><path d="M8.5 8.5v.01" /><path d="M16 15.5v.01" /><path d="M12 12v.01" /><path d="M11 17v.01" /><path d="M7 14v.01" />
    </svg>
  );
}
function Bell({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.268 21a2 2 0 0 0 3.464 0" /><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
    </svg>
  );
}
function Mail({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
function Calendar({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2v4" /><path d="M16 2v4" /><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M3 10h18" />
    </svg>
  );
}
function Printer({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6" /><rect width="12" height="8" x="6" y="14" rx="1" />
    </svg>
  );
}

const ICONS = {
  eye: { Cmp: Eye, cls: 'iconYellow' },
  lock: { Cmp: Lock, cls: 'iconBlue' },
  cookie: { Cmp: Cookie, cls: 'iconPurple' },
  cookieYellow: { Cmp: Cookie, cls: 'iconYellow' },
  shield: { Cmp: Shield, cls: 'iconGreen' },
  bell: { Cmp: Bell, cls: 'iconBlue' },
  mail: { Cmp: Mail, cls: 'iconYellow' },
};

const FALLBACK = {
  updated_at: '',
  intro: {
    icon: 'eye',
    title: 'Compromisso com sua Privacidade',
    text: 'A Feira do Rolo está comprometida em proteger sua privacidade e dados pessoais. Esta política explica como coletamos, usamos e protegemos suas informações quando você usa nossa plataforma de marketplace.',
  },
  sections: [
    {
      icon: 'lock',
      title: 'Informações que Coletamos',
      groups: [
        { subtitle: 'Dados Pessoais:', items: ['Nome completo e endereço de e-mail', 'CPF ou CNPJ para verificação', 'Endereço para entrega', 'Informações de pagamento (processadas com segurança)'] },
        { subtitle: 'Dados de Uso:', items: ['Histórico de navegação e compras', 'Preferências e interações', 'Dados de dispositivo e localização'] },
      ],
    },
    {
      icon: 'cookie',
      title: 'Como Usamos seus Dados',
      columns: [
        { subtitle: 'Funcionalidade:', items: ['Processar pedidos e pagamentos', 'Gerenciar sua conta', 'Fornecer suporte ao cliente'] },
        { subtitle: 'Melhorias:', items: ['Personalizar sua experiência', 'Análise de performance', 'Prevenção de fraudes'] },
      ],
    },
    {
      icon: 'cookieYellow',
      title: 'Política de Cookies',
      paragraphs: ['Utilizamos cookies para melhorar sua experiência. Você pode gerenciar suas preferências de cookies a qualquer momento.'],
      cards: [
        { color: 'green', title: 'Essenciais', text: 'Necessários para funcionamento' },
        { color: 'blue', title: 'Análise', text: 'Melhoria da experiência' },
        { color: 'purple', title: 'Marketing', text: 'Conteúdo relevante' },
      ],
    },
    {
      icon: 'shield',
      title: 'Seus Direitos (LGPD)',
      columns: [
        { items: ['Confirmação de tratamento de dados', 'Acesso aos seus dados', 'Correção de dados incompletos', 'Eliminação de dados desnecessários'] },
        { items: ['Portabilidade dos dados', 'Revogação do consentimento', 'Informações sobre compartilhamento', 'Oposição ao tratamento'] },
      ],
    },
    {
      icon: 'bell',
      highlight: true,
      title: 'Notificações Push',
      paragraphs: ['Com seu consentimento, enviamos notificações push para melhorar sua experiência:'],
      columns: [
        { subtitle: 'Atualizações Importantes:', items: ['Status dos seus pedidos', 'Confirmações de entrega', 'Mensagens de vendedores', 'Alertas de segurança'] },
        { subtitle: 'Ofertas Personalizadas:', items: ['Promoções relevantes', 'Produtos em promoção', 'Lembretes de carrinho', 'Cupons exclusivos'] },
      ],
      note: { strong: 'Controle Total:', text: ' Você pode ativar/desativar notificações a qualquer momento nas configurações do seu navegador ou na sua conta.' },
    },
    {
      icon: 'mail',
      title: 'Entre em Contato',
      paragraphs: ['Para exercer seus direitos ou esclarecer dúvidas sobre esta política:'],
      contacts: [
        { type: 'mail', text: 'privacidade@feiradocrolo.com.br' },
        { type: 'calendar', text: 'Resposta em até 15 dias úteis' },
      ],
    },
  ],
};

function SectionIcon({ name }) {
  const cfg = ICONS[name] || ICONS.shield;
  const Cmp = cfg.Cmp;
  return (
    <span className={cx(styles.secIcon, styles[cfg.cls])}>
      <Cmp size={20} />
    </span>
  );
}

function List({ items }) {
  return (
    <ul className={styles.list}>
      {items.map((it, i) => <li key={i}>{it}</li>)}
    </ul>
  );
}

export default function PoliticaPrivacidadePage() {
  const [content, setContent] = useState(FALLBACK);

  useEffect(() => {
    contentService
      .get('politica-de-privacidade')
      .then((p) => p?.content && setContent(p.content))
      .catch(() => {});
  }, []);

  const updated = content.updated_at || new Date().toLocaleDateString('pt-BR');

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.head}>
          <span className={styles.headIcon}>
            <Shield size={32} />
          </span>
          <h1>Política de Privacidade</h1>
          <p className={styles.updated}>Última atualização: {updated}</p>
        </div>

        <div className={styles.stack}>
          {/* Introdução */}
          {content.intro && (
            <div className={styles.card}>
              <h2><SectionIcon name={content.intro.icon} /> {content.intro.title}</h2>
              <p className={styles.lead}>{content.intro.text}</p>
            </div>
          )}

          {/* Seções */}
          {(content.sections || []).map((sec, idx) => (
            <div key={idx} className={cx(styles.card, sec.highlight && styles.cardHighlight)}>
              <h2><SectionIcon name={sec.icon} /> {sec.title}</h2>

              {sec.paragraphs?.map((p, i) => <p key={i} className={styles.para}>{p}</p>)}

              {sec.groups && (
                <div className={styles.groups}>
                  {sec.groups.map((g, i) => (
                    <div key={i}>
                      {g.subtitle && <h3>{g.subtitle}</h3>}
                      <List items={g.items} />
                    </div>
                  ))}
                </div>
              )}

              {sec.columns && (
                <div className={styles.grid2}>
                  {sec.columns.map((c, i) => (
                    <div key={i}>
                      {c.subtitle && <h3>{c.subtitle}</h3>}
                      <List items={c.items} />
                    </div>
                  ))}
                </div>
              )}

              {sec.cards && (
                <div className={styles.grid3}>
                  {sec.cards.map((c, i) => (
                    <div key={i} className={cx(styles.miniCard, styles[`mc_${c.color}`])}>
                      <h4>{c.title}</h4>
                      <p>{c.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {sec.note && (
                <div className={styles.note}>
                  <p><strong>{sec.note.strong}</strong>{sec.note.text}</p>
                </div>
              )}

              {sec.contacts && (
                <div className={styles.contacts}>
                  {sec.contacts.map((c, i) => (
                    <div key={i} className={styles.contactRow}>
                      {c.type === 'mail' ? <Mail size={16} /> : <Calendar size={16} />}
                      <span>{c.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Rodapé */}
        <div className={styles.footer}>
          <Button variant="outline" href="/" className={styles.footBtn}>Voltar ao Início</Button>
          <Button variant="ghost" onClick={() => window.print()} className={styles.footBtn}>
            <Printer size={18} /> Imprimir Política
          </Button>
        </div>
      </div>
    </main>
  );
}
