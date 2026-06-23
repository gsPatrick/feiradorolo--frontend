'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './Header.module.css';
import { cx } from '@/lib/cx';
import { searchRoute, categoryRoute } from '@/lib/searchRoute';
import Icon from '../../atoms/Icon/Icon';
import SearchBar from '../../molecules/SearchBar/SearchBar';
import AddressSelectionModal from '../AddressSelectionModal/AddressSelectionModal';
import { useCart } from '../../providers/CartProvider';
import { useSiteConfig } from '../../providers/SiteConfigProvider';
import { useAuth } from '../../providers/AuthProvider';
import { useFavorites } from '../../providers/FavoritesProvider';
import { categoryService, notificationService, addressService } from '@/lib/api';
import { getSocket } from '@/lib/socket';

const NAV = [
  { label: 'Pneus', href: '/pneus' },
  { label: 'Ofertas', href: '/promocoes' },
  { label: 'Cupons', href: '/cupons' },
  { label: 'Casa & Jardim', href: '/categoria/casa-e-decoracao' },
  { label: 'Moda', href: '/categoria/roupas-femininas' },
  { label: 'Baixe nosso app', href: '/aplicativo' },
];

const ILogout = (p) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" />
  </svg>
);

const CEP_KEY = 'fdr.cep';
const CITY_KEY = 'fdr.city';

