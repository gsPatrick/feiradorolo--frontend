'use client';

import styles from './QuickAccessCards.module.css';
import Icon from '../../atoms/Icon/Icon';
import { useSiteConfig } from '../../providers/SiteConfigProvider';

// Fallback (cor/soft em hex para casar com os CSS vars).
const FALLBACK = [
  { color: '#2563eb', soft: '#dbeafe', icon: 'eye', title: 'Visto Recentemente', desc: 'Reveja produtos que você visitou', cta: 'Ver histórico', href: '/historico' },
  { color: '#16a34a', soft: '#dcfce7', icon: 'map-pin', title: 'Produtos Perto de Você', desc: 'Encontre vendedores próximos', cta: 'Inserir localização', href: '/proximos' },
  { color: '#ea580c', soft: '#ffedd5', icon: 'dollar', title: 'Menos de R$100', desc: 'Produtos com preços baixos', cta: 'Mostrar produtos', href: '/promocoes' },
  { color: '#7c3aed', soft: '#ede9fe', icon: 'trending-up', title: 'Mais Vendidos', desc: 'Produtos favoritos dos clientes', cta: 'Ver mais vendidos', href: '/promocoes' },
  { color: '#dc2626', soft: '#fee2e2', icon: 'card', title: '50% de Desconto', desc: 'Ofertas imperdíveis', cta: 'Ver promoções', href: '/promocoes' },
  { color: '#0d9488', soft: '#ccfbf1', icon: 'truck', title: 'Frete Grátis', desc: 'Compras acima de R$150', cta: 'Como funciona', href: '/frete-e-entrega' },
];

function toCard(b) {
  const content = b.content || {};
  return {
    color: b.background_color || b.text_color || '#2563eb',
    soft: content.soft || '#eef2ff',
    icon: b.icon || 'tag',
    title: b.title,
    desc: b.subtitle,
    cta: b.cta_text,
    href: b.cta_url || b.link_url || '#',
  };
}

export default function QuickAccessCards() {
  const { getBanners } = useSiteConfig();
  const apiCards = getBanners('home_strip', []);
  const cards = apiCards.length ? apiCards.map(toCard) : FALLBACK;

  return (
    <div className={styles.grid}>
      {cards.map((c) => (
        <div
          key={c.title}
          className={styles.card}
          style={{ '--c': c.color, '--c-soft': c.soft, '--c-border': c.soft }}
        >
          <span className={styles.iconWrap}>
            <Icon name={c.icon} size={24} />
          </span>
          <h3 className={styles.title}>{c.title}</h3>
          <p className={styles.desc}>{c.desc}</p>
          <a href={c.href} className={styles.cta}>
            {c.cta}
          </a>
        </div>
      ))}
    </div>
  );
}
