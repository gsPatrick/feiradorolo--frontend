'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { cx } from '@/lib/cx';
import Button from '@/components/atoms/Button/Button';
import Badge from '@/components/atoms/Badge/Badge';
import Icon from '@/components/atoms/Icon/Icon';
import Modal from '@/components/organisms/Modal/Modal';
import PlanCardPayment from '@/components/organisms/PlanCardPayment/PlanCardPayment';
import { contentService, configService, planService, getToken, ApiError } from '@/lib/api';
import { useToast } from '@/components/providers/ToastProvider';
import { useAuth } from '@/components/providers/AuthProvider';

/* ----------------------------------------------------------------
   Conteúdo editável (intro) — vem de contentService('planos-e-taxas').
   As 3 seções funcionais abaixo independem desse conteúdo.
---------------------------------------------------------------- */
const FALLBACK_HEADER = {
  title: 'Planos e Taxas',
  subtitle:
    'Anuncie de graça e pague apenas quando vender. Conheça nossos pacotes de destaque, os níveis de vendedor e as regras das categorias com pacote de publicação.',
  alertStrong: 'Anuncie sem mensalidade:',
  alertText:
    ' você só paga comissão quando uma venda é concluída. Categorias como Imóveis e Veículos usam pacotes de publicação no lugar de comissão.',
};

/* Seção 1 — Pacotes de destaque (impulsionar anúncio). Informativos:
   ativados ao publicar/editar um anúncio (não há checkout aqui). */
const HIGHLIGHTS = [
  {
    name: 'Prata',
    price: 'R$ 7,99',
    period: '/ semana',
    icon: 'shield',
    variant: 'silver',
    iconClass: 'iconSilver',
    description: 'Destaque básico por 1 semana',
    features: [
      'Selo Prata no anúncio',
      'Volta ao topo a cada 3 dias',
      'Mais visualizações que anúncios sem destaque',
    ],
  },
  {
    name: 'Ouro',
    price: 'R$ 14,99',
    period: '/ semana',
    icon: 'star',
    variant: 'gold',
    iconClass: 'iconGold',
    description: 'Visibilidade reforçada por 1 semana',
    badge: 'Mais Popular',
    features: [
      'Selo Ouro no anúncio',
      'Selo "Impulsionado" nos resultados',
      'Mais visibilidade na categoria e nas buscas',
    ],
  },
  {
    name: 'Diamante',
    price: 'R$ 21,99',
    period: '/ semana',
    icon: 'gem',
    variant: 'diamond',
    iconClass: 'iconDiamond',
    description: 'Máxima visibilidade por 1 semana',
    features: [
      'Selo Diamante no anúncio',
      'Volta ao topo diariamente',
      'Galeria Premium na página inicial',
    ],
  },
];

/* Seção 3 — fallback informativo quando a lista de planos vier vazia
   (deslogado, erro, ou catálogo ainda não cadastrado). */
const CATEGORY_FALLBACK = [
  { id: null, name: 'Imóveis', price: 79.9, duration_days: 30, category_id: 'imoveis' },
  { id: null, name: 'Veículos', price: 79.9, duration_days: 30, category_id: 'veiculos' },
];

const BRL = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Extrai o código Pix copia-e-cola de qualquer formato de resposta do gateway. */
function extractPix(res) {
  if (!res) return null;
  const pix = res.pix || res;
  return (
    pix.qr_code ||
    pix.copy_paste ||
    pix.pix_qr_code ||
    (pix.point_of_interaction &&
      pix.point_of_interaction.transaction_data &&
      pix.point_of_interaction.transaction_data.qr_code) ||
    null
  );
}

