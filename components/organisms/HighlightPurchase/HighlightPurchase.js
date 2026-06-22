'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './HighlightPurchase.module.css';
import { cx } from '@/lib/cx';
import Button from '@/components/atoms/Button/Button';
import Icon from '@/components/atoms/Icon/Icon';
import Spinner from '@/components/atoms/Spinner/Spinner';
import HighlightBadge from '@/components/atoms/HighlightBadge/HighlightBadge';
import { productService, paymentService, ApiError } from '@/lib/api';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const DATE_FMT = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

/* Metadados visuais e de marketing de cada tier. O nome/preço/duração vêm do
 * backend; aqui enriquecemos o visual e descrevemos os benefícios reais do modelo.
 * `boostFreq` é a frase da rotação "volta ao topo"; `perks` reflete cada tier. */
const TIER_META = {
  silver: {
    icon: '🥈',
    accent: 'silver',
    tagline: 'Comece a se destacar',
    boostFreq: 'Volta ao topo a cada 3 dias',
    perks: [
      { icon: 'gem', text: 'Selo Prata visível na busca' },
      { icon: 'trending-up', text: 'Volta ao topo da lista a cada 3 dias' },
      { icon: 'bolt', text: 'Mais cliques e visitas no anúncio' },
    ],
  },
  gold: {
    icon: '🥇',
    accent: 'gold',
    popular: true,
    tagline: 'O favorito de quem vende rápido',
    boostFreq: 'Selo Impulsionado em destaque',
    perks: [
      { icon: 'gem', text: 'Selo Ouro + selo "Impulsionado"' },
      { icon: 'star', text: 'Visibilidade premium na busca' },
      { icon: 'eye', text: 'Aparece com mais frequência aos compradores' },
    ],
  },
  diamond: {
    icon: '💎',
    accent: 'diamond',
    tagline: 'Máxima exposição possível',
    boostFreq: 'Volta ao topo todo dia',
    perks: [
      { icon: 'gem', text: 'Selo Diamante de prestígio' },
      { icon: 'trending-up', text: 'Volta ao topo da lista todo dia' },
      { icon: 'sparkle', text: 'Aparece na Galeria Premium da home' },
      { icon: 'eye', text: 'Máxima exposição em toda a plataforma' },
    ],
  },
};

/* Frase amigável da duração: trata semanas exatas ("1 semana"), senão dias. */
function durationLabel(days) {
  const d = Number(days);
  if (!d || d < 1) return '';
  if (d === 7) return '1 semana';
  if (d === 14) return '2 semanas';
  if (d === 30) return '1 mês';
  if (d % 7 === 0) return `${d / 7} semanas`;
  return `${d} dias`;
}

/* Fallback usado se o endpoint público de pacotes ainda não existir no backend. */
const FALLBACK_PACKAGES = [
  { tier: 'silver', name: 'Prata', price: 7.99, duration_days: 7 },
  { tier: 'gold', name: 'Ouro', price: 14.99, duration_days: 15 },
  { tier: 'diamond', name: 'Diamante', price: 29.99, duration_days: 30 },
];

const TIER_ORDER = { silver: 0, gold: 1, diamond: 2 };

function friendlyError(err, fallback = 'Algo deu errado. Tente novamente.') {
  if (err instanceof ApiError) {
    if (err.code === 'PAYMENT_NOT_CONFIGURED') {
      return 'O pagamento ainda não está disponível para este vendedor. Tente novamente mais tarde.';
    }
    if (err.code === 'NETWORK') return 'Sem conexão com o servidor. Verifique sua internet.';
    return err.message || fallback;
  }
  return fallback;
}

/**
 * Fluxo completo de compra de destaque (Prata/Ouro/Diamante) para um produto.
 * Etapas: escolha do tier → pagamento Pix (QR + copia-e-cola, com polling) →
 * sucesso. Trata erros com mensagens amigáveis e estados de loading.
 *
 * Props:
 *  - productId, productName
 *  - onClose(): fecha o fluxo
 *  - onPaid(): chamado quando o destaque é ativado (pagamento aprovado)
 */
