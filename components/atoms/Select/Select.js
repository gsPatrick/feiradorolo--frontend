'use client';

import { forwardRef } from 'react';
import styles from './Select.module.css';
import { cx } from '@/lib/cx';
import Icon from '../Icon/Icon';

/**
 * Select nativo estilizado. Aceita `options` ([{value,label}] ou strings) ou children.
 */
const Select = forwardRef(function Select(
  { options, placeholder, invalid = false, size = 'md', className, children, ...rest },
  ref
) {
  return (
    <div className={cx(styles.wrapper, styles[size], invalid && styles.invalid, rest.disabled && styles.disabled, className)}>
      <select ref={ref} className={styles.select} {...rest}>
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options
          ? options.map((o) => {
              const value = typeof o === 'string' ? o : o.value;
              const label = typeof o === 'string' ? o : o.label;
              return (
                <option key={value} value={value}>
                  {label}
                </option>
              );
            })
          : children}
      </select>
      <Icon name="chevron-down" size={16} className={styles.caret} />
    </div>
  );
});

export default Select;
