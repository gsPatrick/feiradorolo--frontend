'use client';

import AdminAnalytics from '@/components/organisms/admin/AdminAnalytics/AdminAnalytics';

export default function AdminAnalyticsDemoPage() {
  return (
    <main style={{ minHeight: '100vh', padding: '24px', background: 'var(--bg-1)' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <AdminAnalytics />
      </div>
    </main>
  );
}
