'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import styles from './page.module.css';
import Button from '@/components/atoms/Button/Button';
import Icon from '@/components/atoms/Icon/Icon';
import ProductCard from '@/components/molecules/ProductCard/ProductCard';
import SellerTrust from '@/components/molecules/SellerTrust/SellerTrust';
import VerifiedSeal from '@/components/atoms/VerifiedSeal/VerifiedSeal';
import { cx } from '@/lib/cx';
import { productService, mapProduct, chatService } from '@/lib/api';
import { useToast } from '@/components/providers/ToastProvider';

const AVATAR_KEYS = ['blue', 'green', 'amber', 'red', 'violet', 'pink'];

const SORTS = [
  { key: 'relevance', label: 'Mais relevantes' },
  { key: 'recent', label: 'Mais recentes' },
  { key: 'price_asc', label: 'Menor preço' },
  { key: 'price_desc', label: 'Maior preço' },
];

function Calendar({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
function CheckCircle({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.5 2.5 4.5-4.5" />
    </svg>
  );
}
function Medal({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7.5 3h9l-3 7h-3z" /><circle cx="12" cy="16" r="5" /><path d="M12 14v4M10 16h4" />
    </svg>
  );
}

function Shield({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" />
    </svg>
  );
}

const VERIFICATION = [
  { label: 'Não verificado', cls: 'verifL0', title: 'Vendedor ainda não verificado' },
  { label: 'E-mail e telefone verificados', cls: 'verifL1', title: 'E-mail e telefone verificados' },
  { label: 'Documento validado', cls: 'verifL2', title: 'Documento de identidade validado' },
  { label: 'Verificação facial', cls: 'verifL3', title: 'Verificação facial concluída — nível máximo' },
];

function SellerVerificationBadge({ level = 0 }) {
  const v = VERIFICATION[Math.max(0, Math.min(3, level))] || VERIFICATION[0];
  return (
    <span className={cx(styles.verifBadge, styles[v.cls])} title={v.title}>
      <Shield size={13} /> {v.label}
    </span>
  );
}

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const slugify = (s) =>
  String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export default function LojaPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const rawStoreName = params.storeName || '';
  const storeName = decodeURIComponent(rawStoreName);

  const [raw, setRaw] = useState([]); // produtos crus da API (p/ avatar, categorias)
  const [products, setProducts] = useState([]); // mapeados p/ ProductCard
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // UI state
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('relevance');
  const [activeCat, setActiveCat] = useState('all');
  const [following, setFollowing] = useState(false);

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storeName);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    productService
      .list(isUuid ? `?seller_id=${storeName}&limit=96` : '?limit=96')
      .then((d) => {
        if (!alive) return;
        let list = Array.isArray(d) ? d : [];
        if (!isUuid) {
          list = list.filter((p) => slugify((p.seller && p.seller.name) || '') === slugify(storeName));
        }
        setRaw(list);
        setProducts(list.map(mapProduct).filter(Boolean));
      })
      .catch(() => {
        if (!alive) return;
        setError(true);
        setRaw([]);
        setProducts([]);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [storeName, isUuid]);

  // Vendedor
  const seller = raw[0] && raw[0].seller;
  const name = (seller && seller.name) || (isUuid ? 'Loja' : storeName.replace(/-/g, ' ')) || 'Loja';
  const avatarUrl = (seller && seller.avatar_url) || '';
  const sellerId = (seller && seller.id) || (isUuid ? storeName : null);

  const colorKey = AVATAR_KEYS[(name.length || 0) % AVATAR_KEYS.length];
  const initials = name.trim().slice(0, 2).toUpperCase();

  // Métricas reais do vendedor (vindas da API) com fallbacks seguros
  const sellerRating = Number(seller && seller.rating) || 0;
  const sellerReviews = Number(seller && seller.reviews_count) || 0;
  const salesCount = Number(seller && seller.sales_count) || 0;
  const productsCount = seller && seller.products_count != null ? Number(seller.products_count) : null;
  const sellerTier = (seller && seller.seller_tier) || 'standard';
  const verificationLevel = Math.max(0, Math.min(3, Number(seller && seller.verification_level) || 0));
  const reputationLabel = (seller && seller.reputation_label) || null;
  const sellerStatus = (seller && seller.status) || 'active';
  const chatOnly = !!(seller && seller.chat_only);
  const memberSince = seller && seller.member_since ? Number(seller.member_since) : null;

  // Categorias derivadas dos produtos do vendedor
  const categories = useMemo(() => {
    const map = new Map();
    raw.forEach((p) => {
      const c = p.category;
      if (!c || !c.slug) return;
      const cur = map.get(c.slug) || { slug: c.slug, name: c.name, icon: c.icon || '', count: 0 };
      cur.count += 1;
      map.set(c.slug, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [raw]);

  // Filtro + ordenação client-side
  const visible = useMemo(() => {
    let list = products;
    if (activeCat !== 'all') list = list.filter((p) => p.category === activeCat);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.brand && p.brand.toLowerCase().includes(q)) ||
          (p.category && p.category.includes(q))
      );
    }
    const arr = [...list];
    if (sort === 'price_asc') arr.sort((a, b) => a.price - b.price);
    else if (sort === 'price_desc') arr.sort((a, b) => b.price - a.price);
    else if (sort === 'recent') arr.reverse();
    return arr;
  }, [products, activeCat, query, sort]);

  function handleFollow() {
    const next = !following;
    setFollowing(next);
    toast({
      title: next ? `Seguindo ${name}` : `Deixou de seguir ${name}`,
      variant: next ? 'success' : 'default',
      duration: 1400,
    });
  }

  async function handleChat() {
    if (!sellerId) return;
    try {
      const chat = await chatService.open(sellerId);
      router.push(chat && chat.id ? `/mensagens?chat=${chat.id}` : '/mensagens');
    } catch (e) {
      const msg = e && e.status === 401 ? 'Faça login para conversar com o vendedor.' : 'Não foi possível abrir a conversa agora.';
      toast({ title: msg, variant: e && e.status === 401 ? 'default' : 'destructive', duration: 1800 });
    }
  }

  const minPrice = products.length ? Math.min(...products.map((p) => p.price)) : 0;

  return (
    <main className={styles.page}>
      <div className={styles.topbar}>
        <div className={styles.topInner}>
          <Button variant="ghost" size="sm" leftIcon="arrow-left" onClick={() => router.back()}>Voltar</Button>
        </div>
      </div>

      {/* Banner / cabeçalho da loja */}
      <header className={styles.banner}>
        <div className={styles.bannerGlow} aria-hidden="true" />
        <div className={styles.bannerInner}>
          <div className={styles.identity}>
            <span style={{ position: 'relative', display: 'inline-block', flexShrink: 0 }}>
              <div className={cx(styles.avatar, styles[`av_${colorKey}`])}>
                {avatarUrl ? <img src={avatarUrl} alt={name} className={styles.avatarImg} /> : initials}
              </div>
              {seller && <VerifiedSeal overlay seller={seller} size={22} />}
            </span>
            <div className={styles.identityText}>
              <div className={styles.nameRow}>
                <h1 className={styles.storeName}>{name}</h1>
                <span className={styles.verified} title="Loja verificada"><CheckCircle size={20} /></span>
              </div>
              <div className={styles.badges}>
                {reputationLabel && (
                  <span className={cx(styles.repBadge, reputationLabel === 'Vendedor Platinum' && styles.repPlatinum)}>
                    <Medal size={14} /> {reputationLabel}
                  </span>
                )}
                {sellerTier === 'premium' && (
                  <span className={styles.premiumBadge}>
                    <Icon name="gem" size={13} /> Premium
                  </span>
                )}
                <SellerVerificationBadge level={verificationLevel} />
                {memberSince && (
                  <span className={styles.locBadge}><Calendar size={13} /> Desde {memberSince}</span>
                )}
              </div>
              {(sellerStatus !== 'active' || chatOnly) && (
                <div className={styles.statusRow}>
                  {sellerStatus === 'suspended' && (
                    <span className={cx(styles.statusBadge, styles.statusWarn)}>
                      <Icon name="bell" size={13} /> Vendedor suspenso
                    </span>
                  )}
                  {sellerStatus === 'banned' && (
                    <span className={cx(styles.statusBadge, styles.statusDanger)}>
                      <Icon name="bell" size={13} /> Conta indisponível
                    </span>
                  )}
                  {chatOnly && sellerStatus === 'active' && (
                    <span className={cx(styles.statusBadge, styles.statusInfo)}>
                      <Icon name="chat" size={13} /> Apenas chat
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className={styles.headerActions}>
            <Button
              variant={following ? 'secondary' : 'primary'}
              size="md"
              leftIcon={following ? 'check' : 'plus'}
              onClick={handleFollow}
            >
              {following ? 'Seguindo' : 'Seguir'}
            </Button>
            {sellerId && (
              <Button variant="outline" size="md" leftIcon="chat" onClick={handleChat}>
                Falar com o vendedor
              </Button>
            )}
          </div>
        </div>

        {/* Faixa de métricas */}
        <div className={styles.metricsBar}>
          <div className={styles.metric}>
            <strong className={styles.metricValue}>
              {sellerReviews > 0 ? (
                <>
                  <Icon name="star" size={16} className={styles.starIcon} />
                  {sellerRating.toFixed(1).replace('.', ',')}
                </>
              ) : (
                'Novo'
              )}
            </strong>
            <span className={styles.metricLabel}>
              {sellerReviews > 0 ? `Reputação · ${sellerReviews}` : 'Reputação'}
            </span>
          </div>
          <span className={styles.metricSep} aria-hidden="true" />
          <div className={styles.metric}>
            <strong className={styles.metricValue}>
              {loading ? '—' : productsCount != null ? productsCount : products.length}
            </strong>
            <span className={styles.metricLabel}>Produtos</span>
          </div>
          <span className={styles.metricSep} aria-hidden="true" />
          <div className={styles.metric}>
            <strong className={styles.metricValue}>{salesCount}</strong>
            <span className={styles.metricLabel}>Vendas</span>
          </div>
          <span className={styles.metricSep} aria-hidden="true" />
          <div className={styles.metric}>
            <strong className={styles.metricValue}>{minPrice > 0 ? BRL.format(minPrice) : '—'}</strong>
            <span className={styles.metricLabel}>A partir de</span>
          </div>
        </div>
      </header>

      <div className={styles.container}>
        {/* Bloco de confiança/segurança do vendedor — checklist item a item */}
        {!loading && seller && (
          <section className={styles.trustSection} aria-label="Segurança do vendedor">
            <h2 className={styles.trustTitle}>
              <Shield size={17} /> Segurança e verificações
            </h2>
            <p className={styles.trustHint}>
              Veja o que este vendedor já validou antes de comprar.
            </p>
            <SellerTrust seller={seller} />
          </section>
        )}

        {/* Barra de busca + ordenação */}
        <div className={styles.toolbar}>
          <div className={styles.searchBox}>
            <Icon name="search" size={18} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder={`Buscar nos produtos de ${name}`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Buscar na loja"
            />
            {query && (
              <button type="button" className={styles.searchClear} onClick={() => setQuery('')} aria-label="Limpar busca">
                <Icon name="close" size={16} />
              </button>
            )}
          </div>
          <label className={styles.sortBox}>
            <Icon name="filter" size={16} className={styles.sortIcon} />
            <select className={styles.sortSelect} value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Ordenar">
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
            <Icon name="chevron-down" size={16} className={styles.sortChevron} />
          </label>
        </div>

        {/* Chips de categorias */}
        {categories.length > 0 && (
          <div className={styles.chips}>
            <button
              type="button"
              className={cx(styles.chip, activeCat === 'all' && styles.chipActive)}
              onClick={() => setActiveCat('all')}
            >
              <Icon name="grid" size={14} /> Todos
              <span className={styles.chipCount}>{products.length}</span>
            </button>
            {categories.map((c) => (
              <button
                key={c.slug}
                type="button"
                className={cx(styles.chip, activeCat === c.slug && styles.chipActive)}
                onClick={() => setActiveCat(c.slug)}
              >
                {c.icon ? <span className={styles.chipEmoji}>{c.icon}</span> : <Icon name="tag" size={14} />}
                {c.name}
                <span className={styles.chipCount}>{c.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Cabeçalho da seção */}
        <div className={styles.productsHead}>
          <h2>Produtos</h2>
          <p>
            {loading
              ? 'Carregando…'
              : error
              ? 'Erro ao carregar'
              : `${visible.length} ${visible.length === 1 ? 'item encontrado' : 'itens encontrados'}`}
          </p>
        </div>

        {/* Grid / estados */}
        {loading ? (
          <div className={styles.grid}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className={styles.cardWrap}>
                <ProductCard loading />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className={styles.state}>
            <div className={cx(styles.stateIcon, styles.stateError)}><Icon name="bell" size={32} /></div>
            <p className={styles.stateTitle}>Não foi possível carregar a loja</p>
            <p className={styles.stateText}>Verifique sua conexão e tente novamente.</p>
            <Button variant="primary" size="md" leftIcon="arrow-right" onClick={() => router.refresh()}>Tentar de novo</Button>
          </div>
        ) : products.length === 0 ? (
          <div className={styles.state}>
            <div className={styles.stateIcon}><Icon name="store" size={32} /></div>
            <p className={styles.stateTitle}>Este vendedor ainda não tem produtos</p>
            <p className={styles.stateText}>Volte mais tarde para conferir as novidades desta loja.</p>
          </div>
        ) : visible.length === 0 ? (
          <div className={styles.state}>
            <div className={styles.stateIcon}><Icon name="search" size={32} /></div>
            <p className={styles.stateTitle}>Nenhum produto encontrado</p>
            <p className={styles.stateText}>Tente outra busca ou remova os filtros.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setQuery('');
                setActiveCat('all');
              }}
            >
              Limpar filtros
            </Button>
          </div>
        ) : (
          <div className={styles.grid}>
            {visible.map((p) => (
              <div key={p.id} className={styles.cardWrap}>
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
