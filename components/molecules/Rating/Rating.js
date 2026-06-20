import styles from './Rating.module.css';
import { cx } from '@/lib/cx';
import Icon from '../../atoms/Icon/Icon';

export default function Rating({ value = 0, sales, size = 14, className }) {
  const rounded = Math.round(value);
  return (
    <div className={cx(styles.rating, className)}>
      <span className={styles.stars}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Icon key={i} name="star" size={size} className={cx(styles.star, i <= rounded && styles.filled)} />
        ))}
      </span>
      <span className={styles.value}>{value.toFixed(1).replace('.', ',')}</span>
      {sales != null && (
        <>
          <i className={styles.dot}>•</i>
          <span className={styles.sales}>{sales} vendas</span>
        </>
      )}
    </div>
  );
}
