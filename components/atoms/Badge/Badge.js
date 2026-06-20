import styles from './Badge.module.css';
import { cx } from '@/lib/cx';

export default function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className,
}) {
  return (
    <span className={cx(styles.badge, styles[variant], styles[size], className)}>
      {dot && <span className={styles.dot} />}
      {children}
    </span>
  );
}
