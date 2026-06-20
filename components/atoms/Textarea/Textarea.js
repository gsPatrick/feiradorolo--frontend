'use client';

import { forwardRef } from 'react';
import styles from './Textarea.module.css';
import { cx } from '@/lib/cx';

const Textarea = forwardRef(function Textarea(
  { invalid = false, className, ...rest },
  ref
) {
  return (
    <textarea
      ref={ref}
      className={cx(styles.textarea, invalid && styles.invalid, className)}
      {...rest}
    />
  );
});

export default Textarea;
