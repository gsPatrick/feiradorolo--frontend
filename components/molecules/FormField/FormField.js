'use client';

import { useId } from 'react';
import styles from './FormField.module.css';
import { cx } from '@/lib/cx';
import Input from '../../atoms/Input/Input';

export default function FormField({
  label,
  id,
  required = false,
  error,
  helper,
  className,
  ...inputProps
}) {
  const autoId = useId();
  const fieldId = id || autoId;
  const describedBy = error || helper ? `${fieldId}-msg` : undefined;

  return (
    <div className={cx(styles.field, className)}>
      {label && (
        <label htmlFor={fieldId} className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      <Input id={fieldId} invalid={!!error} aria-describedby={describedBy} {...inputProps} />
      {(error || helper) && (
        <span id={describedBy} className={cx(styles.message, error && styles.error)}>
          {error || helper}
        </span>
      )}
    </div>
  );
}
