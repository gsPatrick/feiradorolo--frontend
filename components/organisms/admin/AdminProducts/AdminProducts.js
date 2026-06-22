'use client';

import { useState, useMemo, useEffect } from 'react';
import styles from './AdminProducts.module.css';
import { cx } from '@/lib/cx';
import { adminService, ApiError } from '@/lib/api';
import { useToast } from '@/components/providers/ToastProvider';
import Icon from '@/components/atoms/Icon/Icon';
import Button from '@/components/atoms/Button/Button';
import Input from '@/components/atoms/Input/Input';
import Select from '@/components/atoms/Select/Select';
import Badge from '@/components/atoms/Badge/Badge';
import Modal from '@/components/organisms/Modal/Modal';

/* — Ícone "atualizar" (lucide rotate-ccw) ausente no Icon.js — */
function RefreshIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" />
    </svg>
  );
}

const CURRENCY = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const NUMBER = new Intl.NumberFormat('pt-BR');

function brl(v) {
  const n = Number(v);
  return Number.isFinite(n) ? CURRENCY.format(n) : '—';
}
function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? NUMBER.format(n) : '0';
}

const PAGE_SIZE = 24;

/* — Status — */
const STATUS_BADGE = {
  active: { variant: 'success', label: 'Ativo' },
  paused: { variant: 'brand', label: 'Pausado' },
  draft: { variant: 'neutral', label: 'Rascunho' },
  sold: { variant: 'info', label: 'Vendido' },
  pending: { variant: 'neutral', label: 'Pendente' },
  rejected: { variant: 'danger', label: 'Rejeitado' },
  removed: { variant: 'danger', label: 'Removido' },
  inactive: { variant: 'neutral', label: 'Inativo' },
};
function statusBadge(status) {
  return STATUS_BADGE[status] || { variant: 'neutral', label: status || '—' };
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos os status' },
  { value: 'active', label: 'Ativos' },
  { value: 'paused', label: 'Pausados' },
  { value: 'draft', label: 'Rascunhos' },
  { value: 'sold', label: 'Vendidos' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'rejected', label: 'Rejeitados' },
];

/* — Destaque (boost) — */
const TIER_INFO = {
  silver: { label: 'Prata', variant: 'neutral', icon: 'star' },
  gold: { label: 'Ouro', variant: 'brand', icon: 'star' },
  diamond: { label: 'Diamante', variant: 'info', icon: 'gem' },
};
function tierInfo(tier) {
  return tier && tier !== 'none' ? TIER_INFO[tier] || null : null;
}

const HIGHLIGHT_OPTIONS = [
  { value: 'all', label: 'Todos os destaques' },
  { value: 'any', label: 'Com destaque' },
  { value: 'none', label: 'Sem destaque' },
  { value: 'silver', label: 'Prata' },
  { value: 'gold', label: 'Ouro' },
  { value: 'diamond', label: 'Diamante' },
];

const BOOST_TIERS = [
  { value: 'silver', label: 'Prata', icon: 'star' },
  { value: 'gold', label: 'Ouro', icon: 'star' },
  { value: 'diamond', label: 'Diamante', icon: 'gem' },
  { value: 'none', label: 'Remover destaque', icon: 'close' },
];

function errMessage(err, fallback) {
  if (err instanceof ApiError && err.message) return err.message;
  return fallback;
}

function expiresLabel(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const diffMs = d.getTime() - Date.now();
  if (diffMs <= 0) return 'expirado';
  const days = Math.floor(diffMs / 86400000);
  if (days >= 1) return `vence em ${days} dia${days === 1 ? '' : 's'}`;
  const hours = Math.max(1, Math.floor(diffMs / 3600000));
  return `vence em ${hours}h`;
}

/* — Normaliza o produto da API para o shape do componente — */
function mapApiProduct(p) {
  const images = Array.isArray(p.images) ? p.images : [];
  const cover = p.cover_image_url || images[0] || '';
  const tier = p.highlight_tier && p.highlight_tier !== 'none' ? p.highlight_tier : null;
  const seller = p.seller && typeof p.seller === 'object' ? p.seller : null;
  const category = p.category && typeof p.category === 'object' ? p.category : null;
  return {
    id: p.id,
    title: p.title || 'Sem título',
    price: Number(p.price) || 0,
    status: p.status || 'draft',
    highlightTier: tier,
    highlightExpiresAt: p.highlight_expires_at || null,
    cover,
    sellerId: (seller && seller.id) || p.seller_id || null,
    sellerName: (seller && (seller.name || seller.email)) || 'Vendedor',
    categoryName: (category && (category.name || category.slug)) || (typeof p.category === 'string' ? p.category : ''),
    stock: p.stock != null ? Number(p.stock) : null,
    views: Number(p.views_count) || 0,
  };
}

