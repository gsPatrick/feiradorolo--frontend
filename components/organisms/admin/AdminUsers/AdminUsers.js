'use client';

import { useState, useMemo, useEffect } from 'react';
import styles from './AdminUsers.module.css';
import { cx } from '@/lib/cx';
import { adminService } from '@/lib/api';
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

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [documentFilter, setDocumentFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);

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

          {/* Tabela */}
          <div className={styles.tableWrap}>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
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
                      <td colSpan={6} className={styles.empty}>
                        <span className={styles.loading}><span className={styles.spinner} aria-hidden="true" /> Carregando…</span>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td colSpan={6} className={styles.empty}>
                        Não foi possível carregar os usuários.{' '}
                        <button type="button" className={styles.retryLink} onClick={loadUsers}>Tentar novamente</button>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className={styles.empty}>
                        {users.length === 0 ? 'Sem dados' : 'Nenhum usuário corresponde aos filtros'}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className={styles.row}>
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

                        <td><Badge variant={STATUS_BADGE[user.status].variant} size="sm">{STATUS_BADGE[user.status].label}</Badge></td>

                        <td><div className={styles.dateValue}>{formatDate(user.createdAt)}</div></td>

                        <td>
                          <div className={styles.actions}>
                            <button className={styles.iconBtn} onClick={() => setSelectedUser(user)} aria-label="Ver perfil" title="Ver perfil"><Icon name="eye" size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))
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
          </div>
        )}
      </Modal>
    </div>
  );
}
