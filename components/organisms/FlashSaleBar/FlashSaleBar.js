'use client';

import { useEffect, useState } from 'react';
import styles from './FlashSaleBar.module.css';
import Icon from '../../atoms/Icon/Icon';
import { useSiteConfig } from '../../providers/SiteConfigProvider';

const pad = (n) => String(n).padStart(2, '0');

function remaining(target) {
  const ms = Math.max(0, new Date(target).getTime() - Date.now());
  const s = Math.floor(ms / 1000);
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

export default function FlashSaleBar() {
  const { getBanners } = useSiteConfig();
  const b = getBanners('home_flash', [])[0];
  const content = (b && b.content) || {};
  // Alvo do cronômetro: ends_at do banner (ou content.ends_at/timer_until).
  const endsAt = (b && b.ends_at) || content.ends_at || content.timer_until || null;
  const staticTimer = content.timer; // fallback estático antigo

  const [t, setT] = useState(null); // null no SSR → evita hydration mismatch
  useEffect(() => {
    if (!endsAt) return;
    setT(remaining(endsAt));
    const id = setInterval(() => setT(remaining(endsAt)), 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  const title = (b && b.title) || 'Flash Sale';
  const desc = (b && b.subtitle) || 'Ofertas relâmpago com até 80% OFF';
  const ctaText = (b && b.cta_text) || 'Ver Todas';
  const href = (b && (b.cta_url || b.link_url)) || '/promocoes';
  const isImage = b && b.background_type === 'image' && b.image_url;
  const bg = b && (b.background_gradient || b.background_color);
  const barStyle = isImage
    ? { backgroundImage: `url(${b.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center', color: b.text_color || '#fff' }
    : bg
    ? { background: bg, color: b.text_color || undefined }
    : undefined;

  let clock = null;
  if (endsAt) {
    const r = t || { days: 0, hours: 0, minutes: 0, seconds: 0 };
    clock = (
      <>
        {r.days > 0 && (
          <>
            <span>{r.days}d</span>
            <i>:</i>
          </>
        )}
        <span>{pad(r.hours)}</span>
        <i>:</i>
        <span>{pad(r.minutes)}</span>
        <i>:</i>
        <span>{pad(r.seconds)}</span>
      </>
    );
  } else if (staticTimer) {
    clock = (
      <>
        <span>{staticTimer.hours}</span>
        <i>:</i>
        <span>{staticTimer.minutes}</span>
        <i>:</i>
        <span>{staticTimer.seconds}</span>
      </>
    );
  }

  return (
    <div className={styles.bar} style={barStyle}>
      <div className={styles.inner}>
        <div className={styles.left}>
          <span className={styles.bolt}>
            <Icon name={(b && b.icon) || 'bolt'} size={20} />
          </span>
          <strong className={styles.title}>{title}</strong>
          <span className={styles.desc}>{desc}</span>
        </div>

        <div className={styles.right}>
          {clock && <div className={styles.timer}>{clock}</div>}
          <a href={href} className={styles.all}>
            {ctaText}
          </a>
        </div>
      </div>
    </div>
  );
}
