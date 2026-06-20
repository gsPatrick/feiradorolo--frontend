'use client';

import styles from './ProductSection.module.css';
import Icon from '../../atoms/Icon/Icon';
import Badge from '../../atoms/Badge/Badge';
import ProductCard from '../../molecules/ProductCard/ProductCard';
import EmptyState from '../../molecules/EmptyState/EmptyState';

export default function ProductSection({
  icon,
  iconColor = '#ea580c',
  title,
  subtitle,
  badge,
  products = [],
  loading = false,
  actionLabel,
  actionHref = '#',
}) {
  const items = loading ? Array.from({ length: 6 }) : products;
  const isEmpty = !loading && items.length === 0;

  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <div className={styles.heading}>
          {icon && (
            <span className={styles.icon} style={{ color: iconColor }}>
              <Icon name={icon} size={24} />
            </span>
          )}
          <div>
            <h2 className={styles.title}>
              {title}
              {badge && (
                <Badge variant="info" size="sm" className={styles.badge}>
                  {badge}
                </Badge>
              )}
            </h2>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
        </div>
        {actionLabel && (
          <a href={actionHref} className={styles.action}>
            {actionLabel}
          </a>
        )}
      </div>

      {isEmpty ? (
        <EmptyState
          icon="package"
          title="Nenhum produto por aqui ainda"
          description="Volte em breve — novos produtos chegam toda hora na Feira do Rolo."
        />
      ) : (
        <div className={styles.grid}>
          {items.map((p, i) => (
            <ProductCard key={p?.id || i} product={p} loading={loading} />
          ))}
        </div>
      )}
    </section>
  );
}
