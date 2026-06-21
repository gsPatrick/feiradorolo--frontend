'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import { cx } from '@/lib/cx';
import Modal from '@/components/organisms/Modal/Modal';
import Icon from '@/components/atoms/Icon/Icon';
import Button from '@/components/atoms/Button/Button';
import Skeleton from '@/components/atoms/Skeleton/Skeleton';
import Checkbox from '@/components/atoms/Checkbox/Checkbox';
import FormField from '@/components/molecules/FormField/FormField';
import ProductCard from '@/components/molecules/ProductCard/ProductCard';
import { useToast } from '@/components/providers/ToastProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { orderService, favoriteService, userService, addressService, productService, paymentService, uploadImage, mapProduct, ApiError } from '@/lib/api';
import { maskPhone, maskCPF, maskCNPJ, onlyDigits, isEmail, isPhone, isCPF, isCNPJ } from '@/lib/masks';
// Rótulos de status dos pedidos (mapa estático de UI).
const STATUS_LABELS = {
  paid: { label: 'Pago', variant: 'info' },
  shipped: { label: 'Enviado', variant: 'brand' },
  delivered: { label: 'Entregue', variant: 'success' },
  cancelled: { label: 'Cancelado', variant: 'danger' },
};

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

// Slot de imagem neutro para pedidos (a API não traz imagem do pedido).
const ORDER_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Crect width='60' height='60' fill='%23f1f5f9'/%3E%3C/svg%3E";

function formatOrderDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('pt-BR');
}

function statusLabel(status) {
  return (STATUS_LABELS[status] && STATUS_LABELS[status].label) || status || '—';
}

const TABS = [
  { k: 'pedidos', l: 'Meus Pedidos' },
  { k: 'favoritos', l: 'Favoritos' },
  { k: 'enderecos', l: 'Endereços' },
  { k: 'perfil', l: 'Meu Perfil' },
];
const SELLER_TABS = [
  { k: 'vendas', l: 'Minhas Vendas' },
  { k: 'produtos', l: 'Meus Produtos' },
  { k: 'relatorios', l: 'Relatórios' },
  { k: 'config', l: 'Configurações' },
];
const ORDER_FILTERS = [
  { k: 'all', l: 'Todos' }, { k: 'pending', l: 'Aguard.' }, { k: 'paid', l: 'Pagos' },
  { k: 'shipped', l: 'Enviados' }, { k: 'delivered', l: 'Entregues' },
  { k: 'cancelled', l: 'Cancelados' }, { k: 'refunded', l: 'Devoluções/Reembolso' },
];
const VERIFS = [
  { label: 'Email', icon: 'mail', status: 'verified' },
  { label: 'Telefone', icon: 'user', status: 'pending' },
  { label: 'CPF', icon: 'card', status: 'pending' },
  { label: 'CNPJ', icon: 'store', status: 'none' },
];

function StatusBadge({ status }) {
  if (status === 'verified') return <span className={`${styles.vBadge} ${styles.vOk}`}>✓ Verificado</span>;
  if (status === 'pending') return <span className={`${styles.vBadge} ${styles.vPend}`}>⚠ Pendente</span>;
  return <span className={`${styles.vBadge} ${styles.vNone}`}>- Não informado</span>;
}

