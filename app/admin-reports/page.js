'use client';

import AdminStandalone from '@/components/organisms/admin/AdminStandalone/AdminStandalone';
import AdminRevenue from '@/components/organisms/admin/AdminRevenue/AdminRevenue';

export default function AdminReportsPage() {
  return (
    <AdminStandalone title="Relatórios">
      <AdminRevenue />
    </AdminStandalone>
  );
}
