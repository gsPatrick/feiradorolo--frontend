'use client';

import { useState, useMemo, useEffect } from 'react';
import styles from './AdminUsers.module.css';
import { cx } from '@/lib/cx';
import { adminService, ApiError } from '@/lib/api';
import { useToast } from '@/components/providers/ToastProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import Icon from '@/components/atoms/Icon/Icon';
import Button from '@/components/atoms/Button/Button';
import Input from '@/components/atoms/Input/Input';
import Select from '@/components/atoms/Select/Select';
import Badge from '@/components/atoms/Badge/Badge';
import Modal from '@/components/organisms/Modal/Modal';

/* — Ícones lucide ausentes no Icon.js (SVG inline) — */
function Lucide({ name, size = 16 }) {
  const paths = {
    'rotate-ccw': <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

/* — Map do shape REAL da API → shape interno do componente — */
const ACCOUNT_STATUS_MAP = {
  active: 'active',
  suspended: 'suspended',
  banned: 'banned',
  pending: 'pending',
  inactive: 'suspended',
};

const ROLE_BY_KEY = {
  admin: { value: 'admin', label: 'Admin' },
  seller: { value: 'seller', label: 'Vendedor' },
  buyer: { value: 'buyer', label: 'Comprador' },
};

function mapApiUser(u) {
  const fullName = (u.name || '').trim();

  const isBusiness = u.person_type === 'pj' || u.person_type === 'business' || (!!u.cnpj && !u.cpf);
  const documentType = isBusiness ? 'cnpj' : 'cpf';
  const cpfCnpj = isBusiness ? (u.cnpj || '') : (u.cpf || '');

  const role = u.is_admin ? 'admin' : (u.is_seller ? 'seller' : 'buyer');
  const status = ACCOUNT_STATUS_MAP[u.account_status] || 'active';

  return {
    id: u.id,
    name: fullName || u.email || 'Usuário',
    email: u.email || '',
    phone: u.phone || '',
    avatarUrl: u.avatar_url || null,
    cpfCnpj,
    documentType,
    accountType: isBusiness ? 'business' : 'individual',
    personType: u.person_type || null,
    isSeller: !!u.is_seller,
    sellerTier: u.seller_tier || null,
    isAdmin: !!u.is_admin,
    adminRole: u.admin_role || null,
    status,
    accountStatus: u.account_status || null,
    role,
    chatOnly: !!u.is_shadowbanned,
    hasFirstSale: !!u.has_first_sale,
    hasFirstPurchase: !!u.has_first_purchase,
    createdAt: u.createdAt || null,
  };
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos os Status' },
  { value: 'active', label: 'Ativos' },
  { value: 'suspended', label: 'Suspensos' },
  { value: 'banned', label: 'Banidos' },
  { value: 'pending', label: 'Pendentes' },
];
const DOCUMENT_OPTIONS = [
  { value: 'all', label: 'CPF e CNPJ' },
  { value: 'cpf', label: 'Apenas CPF' },
  { value: 'cnpj', label: 'Apenas CNPJ' },
];
const ROLE_OPTIONS = [
  { value: 'all', label: 'Todos os Papéis' },
  { value: 'admin', label: 'Admin' },
  { value: 'seller', label: 'Vendedor' },
  { value: 'buyer', label: 'Comprador' },
];

const STATUS_BADGE = {
  active: { variant: 'success', label: 'Ativo' },
  suspended: { variant: 'brand', label: 'Suspenso' },
  banned: { variant: 'danger', label: 'Banido' },
  pending: { variant: 'neutral', label: 'Pendente' },
};

const ROLE_BADGE = {
  admin: { variant: 'danger', label: 'Admin' },
  seller: { variant: 'info', label: 'Vendedor' },
  buyer: { variant: 'neutral', label: 'Comprador' },
};

function maskDocument(doc, type) {
  if (!doc) return '—';
  if (type === 'cpf') return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* — Status de assinatura → badge amigável — */
const SUBSCRIPTION_BADGE = {
  active: { variant: 'success', label: 'Ativo' },
  expired: { variant: 'neutral', label: 'Expirado' },
  pending: { variant: 'brand', label: 'Pendente' },
  cancelled: { variant: 'danger', label: 'Cancelado' },
  canceled: { variant: 'danger', label: 'Cancelado' },
};

function subscriptionBadge(status) {
  return SUBSCRIPTION_BADGE[String(status || '').toLowerCase()] || { variant: 'neutral', label: status || '—' };
}

function errMessage(err, fallback) {
  if (err instanceof ApiError && err.message) return err.message;
  return fallback;
}

export default function AdminUsers() {
  const { toast } = useToast();
  const { user: authUser } = useAuth();
  const currentUserId = authUser?.id ?? null;

  const [users, setUsers] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [documentFilter, setDocumentFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);

  // Ação em andamento: `${userId}:${action}` p/ loading granular nos botões.
  const [busy, setBusy] = useState(null);
  // Modal de confirmação/motivo: { user, action } com action ∈ suspend | ban | delete.
  const [confirm, setConfirm] = useState(null);
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');

  /* — Seleção em massa — */
  // IDs marcados (Set). Nunca inclui a própria conta do admin (checkbox desabilitado).
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  // Ação em massa pendente: { action, count } com action ∈ approve|suspend|ban|unban|delete.
  const [bulkConfirm, setBulkConfirm] = useState(null);
  const [bulkReason, setBulkReason] = useState('');
  const [bulkConfirmText, setBulkConfirmText] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);

  /* — Planos do usuário (no modal de detalhe) — */
  const [subscriptions, setSubscriptions] = useState([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [subsError, setSubsError] = useState(false);
  const [plans, setPlans] = useState([]);
  const [grantPlanId, setGrantPlanId] = useState('');
  const [grantDays, setGrantDays] = useState('');
  const [granting, setGranting] = useState(false);
  // Assinatura em revogação: id → true. Confirmação simples antes de revogar.
  const [revokingId, setRevokingId] = useState(null);
  const [confirmRevoke, setConfirmRevoke] = useState(null);

  // Carrega as assinaturas do usuário selecionado.
  const loadSubscriptions = async (userId) => {
    if (!userId) return;
    setSubsLoading(true);
    setSubsError(false);
    try {
      const data = await adminService.userSubscriptions(userId);
      const list = Array.isArray(data) ? data : (data?.data || data?.subscriptions || []);
      setSubscriptions(Array.isArray(list) ? list : []);
    } catch (err) {
      setSubsError(true);
      setSubscriptions([]);
    } finally {
      setSubsLoading(false);
    }
  };

  // Ao abrir o detalhe do usuário: carrega assinaturas + (uma vez) o catálogo de planos.
  useEffect(() => {
    if (!selectedUser) return;
    setGrantPlanId('');
    setGrantDays('');
    setConfirmRevoke(null);
    loadSubscriptions(selectedUser.id);
    if (plans.length === 0) {
      adminService.plans()
        .then((data) => {
          const list = Array.isArray(data) ? data : (data?.data || []);
          setPlans(Array.isArray(list) ? list : []);
        })
        .catch(() => setPlans([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser?.id]);

  const planOptions = useMemo(() => ([
    { value: '', label: 'Selecione um plano…' },
    ...plans.map((p) => {
      const price = p.price != null ? Number(p.price) : null;
      const priceLabel = price != null && !Number.isNaN(price)
        ? ` — R$ ${price.toFixed(2).replace('.', ',')}`
        : '';
      const dur = p.duration_days ? ` (${p.duration_days}d)` : '';
      return { value: String(p.id), label: `${p.name || `Plano #${p.id}`}${priceLabel}${dur}` };
    }),
  ]), [plans]);

  const handleGrantPlan = async () => {
    if (!selectedUser || !grantPlanId || granting) return;
    setGranting(true);
    try {
      const payload = { user_id: selectedUser.id, plan_id: grantPlanId };
      const daysNum = parseInt(grantDays, 10);
      if (grantDays !== '' && !Number.isNaN(daysNum) && daysNum > 0) payload.days = daysNum;
      await adminService.grantPlan(payload);
      const planName = plans.find((p) => String(p.id) === String(grantPlanId))?.name || 'Plano';
      toast({
        title: 'Plano ativado',
        description: `${planName} concedido a ${selectedUser.name}.`,
        variant: 'success',
      });
      setGrantPlanId('');
      setGrantDays('');
      await loadSubscriptions(selectedUser.id);
    } catch (err) {
      toast({
        title: 'Não foi possível ativar o plano',
        description: errMessage(err, 'Tente novamente em instantes.'),
        variant: 'error',
      });
    } finally {
      setGranting(false);
    }
  };

  const handleRevokeSubscription = async (sub) => {
    if (!sub || revokingId) return;
    setRevokingId(sub.id);
    try {
      await adminService.revokeSubscription(sub.id);
      toast({
        title: 'Assinatura revogada',
        description: 'O plano foi cancelado para este usuário.',
        variant: 'success',
      });
      setConfirmRevoke(null);
      if (selectedUser) await loadSubscriptions(selectedUser.id);
    } catch (err) {
      toast({
        title: 'Não foi possível revogar',
        description: errMessage(err, 'Tente novamente em instantes.'),
        variant: 'error',
      });
    } finally {
      setRevokingId(null);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    setError(false);
    try {
      const [usersData, dashboardData] = await Promise.all([
        adminService.users('?limit=50'),
        adminService.dashboard().catch(() => null),
      ]);
      const list = Array.isArray(usersData) ? usersData : (usersData?.data || []);
      setUsers(list.map(mapApiUser));
      setDashboard(dashboardData || null);
    } catch (err) {
      setError(true);
      setUsers([]);
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredUsers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return users.filter((u) => {
      const matchesSearch = !term
        || u.email?.toLowerCase().includes(term)
        || u.name?.toLowerCase().includes(term)
        || u.cpfCnpj?.includes(searchTerm);
      const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
      const matchesDocument = documentFilter === 'all' || u.documentType === documentFilter;
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      return matchesSearch && matchesStatus && matchesDocument && matchesRole;
    });
  }, [users, searchTerm, statusFilter, documentFilter, roleFilter]);

  const totalUsers = dashboard?.totalUsers ?? users.length;
  const newUsersToday = dashboard?.newUsersToday ?? null;

  /* — Helpers de ação — */
  const isSelf = (user) => currentUserId != null && user.id === currentUserId;
  const isBusy = (userId, action) => busy === `${userId}:${action}`;

  /* — Seleção em massa — */
  // Usuários filtrados elegíveis a ações em massa (exclui a própria conta do admin).
  const selectableUsers = useMemo(
    () => filteredUsers.filter((u) => !isSelf(u)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredUsers, currentUserId],
  );

  // Mantém a seleção coerente quando a lista/filtros mudam: remove IDs que saíram da visão.
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const visible = new Set(selectableUsers.map((u) => u.id));
      const next = new Set();
      prev.forEach((id) => { if (visible.has(id)) next.add(id); });
      return next.size === prev.size ? prev : next;
    });
  }, [selectableUsers]);

  const selectedCount = selectedIds.size;
  const allSelected = selectableUsers.length > 0 && selectedCount === selectableUsers.length;
  const someSelected = selectedCount > 0 && !allSelected;

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) => (prev.size === selectableUsers.length && selectableUsers.length > 0
      ? new Set()
      : new Set(selectableUsers.map((u) => u.id))));
  };

  const clearSelection = () => setSelectedIds(new Set());

  /* — Configuração das ações em massa — */
  const BULK_COPY = {
    approve: { title: 'Aprovar contas', tone: 'success', cta: 'Aprovar', askReason: false, requireType: false,
      lead: (n) => `${n} conta(s) selecionada(s) serão aprovadas e ficarão ativas.` },
    suspend: { title: 'Suspender contas', tone: 'warn', cta: 'Suspender', askReason: true, requireType: false,
      lead: (n) => `${n} conta(s) selecionada(s) serão suspensas até reativação.` },
    ban: { title: 'Banir usuários', tone: 'danger', cta: 'Banir', askReason: true, requireType: false,
      lead: (n) => `${n} usuário(s) selecionado(s) serão banidos e perderão o acesso.` },
    unban: { title: 'Desbanir usuários', tone: 'success', cta: 'Desbanir', askReason: false, requireType: false,
      lead: (n) => `${n} usuário(s) selecionado(s) terão o banimento removido.` },
    delete: { title: 'Excluir contas', tone: 'danger', cta: 'Excluir permanentemente', askReason: false, requireType: true,
      lead: (n) => `Esta ação é PERMANENTE e não pode ser desfeita. ${n} conta(s) e seus dados serão removidos.` },
  };

  const openBulkConfirm = (action) => {
    if (selectedCount === 0) return;
    setBulkReason('');
    setBulkConfirmText('');
    setBulkConfirm({ action, count: selectedCount });
  };
  const closeBulkConfirm = () => {
    if (bulkBusy) return;
    setBulkConfirm(null);
    setBulkReason('');
    setBulkConfirmText('');
  };

  const submitBulk = async () => {
    if (!bulkConfirm || bulkBusy) return;
    const { action } = bulkConfirm;
    // Garante que a própria conta do admin nunca entra no lote.
    const ids = Array.from(selectedIds).filter((id) => id !== currentUserId);
    if (ids.length === 0) { closeBulkConfirm(); return; }

    setBulkBusy(true);
    try {
      const payload = {};
      if ((action === 'suspend' || action === 'ban') && bulkReason.trim()) {
        payload.reason = bulkReason.trim();
      }
      const data = { ids, action };
      if (Object.keys(payload).length) data.payload = payload;

      const res = await adminService.bulkUsers(data);
      const failed = Array.isArray(res?.failed) ? res.failed : [];
      const applied = ids.length - failed.length;

      if (failed.length === 0) {
        toast({
          title: 'Ação concluída',
          description: `${applied} usuário(s) atualizado(s) com sucesso.`,
          variant: 'success',
        });
      } else if (applied === 0) {
        toast({
          title: 'Não foi possível aplicar',
          description: `Nenhum dos ${ids.length} usuários pôde ser atualizado.`,
          variant: 'error',
        });
      } else {
        toast({
          title: 'Ação parcialmente concluída',
          description: `${applied} aplicado(s), ${failed.length} falhou(aram).`,
          variant: 'error',
        });
      }

      clearSelection();
      setBulkConfirm(null);
      setBulkReason('');
      setBulkConfirmText('');
      await loadUsers();
    } catch (err) {
      toast({
        title: 'Não foi possível aplicar a ação',
        description: errMessage(err, 'Tente novamente em instantes.'),
        variant: 'error',
      });
    } finally {
      setBulkBusy(false);
    }
  };

  // Atualiza um usuário in-place a partir do payload retornado pela API (sem refetch global).
  const applyUpdated = (id, apiUser) => {
    if (apiUser && typeof apiUser === 'object' && apiUser.id) {
      const mapped = mapApiUser(apiUser);
      // is_shadowbanned (chatOnly) nem sempre vem no payload sanitizado;
      // preserva o valor anterior quando a API não o informa.
      const merge = (prev) => (prev && prev.id === id
        ? { ...mapped, chatOnly: 'is_shadowbanned' in apiUser ? mapped.chatOnly : prev.chatOnly }
        : prev);
      setUsers((prev) => prev.map(merge));
      setSelectedUser((prev) => merge(prev));
      return mapped;
    }
    return null;
  };

  // Executa uma ação simples (sem confirmação): approve, unban, chat-only toggle.
  const runAction = async ({ user, action, fn, patch, successTitle, successDesc, errorTitle, errorDesc }) => {
    if (busy) return;
    setBusy(`${user.id}:${action}`);
    try {
      const result = await fn();
      const updated = applyUpdated(user.id, result);
      if (!updated) await loadUsers();
      // Patch local p/ campos que a API pode não devolver (ex.: chatOnly).
      if (patch) {
        const apply = (prev) => (prev && prev.id === user.id ? { ...prev, ...patch } : prev);
        setUsers((prev) => prev.map(apply));
        setSelectedUser((prev) => apply(prev));
      }
      toast({ title: successTitle, description: successDesc, variant: 'success' });
    } catch (err) {
      toast({ title: errorTitle, description: errMessage(err, errorDesc), variant: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const handleApprove = (user) => runAction({
    user, action: 'approve',
    fn: () => adminService.approveUser(user.id),
    successTitle: 'Conta aprovada',
    successDesc: `${user.name} agora está com a conta ativa.`,
    errorTitle: 'Não foi possível aprovar',
    errorDesc: 'Tente novamente em instantes.',
  });

  const handleUnban = (user) => runAction({
    user, action: 'unban',
    fn: () => adminService.unbanUser(user.id),
    successTitle: 'Usuário desbanido',
    successDesc: `${user.name} teve o banimento removido.`,
    errorTitle: 'Não foi possível desbanir',
    errorDesc: 'Tente novamente em instantes.',
  });

  const handleToggleChatOnly = (user) => runAction({
    user, action: 'chat',
    fn: () => (user.chatOnly ? adminService.removeChatOnly(user.id) : adminService.setChatOnly(user.id)),
    patch: { chatOnly: !user.chatOnly },
    successTitle: user.chatOnly ? 'Restrição removida' : 'Restrição "apenas chat" aplicada',
    successDesc: user.chatOnly
      ? `${user.name} voltou a usar a plataforma normalmente.`
      : `${user.name} agora só pode usar o chat.`,
    errorTitle: 'Não foi possível atualizar a restrição',
    errorDesc: 'Tente novamente em instantes.',
  });

  /* — Modal de confirmação / motivo (suspend, ban, delete) — */
  const openConfirm = (user, action) => {
    setReason('');
    setConfirmText('');
    setConfirm({ user, action });
  };
  const closeConfirm = () => {
    if (busy) return;
    setConfirm(null);
    setReason('');
    setConfirmText('');
  };

  const submitConfirm = async () => {
    if (!confirm) return;
    const { user, action } = confirm;
    setBusy(`${user.id}:${action}`);
    try {
      let result;
      let successTitle;
      let successDesc;
      if (action === 'suspend') {
        result = await adminService.suspendUser(user.id, reason.trim() ? { reason: reason.trim() } : {});
        successTitle = 'Conta suspensa';
        successDesc = `${user.name} foi suspenso.`;
      } else if (action === 'ban') {
        result = await adminService.banUser(user.id, reason.trim() ? { reason: reason.trim() } : {});
        successTitle = 'Usuário banido';
        successDesc = `${user.name} foi banido da plataforma.`;
      } else if (action === 'delete') {
        result = await adminService.deleteUser(user.id);
        successTitle = 'Conta excluída';
        successDesc = `A conta de ${user.name} foi excluída permanentemente.`;
      }

      if (action === 'delete') {
        // Removida da lista; fecha o detalhe se for o mesmo usuário.
        setUsers((prev) => prev.filter((u) => u.id !== user.id));
        setSelectedUser((prev) => (prev && prev.id === user.id ? null : prev));
      } else {
        const updated = applyUpdated(user.id, result);
        if (!updated) await loadUsers();
      }

      toast({ title: successTitle, description: successDesc, variant: 'success' });
      setConfirm(null);
      setReason('');
      setConfirmText('');
    } catch (err) {
      const titles = {
        suspend: 'Não foi possível suspender',
        ban: 'Não foi possível banir',
        delete: 'Não foi possível excluir',
      };
      toast({ title: titles[action], description: errMessage(err, 'Tente novamente em instantes.'), variant: 'error' });
    } finally {
      setBusy(null);
    }
  };

  /* — Conjunto de ações disponíveis p/ um usuário, conforme status — */
  const ActionButtons = ({ user, stacked = false }) => {
    const self = isSelf(user);
    const anyBusy = !!busy;
    const wrapClass = stacked ? styles.actionStack : styles.rowActionBtns;

    return (
      <div className={wrapClass}>
        {user.status === 'pending' && (
          <Button
            size="sm"
            className={styles.btnApprove}
            loading={isBusy(user.id, 'approve')}
            disabled={anyBusy}
            onClick={() => handleApprove(user)}
            leftIcon="check"
          >
            Aprovar
          </Button>
        )}

        {(user.status === 'active' || user.status === 'pending' || user.status === 'suspended') && !self && (
          <Button
            size="sm"
            variant="outline"
            className={styles.btnChat}
            loading={isBusy(user.id, 'chat')}
            disabled={anyBusy}
            onClick={() => handleToggleChatOnly(user)}
            leftIcon="chat"
          >
            {user.chatOnly ? 'Liberar chat' : 'Apenas chat'}
          </Button>
        )}

        {(user.status === 'active' || user.status === 'pending') && !self && (
          <Button
            size="sm"
            variant="outline"
            className={styles.btnSuspend}
            disabled={anyBusy}
            onClick={() => openConfirm(user, 'suspend')}
            leftIcon="lock"
          >
            Suspender
          </Button>
        )}

        {user.status === 'banned' ? (
          !self && (
            <Button
              size="sm"
              variant="outline"
              className={styles.btnApproveOutline}
              loading={isBusy(user.id, 'unban')}
              disabled={anyBusy}
              onClick={() => handleUnban(user)}
              leftIcon="shield"
            >
              Desbanir
            </Button>
          )
        ) : (
          !self && (
            <Button
              size="sm"
              className={styles.btnBan}
              disabled={anyBusy}
              onClick={() => openConfirm(user, 'ban')}
              leftIcon="shield"
            >
              Banir
            </Button>
          )
        )}

        {!self && (
          <Button
            size="sm"
            variant="outline"
            className={styles.btnDelete}
            disabled={anyBusy}
            onClick={() => openConfirm(user, 'delete')}
            leftIcon="trash"
          >
            Excluir
          </Button>
        )}

        {self && (
          <span className={styles.selfTag} title="Você não pode aplicar ações destrutivas à sua própria conta.">
            <Icon name="shield" size={14} /> Sua conta
          </span>
        )}
      </div>
    );
  };

  /* — Conteúdo do modal de confirmação — */
  const confirmCopy = {
    suspend: {
      title: 'Suspender conta',
      tone: 'warn',
      cta: 'Suspender',
      lead: (u) => `O usuário ${u.name} ficará impedido de operar até ser reativado.`,
      askReason: true,
      requireType: false,
    },
    ban: {
      title: 'Banir usuário',
      tone: 'danger',
      cta: 'Banir',
      lead: (u) => `${u.name} será banido e perderá o acesso à plataforma.`,
      askReason: true,
      requireType: false,
    },
    delete: {
      title: 'Excluir conta',
      tone: 'danger',
      cta: 'Excluir permanentemente',
      lead: (u) => `Esta ação é PERMANENTE e não pode ser desfeita. A conta de ${u.name} e seus dados serão removidos.`,
      askReason: false,
      requireType: true,
    },
  };

  const confirmCfg = confirm ? confirmCopy[confirm.action] : null;
  const deleteReady = !confirmCfg?.requireType
    || confirmText.trim().toUpperCase() === 'EXCLUIR';
  const confirmBusy = confirm ? isBusy(confirm.user.id, confirm.action) : false;

  const bulkCfg = bulkConfirm ? BULK_COPY[bulkConfirm.action] : null;
  const bulkReady = !bulkCfg?.requireType
    || bulkConfirmText.trim().toUpperCase() === 'EXCLUIR';

  return (
    <div className={styles.root}>
      <div className={styles.card}>
        <header className={styles.cardHead}>
          <h2 className={styles.cardTitle}><Icon name="user" size={20} /> Gerenciamento de Usuários</h2>
          <Button variant="outline" size="sm" onClick={loadUsers} disabled={loading}>
            <Lucide name="rotate-ccw" size={16} /> {loading ? 'Carregando…' : 'Atualizar'}
          </Button>
        </header>

        <div className={styles.cardBody}>
          {/* Contadores reais (dashboard) */}
          <div className={styles.counters}>
            <div className={styles.counterBox}>
              <span className={styles.counterLabel}>Total de Usuários</span>
              <strong className={styles.counterValue}>{loading ? '—' : totalUsers}</strong>
            </div>
            <div className={styles.counterBox}>
              <span className={styles.counterLabel}>Novos Hoje</span>
              <strong className={styles.counterValue}>{loading || newUsersToday == null ? '—' : newUsersToday}</strong>
            </div>
            <div className={styles.counterBox}>
              <span className={styles.counterLabel}>Listados</span>
              <strong className={styles.counterValue}>{loading ? '—' : filteredUsers.length}</strong>
            </div>
          </div>

          {/* Filtros */}
          <div className={styles.filters}>
            <Input
              leftIcon="search"
              placeholder="Buscar por nome, email, CPF/CNPJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={STATUS_OPTIONS} />
            <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} options={ROLE_OPTIONS} />
            <Select value={documentFilter} onChange={(e) => setDocumentFilter(e.target.value)} options={DOCUMENT_OPTIONS} />
          </div>

          {/* Barra de ações em massa */}
          {selectedCount > 0 && (
            <div className={styles.bulkBar} role="region" aria-label="Ações em massa">
              <div className={styles.bulkCount}>
                <Icon name="check" size={16} />
                <strong>{selectedCount}</strong> selecionado{selectedCount > 1 ? 's' : ''}
              </div>
              <div className={styles.bulkActions}>
                <Button size="sm" className={styles.btnApprove} disabled={bulkBusy} onClick={() => openBulkConfirm('approve')} leftIcon="check">
                  Aprovar
                </Button>
                <Button size="sm" variant="outline" className={styles.btnSuspend} disabled={bulkBusy} onClick={() => openBulkConfirm('suspend')} leftIcon="lock">
                  Suspender
                </Button>
                <Button size="sm" className={styles.btnBan} disabled={bulkBusy} onClick={() => openBulkConfirm('ban')} leftIcon="shield">
                  Banir
                </Button>
                <Button size="sm" variant="outline" className={styles.btnApproveOutline} disabled={bulkBusy} onClick={() => openBulkConfirm('unban')} leftIcon="shield">
                  Desbanir
                </Button>
                <Button size="sm" variant="outline" className={styles.btnDelete} disabled={bulkBusy} onClick={() => openBulkConfirm('delete')} leftIcon="trash">
                  Excluir
                </Button>
              </div>
              <button type="button" className={styles.bulkClear} onClick={clearSelection} disabled={bulkBusy}>
                Limpar seleção
              </button>
            </div>
          )}

          {/* Tabela */}
          <div className={styles.tableWrap}>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.checkCol}>
                      <input
                        type="checkbox"
                        className={styles.checkbox}
                        checked={allSelected}
                        ref={(el) => { if (el) el.indeterminate = someSelected; }}
                        onChange={toggleSelectAll}
                        disabled={selectableUsers.length === 0}
                        aria-label="Selecionar todos os usuários visíveis"
                        title="Selecionar todos os usuários visíveis"
                      />
                    </th>
                    <th>Usuário</th>
                    <th>Documento</th>
                    <th>Papel</th>
                    <th>Status</th>
                    <th>Cadastro</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className={styles.empty}>
                        <span className={styles.loading}><span className={styles.spinner} aria-hidden="true" /> Carregando…</span>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={7} className={styles.empty}>
                        Não foi possível carregar os usuários.{' '}
                        <button type="button" className={styles.retryLink} onClick={loadUsers}>Tentar novamente</button>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className={styles.empty}>
                        {users.length === 0 ? 'Sem dados' : 'Nenhum usuário corresponde aos filtros'}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const self = isSelf(user);
                      return (
                      <tr key={user.id} className={cx(styles.row, selectedIds.has(user.id) && styles.rowSelected)}>
                        <td className={styles.checkCol}>
                          <input
                            type="checkbox"
                            className={styles.checkbox}
                            checked={selectedIds.has(user.id)}
                            disabled={self}
                            onChange={() => toggleSelect(user.id)}
                            aria-label={self ? 'Sua conta não pode ser selecionada' : `Selecionar ${user.name}`}
                            title={self ? 'Você não pode selecionar a própria conta' : `Selecionar ${user.name}`}
                          />
                        </td>
                        <td>
                          <div className={styles.userCell}>
                            <span className={styles.avatar}>
                              {user.avatarUrl
                                ? <img src={user.avatarUrl} alt={user.name} className={styles.avatarImg} />
                                : <Icon name="user" size={20} />}
                            </span>
                            <div>
                              <div className={styles.userName}>{user.name}</div>
                              <div className={styles.userEmail}>{user.email || '—'}</div>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className={styles.docType}>
                            {user.documentType.toUpperCase()}
                            {user.accountType === 'business' && (
                              <Badge variant="info" size="sm">EMPRESA</Badge>
                            )}
                          </div>
                          <div className={styles.docValue}>{maskDocument(user.cpfCnpj, user.documentType)}</div>
                        </td>

                        <td>
                          <Badge variant={ROLE_BADGE[user.role].variant} size="sm">{ROLE_BADGE[user.role].label}</Badge>
                          {user.role === 'seller' && user.sellerTier && (
                            <div className={styles.subLabel}>Tier: {user.sellerTier}</div>
                          )}
                          {user.role === 'admin' && user.adminRole && (
                            <div className={styles.subLabel}>{user.adminRole}</div>
                          )}
                        </td>

                        <td>
                          <Badge variant={STATUS_BADGE[user.status].variant} size="sm">{STATUS_BADGE[user.status].label}</Badge>
                          {user.chatOnly && (
                            <div className={styles.subLabel}>Apenas chat</div>
                          )}
                        </td>

                        <td><div className={styles.dateValue}>{formatDate(user.createdAt)}</div></td>

                        <td>
                          <div className={styles.actionsCell}>
                            <button className={styles.iconBtn} onClick={() => setSelectedUser(user)} aria-label="Ver perfil" title="Ver perfil"><Icon name="eye" size={16} /></button>
                            <ActionButtons user={user} />
                          </div>
                        </td>
                      </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal — Perfil Detalhado (somente dados reais) */}
      <Modal
        open={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        size="lg"
        title={selectedUser ? `Perfil Detalhado — ${selectedUser.name}` : ''}
      >
        {selectedUser && (
          <div className={styles.detail}>
            <div className={styles.detailGrid}>
              <div className={styles.detailCard}>
                <h3>Informações Pessoais</h3>
                <div className={styles.detailRow}><span>Nome</span><strong>{selectedUser.name}</strong></div>
                <div className={styles.detailRow}><span>Email</span><strong>{selectedUser.email || '—'}</strong></div>
                <div className={styles.detailRow}><span>Telefone</span><strong>{selectedUser.phone || '—'}</strong></div>
                <div className={styles.detailRow}><span>Documento</span><strong>{selectedUser.documentType.toUpperCase()}: {maskDocument(selectedUser.cpfCnpj, selectedUser.documentType)}</strong></div>
                <div className={styles.detailRow}><span>Membro desde</span><strong>{formatDate(selectedUser.createdAt)}</strong></div>
              </div>

              <div className={styles.detailCard}>
                <h3>Conta</h3>
                <div className={styles.detailRow}><span>Papel</span><Badge variant={ROLE_BADGE[selectedUser.role].variant} size="sm">{ROLE_BADGE[selectedUser.role].label}</Badge></div>
                <div className={styles.detailRow}><span>Status</span><Badge variant={STATUS_BADGE[selectedUser.status].variant} size="sm">{STATUS_BADGE[selectedUser.status].label}</Badge></div>
                <div className={styles.detailRow}><span>Restrição</span><strong>{selectedUser.chatOnly ? 'Apenas chat' : 'Nenhuma'}</strong></div>
                <div className={styles.detailRow}><span>Tipo de Pessoa</span><strong>{selectedUser.accountType === 'business' ? 'Pessoa Jurídica' : 'Pessoa Física'}</strong></div>
                {selectedUser.isSeller && (
                  <div className={styles.detailRow}><span>Tier de Vendedor</span><strong>{selectedUser.sellerTier || '—'}</strong></div>
                )}
                {selectedUser.isAdmin && (
                  <div className={styles.detailRow}><span>Cargo Admin</span><strong>{selectedUser.adminRole || '—'}</strong></div>
                )}
                <div className={styles.detailRow}><span>Primeira venda</span><strong>{selectedUser.hasFirstSale ? 'Sim' : 'Não'}</strong></div>
                <div className={styles.detailRow}><span>Primeira compra</span><strong>{selectedUser.hasFirstPurchase ? 'Sim' : 'Não'}</strong></div>
              </div>
            </div>

            {/* Ações de moderação */}
            <div className={styles.detailCard}>
              <h3>Moderação</h3>
              {isSelf(selectedUser) ? (
                <p className={styles.selfNote}>
                  <Icon name="shield" size={16} /> Você não pode aplicar ações de moderação à sua própria conta.
                </p>
              ) : (
                <ActionButtons user={selectedUser} stacked />
              )}
            </div>

            {/* — Planos: assinaturas + concessão manual — */}
            <div className={styles.detailCard}>
              <h3>Planos</h3>

              {/* Lista de assinaturas */}
              {subsLoading ? (
                <p className={styles.loading}>
                  <span className={styles.spinner} aria-hidden="true" /> Carregando assinaturas…
                </p>
              ) : subsError ? (
                <p className={styles.selfNote}>
                  Não foi possível carregar as assinaturas.{' '}
                  <button type="button" className={styles.retryLink} onClick={() => loadSubscriptions(selectedUser.id)}>
                    Tentar novamente
                  </button>
                </p>
              ) : subscriptions.length === 0 ? (
                <p className={styles.selfNote}>Nenhuma assinatura para este usuário.</p>
              ) : (
                <ul className={styles.subsList}>
                  {subscriptions.map((sub) => {
                    const badge = subscriptionBadge(sub.status);
                    const planName = sub.plan?.name || sub.plan_name || (sub.plan_id ? `Plano #${sub.plan_id}` : 'Plano');
                    const endsAt = sub.ends_at || sub.endsAt || sub.expires_at || null;
                    const isActive = String(sub.status || '').toLowerCase() === 'active';
                    return (
                      <li key={sub.id} className={styles.subItem}>
                        <div className={styles.subInfo}>
                          <span className={styles.subPlan}>{planName}</span>
                          <span className={styles.subMeta}>
                            <Badge variant={badge.variant} size="sm">{badge.label}</Badge>
                            <span className={styles.subEnds}>Vence em {formatDate(endsAt)}</span>
                          </span>
                        </div>
                        {isActive && (
                          <Button
                            size="sm"
                            variant="outline"
                            className={styles.btnDelete}
                            loading={revokingId === sub.id}
                            disabled={!!revokingId}
                            onClick={() => setConfirmRevoke(sub)}
                          >
                            Revogar
                          </Button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Concessão manual de plano (grant sem pagamento) */}
              <div className={styles.grantRow}>
                <Select
                  className={styles.grantSelect}
                  value={grantPlanId}
                  onChange={(e) => setGrantPlanId(e.target.value)}
                  options={planOptions}
                  disabled={granting || plans.length === 0}
                />
                <Input
                  className={styles.grantDays}
                  type="number"
                  min="1"
                  placeholder="Dias (opcional)"
                  value={grantDays}
                  onChange={(e) => setGrantDays(e.target.value)}
                  disabled={granting}
                />
                <Button
                  size="sm"
                  className={styles.btnApprove}
                  loading={granting}
                  disabled={!grantPlanId || granting}
                  onClick={handleGrantPlan}
                  leftIcon="check"
                >
                  Ativar plano
                </Button>
              </div>
              {plans.length === 0 && !granting && (
                <p className={styles.subEnds}>Nenhum plano disponível no catálogo.</p>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal — Confirmação de revogação de assinatura */}
      <Modal
        open={!!confirmRevoke}
        onClose={() => { if (!revokingId) setConfirmRevoke(null); }}
        size="sm"
        title="Revogar assinatura"
        footer={confirmRevoke && (
          <div className={styles.confirmFooter}>
            <Button variant="outline" onClick={() => setConfirmRevoke(null)} disabled={!!revokingId}>Cancelar</Button>
            <Button
              className={styles.btnBan}
              loading={revokingId === confirmRevoke.id}
              disabled={!!revokingId}
              onClick={() => handleRevokeSubscription(confirmRevoke)}
            >
              Revogar
            </Button>
          </div>
        )}
      >
        {confirmRevoke && (
          <div className={styles.confirmBody}>
            <p className={styles.confirmLead}>
              O plano <strong>{confirmRevoke.plan?.name || confirmRevoke.plan_name || 'selecionado'}</strong> será
              cancelado para este usuário. Esta ação encerra o acesso imediatamente.
            </p>
          </div>
        )}
      </Modal>

      {/* Modal — Confirmação / motivo (suspender, banir, excluir) */}
      <Modal
        open={!!confirm}
        onClose={closeConfirm}
        size="sm"
        title={confirmCfg ? confirmCfg.title : ''}
        footer={confirm && (
          <div className={styles.confirmFooter}>
            <Button variant="outline" onClick={closeConfirm} disabled={confirmBusy}>Cancelar</Button>
            <Button
              className={confirmCfg.tone === 'danger' ? styles.btnBan : styles.btnSuspend}
              variant={confirmCfg.tone === 'danger' ? 'primary' : 'outline'}
              loading={confirmBusy}
              disabled={confirmBusy || !deleteReady}
              onClick={submitConfirm}
            >
              {confirmCfg.cta}
            </Button>
          </div>
        )}
      >
        {confirm && (
          <div className={styles.confirmBody}>
            <p className={cx(styles.confirmLead, confirmCfg.tone === 'danger' && styles.confirmDanger)}>
              {confirmCfg.lead(confirm.user)}
            </p>

            {confirmCfg.askReason && (
              <label className={styles.confirmField}>
                <span>Motivo (opcional)</span>
                <textarea
                  className={styles.confirmTextarea}
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Descreva o motivo desta ação para registro interno…"
                  disabled={confirmBusy}
                />
              </label>
            )}

            {confirmCfg.requireType && (
              <label className={styles.confirmField}>
                <span>Para confirmar, digite <strong>EXCLUIR</strong></span>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="EXCLUIR"
                  disabled={confirmBusy}
                />
              </label>
            )}
          </div>
        )}
      </Modal>

      {/* Modal — Confirmação de ação em massa */}
      <Modal
        open={!!bulkConfirm}
        onClose={closeBulkConfirm}
        size="sm"
        title={bulkCfg ? bulkCfg.title : ''}
        footer={bulkConfirm && (
          <div className={styles.confirmFooter}>
            <Button variant="outline" onClick={closeBulkConfirm} disabled={bulkBusy}>Cancelar</Button>
            <Button
              className={bulkCfg.tone === 'danger' ? styles.btnBan : styles.btnSuspend}
              variant={bulkCfg.tone === 'danger' ? 'primary' : 'outline'}
              loading={bulkBusy}
              disabled={bulkBusy || !bulkReady}
              onClick={submitBulk}
            >
              {bulkCfg.cta}
            </Button>
          </div>
        )}
      >
        {bulkConfirm && (
          <div className={styles.confirmBody}>
            <p className={cx(styles.confirmLead, bulkCfg.tone === 'danger' && styles.confirmDanger)}>
              {bulkCfg.lead(bulkConfirm.count)}
            </p>

            {bulkCfg.askReason && (
              <label className={styles.confirmField}>
                <span>Motivo (opcional)</span>
                <textarea
                  className={styles.confirmTextarea}
                  rows={3}
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  placeholder="Descreva o motivo desta ação para registro interno…"
                  disabled={bulkBusy}
                />
              </label>
            )}

            {bulkCfg.requireType && (
              <label className={styles.confirmField}>
                <span>Para confirmar, digite <strong>EXCLUIR</strong></span>
                <Input
                  value={bulkConfirmText}
                  onChange={(e) => setBulkConfirmText(e.target.value)}
                  placeholder="EXCLUIR"
                  disabled={bulkBusy}
                />
              </label>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
