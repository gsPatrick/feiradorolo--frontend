'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './page.module.css';
import DashboardLayout from '@/components/templates/DashboardLayout/DashboardLayout';
import Rating from '@/components/molecules/Rating/Rating';
import EmptyState from '@/components/molecules/EmptyState/EmptyState';
import Skeleton from '@/components/atoms/Skeleton/Skeleton';
import Button from '@/components/atoms/Button/Button';
import { reviewService } from '@/lib/api';
import { useAuth } from '@/components/providers/AuthProvider';

function fmtDate(s) {
  try {
    return new Date(s).toLocaleDateString('pt-BR');
  } catch {
    return '';
  }
}

export default function AvaliacoesPage() {
  const { openAuth } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [needLogin, setNeedLogin] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    reviewService
      .listMine()
      .then((data) => active && setReviews(Array.isArray(data) ? data : []))
      .catch((err) => {
        if (!active) return;
        setReviews([]);
        if (err && err.status === 401) setNeedLogin(true);
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const avg = useMemo(
    () => (reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0),
    [reviews]
  );

  return (
    <DashboardLayout active="avaliacoes" title="Minhas Avaliações">
      {loading ? (
        <div className={styles.list}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className={styles.review}>
              <Skeleton width={80} height={80} radius="var(--r-md)" />
              <div className={styles.body} style={{ flex: 1 }}>
                <Skeleton height={16} width="60%" />
                <Skeleton height={14} width="30%" />
                <Skeleton height={14} width="90%" />
              </div>
            </div>
          ))}
        </div>
      ) : needLogin ? (
        <EmptyState
          icon="star"
          title="Entre para ver suas avaliações"
          description="Faça login para acompanhar as avaliações que você já fez."
          action={<Button variant="primary" onClick={() => openAuth('login')} rightIcon="arrow-right">Entrar</Button>}
        />
      ) : reviews.length === 0 ? (
        <EmptyState
          icon="star"
          title="Você ainda não avaliou nada"
          description="Avalie os produtos que comprou e ajude outros compradores."
          action={<Button variant="primary" href="/minha-conta">Ver meus pedidos</Button>}
        />
      ) : (
        <>
          <div className={styles.summary}>
            <div><strong>{reviews.length}</strong><span>avaliações</span></div>
            <div><strong>{avg.toFixed(1).replace('.', ',')}</strong><span>nota média</span></div>
          </div>
          <div className={styles.list}>
            {reviews.map((r) => {
              const img = (r.product && Array.isArray(r.product.images) && r.product.images[0]) || '';
              return (
                <div key={r.id} className={styles.review}>
                  {img ? <img src={img} alt="" className={styles.thumb} /> : <span className={styles.thumb} />}
                  <div className={styles.body}>
                    <div className={styles.top}>
                      <strong>{(r.product && r.product.title) || 'Produto'}</strong>
                    </div>
                    <Rating value={r.rating} className={styles.rating} />
                    {r.title && <strong className={styles.rTitle}>{r.title}</strong>}
                    <p className={styles.comment}>{r.comment}</p>
                    <span className={styles.date}>Avaliado em {fmtDate(r.createdAt || r.created_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