export default function MinhaContaPage() {
  const { toast } = useToast();
  const { openAuth, user, setUser, authReady } = useAuth();
  const [view, setView] = useState('compras');
  const [tab, setTab] = useState('pedidos');
  const [sellerTab, setSellerTab] = useState('vendas');
  const [orderFilter, setOrderFilter] = useState('all');
  const [modal, setModal] = useState(null); // 'profile' | 'address' | 'photo'

  // Pedidos (API)
  const [allOrders, setAllOrders] = useState([]);
  const [ordersState, setOrdersState] = useState('idle'); // idle | loading | ready | unauth | error
  // Favoritos (API)
  const [favorites, setFavorites] = useState([]);
  const [favState, setFavState] = useState('idle');
  // Endereços (API)
  const [addresses, setAddresses] = useState([]);
  const [addrState, setAddrState] = useState('idle');
  // Vendas (API)
  const [sales, setSales] = useState([]);
  const [salesState, setSalesState] = useState('idle');
  // Meus produtos (API)
  const [sellerProducts, setSellerProducts] = useState([]);
  const [sellerProdState, setSellerProdState] = useState('idle');

  const isCompras = view === 'compras';
  const isVendas = view === 'vendas';

  // Abre a aba indicada por ?tab= (ex.: link de Favoritos / Meus produtos no header).
  useEffect(() => {
    try {
      const t = new URLSearchParams(window.location.search).get('tab');
      if (!t) return;
      const sellerTabs = { 'meus-produtos': 'produtos', produtos: 'produtos', vendas: 'vendas', relatorios: 'relatorios', config: 'config' };
      if (sellerTabs[t]) {
        setView('vendas');
        setSellerTab(sellerTabs[t]);
      } else {
        setView('compras');
        setTab(t === 'compras' ? 'pedidos' : t);
      }
    } catch {}
  }, []);

  // Quando a sessão é restaurada (user chega de forma assíncrona) ou troca,
  // zera os estados para 'idle' — assim os fetches rodam de novo com o token.
  useEffect(() => {
    setOrdersState('idle');
    setFavState('idle');
    setAddrState('idle');
    setSalesState('idle');
    setSellerProdState('idle');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user && user.id]);

  useEffect(() => {
    if (!isCompras || tab !== 'pedidos' || ordersState !== 'idle') return;
    setOrdersState('loading');
    orderService
      .listMine()
      .then((data) => {
        setAllOrders(Array.isArray(data) ? data : []);
        setOrdersState('ready');
      })
      .catch((err) => {
        setOrdersState(err instanceof ApiError && err.status === 401 ? 'unauth' : 'error');
      });
  }, [isCompras, tab, ordersState]);

  useEffect(() => {
    if (!isCompras || tab !== 'favoritos' || favState !== 'idle') return;
    setFavState('loading');
    favoriteService
      .listMine()
      .then((data) => {
        const mapped = (Array.isArray(data) ? data : []).map(mapProduct).filter(Boolean);
        setFavorites(mapped);
        setFavState('ready');
      })
      .catch((err) => {
        setFavState(err instanceof ApiError && err.status === 401 ? 'unauth' : 'error');
      });
  }, [isCompras, tab, favState]);

  useEffect(() => {
    if (!isCompras || tab !== 'enderecos' || addrState !== 'idle') return;
    setAddrState('loading');
    addressService
      .list()
      .then((data) => {
        setAddresses(Array.isArray(data) ? data : []);
        setAddrState('ready');
      })
      .catch((err) => {
        setAddrState(err instanceof ApiError && err.status === 401 ? 'unauth' : 'error');
      });
  }, [isCompras, tab, addrState]);

  const reloadAddresses = () => setAddrState('idle');

  useEffect(() => {
    if (!isVendas || sellerTab !== 'vendas' || salesState !== 'idle') return;
    setSalesState('loading');
    orderService
      .listSales()
      .then((data) => {
        setSales(Array.isArray(data) ? data : []);
        setSalesState('ready');
      })
      .catch((err) => {
        setSalesState(err instanceof ApiError && err.status === 401 ? 'unauth' : 'error');
      });
  }, [isVendas, sellerTab, salesState]);

  useEffect(() => {
    if (!isVendas || sellerTab !== 'produtos' || sellerProdState !== 'idle') return;
    if (!user || !user.id) { setSellerProdState('unauth'); return; }
    setSellerProdState('loading');
    productService
      .list(`?seller_id=${user.id}`)
      .then((data) => {
        const mapped = (Array.isArray(data) ? data : []).map(mapProduct).filter(Boolean);
        setSellerProducts(mapped);
        setSellerProdState('ready');
      })
      .catch((err) => {
        setSellerProdState(err instanceof ApiError && err.status === 401 ? 'unauth' : 'error');
      });
  }, [isVendas, sellerTab, sellerProdState, user]);

  const orders = orderFilter === 'all' ? allOrders : allOrders.filter((o) => o.status === orderFilter);
  const close = () => setModal(null);
  const saved = (msg) => { toast({ title: msg, variant: 'success', duration: 1500 }); close(); };

  // ---- Editar Perfil (formulário controlado + máscaras/validações) ----
  const [pf, setPf] = useState({ name: '', email: '', phone: '', cpf: '', cnpj: '', birth_date: '' });
  const [pfErr, setPfErr] = useState({});
  const [pfSaving, setPfSaving] = useState(false);

  useEffect(() => {
    if (modal === 'profile' && user) {
      setPf({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone ? maskPhone(user.phone) : '',
        cpf: user.cpf ? maskCPF(user.cpf) : '',
        cnpj: user.cnpj ? maskCNPJ(user.cnpj) : '',
        birth_date: user.birth_date ? String(user.birth_date).slice(0, 10) : '',
      });
      setPfErr({});
    }
  }, [modal, user]);

  const setPfField = (k, v) => setPf((p) => ({ ...p, [k]: v }));

  // ---- Foto de perfil (avatar) ----
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);

  useEffect(() => {
    if (modal === 'photo') setPhotoUrl((user && user.avatar_url) || '');
  }, [modal, user]);

  async function uploadAvatar(file) {
    if (!file) return;
    setPhotoUploading(true);
    try {
      const data = await uploadImage(file);
      if (data && data.url) setPhotoUrl(data.url);
    } catch (e) {
      toast({ title: 'Falha no upload', description: e.message, variant: 'destructive' });
    } finally {
      setPhotoUploading(false);
    }
  }

  async function saveAvatar() {
    try {
      const updated = await userService.updateMe({ avatar_url: photoUrl || null });
      if (updated) setUser(updated);
      saved('Foto atualizada!');
    } catch (e) {
      toast({ title: 'Não foi possível salvar', description: e.message, variant: 'destructive' });
    }
  }

  async function saveProfile() {
    const err = {};
    if (!pf.name.trim()) err.name = 'Informe seu nome.';
    if (!isEmail(pf.email)) err.email = 'E-mail inválido.';
    if (pf.phone && !isPhone(pf.phone)) err.phone = 'Telefone inválido.';
    if (pf.cpf && !isCPF(pf.cpf)) err.cpf = 'CPF inválido.';
    if (pf.cnpj && !isCNPJ(pf.cnpj)) err.cnpj = 'CNPJ inválido.';
    setPfErr(err);
    if (Object.keys(err).length) return;
    setPfSaving(true);
    try {
      const updated = await userService.updateMe({
        name: pf.name.trim(),
        email: pf.email.trim(),
        phone: onlyDigits(pf.phone) || null,
        cpf: onlyDigits(pf.cpf) || null,
        cnpj: onlyDigits(pf.cnpj) || null,
        birth_date: pf.birth_date || null,
      });
      if (updated) setUser(updated);
      saved('Perfil atualizado!');
    } catch (e) {
      toast({ title: 'Não foi possível salvar', description: e.message, variant: 'destructive' });
    } finally {
      setPfSaving(false);
    }
  }

  // ---- Endereços (formulário controlado) ----
  const EMPTY_ADDR = {
    label: '', zip_code: '', street: '', number: '', complement: '',
    neighborhood: '', city: '', state: '', is_default: false,
  };
  const [af, setAf] = useState(EMPTY_ADDR);
  const [afId, setAfId] = useState(null);
  const [afSaving, setAfSaving] = useState(false);

  const setAfField = (k, v) => setAf((p) => ({ ...p, [k]: v }));

  function openAddress(a) {
    if (a) {
      setAfId(a.id);
      setAf({
        label: a.label || '',
        zip_code: a.zip_code || '',
        street: a.street || '',
        number: a.number || '',
        complement: a.complement || '',
        neighborhood: a.neighborhood || '',
        city: a.city || '',
        state: a.state || '',
        is_default: !!a.is_default,
      });
    } else {
      setAfId(null);
      setAf(EMPTY_ADDR);
    }
    setModal('address');
  }

  async function saveAddress() {
    const payload = {
      label: af.label.trim(),
      zip_code: af.zip_code.trim(),
      street: af.street.trim(),
      number: af.number.trim(),
      complement: af.complement.trim() || null,
      neighborhood: af.neighborhood.trim(),
      city: af.city.trim(),
      state: af.state.trim(),
      is_default: !!af.is_default,
    };
    setAfSaving(true);
    try {
      if (afId) await addressService.update(afId, payload);
      else await addressService.create(payload);
      reloadAddresses();
      saved('Endereço salvo!');
    } catch (e) {
      toast({ title: 'Não foi possível salvar', description: e.message, variant: 'destructive' });
    } finally {
      setAfSaving(false);
    }
  }

  async function setAddressDefault(id) {
    try {
      await addressService.setDefault(id);
      reloadAddresses();
      toast({ title: 'Endereço principal definido!', variant: 'success', duration: 1500 });
    } catch (e) {
      toast({ title: 'Não foi possível atualizar', description: e.message, variant: 'destructive' });
    }
  }

  async function removeAddress(id) {
    try {
      await addressService.remove(id);
      reloadAddresses();
      toast({ title: 'Endereço removido!', variant: 'success', duration: 1500 });
    } catch (e) {
      toast({ title: 'Não foi possível remover', description: e.message, variant: 'destructive' });
    }
  }

  return (
    <main>

      <div className={styles.subheader}>
        <div className={styles.subInner}>
          <Link href="/" className={styles.back}><Icon name="arrow-left" size={20} /> Voltar</Link>
          <h1 className={styles.pageTitle}>Minha Conta</h1>
          <div className={styles.viewToggle}>
            <button className={cx(styles.vt, view === 'compras' && styles.viewActive)} onClick={() => setView('compras')}>
              🛍️ Minhas Compras
            </button>
            <button className={cx(styles.vt, view === 'vendas' && styles.viewActive)} onClick={() => setView('vendas')}>
              📦 Minhas Vendas
            </button>
          </div>
        </div>
      </div>

      <div className={styles.page}>
        <div className={styles.container}>
          <aside className={styles.profileCard}>
            {user ? (
              <>
                <div className={styles.avatar}>
                  {user.avatar_url
                    ? <img src={user.avatar_url} alt="" className={styles.avatarImg} />
                    : (user.name || user.email || 'U').charAt(0).toUpperCase()}
                </div>
                <strong className={styles.name}>{(user.name || 'Conta').split(' ')[0]}</strong>
                <span className={styles.email}>{user.email}</span>
                <button className={styles.changePhoto} onClick={() => setModal('photo')}>
                  <Icon name="camera" size={16} /> Alterar Foto
                </button>
                <span className={styles.emailPill}>✓ Email</span>
              </>
            ) : (
              <>
                <div className={styles.avatar}>?</div>
                <strong className={styles.name}>Visitante</strong>
                <span className={styles.email}>Entre para ver sua conta</span>
                <Button variant="primary" size="sm" leftIcon="user" onClick={() => openAuth('login')}>Entrar</Button>
              </>
            )}
          </aside>

          <section className={styles.main}>
            {view === 'vendas' ? (
              <>
                <MpConnectPrompt />
                <div className={styles.tabs}>
                  {SELLER_TABS.map((t) => (
                    <button key={t.k} className={cx(styles.tab, sellerTab === t.k && styles.tabActive)} onClick={() => setSellerTab(t.k)}>{t.l}</button>
                  ))}
                </div>
                <div className={cx(styles.tabContent, styles.fade)} key={sellerTab}>
                  {sellerTab === 'vendas' && <SalesDashboard sales={sales} salesState={salesState} onRetry={() => setSalesState('idle')} onAuth={() => openAuth('login')} />}
                  {sellerTab === 'produtos' && <SellerProducts products={sellerProducts} state={sellerProdState} onRetry={() => setSellerProdState('idle')} onAuth={() => openAuth('login')} />}
                  {sellerTab === 'relatorios' && <SellerReports onExport={() => toast({ title: 'Exportando relatório…', duration: 1500 })} />}
                  {sellerTab === 'config' && <SellerConfig onSave={() => saved('Configurações salvas!')} />}
                </div>
              </>
            ) : (
              <>
                <div className={styles.tabs}>
                  {TABS.map((t) => (
                    <button key={t.k} className={cx(styles.tab, tab === t.k && styles.tabActive)} onClick={() => setTab(t.k)}>{t.l}</button>
                  ))}
                </div>
                <div className={cx(styles.tabContent, styles.fade)} key={tab}>
                  {tab === 'pedidos' && (
                    <>
                      <div className={styles.sectionHead}><h2>Meus Pedidos</h2><span className={styles.muted}>{ordersState === 'ready' ? `${orders.length} pedidos` : ''}</span></div>
                      <div className={styles.orderFilters}>
                        {ORDER_FILTERS.map((of) => (
                          <button key={of.k} className={cx(styles.ofPill, orderFilter === of.k && styles.ofActive)} onClick={() => setOrderFilter(of.k)}>{of.l}</button>
                        ))}
                      </div>
                      {ordersState === 'unauth' ? (
                        <div className={styles.emptyCard}>
                          <span className={styles.emptyIcon}><Icon name="user" size={36} /></span>
                          <strong>Entre para ver seus pedidos</strong>
                          <p>Faça login para acompanhar suas compras no Feira do Rolo.</p>
                          <Button variant="primary" leftIcon="user" onClick={() => openAuth('login')}>Entrar</Button>
                        </div>
                      ) : ordersState === 'error' ? (
                        <div className={styles.emptyCard}>
                          <span className={styles.emptyIcon}><Icon name="package" size={36} /></span>
                          <strong>Não foi possível carregar seus pedidos</strong>
                          <p>Tente novamente em alguns instantes.</p>
                          <Button variant="primary" onClick={() => setOrdersState('idle')}>Tentar novamente</Button>
                        </div>
                      ) : ordersState !== 'ready' ? (
                        <div className={styles.orders}>
                          {[0, 1, 2].map((i) => (
                            <div key={i} className={styles.order}>
                              <img src={ORDER_PLACEHOLDER} alt="" />
                              <div className={styles.orderInfo}><strong style={{ opacity: 0.4 }}>Carregando…</strong><span>&nbsp;</span></div>
                            </div>
                          ))}
                        </div>
                      ) : orders.length === 0 ? (
                        <div className={styles.emptyCard}>
                          <span className={styles.emptyIcon}><Icon name="package" size={36} /></span>
                          <strong>Nenhum pedido encontrado</strong>
                          <p>Comece a comprar no Feira do Rolo e seus pedidos aparecerão aqui!</p>
                          <Button variant="primary" leftIcon="plus" href="/produtos">Começar a Comprar</Button>
                        </div>
                      ) : (
                        <div className={styles.orders}>
                          {orders.map((o) => {
                            const items = Array.isArray(o.items) ? o.items : [];
                            const title = (items[0] && items[0].title_snapshot) || `${items.length} itens`;
                            return (
                              <div key={o.id} className={styles.order}>
                                <img src={ORDER_PLACEHOLDER} alt="" />
                                <div className={styles.orderInfo}><strong>{title}</strong><span>Pedido {o.id} · {formatOrderDate(o.created_at)}</span></div>
                                <div className={styles.orderRight}>
                                  <span className={`${styles.vBadge} ${styles[`b_${o.status}`] || styles.vNone}`}>{statusLabel(o.status)}</span>
                                  <span className={styles.orderTotal}>{BRL.format(Number(o.total) || 0)}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}

                  {tab === 'favoritos' && (
                    <>
                      <div className={styles.sectionHead}><h2>Favoritos</h2><span className={styles.muted}>{favState === 'ready' ? `${favorites.length} produtos` : ''}</span></div>
                      {favState === 'unauth' ? (
                        <div className={styles.emptyCard}>
                          <span className={styles.emptyIcon}><Icon name="user" size={36} /></span>
                          <strong>Entre para ver seus favoritos</strong>
                          <p>Faça login para acessar os produtos que você favoritou.</p>
                          <Button variant="primary" leftIcon="user" onClick={() => openAuth('login')}>Entrar</Button>
                        </div>
                      ) : favState === 'error' ? (
                        <div className={styles.emptyCard}>
                          <span className={styles.emptyIcon}><Icon name="heart" size={36} /></span>
                          <strong>Não foi possível carregar seus favoritos</strong>
                          <p>Tente novamente em alguns instantes.</p>
                          <Button variant="primary" onClick={() => setFavState('idle')}>Tentar novamente</Button>
                        </div>
                      ) : favState !== 'ready' ? (
                        <div className={styles.favGrid}>{[0, 1, 2].map((i) => <ProductCard key={i} loading />)}</div>
                      ) : favorites.length === 0 ? (
                        <div className={styles.emptyCard}>
                          <span className={styles.emptyIcon}><Icon name="heart" size={36} /></span>
                          <strong>Você ainda não tem favoritos</strong>
                          <p>Favorite produtos no Feira do Rolo e eles aparecerão aqui!</p>
                          <Button variant="primary" leftIcon="plus" href="/produtos">Explorar Produtos</Button>
                        </div>
                      ) : (
                        <div className={styles.favGrid}>{favorites.map((p) => <ProductCard key={p.id} product={p} />)}</div>
                      )}
                    </>
                  )}

                  {tab === 'enderecos' && (
                    <>
                      <div className={styles.sectionHead}><h2>Endereços</h2>
                        <Button variant="outline" size="sm" leftIcon="plus" onClick={() => openAddress(null)}>Adicionar</Button>
                      </div>
                      {addrState === 'unauth' ? (
                        <div className={styles.emptyCard}>
                          <span className={styles.emptyIcon}><Icon name="user" size={36} /></span>
                          <strong>Entre para ver seus endereços</strong>
                          <p>Faça login para gerenciar seus endereços no Feira do Rolo.</p>
                          <Button variant="primary" leftIcon="user" onClick={() => openAuth('login')}>Entrar</Button>
                        </div>
                      ) : addrState === 'error' ? (
                        <div className={styles.emptyCard}>
                          <span className={styles.emptyIcon}><Icon name="map-pin" size={36} /></span>
                          <strong>Não foi possível carregar seus endereços</strong>
                          <p>Tente novamente em alguns instantes.</p>
                          <Button variant="primary" onClick={() => setAddrState('idle')}>Tentar novamente</Button>
                        </div>
                      ) : addrState !== 'ready' ? (
                        <div className={styles.addresses}>
                          {[0, 1].map((i) => (
                            <div key={i} className={styles.address}>
                              <Icon name="map-pin" size={20} className={styles.addrPin} />
                              <div className={styles.addrBody}>
                                <div className={styles.addrTop}><strong style={{ opacity: 0.4 }}>Carregando…</strong></div>
                                <p>&nbsp;</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : addresses.length === 0 ? (
                        <div className={styles.emptyCard}>
                          <span className={styles.emptyIcon}><Icon name="map-pin" size={36} /></span>
                          <strong>Nenhum endereço cadastrado</strong>
                          <p>Adicione um endereço para agilizar suas compras no Feira do Rolo.</p>
                          <Button variant="primary" leftIcon="plus" onClick={() => openAddress(null)}>Adicionar endereço</Button>
                        </div>
                      ) : (
                        <div className={styles.addresses}>
                          {addresses.map((a) => (
                            <div key={a.id} className={styles.address}>
                              <Icon name="map-pin" size={20} className={styles.addrPin} />
                              <div className={styles.addrBody}>
                                <div className={styles.addrTop}><strong>{a.label}</strong>{a.is_default
                                  ? <span className={`${styles.vBadge} ${styles.vOk}`}><Icon name="star" size={11} /> Principal</span>
                                  : <button className={styles.addrEdit} onClick={() => setAddressDefault(a.id)}>Definir como padrão</button>}</div>
                                <p>{a.street}, {a.number}{a.complement ? ` · ${a.complement}` : ''}</p>
                                <p>{a.neighborhood} · {a.city}/{a.state} · CEP {a.zip_code}</p>
                              </div>
                              <div className={styles.addrActions}>
                                <button className={styles.addrEdit} onClick={() => openAddress(a)} aria-label="Editar"><Icon name="edit" size={15} /></button>
                                <button className={styles.addrDel} onClick={() => removeAddress(a.id)} aria-label="Excluir"><Icon name="trash" size={15} /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {tab === 'perfil' && <ProfileTab onEdit={() => setModal('profile')} user={user} />}
                </div>
              </>
            )}
          </section>
        </div>
      </div>


      <Modal open={modal === 'profile'} onClose={close} title="Editar Perfil"
        footer={<><Button variant="ghost" onClick={close}>Cancelar</Button><Button variant="primary" loading={pfSaving} onClick={saveProfile}>Salvar alterações</Button></>}>
        <div className={styles.modalForm}>
          <FormField label="Nome completo" required value={pf.name} error={pfErr.name}
            onChange={(e) => setPfField('name', e.target.value)} leftIcon="user" placeholder="Seu nome" />
          <FormField label="E-mail" type="email" required value={pf.email} error={pfErr.email}
            onChange={(e) => setPfField('email', e.target.value)} leftIcon="mail" placeholder="seu@email.com" />
          <FormField label="Telefone" value={pf.phone} error={pfErr.phone}
            onChange={(e) => setPfField('phone', maskPhone(e.target.value))} placeholder="(11) 99999-9999" inputMode="numeric" />
          <div className={styles.row2}>
            <FormField label="CPF" value={pf.cpf} error={pfErr.cpf}
              onChange={(e) => setPfField('cpf', maskCPF(e.target.value))} placeholder="000.000.000-00" inputMode="numeric" />
            <FormField label="CNPJ" value={pf.cnpj} error={pfErr.cnpj}
              onChange={(e) => setPfField('cnpj', maskCNPJ(e.target.value))} placeholder="00.000.000/0000-00" inputMode="numeric" />
          </div>
          <FormField label="Data de nascimento" type="date" value={pf.birth_date}
            onChange={(e) => setPfField('birth_date', e.target.value)} />
        </div>
      </Modal>

      <Modal open={modal === 'address'} onClose={close} title="Endereço"
        footer={<><Button variant="ghost" onClick={close}>Cancelar</Button><Button variant="primary" loading={afSaving} onClick={saveAddress}>Salvar endereço</Button></>}>
        <div className={styles.modalForm}>
          <FormField label="Identificação" placeholder="Ex: Casa, Trabalho"
            value={af.label} onChange={(e) => setAfField('label', e.target.value)} />
          <FormField label="CEP" placeholder="00000-000"
            value={af.zip_code} onChange={(e) => setAfField('zip_code', e.target.value)} />
          <FormField label="Rua / Logradouro" placeholder="Av. Paulista"
            value={af.street} onChange={(e) => setAfField('street', e.target.value)} />
          <div className={styles.row2}>
            <FormField label="Número" placeholder="123"
              value={af.number} onChange={(e) => setAfField('number', e.target.value)} />
            <FormField label="Complemento" placeholder="Apto, bloco..."
              value={af.complement} onChange={(e) => setAfField('complement', e.target.value)} />
          </div>
          <FormField label="Bairro" placeholder="Centro"
            value={af.neighborhood} onChange={(e) => setAfField('neighborhood', e.target.value)} />
          <div className={styles.row2}>
            <FormField label="Cidade" placeholder="São Paulo"
              value={af.city} onChange={(e) => setAfField('city', e.target.value)} />
            <FormField label="UF" placeholder="SP"
              value={af.state} onChange={(e) => setAfField('state', e.target.value)} />
          </div>
          <Checkbox label="Definir como endereço principal"
            checked={af.is_default} onChange={(v) => setAfField('is_default', v)} />
        </div>
      </Modal>

      <Modal open={modal === 'photo'} onClose={close} size="sm" title="Alterar foto de perfil"
        footer={<><Button variant="ghost" onClick={close}>Cancelar</Button><Button variant="primary" loading={photoUploading} onClick={saveAvatar}>Salvar</Button></>}>
        <label className={styles.photoDrop}>
          <input type="file" accept="image/*" hidden disabled={photoUploading}
            onChange={(e) => uploadAvatar(e.target.files && e.target.files[0])} />
          {photoUrl ? (
            <img src={photoUrl} alt="Pré-visualização" className={styles.photoPreview} />
          ) : (
            <Icon name="camera" size={32} />
          )}
          <strong>{photoUploading ? 'Enviando…' : 'Clique para selecionar uma imagem'}</strong>
          <span>JPG, PNG ou WEBP, até 5MB</span>
          <span className={styles.photoBtn}>Escolher arquivo</span>
        </label>
      </Modal>
    </main>
  );
}

/* — Aba Meu Perfil — */
function ProfileTab({ onEdit, user }) {
  const dimRow = (label, value) => (
    <div className={styles.infoRow}>
      <span>{label}</span>
      {value ? <strong>{value}</strong> : <strong className={styles.dim}>Não informado ⚠</strong>}
    </div>
  );
  return (
    <>
      <div className={styles.sectionHead}><h2>Meu Perfil</h2><Button variant="outline" size="sm" leftIcon="filter" onClick={onEdit}>Editar Perfil</Button></div>
      <div className={styles.verifCard}>
        <div className={styles.verifTitle}><Icon name="shield" size={20} /> Status de Verificação</div>
        <div className={styles.verifGrid}>
          {VERIFS.map((v) => (
            <div key={v.label} className={styles.verifItem}>
              <span className={cx(styles.vIcon, styles[`vi_${v.status}`])}><Icon name={v.icon} size={18} /></span>
              <span className={styles.vLabel}>{v.label}</span>
              <StatusBadge status={v.status} />
            </div>
          ))}
        </div>
        <div className={styles.verifWarn}>⚠ Complete suas verificações para aumentar a confiança dos vendedores e ter acesso a todas as funcionalidades.</div>
      </div>
      <div className={styles.profileGrid}>
        <div className={styles.infoCard}>
          <h3>Informações Pessoais</h3>
          {dimRow('Nome', user?.name)}
          <div className={styles.infoRow}><span>Email</span><strong>{user?.email || '—'} {user?.email && <em className={styles.okMark}>✓</em>}</strong></div>
          {dimRow('Telefone', user?.phone ? maskPhone(user.phone) : null)}
          {dimRow('CPF', user?.cpf ? maskCPF(user.cpf) : null)}
          {dimRow('CNPJ', user?.cnpj ? maskCNPJ(user.cnpj) : null)}
        </div>
        <div className={styles.infoCard}>
          <h3>Estatísticas da Conta</h3>
          <div className={styles.statRow}><span>Membro desde</span><strong>Dezembro 2024</strong></div>
          <div className={styles.statRow}><span>Compras realizadas</span><strong>12</strong></div>
          <div className={styles.statRow}><span>Avaliações feitas</span><strong>8</strong></div>
          <div className={styles.statRow}><span>Produtos favoritos</span><strong>24</strong></div>
          <div className={styles.trust}>
            <div className={styles.trustTop}><span>Nível de Confiança</span><span className={`${styles.vBadge} ${styles.vPend}`}>Básico</span></div>
            <p>Complete suas verificações para alcançar nível “Confiável”</p>
          </div>
        </div>
      </div>
    </>
  );
}

/* — Vendas: Dashboard — */
function SalesDashboard({ sales = [], salesState = 'idle', onRetry, onAuth }) {
  const hasData = salesState === 'ready' && sales.length > 0;
  // Estatísticas reais derivadas dos pedidos de venda; sem dado, zera (sem mock).
  const revenue = hasData ? sales.reduce((acc, s) => acc + (Number(s.total) || 0), 0) : 0;
  const soldCount = hasData ? sales.length : 0;
  const pendingCount = hasData
    ? sales.filter((s) => s.status === 'pending' || s.status === 'paid').length
    : 0;
  // Vendas recentes reais (até 5); sem dado, lista vazia (sem mock).
  const recent = hasData
    ? sales.slice(0, 5).map((s) => {
        const items = Array.isArray(s.items) ? s.items : [];
        const title = (items[0] && items[0].title_snapshot) || `Pedido ${s.id}`;
        return { id: s.id, title, time: formatOrderDate(s.created_at), price: Number(s.total) || 0, status: s.status };
      })
    : [];

  return (
    <>
      <div className={styles.sectionHead}><h2>Dashboard de Vendas</h2><span className={`${styles.vBadge} ${styles.vOk}`}>Vendedor Ativo</span></div>
      {salesState === 'unauth' ? (
        <div className={styles.emptyCard}>
          <span className={styles.emptyIcon}><Icon name="user" size={36} /></span>
          <strong>Entre para ver suas vendas</strong>
          <p>Faça login para acompanhar suas vendas no Feira do Rolo.</p>
          <Button variant="primary" leftIcon="user" onClick={onAuth}>Entrar</Button>
        </div>
      ) : salesState === 'error' ? (
        <div className={styles.emptyCard}>
          <span className={styles.emptyIcon}><Icon name="package" size={36} /></span>
          <strong>Não foi possível carregar suas vendas</strong>
          <p>Tente novamente em alguns instantes.</p>
          <Button variant="primary" onClick={onRetry}>Tentar novamente</Button>
        </div>
      ) : (
        <>
          <div className={styles.sellerStats}>
            <div className={styles.sStat}><div><span>Faturamento</span><strong className={styles.green}>{BRL.format(revenue)}</strong></div><span className={`${styles.sIcon} ${styles.green}`}><Icon name="dollar" size={26} /></span></div>
            <div className={styles.sStat}><div><span>Produtos Vendidos</span><strong className={styles.blue}>{soldCount}</strong></div><span className={`${styles.sIcon} ${styles.blue}`}><Icon name="package" size={26} /></span></div>
            <div className={styles.sStat}><div><span>Pedidos Pendentes</span><strong className={styles.orange}>{pendingCount}</strong></div><span className={`${styles.sIcon} ${styles.orange}`}><Icon name="bell" size={26} /></span></div>
          </div>
          <div className={styles.recentCard}>
            <h3>Vendas Recentes</h3>
            <div className={styles.recentList}>
              {recent.map((s) => (
                <div key={s.id} className={styles.recent}>
                  <span className={cx(styles.recentIcon, s.status === 'paid' ? styles.green : styles.blue)}><Icon name="package" size={20} /></span>
                  <div className={styles.recentInfo}><strong>{s.title}</strong><span>Pedido #{s.id} - {s.time}</span></div>
                  <div className={styles.recentRight}>
                    <strong className={s.status === 'paid' ? styles.green : styles.blue}>{BRL.format(s.price)}</strong>
                    <span className={`${styles.vBadge} ${styles[`b_${s.status}`] || styles.vNone}`}>{statusLabel(s.status)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}

/* — Vendas: Meus Produtos — */
function SellerProducts({ products = [], state = 'idle', onRetry, onAuth }) {
  const count = state === 'ready' ? products.length : 0;
  return (
    <>
      <div className={styles.sectionHead}><h2>Meus Produtos{state === 'ready' ? ` (${count})` : ''}</h2>
        <Button variant="accent" leftIcon="plus" href="/adicionar-produto" className={styles.addProduct}>Adicionar Produto</Button>
      </div>
      {state === 'unauth' ? (
        <div className={styles.emptyCard}>
          <span className={styles.emptyIcon}><Icon name="user" size={36} /></span>
          <strong>Entre para ver seus produtos</strong>
          <p>Faça login para gerenciar seus anúncios no Feira do Rolo.</p>
          <Button variant="primary" leftIcon="user" onClick={onAuth}>Entrar</Button>
        </div>
      ) : state === 'error' ? (
        <div className={styles.emptyCard}>
          <span className={styles.emptyIcon}><Icon name="package" size={36} /></span>
          <strong>Não foi possível carregar seus produtos</strong>
          <p>Tente novamente em alguns instantes.</p>
          <Button variant="primary" onClick={onRetry}>Tentar novamente</Button>
        </div>
      ) : state !== 'ready' ? (
        <div className={styles.prodGrid}>
          {[0, 1, 2].map((i) => (
            <div key={i} className={styles.prodCard}>
              <div className={styles.prodMedia}><Icon name="package" size={34} /></div>
              <div className={styles.prodBody}><strong style={{ opacity: 0.4 }}>Carregando…</strong></div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className={styles.emptyCard}>
          <span className={styles.emptyIcon}><Icon name="package" size={36} /></span>
          <strong>Você ainda não tem produtos</strong>
          <p>Cadastre seu primeiro anúncio e ele aparecerá aqui!</p>
          <Button variant="accent" leftIcon="plus" href="/adicionar-produto">Adicionar Produto</Button>
        </div>
      ) : (
        <div className={styles.prodGrid}>
          {products.map((p) => (
            <div key={p.id} className={styles.prodCard}>
              <div className={styles.prodMedia}>
                {p.image ? <img src={p.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Icon name="package" size={34} />}
              </div>
              <div className={styles.prodBody}>
                <strong>{p.title}</strong>
                <div className={styles.prodPriceRow}>
                  <span className={styles.green}>{BRL.format(p.price)}</span>
                </div>
                <div className={styles.prodActions}>
                  <Button variant="outline" size="sm" leftIcon="eye" href={`/produto/${p.id}`}>Ver</Button>
                  <Button variant="outline" size="sm" href={`/adicionar-produto?id=${p.id}`}>Editar</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/* — Vendas: Relatórios — */
function SellerReports({ onExport }) {
  return (
    <>
      <div className={styles.sectionHead}><h2>Relatórios e Analytics</h2><Button variant="outline" size="sm" leftIcon="trending-up" onClick={onExport}>Exportar</Button></div>
      <div className={styles.reportsGrid}>
        <div className={styles.reportCard}><h3>Vendas por Mês</h3><div className={styles.chartPh}><Icon name="trending-up" size={34} /><span>Gráfico de vendas</span></div></div>
        <div className={styles.reportCard}><h3>Top Produtos</h3><div className={styles.chartPh}><Icon name="grid" size={34} /><span>Produtos mais vendidos</span></div></div>
      </div>
    </>
  );
}

/* — Vendas: Configurações — */
// Modal proativo: aparece pro vendedor que ainda não vinculou a conta de
// recebimento (Mercado Pago) na primeira vez que abre o painel de Vendas.
function MpConnectPrompt() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    let active = true;
    try { if (sessionStorage.getItem('fdr_mp_prompt') === '1') return; } catch {}
    paymentService
      .connectStatus()
      .then((s) => { if (active && !(s && s.linked)) setOpen(true); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  function dismiss() {
    try { sessionStorage.setItem('fdr_mp_prompt', '1'); } catch {}
    setOpen(false);
  }

  async function connect() {
    setConnecting(true);
    try {
      const res = await paymentService.connectMercadoPago();
      if (res && res.url) { window.location.href = res.url; return; }
      toast({ title: 'Não foi possível iniciar o vínculo', variant: 'destructive', duration: 2500 });
    } catch (e) {
      toast({ title: 'Erro ao conectar', description: (e && e.message) || 'Tente novamente.', variant: 'destructive', duration: 2500 });
    } finally {
      setConnecting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={dismiss}
      size="sm"
      title="Receba suas vendas no Mercado Pago"
      footer={(
        <>
          <Button variant="ghost" onClick={dismiss}>Agora não</Button>
          <Button variant="primary" loading={connecting} leftIcon="dollar" onClick={connect}>Vincular agora</Button>
        </>
      )}
    >
      <p style={{ lineHeight: 1.6, margin: 0 }}>
        Para receber o valor das suas vendas <strong>direto na sua conta</strong>, vincule seu Mercado Pago.
        A comissão da plataforma é descontada automaticamente no repasse — leva menos de 1 minuto.
        Você também pode fazer isso depois em <strong>Configurações → Recebimentos</strong>.
      </p>
    </Modal>
  );
}

function SellerConfig({ onSave }) {
  const { toast } = useToast();
  const [mp, setMp] = useState(null);
  const [mpLoading, setMpLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    let active = true;
    paymentService
      .connectStatus()
      .then((s) => { if (active) setMp(s); })
      .catch(() => { if (active) setMp(null); })
      .finally(() => { if (active) setMpLoading(false); });
    return () => { active = false; };
  }, []);

  async function connectMp() {
    setConnecting(true);
    try {
      const res = await paymentService.connectMercadoPago();
      const url = res && res.url;
      if (url) { window.location.href = url; return; }
      toast({ title: 'Não foi possível iniciar o vínculo', variant: 'destructive', duration: 2500 });
    } catch (e) {
      toast({ title: 'Erro ao conectar', description: (e && e.message) || 'Tente novamente.', variant: 'destructive', duration: 2500 });
    } finally {
      setConnecting(false);
    }
  }

  async function disconnectMp() {
    try {
      await paymentService.disconnectMercadoPago();
      setMp(null);
      toast({ title: 'Conta de recebimento desvinculada', variant: 'success', duration: 2000 });
    } catch (e) {
      toast({ title: 'Erro ao desvincular', variant: 'destructive', duration: 2000 });
    }
  }

  const linked = !!(mp && mp.linked);

  return (
    <>
      <div className={styles.sectionHead}><h2>Configurações de Vendedor</h2></div>

      {/* Recebimentos — vínculo Mercado Pago (split/repasse) */}
      <div className={styles.configCard}>
        <h3>Recebimentos (Mercado Pago)</h3>
        <p className={styles.muted} style={{ marginBottom: 14 }}>
          Vincule sua conta do Mercado Pago para receber o valor das suas vendas <strong>direto na sua conta</strong>,
          já com a comissão da plataforma descontada automaticamente (repasse via split).
        </p>
        {mpLoading ? (
          <Skeleton width={220} height={40} radius={10} />
        ) : linked ? (
          <div className={styles.mpLinked} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span className={`${styles.vBadge} ${styles.b_paid}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Icon name="check" size={14} /> Conta vinculada{mp.mp_user_id ? ` · ID ${mp.mp_user_id}` : ''}
            </span>
            <Button variant="ghost" size="sm" onClick={disconnectMp}>Desvincular</Button>
          </div>
        ) : (
          <Button variant="primary" size="lg" leftIcon="dollar" onClick={connectMp} disabled={connecting}>
            {connecting ? 'Redirecionando…' : 'Vincular conta Mercado Pago'}
          </Button>
        )}
      </div>

      <div className={styles.configCard}>
        <h3>Informações da Loja</h3>
        <form className={styles.modalForm} onSubmit={(e) => { e.preventDefault(); onSave(); }}>
          <FormField label="Nome da Loja" placeholder="Digite o nome da sua loja" />
          <FormField label="Descrição" placeholder="Descreva sua loja em poucas palavras" />
          <FormField label="Categoria Principal" placeholder="Ex: Eletrônicos, Roupas, Casa..." />
          <Button type="submit" variant="primary" size="lg" fullWidth>Salvar Configurações</Button>
        </form>
      </div>
    </>
  );
}