export default function HighlightPurchase({ productId, productName, onClose, onPaid }) {
  // step: 'choose' | 'pay' | 'success'
  const [step, setStep] = useState('choose');
  const [packages, setPackages] = useState(null); // null = carregando
  const [selected, setSelected] = useState(null); // pacote escolhido

  const [creating, setCreating] = useState(false); // gerando pagamento
  const [pix, setPix] = useState(null); // { qr_code, qr_code_base64, ticket_url }
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [activation, setActivation] = useState(null); // { starts_at, ends_at } se a API trouxer
  const pollRef = useRef(null);

  // Busca os pacotes ao montar (com fallback estático em caso de erro).
  useEffect(() => {
    let active = true;
    productService
      .highlightPackages()
      .then((list) => {
        if (!active) return;
        const arr = Array.isArray(list) && list.length ? list : FALLBACK_PACKAGES;
        setPackages([...arr].sort((a, b) => (TIER_ORDER[a.tier] ?? 9) - (TIER_ORDER[b.tier] ?? 9)));
      })
      .catch(() => {
        if (active) setPackages(FALLBACK_PACKAGES);
      });
    return () => {
      active = false;
    };
  }, []);

  // Para o polling ao desmontar.
  useEffect(() => () => stopPolling(), []);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function startPolling(paymentId) {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const p = await paymentService.getById(paymentId);
        const s = String(p?.status || '').toLowerCase();
        if (s === 'paid' || s === 'approved' || s === 'authorized') {
          stopPolling();
          // Aproveita datas de ativação se o pagamento já trouxer o destaque ativo.
          const h = p?.highlight || p?.metadata?.highlight;
          if (h?.starts_at || h?.ends_at) {
            setActivation({ starts_at: h.starts_at || null, ends_at: h.ends_at || null });
          }
          setStep('success');
          setPix(null);
          if (typeof onPaid === 'function') onPaid();
        } else if (s === 'rejected' || s === 'cancelled') {
          stopPolling();
          setPix(null);
          setStep('choose');
          setSelected(null);
          setError('O pagamento não foi aprovado. Escolha um destaque e tente novamente.');
        }
      } catch {
        /* erro transitório no polling — segue tentando */
      }
    }, 4000);
  }

  async function choose(pkg) {
    if (creating) return;
    setSelected(pkg);
    setCreating(true);
    setError('');
    try {
      const res = await productService.highlight(productId, { tier: pkg.tier });
      const pixData = res?.pix || null;
      const paymentId = res?.payment?.id;
      const h = res?.highlight;
      if (h?.starts_at || h?.ends_at) {
        setActivation({ starts_at: h.starts_at || null, ends_at: h.ends_at || null });
      } else {
        setActivation(null);
      }
      if (!pixData || !paymentId) {
        // Gateway pode não estar configurado (retorna note + pagamento pendente).
        setStep('pay');
        setPix(null);
        setError(
          res?.note ||
            'O pagamento foi registrado, mas o Pix ainda não pôde ser gerado. Tente novamente em instantes.'
        );
        return;
      }
      setPix(pixData);
      setStep('pay');
      startPolling(paymentId);
    } catch (err) {
      setSelected(null);
      setError(friendlyError(err, 'Não foi possível iniciar o pagamento do destaque.'));
    } finally {
      setCreating(false);
    }
  }

  async function copyPix() {
    if (!pix?.qr_code) return;
    try {
      await navigator.clipboard.writeText(pix.qr_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Não foi possível copiar o código. Copie manualmente.');
    }
  }

  function backToChoose() {
    stopPolling();
    setPix(null);
    setSelected(null);
    setError('');
    setActivation(null);
    setStep('choose');
  }

  /* ----------------------------- Sucesso ----------------------------- */
  if (step === 'success') {
    const meta = selected ? TIER_META[selected.tier] || {} : {};
    const durTxt = selected ? durationLabel(selected.duration_days) : '';
    const startsTxt = activation?.starts_at ? DATE_FMT.format(new Date(activation.starts_at)) : null;
    const endsTxt = activation?.ends_at ? DATE_FMT.format(new Date(activation.ends_at)) : null;
    return (
      <div className={styles.root}>
        <div className={styles.success}>
          <div className={styles.successIcon}>🎉</div>
          <h3 className={styles.successTitle}>Destaque ativado!</h3>
          <p className={styles.successText}>
            {productName ? `"${productName}"` : 'Seu anúncio'} já está impulsionado e aparece com
            mais destaque. Aproveite a visibilidade extra para vender mais rápido.
          </p>

          {selected && (
            <div className={cx(styles.successCard, styles[meta.accent])}>
              <div className={styles.successCardHead}>
                <HighlightBadge tier={selected.tier} className={styles.successFlowBadge} />
                <span className={styles.successLive}>
                  <span className={styles.liveDot} /> Ativo agora
                </span>
              </div>
              <dl className={styles.successDetails}>
                <div>
                  <dt>Plano</dt>
                  <dd>Destaque {selected.name}</dd>
                </div>
                {durTxt && (
                  <div>
                    <dt>Duração</dt>
                    <dd>{durTxt}</dd>
                  </div>
                )}
                {startsTxt && (
                  <div>
                    <dt>Início</dt>
                    <dd>{startsTxt}</dd>
                  </div>
                )}
                {endsTxt && (
                  <div>
                    <dt>Termina em</dt>
                    <dd>{endsTxt}</dd>
                  </div>
                )}
              </dl>
              <p className={styles.successSummary}>
                <Icon name="check" size={15} />{' '}
                {endsTxt
                  ? `Impulsionado de ${startsTxt || 'hoje'} até ${endsTxt}.`
                  : `Ativo agora${
                      selected.duration_days ? ` por ${selected.duration_days} dias` : ''
                    }, começando neste instante.`}
              </p>
            </div>
          )}

          <Button onClick={onClose} className={styles.successBtn}>Concluir</Button>
        </div>
      </div>
    );
  }

  /* ---------------------------- Pagamento ---------------------------- */
  if (step === 'pay') {
    return (
      <div className={styles.root}>
        <div className={styles.payHead}>
          <button type="button" className={styles.backLink} onClick={backToChoose}>
            <Icon name="arrow-left" size={16} /> Trocar destaque
          </button>
          {selected && (
            <div className={styles.paySummary}>
              <span className={styles.payTierIcon}>{TIER_META[selected.tier]?.icon || '✨'}</span>
              <div className={styles.paySummaryBody}>
                <strong>Destaque {selected.name}</strong>
                {durationLabel(selected.duration_days) && (
                  <span className={styles.paySummaryDur}>
                    Impulsionado por {durationLabel(selected.duration_days)}, a partir da confirmação
                  </span>
                )}
              </div>
              <span className={styles.payAmount}>{BRL.format(selected.price)}</span>
            </div>
          )}
        </div>

        {error && (
          <div className={styles.errorBox}>
            <Icon name="sparkle" size={16} /> <span>{error}</span>
          </div>
        )}

        <div className={styles.pixBox}>
          {pix?.qr_code_base64 ? (
            <div className={styles.pixQr}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`data:image/png;base64,${pix.qr_code_base64}`} alt="QR Code Pix" />
            </div>
          ) : (
            <div className={styles.pixQrPlaceholder}>
              <Spinner size={28} />
              <span>Gerando Pix…</span>
            </div>
          )}

          <div className={styles.pixInfo}>
            <p className={styles.pixLead}>
              <span className={styles.pulse} /> Aguardando pagamento
            </p>
            <p className={styles.pixHint}>
              Escaneie o QR Code no app do seu banco ou use o código copia-e-cola. A ativação é
              automática assim que o pagamento for confirmado.
            </p>
            {pix?.qr_code && (
              <>
                <code className={styles.pixCode}>{pix.qr_code}</code>
                <div className={styles.pixActions}>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={copied ? 'check' : 'pix'}
                    onClick={copyPix}
                  >
                    {copied ? 'Copiado!' : 'Copiar código Pix'}
                  </Button>
                  {pix.ticket_url && (
                    <Button variant="ghost" size="sm" href={pix.ticket_url} target="_blank" rel="noopener noreferrer">
                      Abrir no banco
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------- Escolha do tier ------------------------- */
  return (
    <div className={styles.root}>
      {error && (
        <div className={styles.errorBox}>
          <Icon name="sparkle" size={16} /> <span>{error}</span>
        </div>
      )}

      {packages === null ? (
        <div className={styles.loading}>
          <Spinner size={32} />
          <span>Carregando pacotes de destaque…</span>
        </div>
      ) : (
        <>
          <p className={styles.chooseIntro}>
            Escolha um destaque e pague com Pix. Seu anúncio é impulsionado pelo período do plano,
            <strong> começando agora</strong> — quanto maior o tier, mais exposição e mais cliques.
          </p>

          <div className={styles.tierGrid}>
            {packages.map((pkg) => {
              const meta = TIER_META[pkg.tier] || {};
              const busy = creating && selected?.tier === pkg.tier;
              const durTxt = durationLabel(pkg.duration_days);
              return (
                <button
                  key={pkg.tier}
                  type="button"
                  className={cx(styles.tierCard, styles[meta.accent], meta.popular && styles.tierPopular)}
                  disabled={creating}
                  onClick={() => choose(pkg)}
                >
                  {meta.popular && <span className={styles.popularBadge}>Mais popular</span>}

                  <span className={styles.tierIcon}>{meta.icon || '✨'}</span>
                  <span className={styles.tierName}>{pkg.name}</span>
                  {meta.tagline && <span className={styles.tierTagline}>{meta.tagline}</span>}

                  <span className={styles.tierPrice}>{BRL.format(pkg.price)}</span>
                  {durTxt ? (
                    <span className={styles.tierDuration}>
                      por {durTxt}
                      {pkg.duration_days ? ` (${pkg.duration_days} dias)` : ''}
                    </span>
                  ) : null}

                  {meta.boostFreq && (
                    <span className={styles.tierBoost}>
                      <Icon name="rocket" size={13} /> {meta.boostFreq}
                    </span>
                  )}

                  <ul className={styles.perks}>
                    {(meta.perks || []).map((perk) => (
                      <li key={perk.text}>
                        <Icon name={perk.icon || 'check'} size={14} /> {perk.text}
                      </li>
                    ))}
                  </ul>

                  {durTxt && (
                    <span className={styles.tierAfter}>
                      Após o pagamento: anúncio impulsionado por {durTxt}, começando na hora.
                    </span>
                  )}

                  <span className={cx(styles.tierCta, busy && styles.tierCtaBusy)}>
                    {busy ? (
                      <>
                        <Spinner size={16} /> Gerando…
                      </>
                    ) : (
                      'Destacar agora'
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