export default function AdminProducts() {
  const { toast } = useToast();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [sellerTerm, setSellerTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [highlightFilter, setHighlightFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Ação em andamento: `${id}:${action}` p/ loading granular nos botões.
  const [busy, setBusy] = useState(null);

  // Modais de destrutivos / boost.
  const [confirmDelete, setConfirmDelete] = useState(null); // produto
  const [deleteText, setDeleteText] = useState('');
  const [boostTarget, setBoostTarget] = useState(null); // produto
  const [boostTier, setBoostTier] = useState('gold');
  const [boostDays, setBoostDays] = useState(7);

  const loadProducts = async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await adminService.products('?limit=500');
      const list = Array.isArray(data) ? data : (data?.products || data?.data || []);
      setProducts(list.map(mapApiProduct));
    } catch (err) {
      setError(true);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset da paginação quando os filtros mudam.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [searchTerm, sellerTerm, statusFilter, highlightFilter]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const s = sellerTerm.trim().toLowerCase();
    return products.filter((p) => {
      const matchesQ = !q || p.title.toLowerCase().includes(q);
      const matchesSeller = !s || p.sellerName.toLowerCase().includes(s);
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      let matchesHighlight = true;
      if (highlightFilter === 'any') matchesHighlight = !!p.highlightTier;
      else if (highlightFilter === 'none') matchesHighlight = !p.highlightTier;
      else if (highlightFilter !== 'all') matchesHighlight = p.highlightTier === highlightFilter;
      return matchesQ && matchesSeller && matchesStatus && matchesHighlight;
    });
  }, [products, searchTerm, sellerTerm, statusFilter, highlightFilter]);

  const visible = filtered.slice(0, visibleCount);
  const activeCount = useMemo(() => products.filter((p) => p.status === 'active').length, [products]);
  const boostedCount = useMemo(() => products.filter((p) => p.highlightTier).length, [products]);

  const isBusy = (id, action) => busy === `${id}:${action}`;
  const anyBusy = !!busy;

  // Atualiza um item in-place a partir do payload retornado (sem refetch global).
  const applyUpdated = (id, apiProduct) => {
    if (apiProduct && typeof apiProduct === 'object' && apiProduct.id) {
      const mapped = mapApiProduct(apiProduct);
      setProducts((prev) => prev.map((p) => (p.id === id ? mapped : p)));
      return mapped;
    }
    return null;
  };
  const patchProduct = (id, patch) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  /* — Ver / Editar (nova aba) — */
  const openInNewTab = (path) => {
    if (typeof window !== 'undefined') window.open(path, '_blank', 'noopener,noreferrer');
  };

  /* — Ativar / Desativar — */
  const handleToggleStatus = async (product) => {
    if (anyBusy) return;
    const next = product.status === 'active' ? 'paused' : 'active';
    setBusy(`${product.id}:status`);
    try {
      const result = await adminService.setProductStatus(product.id, next);
      const updated = applyUpdated(product.id, result);
      if (!updated) patchProduct(product.id, { status: next });
      toast({
        title: next === 'active' ? 'Anúncio ativado' : 'Anúncio desativado',
        description: next === 'active'
          ? `"${product.title}" voltou a ficar visível.`
          : `"${product.title}" foi pausado e não aparece mais nas buscas.`,
        variant: 'success',
      });
    } catch (err) {
      toast({
        title: 'Não foi possível atualizar o status',
        description: errMessage(err, 'Tente novamente em instantes.'),
        variant: 'error',
      });
    } finally {
      setBusy(null);
    }
  };

  /* — Excluir — */
  const openDelete = (product) => {
    setDeleteText('');
    setConfirmDelete(product);
  };
  const closeDelete = () => {
    if (busy) return;
    setConfirmDelete(null);
    setDeleteText('');
  };
  const submitDelete = async () => {
    if (!confirmDelete) return;
    const product = confirmDelete;
    setBusy(`${product.id}:delete`);
    try {
      await adminService.deleteProduct(product.id);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      toast({
        title: 'Anúncio excluído',
        description: `"${product.title}" foi removido permanentemente.`,
        variant: 'success',
      });
      setConfirmDelete(null);
      setDeleteText('');
    } catch (err) {
      toast({
        title: 'Não foi possível excluir',
        description: errMessage(err, 'Tente novamente em instantes.'),
        variant: 'error',
      });
    } finally {
      setBusy(null);
    }
  };

  /* — Destacar / Boost — */
  const openBoost = (product) => {
    setBoostTier(product.highlightTier || 'gold');
    setBoostDays(7);
    setBoostTarget(product);
  };
  const closeBoost = () => {
    if (busy) return;
    setBoostTarget(null);
  };
  const submitBoost = async () => {
    if (!boostTarget) return;
    const product = boostTarget;
    const removing = boostTier === 'none';
    const days = Math.max(1, Number(boostDays) || 1);
    setBusy(`${product.id}:boost`);
    try {
      const result = await adminService.setProductBoost(product.id, {
        tier: boostTier,
        days: removing ? 0 : days,
      });
      const updated = applyUpdated(product.id, result);
      if (!updated) {
        patchProduct(product.id, {
          highlightTier: removing ? null : boostTier,
          highlightExpiresAt: removing ? null : new Date(Date.now() + days * 86400000).toISOString(),
        });
      }
      toast({
        title: removing ? 'Destaque removido' : 'Destaque aplicado',
        description: removing
          ? `"${product.title}" não está mais em destaque.`
          : `"${product.title}" agora é ${(TIER_INFO[boostTier]?.label || boostTier)} por ${days} dia${days === 1 ? '' : 's'}.`,
        variant: 'success',
      });
      setBoostTarget(null);
    } catch (err) {
      toast({
        title: 'Não foi possível alterar o destaque',
        description: errMessage(err, 'Tente novamente em instantes.'),
        variant: 'error',
      });
    } finally {
      setBusy(null);
    }
  };

  /* — Ações de uma linha/card (reutilizadas na tabela e no mobile) — */
  const RowActions = ({ product, stacked = false }) => {
    const isActive = product.status === 'active';
    return (
      <div className={stacked ? styles.actionStack : styles.rowActionBtns}>
        <Button
          size="sm"
          variant="outline"
          disabled={anyBusy}
          onClick={() => openInNewTab(`/produto/${product.id}`)}
          leftIcon="eye"
        >
          Ver
        </Button>
        <Button
          size="sm"
          variant="outline"
          className={isActive ? styles.btnPause : styles.btnActivate}
          loading={isBusy(product.id, 'status')}
          disabled={anyBusy}
          onClick={() => handleToggleStatus(product)}
          leftIcon={isActive ? 'lock' : 'check'}
        >
          {isActive ? 'Desativar' : 'Ativar'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={anyBusy}
          onClick={() => openInNewTab(`/editar-produto/${product.id}`)}
          leftIcon="edit"
        >
          Editar
        </Button>
        <Button
          size="sm"
          variant="outline"
          className={styles.btnBoost}
          disabled={anyBusy}
          onClick={() => openBoost(product)}
          leftIcon="star"
        >
          Destacar
        </Button>
        <Button
          size="sm"
          variant="outline"
          className={styles.btnDelete}
          disabled={anyBusy}
          onClick={() => openDelete(product)}
          leftIcon="trash"
        >
          Excluir
        </Button>
      </div>
    );
  };

  const HighlightCell = ({ product }) => {
    const info = tierInfo(product.highlightTier);
    if (!info) return <span className={styles.noHighlight}>—</span>;
    const exp = expiresLabel(product.highlightExpiresAt);
    return (
      <div className={styles.highlightCell}>
        <Badge variant={info.variant} size="sm">
          <Icon name={info.icon} size={12} /> {info.label}
        </Badge>
        {exp && <span className={styles.highlightExp}>{exp}</span>}
      </div>
    );
  };

  const Cover = ({ product, size = 44 }) => (
    <span className={styles.cover} style={{ width: size, height: size }}>
      {product.cover
        ? <img src={product.cover} alt={product.title} className={styles.coverImg} />
        : <Icon name="package" size={Math.round(size * 0.5)} />}
    </span>
  );

  const deleteReady = deleteText.trim().toUpperCase() === 'EXCLUIR';
  const deleteBusy = confirmDelete ? isBusy(confirmDelete.id, 'delete') : false;
  const boostBusy = boostTarget ? isBusy(boostTarget.id, 'boost') : false;

  return (
    <div className={styles.root}>
      <div className={styles.card}>
        <header className={styles.cardHead}>
          <h2 className={styles.cardTitle}><Icon name="package" size={20} /> Gerenciamento de Anúncios</h2>
          <Button variant="outline" size="sm" onClick={loadProducts} disabled={loading}>
            <RefreshIcon size={16} /> {loading ? 'Carregando…' : 'Atualizar'}
          </Button>
        </header>

        <div className={styles.cardBody}>
          {/* Contadores */}
          <div className={styles.counters}>
            <div className={styles.counterBox}>
              <span className={styles.counterLabel}>Total de Anúncios</span>
              <strong className={styles.counterValue}>{loading ? '—' : num(products.length)}</strong>
            </div>
            <div className={styles.counterBox}>
              <span className={styles.counterLabel}>Ativos</span>
              <strong className={styles.counterValue}>{loading ? '—' : num(activeCount)}</strong>
            </div>
            <div className={styles.counterBox}>
              <span className={styles.counterLabel}>Em destaque</span>
              <strong className={styles.counterValue}>{loading ? '—' : num(boostedCount)}</strong>
            </div>
            <div className={styles.counterBox}>
              <span className={styles.counterLabel}>Listados</span>
              <strong className={styles.counterValue}>{loading ? '—' : num(filtered.length)}</strong>
            </div>
          </div>

          {/* Filtros */}
          <div className={styles.filters}>
            <Input
              leftIcon="search"
              placeholder="Buscar por título..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Input
              leftIcon="user"
              placeholder="Filtrar por vendedor..."
              value={sellerTerm}
              onChange={(e) => setSellerTerm(e.target.value)}
            />
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={STATUS_OPTIONS} />
            <Select value={highlightFilter} onChange={(e) => setHighlightFilter(e.target.value)} options={HIGHLIGHT_OPTIONS} />
          </div>

          {/* Tabela (desktop) */}
          <div className={styles.tableWrap}>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Anúncio</th>
                    <th>Vendedor</th>
                    <th>Preço</th>
                    <th>Status</th>
                    <th>Destaque</th>
                    <th>Estoque</th>
                    <th>Views</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className={styles.empty}>
                        <span className={styles.loading}><span className={styles.spinner} aria-hidden="true" /> Carregando…</span>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={8} className={styles.empty}>
                        Não foi possível carregar os anúncios.{' '}
                        <button type="button" className={styles.retryLink} onClick={loadProducts}>Tentar novamente</button>
                      </td>
                    </tr>
                  ) : visible.length === 0 ? (
                    <tr>
                      <td colSpan={8} className={styles.empty}>
                        {products.length === 0 ? 'Nenhum anúncio cadastrado' : 'Nenhum anúncio corresponde aos filtros'}
                      </td>
                    </tr>
                  ) : (
                    visible.map((product) => (
                      <tr key={product.id} className={styles.row}>
                        <td>
                          <div className={styles.productCell}>
                            <Cover product={product} />
                            <div className={styles.productInfo}>
                              <div className={styles.productTitle}>{product.title}</div>
                              {product.categoryName && (
                                <div className={styles.productCat}>{product.categoryName}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td><div className={styles.sellerName}>{product.sellerName}</div></td>
                        <td><div className={styles.price}>{brl(product.price)}</div></td>
                        <td>
                          <Badge variant={statusBadge(product.status).variant} size="sm">
                            {statusBadge(product.status).label}
                          </Badge>
                        </td>
                        <td><HighlightCell product={product} /></td>
                        <td>
                          <span className={cx(styles.stock, product.stock === 0 && styles.stockOut)}>
                            {product.stock == null ? '—' : num(product.stock)}
                          </span>
                        </td>
                        <td><span className={styles.views}>{num(product.views)}</span></td>
                        <td>
                          <div className={styles.actionsCell}>
                            <RowActions product={product} />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cards (mobile) */}
          {!loading && !error && visible.length > 0 && (
            <div className={styles.cardsMobile}>
              {visible.map((product) => (
                <div key={product.id} className={styles.mobileCard}>
                  <div className={styles.mobileTop}>
                    <Cover product={product} size={56} />
                    <div className={styles.mobileInfo}>
                      <div className={styles.productTitle}>{product.title}</div>
                      <div className={styles.sellerName}>{product.sellerName}</div>
                      <div className={styles.price}>{brl(product.price)}</div>
                    </div>
                  </div>
                  <div className={styles.mobileMeta}>
                    <Badge variant={statusBadge(product.status).variant} size="sm">
                      {statusBadge(product.status).label}
                    </Badge>
                    <HighlightCell product={product} />
                    <span className={styles.metaPill}><Icon name="package" size={13} /> {product.stock == null ? '—' : num(product.stock)}</span>
                    <span className={styles.metaPill}><Icon name="eye" size={13} /> {num(product.views)}</span>
                  </div>
                  <RowActions product={product} stacked />
                </div>
              ))}
            </div>
          )}

          {/* Carregar mais */}
          {!loading && !error && filtered.length > visible.length && (
            <div className={styles.loadMore}>
              <Button variant="outline" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
                Carregar mais ({num(filtered.length - visible.length)} restantes)
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Modal — Excluir (confirmação forte) */}
      <Modal
        open={!!confirmDelete}
        onClose={closeDelete}
        size="sm"
        title="Excluir anúncio"
        footer={confirmDelete && (
          <div className={styles.confirmFooter}>
            <Button variant="outline" onClick={closeDelete} disabled={deleteBusy}>Cancelar</Button>
            <Button
              className={styles.btnDeleteSolid}
              loading={deleteBusy}
              disabled={deleteBusy || !deleteReady}
              onClick={submitDelete}
            >
              Excluir permanentemente
            </Button>
          </div>
        )}
      >
        {confirmDelete && (
          <div className={styles.confirmBody}>
            <p className={cx(styles.confirmLead, styles.confirmDanger)}>
              Esta ação é PERMANENTE e não pode ser desfeita. O anúncio "{confirmDelete.title}"
              de {confirmDelete.sellerName} será removido.
            </p>
            <label className={styles.confirmField}>
              <span>Para confirmar, digite <strong>EXCLUIR</strong></span>
              <Input
                value={deleteText}
                onChange={(e) => setDeleteText(e.target.value)}
                placeholder="EXCLUIR"
                disabled={deleteBusy}
              />
            </label>
          </div>
        )}
      </Modal>

      {/* Modal — Destacar / Boost */}
      <Modal
        open={!!boostTarget}
        onClose={closeBoost}
        size="sm"
        title="Destacar anúncio"
        footer={boostTarget && (
          <div className={styles.confirmFooter}>
            <Button variant="outline" onClick={closeBoost} disabled={boostBusy}>Cancelar</Button>
            <Button
              variant="primary"
              loading={boostBusy}
              disabled={boostBusy}
              onClick={submitBoost}
            >
              {boostTier === 'none' ? 'Remover destaque' : 'Aplicar destaque'}
            </Button>
          </div>
        )}
      >
        {boostTarget && (
          <div className={styles.confirmBody}>
            <p className={styles.confirmLead}>
              Presenteie um destaque para "{boostTarget.title}" sem cobrança.
            </p>

            {boostTarget.highlightTier && (
              <div className={styles.currentBoost}>
                <span>Destaque atual:</span>
                <HighlightCell product={boostTarget} />
              </div>
            )}

            <div className={styles.confirmField}>
              <span>Nível do destaque</span>
              <div className={styles.tierGrid}>
                {BOOST_TIERS.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    className={cx(styles.tierBtn, boostTier === t.value && styles.tierBtnOn, t.value === 'none' && styles.tierBtnNone)}
                    onClick={() => setBoostTier(t.value)}
                    aria-pressed={boostTier === t.value}
                    disabled={boostBusy}
                  >
                    <Icon name={t.icon} size={18} />
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {boostTier !== 'none' && (
              <label className={styles.confirmField}>
                <span>Duração (dias)</span>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={boostDays}
                  onChange={(e) => setBoostDays(e.target.value)}
                  disabled={boostBusy}
                />
              </label>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