export default function PlanosETaxas() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();

  const [header, setHeader] = useState(FALLBACK_HEADER);
  const [fees, setFees] = useState(null);

  const [plans, setPlans] = useState(null); // null = carregando; [] = vazio/deslogado
  const [plansAuthed, setPlansAuthed] = useState(false);

  const [subscribing, setSubscribing] = useState(null); // planId em processamento (Pix)
  const [pixCode, setPixCode] = useState(null);

  // Escolha da forma de pagamento (Pix x Cartão) e modal de cartão.
  const [methodPlan, setMethodPlan] = useState(null); // plano escolhendo a forma de pagamento
  const [cardPlan, setCardPlan] = useState(null); // plano pagando com cartão

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Intro editável (não bloqueia a página se falhar).
  useEffect(() => {
    contentService
      .get('planos-e-taxas')
      .then((p) => {
        const h = p && p.content && p.content.header;
        if (h) setHeader((prev) => ({ ...prev, ...h }));
      })
      .catch(() => {});
  }, []);

  // Taxas reais (público).
  useEffect(() => {
    configService
      .fees()
      .then(setFees)
      .catch(() => setFees(null));
  }, []);

  // Planos de categoria (exige login). Deslogado → fallback informativo.
  useEffect(() => {
    if (!getToken()) {
      setPlansAuthed(false);
      setPlans([]);
      return;
    }
    setPlansAuthed(true);
    planService
      .list()
      .then((list) => setPlans(Array.isArray(list) ? list : []))
      .catch(() => setPlans([]));
  }, []);

  const commissionStandard =
    fees && fees.commission_percent != null ? Number(fees.commission_percent) : 10;
  const maxInstallments = fees && fees.max_installments ? Number(fees.max_installments) : null;

  // Níveis de vendedor (comissão) — Standard usa a taxa real do config.
  const tiers = [
    {
      type: 'Standard',
      rate: `${commissionStandard}%`,
      icon: 'store',
      iconClass: 'iconNeutral',
      description: 'Nível padrão de todo vendedor',
      features: [
        `Comissão de ${commissionStandard}% por venda concluída`,
        'Anúncios ilimitados de produtos',
        'Painel do vendedor completo',
        'Recebimento via Mercado Pago',
      ],
    },
    {
      type: 'Premium',
      rate: '12%',
      icon: 'star',
      iconClass: 'iconBrand',
      description: 'Mais visibilidade e benefícios',
      badge: 'Recomendado',
      features: [
        'Comissão de 12% por venda concluída',
        '50% mais visibilidade nas buscas',
        'Selo Premium no perfil de vendedor',
        'Suporte prioritário',
      ],
    },
  ];

  // Planos com categoria (Seção 3). Vazio → fallback informativo.
  const categoryPlans =
    plans && plans.length ? plans.filter((p) => p.category_id != null) : [];
  const showCategoryFallback = !categoryPlans.length;
  const categoryRows = showCategoryFallback ? CATEGORY_FALLBACK : categoryPlans;

  // "Assinar" → abre o seletor de forma de pagamento (Pix x Cartão).
  function handleSubscribe(plan) {
    if (!getToken()) {
      toast({ title: 'Entre na sua conta para assinar um plano.', variant: 'default' });
      router.push('/login?redirect=/planos-e-taxas');
      return;
    }
    if (!plan || !plan.id) return;
    setPixCode(null);
    setMethodPlan(plan);
  }

  // Paga a assinatura com Pix (fluxo original).
  async function subscribeWithPix(plan) {
    if (!plan || !plan.id) return;
    setMethodPlan(null);
    setSubscribing(plan.id);
    setPixCode(null);
    try {
      const res = await planService.subscribe(plan.id);
      const redirect = res && (res.init_point || res.redirect_url || res.checkout_url);
      const pix = extractPix(res);
      if (redirect) {
        toast({ title: 'Redirecionando para o pagamento...', variant: 'success', duration: 2500 });
        window.location.href = redirect;
        return;
      }
      if (pix) {
        setPixCode(pix);
        toast({
          title: 'Pix gerado para a assinatura!',
          description: 'Copie o código Pix abaixo para concluir o pagamento.',
          variant: 'success',
          duration: 5000,
        });
      } else {
        toast({
          title: 'Assinatura criada!',
          description:
            (res && res.note) ||
            'Acompanhe o status do pagamento na sua conta para ativar o plano.',
          variant: 'success',
          duration: 5000,
        });
      }
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'Não foi possível iniciar a assinatura.';
      toast({ title: msg, variant: 'destructive' });
    } finally {
      setSubscribing(null);
    }
  }

  async function copyPix() {
    if (!pixCode) return;
    try {
      await navigator.clipboard.writeText(pixCode);
      toast({ title: 'Código Pix copiado!', variant: 'success', duration: 2500 });
    } catch {
      toast({ title: 'Copie o código manualmente.', variant: 'default' });
    }
  }

  return (
    <main className={styles.page}>
      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <div className={styles.container}>
          <nav className={styles.crumbNav}>
            <Link href="/" className={styles.crumbLink}>Início</Link>
            <Icon name="chevron-left" size={16} className={styles.crumbChevron} />
            <span className={styles.crumbCurrent}>Planos e Taxas</span>
          </nav>
        </div>
      </div>

      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h1>{header.title}</h1>
          <p>{header.subtitle}</p>
        </div>

        {/* Aviso */}
        <div className={styles.alert}>
          <Icon name="sparkle" size={18} className={styles.alertIcon} />
          <p>
            <strong>{header.alertStrong}</strong>{header.alertText}
          </p>
        </div>

        {/* ===== Seção 1 — Destaque de anúncios (impulsionar) ===== */}
        <h2 className={styles.sectionTitle}>Destaque de anúncios</h2>
        <p className={styles.sectionSub}>
          Impulsione a visibilidade de um anúncio por 1 semana. O destaque é ativado ao
          publicar ou editar um anúncio.
        </p>
        <div className={styles.highlightGrid}>
          {HIGHLIGHTS.map((plan) => (
            <div key={plan.name} className={cx(styles.card, plan.badge && styles.cardFeatured)}>
              {plan.badge && (
                <Badge variant={plan.variant} className={styles.cardBadge}>{plan.badge}</Badge>
              )}
              <div className={styles.cardHead}>
                <span className={cx(styles.cardIcon, styles[plan.iconClass])}>
                  <Icon name={plan.icon} size={30} />
                </span>
                <h3>{plan.name}</h3>
                <p className={styles.cardDesc}>{plan.description}</p>
                <div className={styles.priceRow}>
                  <span className={styles.price}>{plan.price}</span>
                  <span className={styles.period}>{plan.period}</span>
                </div>
              </div>
              <ul className={styles.featureList}>
                {plan.features.map((f) => (
                  <li key={f}>
                    <Icon name="check" size={18} className={styles.checkIcon} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                fullWidth
                variant={plan.badge ? 'primary' : 'outline'}
                className={styles.cardCta}
                href="/adicionar-produto"
              >
                Destacar ao anunciar
              </Button>
            </div>
          ))}
        </div>
        <p className={styles.sectionNote}>
          <Icon name="sparkle" size={15} /> Você ativa o destaque ao{' '}
          <Link href="/adicionar-produto" className={styles.inlineLink}>publicar ou editar um anúncio</Link>.
        </p>

        {/* ===== Seção 2 — Níveis de vendedor (comissão) ===== */}
        <h2 className={styles.sectionTitle}>Níveis de vendedor</h2>
        <p className={styles.sectionSub}>
          A comissão é descontada apenas quando uma venda é concluída.
          {maxInstallments ? ` Compras parceláveis em até ${maxInstallments}x.` : ''}
        </p>
        <div className={styles.commissionGrid}>
          {tiers.map((tier) => (
            <div key={tier.type} className={cx(styles.card, tier.badge && styles.cardFeatured)}>
              {tier.badge && (
                <Badge variant="brand" className={styles.cardBadge}>{tier.badge}</Badge>
              )}
              <div className={styles.cardHead}>
                <span className={cx(styles.cardIcon, styles[tier.iconClass])}>
                  <Icon name={tier.icon} size={30} />
                </span>
                <h3>{tier.type}</h3>
                <p className={styles.cardDesc}>{tier.description}</p>
                <div className={styles.priceRow}>
                  <span className={styles.price}>{tier.rate}</span>
                  <span className={styles.period}>por venda</span>
                </div>
              </div>
              <ul className={styles.featureList}>
                {tier.features.map((f) => (
                  <li key={f}>
                    <Icon name="check" size={18} className={styles.checkIcon} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                fullWidth
                variant={tier.badge ? 'primary' : 'outline'}
                className={styles.cardCta}
                href="/adicionar-produto"
              >
                Começar a vender
              </Button>
            </div>
          ))}
        </div>

        {/* ===== Seção 3 — Planos por categoria (Imóveis e Veículos) ===== */}
        <h2 className={styles.sectionTitle}>Planos por categoria</h2>
        <p className={styles.sectionSub}>
          Imóveis e Veículos não cobram comissão sobre a venda. Em vez disso, o anúncio
          exige um pacote de publicação (30, 60 ou 90 dias).
        </p>

        {plans === null ? (
          <div className={styles.stateBox}>
            <Icon name="sparkle" size={20} /> Carregando planos...
          </div>
        ) : (
          <>
            {!plansAuthed && (
              <div className={styles.alert}>
                <Icon name="sparkle" size={18} className={styles.alertIcon} />
                <p>
                  <strong>Valores informativos.</strong>{' '}
                  <Link href="/login?redirect=/planos-e-taxas" className={styles.inlineLink}>
                    Entre na sua conta
                  </Link>{' '}
                  para assinar um pacote de publicação.
                </p>
              </div>
            )}

            <div className={styles.planGrid}>
              {categoryRows.map((plan, i) => (
                <div key={plan.id || `${plan.name}-${i}`} className={styles.planCard}>
                  <div className={styles.planInfo}>
                    <span className={cx(styles.cardIcon, styles.iconBrand)}>
                      <Icon name="package" size={26} />
                    </span>
                    <div>
                      <h3 className={styles.planName}>{plan.name}</h3>
                      <p className={styles.planMeta}>
                        Pacote de {plan.duration_days || 30} dias - sem comissão
                      </p>
                    </div>
                  </div>
                  <div className={styles.planPrice}>
                    <span className={styles.price}>{BRL(plan.price)}</span>
                    <span className={styles.period}>
                      /{(plan.duration_days || 30)} dias
                    </span>
                  </div>
                  <Button
                    fullWidth
                    variant="primary"
                    className={styles.cardCta}
                    loading={subscribing === plan.id}
                    disabled={subscribing != null}
                    onClick={() => handleSubscribe(plan)}
                  >
                    {plansAuthed && plan.id ? 'Assinar' : 'Entrar para assinar'}
                  </Button>
                </div>
              ))}
            </div>

            {pixCode && (
              <div className={styles.pixBox}>
                <h4>
                  <Icon name="check" size={18} className={styles.checkIcon} /> Pix gerado
                </h4>
                <p>Copie o código abaixo e pague no app do seu banco para ativar o plano.</p>
                <code className={styles.pixCode}>{pixCode}</code>
                <Button variant="outline" leftIcon="download" onClick={copyPix}>
                  Copiar código Pix
                </Button>
              </div>
            )}
          </>
        )}

        {/* CTA final */}
        <div className={styles.ctaCard}>
          <span className={styles.ctaIcon}>
            <Icon name="trending-up" size={32} />
          </span>
          <h2>Pronto para começar a vender?</h2>
          <p>Crie seus anúncios gratuitamente e pague apenas quando vender.</p>
          <div className={styles.ctaActions}>
            <Button size="lg" leftIcon="store" href="/adicionar-produto">Anunciar agora</Button>
            <Button size="lg" variant="outline" href="/como-vender">Saber mais</Button>
          </div>
        </div>
      </div>

      {/* Seletor de forma de pagamento (Pix x Cartão) */}
      <Modal
        open={!!methodPlan}
        onClose={() => setMethodPlan(null)}
        size="sm"
        title={
          <span className={styles.modalTitle}>
            <Icon name="package" size={20} />
            Assinar {methodPlan?.name}
          </span>
        }
      >
        <p className={styles.methodLead}>Escolha como deseja pagar o pacote de publicação.</p>
        <div className={styles.methodList}>
          <button
            type="button"
            className={styles.methodOption}
            onClick={() => subscribeWithPix(methodPlan)}
          >
            <span className={styles.methodBadgePix}>PIX</span>
            <span className={styles.methodOptBody}>
              <span className={styles.methodOptName}>Pix</span>
              <span className={styles.methodOptSub}>Pague na hora pelo app do seu banco</span>
            </span>
            <Icon name="chevron-left" size={18} className={styles.methodChevron} />
          </button>
          <button
            type="button"
            className={styles.methodOption}
            onClick={() => {
              const p = methodPlan;
              setMethodPlan(null);
              setCardPlan(p);
            }}
          >
            <Icon name="card" size={24} className={styles.methodCardIcon} />
            <span className={styles.methodOptBody}>
              <span className={styles.methodOptName}>Cartão de crédito</span>
              <span className={styles.methodOptSub}>Ative na hora e renove automaticamente</span>
            </span>
            <Icon name="chevron-left" size={18} className={styles.methodChevron} />
          </button>
        </div>
      </Modal>

      {/* Pagamento com cartão (tokenização Mercado Pago + salvar cartão) */}
      <PlanCardPayment
        open={!!cardPlan}
        plan={cardPlan}
        userCpf={user?.cpf || user?.document || ''}
        onClose={() => setCardPlan(null)}
        onSuccess={() => {
          toast({
            title: 'Assinatura ativada!',
            description: 'Seu plano de categoria já está ativo.',
            variant: 'success',
            duration: 5000,
          });
          // Atualiza a lista de planos para refletir o status, se logado.
          if (getToken()) {
            planService
              .list()
              .then((list) => setPlans(Array.isArray(list) ? list : []))
              .catch(() => {});
          }
        }}
      />
    </main>
  );
}
