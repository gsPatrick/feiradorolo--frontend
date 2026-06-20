'use client';

import styles from './Checkbox.module.css';
import { cx } from '@/lib/cx';
import Icon from '../Icon/Icon';

export default function Checkbox({ checked = false, onChange, label, count, className }) {
  return (
    <label className={cx(styles.wrap, className)}>
      <input type="checkbox" className={styles.input} checked={checked} onChange={(e) => onChange && onChange(e.target.checked)} />
      <span className={styles.box}>{checked && <Icon name="check" size={13} strokeWidth={2.6} />}</span>
      <span className={styles.label}>{label}</span>
      {count != null && <span className={styles.count}>{count}</span>}
    </label>
  );
}
