'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './DashboardLayout.module.css';
import { cx } from '@/lib/cx';
import Badge from '../../atoms/Badge/Badge';
import Icon from '../../atoms/Icon/Icon';
import { useAuth } from '../../providers/AuthProvider';

const ROLES = {
  individual: 'Comprador',
  seller: 'Vendedor',
  admin: 'Admin',
};

const NAV = [
  { key: 'perfil', label: 'Perfil', icon: 'user', href: '/minha-conta', roles: ['individual', 'seller', 'admin'] },
  { key: 'pedidos', label: 'Meus Pedidos', icon: 'package', href: '/minha-conta#pedidos', roles: ['individual', 'seller', 'admin'] },
  { key: 'favoritos', label: 'Favoritos', icon: 'heart', href: '/favoritos', roles: ['individual', 'seller', 'admin'] },
  { key: 'avaliacoes', label: 'Avaliações', icon: 'star', href: '/avaliacoes', roles: ['individual', 'seller', 'admin'] },
  { key: 'vendas', label: 'Minhas Vendas', icon: 'tag', href: '/minhas-vendas', roles: ['seller', 'admin'] },
  { key: 'anunciar', label: 'Anunciar Produto', icon: 'plus', href: '/adicionar-produto', roles: ['seller', 'admin'] },
  { key: 'planos', label: 'Planos e Taxas', icon: 'card', href: '/planos-e-taxas', roles: ['seller', 'admin'] },
  { key: 'admin', label: 'Painel Admin', icon: 'shield', href: '/admin', roles: ['admin'] },
  { key: 'upgrade', label: 'Virar Empresa', icon: 'store', href: '/upgrade-conta', roles: ['individual'] },
];

export default function DashboardLayout({ active, title, children }) {
  const { user } = useAuth();
  const [role, setRole] = useState('seller');
  const displayName = (user && (user.name || user.email)) || 'Visitante';
  const initial = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    const saved = window.localStorage.getItem('fdr.role');
    if (saved) setRole(saved);
  }, []);

  function changeRole(r) {
    setRole(r);
    window.localStorage.setItem('fdr.role', r);
  }

  const items = NAV.filter((n) => n.roles.includes(role));

  return (
    <div className={styles.root}>
      <div className={styles.shell}>
        <div className={styles.container}>
          <aside className={styles.sidebar}>
            <div className={styles.userCard}>
              <span className={styles.avatar}>
                {user && user.avatar_url ? <img src={user.avatar_url} alt="" className={styles.avatarImg} /> : initial}
              </span>
              <div className={styles.userMeta}>
                <strong>{displayName.split(' ')[0]}</strong>
                <span>{(user && user.email) || ''}</span>
                <Badge variant="brand" size="sm" className={styles.roleBadge}>
                  {ROLES[role]}
                </Badge>
              </div>
            </div>

            <nav className={styles.nav}>
              {items.map((n) => (
                <Link key={n.key} href={n.href} className={cx(styles.navItem, active === n.key && styles.navActive)}>
                  <Icon name={n.icon} size={18} />
                  {n.label}
                </Link>
              ))}
              <Link href="/login" className={cx(styles.navItem, styles.signOut)}>
                <Icon name="arrow-left" size={18} /> Sair
              </Link>
            </nav>

            <div className={styles.switcher}>
              <span>Ver como (demo)</span>
              <div className={styles.switchBtns}>
                {Object.entries(ROLES).map(([k, l]) => (
                  <button key={k} className={cx(role === k && styles.switchActive)} onClick={() => changeRole(k)}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <main className={styles.content}>
            {title && <h1 className={styles.pageTitle}>{title}</h1>}
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
