'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { cx } from '@/lib/cx';
import Icon from '@/components/atoms/Icon/Icon';
import Button from '@/components/atoms/Button/Button';
import { useToast } from '@/components/providers/ToastProvider';
import { useAuth } from '@/components/providers/AuthProvider';

import AdminOrders from '@/components/organisms/admin/AdminOrders/AdminOrders';
import AdminDisputes from '@/components/organisms/admin/AdminDisputes/AdminDisputes';
import AdminUsers from '@/components/organisms/admin/AdminUsers/AdminUsers';
import AdminChatModeration from '@/components/organisms/admin/AdminChatModeration/AdminChatModeration';
import AdminAnalytics from '@/components/organisms/admin/AdminAnalytics/AdminAnalytics';
import AdminRevenue from '@/components/organisms/admin/AdminRevenue/AdminRevenue';
import AdminEmails from '@/components/organisms/admin/AdminEmails/AdminEmails';
import AdminAudit from '@/components/organisms/admin/AdminAudit/AdminAudit';
import AdminSpecifications from '@/components/organisms/admin/AdminSpecifications/AdminSpecifications';
import AdminTesting from '@/components/organisms/admin/AdminTesting/AdminTesting';
import AdminSecurity from '@/components/organisms/admin/AdminSecurity/AdminSecurity';
import AdminNotifications from '@/components/organisms/admin/AdminNotifications/AdminNotifications';
import AdminPerformance from '@/components/organisms/admin/AdminPerformance/AdminPerformance';
import AdminCustomization from '@/components/organisms/admin/AdminCustomization/AdminCustomization';
import AdminIntegrations from '@/components/organisms/admin/AdminIntegrations/AdminIntegrations';
import AdminFinance from '@/components/organisms/admin/AdminFinance/AdminFinance';
import AdminPlans from '@/components/organisms/admin/AdminPlans/AdminPlans';

const TABS = [
  { k: 'orders', label: 'Pedidos', icon: 'package', Comp: AdminOrders },
  { k: 'disputes', label: 'Disputas', icon: 'shield', Comp: AdminDisputes },
  { k: 'users', label: 'Usuários', icon: 'user', Comp: AdminUsers },
  { k: 'chat', label: 'Chat', icon: 'chat', Comp: AdminChatModeration },
  { k: 'analytics', label: 'Analytics', icon: 'trending-up', Comp: AdminAnalytics },
  { k: 'revenue', label: 'Receitas', icon: 'dollar', Comp: AdminRevenue },
  { k: 'finance', label: 'Financeiro', icon: 'dollar', Comp: AdminFinance },
  { k: 'plans', label: 'Planos', icon: 'package', Comp: AdminPlans },
  { k: 'emails', label: 'Emails', icon: 'mail', Comp: AdminEmails },
  { k: 'audit', label: 'Auditoria', icon: 'eye', Comp: AdminAudit },
  { k: 'specifications', label: 'Especificações', icon: 'grid', Comp: AdminSpecifications },
  { k: 'testing', label: 'Testes', icon: 'bolt', Comp: AdminTesting },
  { k: 'security', label: 'Segurança', icon: 'shield', Comp: AdminSecurity },
  { k: 'notifications', label: 'Push', icon: 'bell', Comp: AdminNotifications },
  { k: 'performance', label: 'Performance', icon: 'sparkle', Comp: AdminPerformance },
  { k: 'customization', label: 'Personalização', icon: 'sparkle', Comp: AdminCustomization },
  { k: 'integrations', label: 'Integrações', icon: 'bolt', Comp: AdminIntegrations },
];

export default function AdminPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, authReady, openAuth, logout: authLogout } = useAuth();
  const [active, setActive] = useState('orders');

  const Current = (TABS.find((t) => t.k === active) || TABS[0]).Comp;
  const isAdmin = !!(user && (user.is_admin || user.admin_role));

  // "Voltar ao site": apenas navega de volta — NÃO desloga (a sessão continua).
  function logout() {
    router.push('/');
  }

  // ---- Gate de acesso: só admin entra ----
  if (!authReady) {
    return (
      <div className={styles.gate}>
        <Icon name="shield" size={32} />
        <p>Verificando acesso…</p>
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className={styles.gate}>
        <span className={styles.gateIcon}><Icon name="shield" size={34} /></span>
        <h1>Acesso restrito</h1>
        <p>{user ? 'Sua conta não tem permissão de administrador.' : 'Entre com uma conta de administrador para acessar o painel.'}</p>
        <div className={styles.gateActions}>
          {!user && <Button variant="primary" onClick={() => openAuth('login')}>Entrar</Button>}
          <Button variant="outline" href="/">Voltar ao site</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headInner}>
          <div className={styles.brand}>
            <span className={styles.brandIcon}><Icon name="shield" size={26} /></span>
            <div>
              <h1>Painel Administrativo</h1>
              <p>Feira do Rolo · gestão da plataforma</p>
            </div>
          </div>
          <button className={styles.logout} onClick={logout}>
            <Icon name="arrow-left" size={18} /> Voltar ao site
          </button>
        </div>

        <nav className={styles.tabs}>
          {TABS.map((t) => (
            <button
              key={t.k}
              className={cx(styles.tab, active === t.k && styles.tabActive)}
              onClick={() => setActive(t.k)}
            >
              <Icon name={t.icon} size={18} />
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      </header>

      <main className={styles.content}>
        <Current />
      </main>
    </div>
  );
}