function timeAgo(value) {
  if (!value) return '';
  const ts = new Date(value).getTime();
  if (Number.isNaN(ts)) return '';
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `${minutes} min atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  return `${days}d atrás`;
}

/* Mapeia o endereço real da API para o formato esperado pelo AddressSelectionModal. */
function toModalAddress(a) {
  return {
    id: a.id,
    cep: a.zip_code || a.cep || '',
    street: a.street || '',
    number: a.number || '',
    neighborhood: a.neighborhood || '',
    city: a.city || '',
    state: a.state || '',
    isDefault: !!(a.is_default ?? a.isDefault),
  };
}

export default function Header({ favCount = 0 }) {
  const { totalItems, openCart } = useCart();
  const { getSetting } = useSiteConfig();
  const { openAuth, user, logout } = useAuth();
  const { openLoginPrompt } = useFavorites();
  const router = useRouter();

  const topbarMessage = getSetting('branding.topbar_message', 'Frete grátis a partir de R$ 79 | Parcelamos em até 12x');
  const navConfig = getSetting('nav.primary_menu', NAV);
  // Garante o atalho da vertical de Pneus mesmo quando o menu vem do config remoto.
  const navItems = Array.isArray(navConfig) && navConfig.some((n) => n.href === '/pneus')
    ? navConfig
    : [{ label: 'Pneus', href: '/pneus' }, ...(Array.isArray(navConfig) ? navConfig : [])];

  // CEP / endereço
  const [city, setCity] = useState('');
  const [cepOpen, setCepOpen] = useState(false);

  // Categorias
  const [catsOpen, setCatsOpen] = useState(false);
  const [cats, setCats] = useState([]);
  const [expandedCat, setExpandedCat] = useState(null);
  const catsRef = useRef(null);

  // Menu do usuário (logado)
  const [userOpen, setUserOpen] = useState(false);
  const userRef = useRef(null);
  const isAdmin = !!(user && (user.is_admin || user.admin_role));

  // Notificações (logado)
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);
  const unreadCount = notifications.filter((n) => n.status !== 'read').length;

  // Endereços reais (logado) para o modal de CEP
  const [addresses, setAddresses] = useState([]);

  useEffect(() => {
    try {
      const savedCity = window.localStorage.getItem(CITY_KEY);
      if (savedCity) setCity(savedCity);
    } catch {}
  }, []);

  function handleConfirmCep(payload) {
    if (!payload) return;
    setCity(payload.city);
    try {
      window.localStorage.setItem(CEP_KEY, payload.cep);
      window.localStorage.setItem(CITY_KEY, payload.city);
      window.dispatchEvent(new CustomEvent('cep-updated', { detail: payload }));
    } catch {}
  }

  useEffect(() => {
    function onDoc(e) {
      if (catsRef.current && !catsRef.current.contains(e.target)) {
        setCatsOpen(false);
        setExpandedCat(null);
      }
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    }
    if (catsOpen || userOpen || notifOpen) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [catsOpen, userOpen, notifOpen]);

  // Carrega notificações e endereços reais quando logado.
  const loadNotifications = useCallback(async () => {
    try {
      const list = await notificationService.listMine('?limit=20');
      setNotifications(Array.isArray(list) ? list : []);
    } catch {
      setNotifications([]);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setAddresses([]);
      return;
    }
    loadNotifications();
    (async () => {
      try {
        const list = await addressService.list();
        setAddresses(Array.isArray(list) ? list.map(toModalAddress) : []);
      } catch {
        setAddresses([]);
      }
    })();
  }, [user, loadNotifications]);

  // Entrega em tempo real via socket (push in-app) — funciona mesmo sem provider.
  useEffect(() => {
    if (!user) return undefined;
    const socket = getSocket();
    if (!socket) return undefined;
    const onNew = (n) => {
      if (!n) return;
      setNotifications((prev) =>
        prev.some((x) => x.id === n.id) ? prev : [{ ...n, status: 'sent' }, ...prev].slice(0, 20)
      );
    };
    socket.on('notification:new', onNew);
    return () => socket.off('notification:new', onNew);
  }, [user]);

  async function handleNotifClick(n) {
    if (n.status !== 'read') {
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, status: 'read' } : x)));
      try {
        await notificationService.markRead(n.id);
      } catch {}
    }
  }

  async function handleMarkAllRead() {
    try {
      await notificationService.markAllRead();
    } catch {}
    loadNotifications();
  }

  async function openCategories() {
    setCatsOpen((v) => !v);
    if (!cats.length) {
      try {
        const tree = await categoryService.tree();
        setCats(Array.isArray(tree) ? tree.slice(0, 18) : []);
      } catch {}
    }
  }

  function closeCategories() {
    setCatsOpen(false);
    setExpandedCat(null);
  }

  function toggleCat(id) {
    setExpandedCat((cur) => (cur === id ? null : id));
  }

  function handleLogout() {
    setUserOpen(false);
    logout();
    router.push('/');
  }

  // Coração do header: logado → vai aos favoritos da conta; deslogado → abre o
  // modal de login/cadastro (do FavoritesProvider) em vez de jogar numa tela cinza.
  function handleFavorites() {
    if (user) {
      router.push('/minha-conta?tab=favoritos');
    } else {
      openLoginPrompt();
    }
  }

  const displayName = (user && (user.name || user.email)) || 'Conta';
  const firstName = displayName.split(' ')[0];
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className={styles.header}>
      <div className={styles.topBar}>
        <div className={styles.topInner}>
          <span>{topbarMessage}</span>
          <Link href="/central-de-ajuda">Ajuda</Link>
        </div>
      </div>

      <div className={styles.main}>
        <div className={styles.mainInner}>
          <Link href="/" className={styles.logo}>
            Feira do Rolo
          </Link>

          <button className={styles.cep} type="button" onClick={() => setCepOpen(true)}>
            <Icon name="map-pin" size={24} className={styles.pin} />
            <span className={styles.cepText}>
              {city ? (
                <>
                  <small>Enviar para</small>
                  <strong>{city}</strong>
                </>
              ) : (
                <>
                  <small>Adicione seu</small>
                  <strong>CEP</strong>
                </>
              )}
            </span>
          </button>

          <div className={styles.search}>
            <SearchBar onSubmit={(q) => router.push(searchRoute(q))} />
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.iconBtn} aria-label="Favoritos" onClick={handleFavorites}>
              <Icon name="heart" size={24} />
              {favCount > 0 && <span className={styles.count}>{favCount}</span>}
            </button>
            <button type="button" className={styles.iconBtn} aria-label="Carrinho" onClick={openCart}>
              <Icon name="cart" size={24} />
              {totalItems > 0 && <span className={styles.count}>{totalItems > 99 ? '99+' : totalItems}</span>}
            </button>

            {user && (
              <div className={styles.notifWrap} ref={notifRef}>
                <button
                  type="button"
                  className={styles.iconBtn}
                  aria-label="Notificações"
                  onClick={() => setNotifOpen((v) => !v)}
                >
                  <Icon name="bell" size={24} />
                  {unreadCount > 0 && <span className={styles.count}>{unreadCount > 99 ? '99+' : unreadCount}</span>}
                </button>
                {notifOpen && (
                  <div className={styles.notifMenu}>
                    <div className={styles.notifHead}>
                      <strong>Notificações</strong>
                      {unreadCount > 0 && (
                        <button type="button" className={styles.notifMarkAll} onClick={handleMarkAllRead}>
                          Marcar todas como lidas
                        </button>
                      )}
                    </div>
                    <div className={styles.notifList}>
                      {notifications.length === 0 ? (
                        <div className={styles.notifEmpty}>
                          <Icon name="bell" size={40} className={styles.notifEmptyIcon} />
                          <p>Nenhuma notificação</p>
                        </div>
                      ) : (
                        notifications.map((n) => {
                          const unread = n.status !== 'read';
                          return (
                            <button
                              type="button"
                              key={n.id}
                              className={cx(styles.notifItem, unread && styles.notifItemUnread)}
                              onClick={() => handleNotifClick(n)}
                            >
                              <div className={styles.notifItemBody}>
                                <p className={styles.notifItemTitle}>{n.title}</p>
                                {n.body && <p className={styles.notifItemText}>{n.body}</p>}
                                <span className={styles.notifItemTime}>{timeAgo(n.sent_at || n.createdAt)}</span>
                              </div>
                              {unread && <span className={styles.notifDot} />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {user ? (
              <div className={styles.userWrap} ref={userRef}>
                <button type="button" className={styles.avatarBtn} onClick={() => setUserOpen((v) => !v)} aria-label="Conta">
                  <span className={styles.avatar}>
                    {user.avatar_url ? <img src={user.avatar_url} alt="" className={styles.avatarImg} /> : initial}
                  </span>
                  <span className={styles.avatarName}>{firstName}</span>
                  <Icon name="chevron-down" size={16} className={cx(styles.avatarCaret, userOpen && styles.avatarCaretOpen)} />
                </button>
                {userOpen && (
                  <div className={styles.userMenu}>
                    <div className={styles.userMenuHead}>
                      <strong className={styles.userName}>{user.name || firstName}</strong>
                      {user.email && <span className={styles.userEmail}>{user.email}</span>}
                    </div>
                    <div className={styles.userMenuSep} />
                    <Link href="/minha-conta" className={styles.userMenuItem} onClick={() => setUserOpen(false)}>
                      <Icon name="user" size={16} /> Minha Conta
                    </Link>
                    <Link href="/mensagens" className={styles.userMenuItem} onClick={() => setUserOpen(false)}>
                      <Icon name="chat" size={16} /> Mensagens
                    </Link>
                    {isAdmin && (
                      <Link href="/admin" className={styles.userMenuItem} onClick={() => setUserOpen(false)}>
                        <Icon name="shield" size={16} /> Painel Admin
                      </Link>
                    )}
                    <div className={styles.userMenuSep} />
                    <button type="button" className={cx(styles.userMenuItem, styles.userMenuLogout)} onClick={handleLogout}>
                      <ILogout /> Sair
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button type="button" className={styles.login} onClick={() => openAuth('login')}>
                <Icon name="user" size={22} />
                <span>Entrar</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <div className={styles.catsWrap} ref={catsRef}>
            <button className={cx(styles.categories, catsOpen && styles.categoriesOpen)} type="button" onClick={openCategories}>
              <Icon name="menu" size={20} />
              <span>Categorias</span>
              <Icon name="chevron-down" size={16} className={styles.catCaret} />
            </button>
            {catsOpen && (
              <div className={styles.catsPanel} role="menu">
                {cats.length === 0 ? (
                  <div className={styles.catsEmpty}>Carregando...</div>
                ) : (
                  <>
                    <ul className={styles.catsList}>
                      {cats.map((c) => {
                        const children = Array.isArray(c.children) ? c.children : [];
                        const hasChildren = children.length > 0;
                        const isExpanded = expandedCat === c.id;
                        return (
                          <li key={c.id} className={styles.catRow}>
                            <div className={cx(styles.catHead, isExpanded && styles.catHeadOpen)}>
                              <Link
                                href={categoryRoute(c.slug)}
                                className={styles.catLink}
                                onClick={closeCategories}
                              >
                                <span className={styles.catEmoji}>{c.icon}</span>
                                <span className={styles.catName}>{c.name}</span>
                              </Link>
                              {hasChildren && (
                                <button
                                  type="button"
                                  className={styles.catToggle}
                                  aria-label={isExpanded ? `Recolher ${c.name}` : `Expandir ${c.name}`}
                                  aria-expanded={isExpanded}
                                  onClick={() => toggleCat(c.id)}
                                >
                                  <Icon
                                    name="chevron-down"
                                    size={16}
                                    className={cx(styles.catChevron, isExpanded && styles.catChevronOpen)}
                                  />
                                </button>
                              )}
                            </div>
                            {hasChildren && isExpanded && (
                              <ul className={styles.subList}>
                                {children.map((sub) => (
                                  <li key={sub.id}>
                                    <Link
                                      href={categoryRoute(sub.slug)}
                                      className={styles.subItem}
                                      onClick={closeCategories}
                                    >
                                      {sub.name}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                    <Link href="/categorias" className={styles.catsAll} onClick={closeCategories}>
                      Ver todas as categorias <Icon name="arrow-right" size={15} />
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
          <ul className={styles.navLinks}>
            {navItems.map((n) => (
              <li key={n.href}>
                <Link href={n.href}>{n.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <AddressSelectionModal
        open={cepOpen}
        onClose={() => setCepOpen(false)}
        addresses={addresses}
        onConfirm={handleConfirmCep}
      />
    </header>
  );
}
