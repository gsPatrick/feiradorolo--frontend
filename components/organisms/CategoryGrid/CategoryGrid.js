'use client';

import Link from 'next/link';
import styles from './CategoryGrid.module.css';
import Icon from '../../atoms/Icon/Icon';

const CATEGORIES = [
  { emoji: '👗', label: 'Roupas Femininas' },
  { emoji: '👔', label: 'Roupas Masculinas' },
  { emoji: '💄', label: 'Beleza' },
  { emoji: '🏥', label: 'Saúde' },
  { emoji: '🏠', label: 'Eletrodomésticos' },
  { emoji: '👞', label: 'Sapatos Masculinos' },
  { emoji: '📱', label: 'Celulares e Dispositivos' },
  { emoji: '🧳', label: 'Viagens e Bagagens' },
  { emoji: '👜', label: 'Bolsas Femininas' },
  { emoji: '👠', label: 'Sapatos Femininos' },
  { emoji: '🎒', label: 'Bolsas Masculinas' },
  { emoji: '⌚', label: 'Relógios' },
  { emoji: '🎧', label: 'Áudio' },
  { emoji: '🍕', label: 'Alimentos e Bebidas' },
  { emoji: '🐕', label: 'Animais Domésticos' },
  { emoji: '👶', label: 'Mãe e Bebê' },
  { emoji: '🧒', label: 'Moda Infantil' },
  { emoji: '🎮', label: 'Jogos e Consoles' },
  { emoji: '📷', label: 'Câmeras e Drones' },
  { emoji: '🏡', label: 'Casa e Decoração' },
  { emoji: '⚽', label: 'Esportes e Atividades' },
  { emoji: '📝', label: 'Papelaria' },
  { emoji: '🎨', label: 'Hobbies e Coleções' },
  { emoji: '📚', label: 'Livros e Revistas' },
  { emoji: '💻', label: 'Computadores' },
  { emoji: '🚗', label: 'Peças para Veículos' },
  { emoji: '🎫', label: 'Ingressos e Serviços' },
];

const TONES = ['t0', 't1', 't2', 't3', 't4', 't5', 't6', 't7'];

export default function CategoryGrid() {
  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>Categorias</h2>
          <p className={styles.subtitle}>Encontre produtos por categoria</p>
        </div>
        <Link href="/categorias" className={styles.action}>
          Mostrar todas as categorias <Icon name="arrow-right" size={17} />
        </Link>
      </div>

      <div className={styles.grid}>
        {CATEGORIES.map((c, i) => (
          <Link key={c.label} href="/categorias" className={styles.item}>
            <span className={`${styles.circle} ${styles[TONES[i % TONES.length]]}`}>
              <span className={styles.emoji}>{c.emoji}</span>
            </span>
            <span className={styles.label}>{c.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
