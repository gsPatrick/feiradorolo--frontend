'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import styles from './ProductCard.module.css';
import { cx } from '@/lib/cx';
import Icon from '../../atoms/Icon/Icon';
import Skeleton from '../../atoms/Skeleton/Skeleton';
import HighlightBadge from '../../atoms/HighlightBadge/HighlightBadge';
import { useCart } from '../../providers/CartProvider';
import { useToast } from '../../providers/ToastProvider';
import { useFavorites } from '../../providers/FavoritesProvider';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ProductCard({ product, loading = false, className }) {
  const { addItem } = useCart();
  const { toast } = useToast();
  const { isFavorite, toggle } = useFavorites();
  const [added, setAdded] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  function handleAdd() {
    addItem({ id: product.id, title: product.title, price: product.price, image: product.image });
    toast({ title: '✓ Adicionado!', variant: 'success', duration: 1000 });
    setAdded(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(false), 1500);
  }

  function handleFav(e) {
    e.preventDefault();
    e.stopPropagation();
    const nowFav = toggle(product);
    toast({
      title: nowFav ? '♥ Adicionado aos favoritos' : 'Removido dos favoritos',
      variant: nowFav ? 'success' : 'default',
      duration: 1000,
    });
  }

  if (loading || !product) {
    return (
      <div className={cx(styles.card, className)}>
        <Skeleton height={190} radius="0" />
        <div className={styles.body}>
          <Skeleton height={14} width="80%" />
          <Skeleton height={12} width="50%" />
          <Skeleton height={20} width="45%" />
          <Skeleton height={40} radius="var(--r-md)" />
        </div>
      </div>
    );
  }

  const { title, price, image, rating = 0, reviewsCount = 0, sold = 0, installments = 3 } = product;
  const href = product.id ? `/produto/${product.id}` : '#';
  const fav = isFavorite(product.id);
  const hasReviews = reviewsCount > 0;

  return (
    <article className={cx(styles.card, className)}>
      <div className={styles.media}>
        {product.highlightTier && <HighlightBadge tier={product.highlightTier} />}
        <Link href={href} className={styles.mediaLink} aria-label={title}>
          {image ? (
            <img src={image} alt={title} className={styles.image} loading="lazy" />
          ) : (
            <div className={styles.placeholder}>
              <Icon name="package" size={28} />
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
        <Link href={href} className={styles.titleLink}>
          <h3 className={styles.title}>{title}</h3>
        </Link>
        <div className={styles.rating}>
          {hasReviews ? (
            <>
              <Icon name="star" size={14} className={styles.star} />
              <span>{rating.toFixed(1).replace('.', ',')}</span>
              <span className={styles.reviews}>({reviewsCount})</span>
            </>
          ) : (
            <span className={styles.newBadge}>Novo</span>
          )}
          {sold > 0 && (
            <>
              {hasReviews && <i>•</i>}
              <span>{sold} {sold === 1 ? 'venda' : 'vendas'}</span>
            </>
          )}
        </div>
        <div className={styles.price}>{BRL.format(price)}</div>
        <span className={styles.installments}>em até {installments}x sem juros</span>
        <button className={cx(styles.add, added && styles.added)} type="button" onClick={handleAdd}>
          <Icon name={added ? 'check' : 'cart'} size={17} />
          {added ? 'Adicionado!' : 'Adicionar'}
        </button>
      </div>
    </article>
  );
}
