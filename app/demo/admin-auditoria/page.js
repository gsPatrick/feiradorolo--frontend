'use client';

import AdminAudit from '@/components/organisms/admin/AdminAudit/AdminAudit';

export default function AdminAuditoriaDemoPage() {
  return (
    <main style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 20px' }}>
      <header style={{ marginBottom: 28 }}>
        <h1 style={{ marginBottom: 6 }}>Painel Admin · Auditoria</h1>
        <p style={{ color: 'var(--muted-foreground)' }}>
          Logs de auditoria e segurança, conformidade LGPD e exportação de registros.
        </p>
      </header>

      <AdminAudit />
    </main>
  );
}
