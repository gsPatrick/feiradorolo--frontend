'use client';

import AdminChatModeration from '@/components/organisms/admin/AdminChatModeration/AdminChatModeration';

export default function AdminChatDemoPage() {
  return (
    <main style={{ padding: '32px 24px', maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ marginBottom: 8 }}>Demo · Admin · Moderação de Chat</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
        Painel de moderação de denúncias e mensagens suspeitas do Feira do Rolo.
      </p>
      <AdminChatModeration />
    </main>
  );
}
