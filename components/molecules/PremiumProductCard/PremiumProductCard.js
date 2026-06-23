'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './PremiumProductCard.module.css';
import { cx } from '@/lib/cx';
import Icon from '../../atoms/Icon/Icon';
import Skeleton from '../../atoms/Skeleton/Skeleton';
import VerifiedSeal from '../../atoms/VerifiedSeal/VerifiedSeal';
import { useToast } from '../../providers/ToastProvider';
import { useFavorites } from '../../providers/FavoritesProvider';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

// Selo de reputação textual (quando a API trouxer). Mapeia rótulos comuns para
// uma classe de cor; o texto vem direto do backend (reputation_label).
function reputationClass(label = '') {
  const l = String(label).toLowerCase();
  if (l.includes('líder') || l.includes('lider') || l.includes('platina') || l.includes('diamante')) return styles.repElite;
  if (l.includes('ouro') || l.includes('gold')) return styles.repGold;
  return styles.repDefault;
}

export default function PremiumProductCard({ product, loading = false, className }) {
  const router = useRouter();
  const { toast } = useToast();
  const { isFavorite, toggle } = useFavorites();

  if (loading || !product) {
    return (
      <div className={cx(styles.card, className)}>
        <div className={styles.media}>
          <Skeleton height={210} radius="0" style={{ display: 'block', width: '100%' }} />
        </div>
        <div className={styles.body}>
          <Skeleton height={44} radius="var(--r-md)" />
          <Skeleton height={16} width="85%" />
          <Skeleton height={16} width="60%" />
          <Skeleton height={28} width="50%" />
          <Skeleton height={44} radius="var(--r-md)" />
        </div>
      </div>
    );
  }

  const {
    id,
    title,
    image,
    price,
    oldPrice,
    installments = 3,
    freeShipping,
    sellerInfo,
  } = product;

  const href = id ? `/produto/${id}` : '#';
  const fav = isFavorite(id);

  const seller = sellerInfo && typeof sellerInfo === 'object' ? sellerInfo : null;
  const sellerName = (seller && (seller.name || seller.email)) || null;
  const sellerInitial = sellerName ? sellerName.trim().charAt(0).toUpperCase() : '?';
  const sellerRating = seller && Number(seller.rating) > 0 ? Number(seller.rating) : 0;
  const sellerSales = seller && Number(seller.sales_count) > 0 ? Number(seller.sales_count) : 0;
  const repLabel = (seller && seller.reputation_label) || null;

  // % OFF só quando há preço antigo coerente.
  const discount =
    oldPrice && oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;

  function goToProduct() {
    if (id) router.push(href);
  }

  function handleCardClick(e) {
    // Ignora cliques em links/botões internos (eles tratam a navegação).
    if (e.target.closest('a, button')) return;
    goToProduct();
  }

  function handleFav(e) {
    e.preventDefault();
    e.stopPropagation();
    const nowFav = toggle(product);
    if (nowFav === null) return; // deslogado: abriu o modal de login, sem toast.
    toast({
      title: nowFav ? '♥ Adicionado aos favoritos' : 'Removido dos favoritos',
      variant: nowFav ? 'success' : 'default',
      duration: 1000,
    });
  }

  return (
    <article
      className={cx(styles.card, className)}
      onClick={handleCardClick}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target === e.currentTarget) goToProduct();
      }}
      aria-label={title}
    >
      <div className={styles.media}>
        <span className={styles.premiumBadge}>
          <Icon name="gem" size={13} /> Destaque Diamante
        </span>

        <Link href={href} className={styles.mediaLink} aria-label={title} tabIndex={-1}>
          {image ? (
            <img src={image} alt={title} className={styles.image} loading="lazy" />
          ) : (
            <div className={styles.placeholder}>
              <Icon name="package" size={32} />
            </div>
          )}
        </Link>

        <button
          className={styles.fav}
          aria-label={fav ? 'Remover dos favoritos' : 'Favoritar'}
          aria-pressed={fav}
          type="button"
          onClick={handleFav}
          style={fav ? { color: 'var(--destructive)' } : undefined}
        >
          <Icon name="heart" size={18} fill={fav ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className={styles.body}>
        {/* Bloco do VENDEDOR em destaque — o diferencial da galeria premium. */}
        {sellerName && (
          <div className={styles.seller}>
            <span className={styles.avatar} aria-hidden="true">
              {seller.avatar_url ? (
                <img src={seller.avatar_url} alt="" className={styles.avatarImg} />
              ) : (
                sellerInitial
              )}
            </span>
            <span className={styles.sellerMeta}>
              <span className={styles.sellerName}>
                <span className={styles.sellerNameText}>{sellerName}</span>
                <VerifiedSeal seller={seller} size={15} />
              </span>
              <span className={styles.sellerTrust}>
                {sellerRating > 0 && (
                  <span className={styles.sellerRating}>
                    <Icon name="star" size={12} className={styles.starIcon} />
                    {sellerRating.toFixed(1).replace('.', ',')}
                  </span>
                )}
                {sellerSales > 0 && (
                  <span className={styles.sellerSales}>
                    {sellerRating > 0 && <i className={styles.dot}>•</i>}
                    {sellerSales} {sellerSales === 1 ? 'venda' : 'vendas'}
                  </span>
                )}
                {repLabel && (
                  <span className={cx(styles.repBadge, reputationClass(repLabel))}>{repLabel}</span>
                )}
                {!repLabel && sellerRating === 0 && sellerSales === 0 && (
                  <span className={styles.sellerVerifiedTxt}>Vendedor verificado</span>
                )}
              </span>
            </span>
          </div>
        )}

        <Link href={href} className={styles.titleLink} tabIndex={-1}>
          <h3 className={styles.title}>{title}</h3>
        </Link>

        <div className={styles.priceRow}>
          <span className={styles.price}>{BRL.format(price)}</span>
          {discount > 0 && <span className={styles.off}>-{discount}%</span>}
        </div>
        {oldPrice && oldPrice > price && (
          <span className={styles.oldPrice}>{BRL.format(oldPrice)}</span>
        )}
        <span className={styles.installments}>em até {installments}x sem juros</span>

        {freeShipping && (
          <span className={styles.shipping}>
            <Icon name="truck" size={13} /> Frete grátis
          </span>
        )}

        <div className={styles.actions}>
          <Link href={href} className={styles.primary} tabIndex={0}>
            <Icon name="store" size={16} /> Ver produto
          </Link>
        </div>
      </div>
    </article>
  );
}
