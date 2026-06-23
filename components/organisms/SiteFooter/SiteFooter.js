'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './SiteFooter.module.css';
import { cx } from '@/lib/cx';
import Icon from '../../atoms/Icon/Icon';
import { useSiteConfig } from '../../providers/SiteConfigProvider';
import PolicyModal from '../PolicyModal/PolicyModal';

const MORE_COLUMNS = [
  [
    { label: 'Central de Ajuda', href: '/central-de-ajuda' },
    { label: 'Frete e Entrega', href: '/frete-e-entrega' },
    { label: 'Trocas e Devoluções', href: '/trocas-e-devolucoes' },
    { label: 'Garantia', href: '/garantia' },
  ],
  [
    { label: 'Como Vender', href: '/como-vender' },
    { label: 'Planos e Taxas', href: '/planos-e-taxas' },
    { label: 'Academia do Vendedor', href: '/academia-do-vendedor' },
    { label: 'Anunciar Produtos', href: '/anunciar-produtos' },
  ],
  [
    { label: 'Formas de Pagamento', href: '/formas-de-pagamento' },
    { label: 'Quem Somos', href: '/quem-somos' },
    { label: 'Trabalhe Conosco', href: '/trabalhe-conosco' },
  ],
  [
    { label: 'Segurança', href: '/seguranca' },
    { label: 'Acessibilidade', href: '/acessibilidade' },
  ],
];

const DEFAULT_PAYMENT = {
  title: 'Mercado Pago',
  subtitle: 'Pagamento seguro e fácil',
  body: 'Com Mercado Pago, você paga com cartão, boleto ou Pix. Você também pode pagar em até 12x sem cartão com a Linha de Crédito.',
  link_text: 'Como pagar com Mercado Pago',
  link_url: '/como-pagar-com-mercado-pago',
};
const DEFAULT_PROTECTION = {
  title: 'Proteção',
  subtitle: 'Compra protegida',
  body: 'Você não gostou do que comprou? Devolva! No Feira do Rolo não há nada que você não possa fazer, porque você está sempre protegido.',
  link_text: 'Como te protegemos',
  link_url: '/como-te-protegemos',
};
const DEFAULT_LEGAL = [
  { label: 'Política de Privacidade', href: '/politica-de-privacidade' },
  { label: 'Termos de Uso', href: '/termos-de-uso' },
  { label: 'Suporte', href: '/suporte' },
];

export default function SiteFooter() {
  const { getSetting } = useSiteConfig();
  const [moreOpen, setMoreOpen] = useState(false);
  // Modal de política: 'protected' | 'returns' | null
  const [policyKind, setPolicyKind] = useState(null);

  const brand = getSetting('app.name', 'Feira do Rolo');
  const tagline = getSetting(
    'branding.footer_tagline',
    'Sua plataforma de compras online preferida. Milhões de produtos com entrega rápida e segura.'
  );
  const social = getSetting('social.links', {}) || {};
  const pay = getSetting('footer.payment_card', DEFAULT_PAYMENT);
  const prot = getSetting('footer.protection_card', DEFAULT_PROTECTION);
  const legal = getSetting('nav.legal_links', DEFAULT_LEGAL);
  const cnpj = getSetting('branding.company_cnpj', '12.345.678/0001-90');

  const socialIcons = [
    { key: 'facebook', icon: 'facebook', label: 'Facebook' },
    { key: 'instagram', icon: 'instagram', label: 'Instagram' },
  ];

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brandBlock}>
          <h3 className={styles.brand}>{brand}</h3>
          <p className={styles.desc}>{tagline}</p>
          <div className={styles.social}>
            {socialIcons.map((s) => (
              <a
                key={s.key}
                href={social[s.key] || '#'}
                aria-label={s.label}
                target={social[s.key] ? '_blank' : undefined}
                rel="noreferrer"
              >
                <Icon name={s.icon} size={20} />
              </a>
            ))}
          </div>
        </div>

        <div className={styles.cards}>
          <div className={`${styles.card} ${styles.cardPay}`}>
            <div className={styles.cardHead}>
              <span className={`${styles.cardIcon} ${styles.iconPay}`}>
                <img src="/app/mercadopago.png" alt="Mercado Pago" className={styles.payLogo} />
              </span>
              <div>
                <strong>{pay.title}</strong>
                <span>{pay.subtitle}</span>
              </div>
            </div>
            <p className={styles.cardBody}>{pay.body}</p>
            <a href={pay.link_url || '#'} className={`${styles.cardLink} ${styles.linkPay}`}>
              {pay.link_text}
            </a>
          </div>

          <div className={`${styles.card} ${styles.cardSafe}`}>
            <div className={styles.cardHead}>
              <span className={`${styles.cardIcon} ${styles.iconSafe}`}>
                <Icon name="shield" size={22} />
              </span>
              <div>
                <strong>{prot.title}</strong>
                <span>{prot.subtitle}</span>
              </div>
            </div>
            <p className={styles.cardBody}>{prot.body}</p>
            <div className={styles.policyLinks}>
              <button
                type="button"
                className={`${styles.cardLink} ${styles.linkSafe}`}
                onClick={() => setPolicyKind('protected')}
              >
                Compra Protegida
              </button>
              <button
                type="button"
                className={`${styles.cardLink} ${styles.linkSafe}`}
                onClick={() => setPolicyKind('returns')}
              >
                Devolução Grátis
              </button>
            </div>
          </div>
        </div>

        <button
          className={styles.more}
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          aria-expanded={moreOpen}
        >
          Mais informações
          <Icon name="chevron-down" size={18} className={cx(styles.moreCaret, moreOpen && styles.moreCaretOpen)} />
        </button>

        {moreOpen && (
          <div className={styles.moreGrid}>
            {MORE_COLUMNS.map((col, i) => (
              <ul key={i} className={styles.moreCol}>
                {col.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className={styles.moreLink}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        )}
      </div>

      <div className={styles.legal}>
        <div className={styles.legalLinks}>
          <span>CNPJ: {cnpj}</span>
          {legal.map((l) => (
            <Link key={l.href} href={l.href}>
              {l.label}
            </Link>
          ))}
        </div>
        <span className={styles.copy}>
          © {new Date().getFullYear()} {brand} · Todos os direitos reservados.
        </span>
      </div>

      <PolicyModal
        open={policyKind != null}
        kind={policyKind || 'protected'}
        onClose={() => setPolicyKind(null)}
      />
    </footer>
  );
}
