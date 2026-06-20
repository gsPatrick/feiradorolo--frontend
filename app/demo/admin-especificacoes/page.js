'use client';

import AdminSpecifications from '@/components/organisms/admin/AdminSpecifications/AdminSpecifications';

export default function AdminEspecificacoesDemoPage() {
  return (
    <main style={{ padding: '48px 24px', maxWidth: 880, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 8 }}>Demo · Admin · Especificações</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
        Gerenciador de especificações (field_definitions) com navegação de categoria N1–N4.
      </p>

      <AdminSpecifications />
    </main>
  );
}
