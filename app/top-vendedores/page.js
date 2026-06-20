'use client';

import AdminStandalone from '@/components/organisms/admin/AdminStandalone/AdminStandalone';
import AdminAnalytics from '@/components/organisms/admin/AdminAnalytics/AdminAnalytics';

export default function TopVendedoresPage() {
  return (
    <AdminStandalone title="Top Vendedores">
      <AdminAnalytics />
    </AdminStandalone>
  );
}
