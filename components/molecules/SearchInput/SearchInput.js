'use client';

import { useState } from 'react';
import styles from './SearchInput.module.css';
import { cx } from '@/lib/cx';
import Input from '../../atoms/Input/Input';
import Button from '../../atoms/Button/Button';

export default function SearchInput({
  value,
  onChange,
  onSubmit,
  placeholder = 'O que você procura hoje?',
  size = 'md',
  className,
}) {
  const [inner, setInner] = useState('');
  const controlled = value !== undefined;
  const current = controlled ? value : inner;

  function handleChange(e) {
    if (!controlled) setInner(e.target.value);
    onChange && onChange(e.target.value);
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit && onSubmit(current);
  }

  return (
    <form className={cx(styles.bar, className)} onSubmit={handleSubmit} role="search">
      <Input
        leftIcon="search"
        size={size}
        value={current}
        onChange={handleChange}
        placeholder={placeholder}
        wrapperClassName={styles.input}
        aria-label="Buscar"
      />
      <Button type="submit" variant="accent" size={size} leftIcon="search" className={styles.submit}>
        Buscar
      </Button>
    </form>
  );
}
