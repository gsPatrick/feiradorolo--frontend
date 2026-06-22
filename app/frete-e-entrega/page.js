'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import { contentService, shipmentService } from '@/lib/api';
import Button from '@/components/atoms/Button/Button';
import Input from '@/components/atoms/Input/Input';
import Icon from '@/components/atoms/Icon/Icon';
import Badge from '@/components/atoms/Badge/Badge';
import { maskCEP } from '@/lib/masks';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

// Ícones ausentes no Icon atom — SVG inline (lucide-style).
function ClockIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function CalculatorIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="8" y1="10" x2="8" y2="10" />
      <line x1="12" y1="10" x2="12" y2="10" />
      <line x1="16" y1="10" x2="16" y2="10" />
      <line x1="8" y1="14" x2="8" y2="14" />
      <line x1="12" y1="14" x2="12" y2="14" />
      <line x1="16" y1="14" x2="16" y2="18" />
      <line x1="8" y1="18" x2="12" y2="18" />
    </svg>
  );
}
function CheckCircleIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
function AlertCircleIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12" y2="16" />
    </svg>
  );
}

const MODALIDADE_ICONS = {
  truck: <Icon name="truck" size={32} />,
  clock: <ClockIcon size={32} />,
  package: <Icon name="package" size={32} />,
};

const FALLBACK = {
  hero: {
    title: 'Frete e Entrega',
    description:
      'Entrega rápida, segura e confiável para todo o Brasil. Escolha a modalidade que melhor atende suas necessidades.',
    calculatorTitle: 'Calcular Frete',
    calculatorPlaceholder: 'Digite seu CEP',
    calculatorButton: 'Calcular Frete',
  },
  modalidadesTitle: 'Modalidades de Entrega',
  modalidades: [
    {
      icon: 'truck',
      iconTone: 'blue',
      title: 'Entrega Padrão',
      description: 'Para todo o Brasil',
      prazo: '3-8 dias úteis',
      preco: 'A partir de R$ 12,90',
      features: ['Rastreamento incluso', 'Seguro até R$ 500', 'Entrega no endereço'],
      badge: 'Mais Popular',
    },
    {
      icon: 'clock',
      iconTone: 'green',
      title: 'Entrega Expressa',
      description: 'Capitais e regiões metropolitanas',
      prazo: '1-2 dias úteis',
      preco: 'A partir de R$ 25,90',
      features: ['Rastreamento em tempo real', 'Seguro até R$ 1000', 'Prioridade máxima'],
      badge: 'Mais Rápido',
    },
    {
      icon: 'package',
      iconTone: 'purple',
      title: 'Retire na Loja',
      description: 'Pontos de retirada parceiros',
      prazo: '2-5 dias úteis',
      preco: 'Grátis',
      features: ['Sem custo adicional', 'Horário flexível', 'Mais de 500 pontos'],
      badge: 'Econômico',
    },
  ],
  modalidadeButton: 'Escolher Esta Opção',
  regioesTitle: 'Prazos de Entrega por Região',
  regioesHeaders: {
    regiao: 'Região',
    estados: 'Estados',
    padrao: 'Entrega Padrão',
    expressa: 'Entrega Expressa',
    disponivel: 'Express Disponível',
  },
  regioes: [
    { regiao: 'Sudeste', estados: 'SP, RJ, MG, ES', prazoMin: '1-3 dias', prazoMax: '3-5 dias', expressa: true },
    { regiao: 'Sul', estados: 'RS, SC, PR', prazoMin: '2-4 dias', prazoMax: '4-6 dias', expressa: true },
    { regiao: 'Centro-Oeste', estados: 'GO, DF, MT, MS', prazoMin: '3-5 dias', prazoMax: '5-7 dias', expressa: false },
    { regiao: 'Nordeste', estados: 'BA, PE, CE, e outros', prazoMin: '4-6 dias', prazoMax: '6-8 dias', expressa: false },
    { regiao: 'Norte', estados: 'AM, PA, AC, e outros', prazoMin: '5-7 dias', prazoMax: '7-10 dias', expressa: false },
  ],
  protecao: {
    title: 'Proteção Total',
    items: [
      'Seguro automático incluído em todas as entregas',
      'Cobertura até o valor do produto',
      'Rastreamento em tempo real',
      'Suporte especializado 24/7',
    ],
  },
  freteGratis: {
    title: 'Frete Grátis',
    items: [
      'Compras acima de R$ 99 (Sudeste/Sul)',
      'Compras acima de R$ 149 (demais regiões)',
      'Produtos com selo especial',
      'Membros do programa fidelidade',
    ],
  },
  faqTitle: 'Perguntas Frequentes',
  faq: [
    {
      pergunta: 'Como é calculado o frete?',
      resposta:
        'O frete é calculado com base no peso, dimensões do produto, distância entre origem e destino, e modalidade escolhida. Utilizamos as melhores transportadoras do mercado para garantir o melhor custo-benefício.',
    },
    {
      pergunta: 'Quando o frete é grátis?',
      resposta:
        "Oferecemos frete grátis para:\n• Compras acima de R$ 99 (Sudeste/Sul)\n• Compras acima de R$ 149 (demais regiões)\n• Produtos elegíveis com selo 'Frete Grátis'\n• Assinantes do nosso programa de fidelidade",
    },
    {
      pergunta: 'Posso alterar o endereço após a compra?',
      resposta:
        "Sim, você pode alterar o endereço de entrega antes do produto ser enviado. Acesse 'Meus Pedidos' ou entre em contato conosco. Após o envio, apenas em casos especiais mediante taxa adicional.",
    },
    {
      pergunta: 'O que acontece se não estiver em casa?',
      resposta:
        'O transportador fará até 3 tentativas de entrega em dias alternados. Você pode:\n• Reagendar a entrega\n• Autorizar entrega com vizinhos\n• Redirecionar para um ponto de retirada\n• Solicitar entrega em horário alternativo',
    },
  ],
  alerta: {
    title: 'Dúvidas sobre entrega?',
    text:
      'Entre em contato conosco através do chat, telefone ou e-mail. Nossa equipe de logística está pronta para ajudar você!',
  },
};

