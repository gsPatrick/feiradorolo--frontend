'use client';

import AdminStandalone from '@/components/organisms/admin/AdminStandalone/AdminStandalone';
import AdminChatModeration from '@/components/organisms/admin/AdminChatModeration/AdminChatModeration';

export default function ChatPage() {
  return (
    <AdminStandalone title="Chat & Moderação">
      <AdminChatModeration />
    </AdminStandalone>
  );
}
