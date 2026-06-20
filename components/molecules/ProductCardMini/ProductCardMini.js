import styles from './ProductCardMini.module.css';
import { cx } from '@/lib/cx';
import Badge from '../../atoms/Badge/Badge';
import Skeleton from '../../atoms/Skeleton/Skeleton';
import Icon from '../../atoms/Icon/Icon';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const TIERS = {
  silver: { label: 'Prata', variant: 'silver' },
  gold: { label: 'Ouro', variant: 'gold' },
  diamond: { label: 'Diamante', variant: 'diamond' },
};

export default function ProductCardMini({ product, loading = false, href, className }) {
  if (loading || !product) {
    return (
      <div className={cx(styles.card, className)}>
        <Skeleton height={170} radius="var(--r-md)" />
        <div className={styles.body}>
          <Skeleton height={14} width="85%" />
          <Skeleton height={14} width="55%" />
          <Skeleton height={22} width="40%" />
        </div>
      </div>
    );
  }

  const { title, price, oldPrice, image, seller, tier, freeShipping } = product;
  const tierInfo = tier && tier !== 'none' ? TIERS[tier] : null;
  const discount = oldPrice && oldPrice > price ? Math.round((1 - price / oldPrice) * 100) : null;
  const Wrapper = href ? 'a' : 'div';

  return (
    <Wrapper href={href} className={cx(styles.card, className)}>
      <div className={styles.media}>
        {image ? (
          <img src={image} alt={title} className={styles.image} loading="lazy" />
        ) : (
          <div className={styles.placeholder}>
            <Icon name="package" size={28} />
          </div>
        )}
        <div className={styles.topRow}>
          {tierInfo && (
            <Badge variant={tierInfo.variant} size="sm">
              <Icon name="sparkle" size={11} /> {tierInfo.label}
            </Badge>
          )}
          {discount && (
            <Badge variant="danger" size="sm">
              -{discount}%
            </Badge>
          )}
        </div>
        <button className={styles.fav} aria-label="Favoritar" type="button">
          <Icon name="heart" size={17} />
        </button>
      </div>

      <div className={styles.body}>
        <h3 className={styles.title}>{title}</h3>
        {seller && <span className={styles.seller}>{seller}</span>}
        <div className={styles.priceRow}>
          <span className={styles.price}>{BRL.format(price)}</span>
          {oldPrice && oldPrice > price && (
            <span className={styles.old}>{BRL.format(oldPrice)}</span>
          )}
        </div>
        {freeShipping && (
          <span className={styles.shipping}>
            <Icon name="package" size={13} /> Frete grátis
          </span>
        )}
      </div>
    </Wrapper>
  );
}
