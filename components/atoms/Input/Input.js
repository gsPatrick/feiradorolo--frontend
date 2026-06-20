'use client';

import { forwardRef } from 'react';
import styles from './Input.module.css';
import { cx } from '@/lib/cx';
import Icon from '../Icon/Icon';

const Input = forwardRef(function Input(
  {
    leftIcon,
    rightIcon,
    onRightIconClick,
    invalid = false,
    size = 'md',
    className,
    wrapperClassName,
    ...rest
  },
  ref
) {
  return (
    <div
      className={cx(
        styles.wrapper,
        styles[size],
        invalid && styles.invalid,
        rest.disabled && styles.disabled,
        wrapperClassName
      )}
    >
      {leftIcon && <Icon name={leftIcon} size={18} className={styles.left} />}
      <input ref={ref} className={cx(styles.input, className)} {...rest} />
      {rightIcon &&
        (onRightIconClick ? (
          <button type="button" className={styles.rightBtn} onClick={onRightIconClick} tabIndex={-1}>
            <Icon name={rightIcon} size={18} />
          </button>
        ) : (
          <Icon name={rightIcon} size={18} className={styles.right} />
        ))}
    </div>
  );
});

export default Input;