// Mescla recursivamente o conteúdo do banco sobre o FALLBACK, mantendo as chaves
// ausentes (evita crash se o admin editar/remover alguma seção).
function mergeContent(base, over) {
  if (Array.isArray(over)) return over.length ? over : base;
  if (over && typeof over === 'object' && base && typeof base === 'object' && !Array.isArray(base)) {
    const out = { ...base };
    for (const k of Object.keys(over)) out[k] = mergeContent(base[k], over[k]);
    return out;
  }
  return over == null || over === '' ? base : over;
}

export default function FreteEEntregaPage() {
  const [content, setContent] = useState(FALLBACK);

  // Calculadora de frete (estimativa por CEP, pacote padrão 1kg).
  const [cep, setCep] = useState('');
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcOptions, setCalcOptions] = useState(null);
  const [calcError, setCalcError] = useState('');

  async function calcularFrete() {
    const digits = cep.replace(/\D/g, '');
    if (digits.length !== 8) {
      setCalcError('Informe um CEP válido (8 dígitos).');
      setCalcOptions(null);
      return;
    }
    setCalcLoading(true);
    setCalcError('');
    setCalcOptions(null);
    try {
      const res = await shipmentService.quote({ to_zip: digits });
      const opts = Array.isArray(res) ? res : [];
      setCalcOptions(opts);
      if (!opts.length) setCalcError('Nenhuma opção de frete disponível para este CEP.');
    } catch (e) {
      setCalcError(
        e?.code === 'SHIPPING_NOT_CONFIGURED'
          ? 'Cálculo de frete indisponível no momento.'
          : (e?.message || 'Não foi possível calcular o frete agora.')
      );
    } finally {
      setCalcLoading(false);
    }
  }

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    contentService
      .get('frete-e-entrega')
      // Deep-merge com o FALLBACK: se o admin editar e faltar alguma chave/seção,
      // a página não quebra (mantém o padrão para o que faltar).
      .then((p) => p?.content && setContent(mergeContent(FALLBACK, p.content)))
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
            <span className={styles.crumbCurrent}>Frete e Entrega</span>
          </nav>
        </div>
      </div>

      {/* Hero */}
      <div className={styles.hero}>
        <div className={`${styles.container} ${styles.heroInner}`}>
          <h1 className={styles.heroTitle}>{c.hero.title}</h1>
          <p className={styles.heroText}>{c.hero.description}</p>

          {/* Calculadora de Frete */}
          <div className={styles.calc}>
            <h3 className={styles.calcTitle}>
              <CalculatorIcon size={20} />
              {c.hero.calculatorTitle}
            </h3>
            <div className={styles.calcForm}>
              <Input
                placeholder={c.hero.calculatorPlaceholder || 'Digite seu CEP'}
                className={styles.calcInput}
                value={cep}
                inputMode="numeric"
                maxLength={9}
                onChange={(e) => { setCep(maskCEP(e.target.value)); setCalcError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && calcularFrete()}
              />
              <Button className={styles.calcBtn} onClick={calcularFrete} loading={calcLoading}>
                {c.hero.calculatorButton}
              </Button>
            </div>

            {calcError && <p className={styles.calcError}>{calcError}</p>}

            {calcOptions && calcOptions.length > 0 && (
              <div className={styles.calcResults}>
                <p className={styles.calcResultsHint}>Estimativa para um pacote de 1kg:</p>
                <ul className={styles.calcList}>
                  {calcOptions.map((o) => (
                    <li key={o.service_code} className={styles.calcRow}>
                      <span className={styles.calcInfo}>
                        {o.company_picture && (
                          <img
                            src={o.company_picture}
                            alt={o.company || o.service_name}
                            className={styles.calcLogo}
                            loading="lazy"
                          />
                        )}
                        <span className={styles.calcSvcWrap}>
                          <span className={styles.calcSvc}>
                            {o.company ? `${o.company} · ` : ''}{o.service_name}
                          </span>
                          {o.delivery_time != null && (
                            <span className={styles.calcEta}>{o.delivery_time} dias úteis</span>
                          )}
                        </span>
                      </span>
                      <span className={styles.calcPrice}>
                        {o.free_shipping || Number(o.price) === 0 ? 'Grátis' : BRL.format(Number(o.price) || 0)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={`${styles.container} ${styles.content}`}>
        {/* Modalidades */}
        <section className={styles.block}>
          <h2 className={styles.blockTitle}>{c.modalidadesTitle}</h2>
          <div className={styles.modalidadesGrid}>
            {c.modalidades.map((m, i) => (
              <article key={i} className={styles.modalCard}>
                {m.badge && <span className={styles.modalBadge}>{m.badge}</span>}
                <div className={styles.modalHead}>
                  <div className={`${styles.modalIcon} ${styles[m.iconTone] || ''}`}>
                    {MODALIDADE_ICONS[m.icon] || <Icon name="package" size={32} />}
                  </div>
                  <h3 className={styles.modalTitle}>{m.title}</h3>
                  <p className={styles.modalDesc}>{m.description}</p>
                </div>
                <div className={styles.modalBody}>
                  <div className={styles.modalPrazo}>{m.prazo}</div>
                  <div className={styles.modalPreco}>{m.preco}</div>
                  <ul className={styles.modalFeatures}>
                    {m.features.map((f, idx) => (
                      <li key={idx} className={styles.modalFeature}>
                        <span className={styles.featureCheck}>
                          <CheckCircleIcon size={16} />
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button variant="outline" className={styles.modalBtn}>
                    {c.modalidadeButton}
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Prazos por Região */}
        <section className={styles.block}>
          <h2 className={styles.blockTitle}>{c.regioesTitle}</h2>
          <div className={styles.tableCard}>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.thLeft}>{c.regioesHeaders.regiao}</th>
                    <th className={styles.thLeft}>{c.regioesHeaders.estados}</th>
                    <th className={styles.thCenter}>{c.regioesHeaders.padrao}</th>
                    <th className={styles.thCenter}>{c.regioesHeaders.expressa}</th>
                    <th className={styles.thCenter}>{c.regioesHeaders.disponivel}</th>
                  </tr>
                </thead>
                <tbody>
                  {c.regioes.map((r, i) => (
                    <tr key={i} className={styles.tr}>
                      <td className={`${styles.td} ${styles.tdName}`}>{r.regiao}</td>
                      <td className={`${styles.td} ${styles.tdMuted}`}>{r.estados}</td>
                      <td className={`${styles.td} ${styles.tdCenter}`}>{r.prazoMax}</td>
                      <td className={`${styles.td} ${styles.tdCenter}`}>{r.expressa ? r.prazoMin : '-'}</td>
                      <td className={`${styles.td} ${styles.tdCenter}`}>
                        {r.expressa ? (
                          <span className={styles.tableCheck}>
                            <CheckCircleIcon size={20} />
                          </span>
                        ) : (
                          <span className={styles.tableDash}>-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Dicas e Informações */}
        <div className={styles.infoGrid}>
          <article className={`${styles.infoCard} ${styles.infoBlue}`}>
            <h3 className={styles.infoTitle}>
              <span className={styles.infoIconBlue}>
                <Icon name="shield" size={20} />
              </span>
              {c.protecao.title}
            </h3>
            <ul className={styles.infoList}>
              {c.protecao.items.map((item, i) => (
                <li key={i}>• {item}</li>
              ))}
            </ul>
          </article>

          <article className={`${styles.infoCard} ${styles.infoGreen}`}>
            <h3 className={styles.infoTitle}>
              <span className={styles.infoIconGreen}>
                <Icon name="star" size={20} />
              </span>
              {c.freteGratis.title}
            </h3>
            <ul className={styles.infoList}>
              {c.freteGratis.items.map((item, i) => (
                <li key={i}>• {item}</li>
              ))}
            </ul>
          </article>
        </div>

        {/* FAQ */}
        <section className={styles.block}>
          <h2 className={styles.blockTitle}>{c.faqTitle}</h2>
          <div className={styles.faqList}>
            {c.faq.map((item, i) => (
              <article key={i} className={styles.faqCard}>
                <h3 className={styles.faqQuestion}>{item.pergunta}</h3>
                <p className={styles.faqAnswer}>{item.resposta}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Alerta de Contato */}
        <div className={styles.contactAlert}>
          <span className={styles.contactIcon}>
            <AlertCircleIcon size={16} />
          </span>
          <p className={styles.contactText}>
            <strong>{c.alerta.title}</strong> {c.alerta.text}
          </p>
        </div>
      </div>
    </main>
  );
}
