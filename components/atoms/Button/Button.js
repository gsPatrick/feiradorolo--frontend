'use client';

import styles from './Button.module.css';
import { cx } from '@/lib/cx';
import Icon from '../Icon/Icon';
import Spinner from '../Spinner/Spinner';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  loading = false,
  disabled = false,
  fullWidth = false,
  type = 'button',
  href,
  className,
  ...rest
}) {
  const iconOnly = !children && (leftIcon || rightIcon);
  const classes = cx(
    styles.button,
    styles[variant],
    styles[size],
    fullWidth && styles.fullWidth,
    iconOnly && styles.iconOnly,
    loading && styles.loading,
    className
  );

  const content = (
    <>
      {loading && <Spinner size={size === 'sm' ? 14 : 18} className={styles.spinner} />}
      {!loading && leftIcon && <Icon name={leftIcon} size={size === 'sm' ? 16 : 18} />}
      {children && <span className={styles.label}>{children}</span>}
      {!loading && rightIcon && <Icon name={rightIcon} size={size === 'sm' ? 16 : 18} />}
    </>
  );

  if (href) {
    return (
      <a href={href} className={classes} {...rest}>
        {content}
      </a>
    );
  }

  return (
    <button type={type} className={classes} disabled={disabled || loading} {...rest}>
      {content}
    </button>
  );
}
