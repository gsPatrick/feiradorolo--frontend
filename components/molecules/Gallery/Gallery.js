'use client';

import { useState } from 'react';
import styles from './Gallery.module.css';
import { cx } from '@/lib/cx';

export default function Gallery({ images = [], alt = '' }) {
  const [active, setActive] = useState(0);
  const list = images.length ? images : [null];

  return (
    <div className={styles.gallery}>
      <div className={styles.thumbs}>
        {list.map((src, i) => (
          <button
            key={i}
            className={cx(styles.thumb, i === active && styles.thumbActive)}
            onMouseEnter={() => setActive(i)}
            onClick={() => setActive(i)}
            aria-label={`Imagem ${i + 1}`}
          >
            {src && <img src={src} alt="" />}
          </button>
        ))}
      </div>
      <div className={styles.main}>
        {list[active] && <img src={list[active]} alt={alt} className={styles.mainImg} />}
      </div>
    </div>
  );
}
