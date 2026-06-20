'use client';

import { useState } from 'react';
import styles from './AdminCustomization.module.css';
import { cx } from '@/lib/cx';
import Icon from '../../../atoms/Icon/Icon';
import HeaderPanel from './panels/HeaderPanel';
import HomePanel from './panels/HomePanel';
import FooterPanel from './panels/FooterPanel';
import SocialPanel from './panels/SocialPanel';
import PagesPanel from './panels/PagesPanel';

const SUBTABS = [
  { k: 'header', label: 'Header', icon: 'menu', Comp: HeaderPanel },
  { k: 'home', label: 'Home & Banners', icon: 'grid', Comp: HomePanel },
  { k: 'footer', label: 'Rodapé', icon: 'menu', Comp: FooterPanel },
  { k: 'social', label: 'Redes & Contato', icon: 'chat', Comp: SocialPanel },
  { k: 'pages', label: 'Páginas & FAQ', icon: 'eye', Comp: PagesPanel },
];

export default function AdminCustomization() {
  const [sub, setSub] = useState('header');
  const Current = (SUBTABS.find((s) => s.k === sub) || SUBTABS[0]).Comp;

  return (
    <div className={styles.wrap}>
      <div className={styles.intro}>
        <h2>Personalização</h2>
        <p>
          Edite o conteúdo do site — topbar, menus, banners da home, rodapé, redes sociais e páginas
          institucionais. As alterações são salvas na API e refletem no site público.
        </p>
      </div>

      <nav className={styles.subtabs}>
        {SUBTABS.map((s) => (
          <button
            key={s.k}
            className={cx(styles.subtab, sub === s.k && styles.subtabActive)}
            onClick={() => setSub(s.k)}
          >
            <Icon name={s.icon} size={16} /> {s.label}
          </button>
        ))}
      </nav>

      <div className={styles.panelArea}>
        <Current />
      </div>
    </div>
  );
}
