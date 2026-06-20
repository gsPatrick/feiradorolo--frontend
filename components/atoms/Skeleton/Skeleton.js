import styles from './Skeleton.module.css';
import { cx } from '@/lib/cx';

export default function Skeleton({ width, height, radius, circle, className, style }) {
  return (
    <span
      className={cx(styles.skeleton, circle && styles.circle, className)}
      style={{ width, height, borderRadius: circle ? '50%' : radius, ...style }}
      aria-hidden="true"
    />
  );
}
