import Link from 'next/link';
import styles from './Breadcrumb.module.css';
import { cx } from '@/lib/cx';
import Icon from '../../atoms/Icon/Icon';

export default function Breadcrumb({ items = [], className }) {
  return (
    <nav className={cx(styles.crumb, className)} aria-label="Trilha">
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <span key={i} className={styles.item}>
            {item.href && !last ? <Link href={item.href}>{item.label}</Link> : <span className={last ? styles.current : ''}>{item.label}</span>}
            {!last && <Icon name="chevron-down" size={14} className={styles.sep} />}
          </span>
        );
      })}
    </nav>
  );
}
