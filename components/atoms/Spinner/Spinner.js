import styles from './Spinner.module.css';
import { cx } from '@/lib/cx';

export default function Spinner({ size = 20, className, label = 'Carregando' }) {
  return (
    <span
      className={cx(styles.spinner, className)}
      style={{ width: size, height: size }}
      role="status"
      aria-label={label}
    />
  );
}
