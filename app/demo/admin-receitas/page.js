'use client';

import AdminRevenue from '@/components/organisms/admin/AdminRevenue/AdminRevenue';

export default function AdminReceitasDemoPage() {
  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-1)', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1024, margin: '0 auto' }}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--foreground)' }}>
            Painel Admin · Receitas
          </h1>
          <p style={{ color: 'var(--muted-foreground)', marginTop: 4 }}>
            Configurações da plataforma e relatórios de receita (dados mock).
          </p>
        </header>
        <AdminRevenue />
      </div>
    </main>
  );
}
