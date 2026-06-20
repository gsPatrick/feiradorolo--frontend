'use client';

import styles from './AppPromo.module.css';
import Icon from '../../atoms/Icon/Icon';
import { useSiteConfig } from '../../providers/SiteConfigProvider';

const FALLBACK_FEATURES = ['Ofertas exclusivas', 'Acompanhe pedidos', 'PIX instantâneo'];

export default function AppPromo() {
  const { getBanners, getSetting } = useSiteConfig();
  const b = getBanners('app_promo', [])[0];
  const content = (b && b.content) || {};

  const title = (b && b.title) || 'Baixe nosso App Feira do Rolo!';
  const sub = (b && b.subtitle) || 'Melhor experiência de compras no seu celular';
  const features = Array.isArray(content.features) && content.features.length ? content.features : FALLBACK_FEATURES;
  const note = content.note || 'Funciona via Expo Go';
  const links = content.store_links || getSetting('app.store_links', { google_play: '#', app_store: '#' });
  const bg = b && b.background_color;

  return (
    <section className={styles.section} style={bg ? { background: bg } : undefined}>
      <div className={styles.inner}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.sub}>{sub}</p>

        <div className={styles.features}>
          {features.map((f) => (
            <div key={f} className={styles.feature}>
              <span className={styles.check}>
                <Icon name="check" size={22} />
              </span>
              <strong>{f}</strong>
            </div>
          ))}
        </div>

        <div className={styles.badges}>
          <a href={links.google_play || '#'} className={styles.badge}>
            <img src="/app/googleplay.png" alt="" className={styles.badgeImg} />
            <span className={styles.badgeText}>
              <small>DISPONÍVEL NO</small>
              <strong>Google Play</strong>
            </span>
          </a>
          <a href={links.app_store || '#'} className={styles.badge}>
            <img src="/app/apple.png" alt="" className={`${styles.badgeImg} ${styles.badgeImgWhite}`} />
            <span className={styles.badgeText}>
              <small>BAIXAR NA</small>
              <strong>App Store</strong>
            </span>
          </a>
        </div>

        <span className={styles.note}>{note}</span>
      </div>
    </section>
  );
}
