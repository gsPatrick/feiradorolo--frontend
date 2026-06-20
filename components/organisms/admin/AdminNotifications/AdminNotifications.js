'use client';

import { useState, useEffect } from 'react';
import styles from './AdminNotifications.module.css';
import { cx } from '@/lib/cx';
import { adminService, ApiError } from '@/lib/api';
import Button from '@/components/atoms/Button/Button';
import Input from '@/components/atoms/Input/Input';
import Textarea from '@/components/atoms/Textarea/Textarea';
import Select from '@/components/atoms/Select/Select';
import Icon from '@/components/atoms/Icon/Icon';
import { useToast } from '@/components/providers/ToastProvider';

/* ── Tipos de notificação ───────────────────────────────────────── */
const TYPE_OPTIONS = [
  { value: 'order', label: '📦 Pedido' },
  { value: 'chat', label: '💬 Chat' },
  { value: 'system', label: '⚙️ Sistema' },
  { value: 'marketing', label: '📢 Marketing' },
];

const TYPE_LABEL = {
  order: 'order',
  chat: 'chat',
  system: 'system',
  marketing: 'marketing',
};

function formatStamp(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* ── Mapeia a notificação da API para o formato de renderização ── */
function mapApiNotification(n) {
  return {
    id: n.id,
    title: n.title,
    body: n.body,
    type: n.type,
    targetUserId: n.user_id ? String(n.user_id) : '',
    targetUserName: n.user?.name || '',
    read: n.status === 'read',
    timestamp: n.sent_at || n.createdAt,
  };
}

const EMPTY_FORM = { title: '', body: '', type: 'order', targetUserId: '' };

export default function AdminNotifications() {
  const { toast } = useToast();

  const [form, setForm] = useState(EMPTY_FORM);
  const [history, setHistory] = useState([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const canSend = form.title.trim() && form.body.trim();

  const total = history.length;
  const ordersCount = history.filter((n) => n.type === 'order').length;
  const chatCount = history.filter((n) => n.type === 'chat').length;
  const unreadCount = history.filter((n) => !n.read).length;

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await adminService.notifications('?limit=50');
      const list = Array.isArray(data) ? data : (data?.data || []);
      setHistory(list.map(mapApiNotification));
    } catch (err) {
      // Em erro/401 → estado vazio, nunca mock.
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function removeOne(id) {
    try {
      await adminService.deleteNotification(id);
      setHistory((prev) => prev.filter((n) => n.id !== id));
      toast({ title: 'Notificação removida.', variant: 'success', duration: 1500 });
    } catch (err) {
      toast({ title: 'Erro ao remover', description: err.message, variant: 'destructive' });
    }
  }

  async function clearAll() {
    if (!history.length) return;
    if (!window.confirm('Limpar todo o histórico de notificações?')) return;
    try {
      await adminService.clearNotifications();
      setHistory([]);
      toast({ title: 'Histórico limpo.', variant: 'success', duration: 1500 });
    } catch (err) {
      toast({ title: 'Erro ao limpar', description: err.message, variant: 'destructive' });
    }
  }

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSend() {
    if (!canSend || sending) return;
    setSending(true);
    const targetUserId = form.targetUserId.trim();
    try {
      await adminService.sendNotification({
        title: form.title.trim(),
        body: form.body.trim(),
        type: form.type,
        userId: targetUserId || undefined,
      });
      setForm(EMPTY_FORM);
      toast({
        title: 'Notificação enviada!',
        description: targetUserId
          ? `Enviada para o usuário #${targetUserId}`
          : 'Enviada para todos os usuários',
        variant: 'success',
      });
      await loadHistory();
    } catch (err) {
      toast({
        title: 'Erro ao enviar notificação',
        description:
          err instanceof ApiError
            ? err.message
            : 'Não foi possível enviar a notificação.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={styles.root}>
      {/* ── Cabeçalho ──────────────────────────────────────────── */}
      <header className={styles.head}>
        <div>
          <h1 className={styles.title}>Notificações Push</h1>
          <p className={styles.subtitle}>
            Envie notificações push e acompanhe o histórico de disparos
          </p>
        </div>
      </header>

      <div className={styles.grid}>
        {/* ── Enviar notificação ───────────────────────────────── */}
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle}>
              <Icon name="arrow-right" size={18} />
              Enviar Notificação Push
            </h2>
          </div>

          <div className={styles.form}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="notif-title">
                Título
              </label>
              <Input
                id="notif-title"
                placeholder="Ex: Novo Pedido Recebido"
                value={form.title}
                onChange={(e) => update('title', e.target.value)}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="notif-body">
                Mensagem
              </label>
              <Textarea
                id="notif-body"
                rows={3}
                placeholder="Ex: Você tem um novo pedido aguardando confirmação"
                value={form.body}
                onChange={(e) => update('body', e.target.value)}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="notif-type">
                Tipo
              </label>
              <Select
                id="notif-type"
                value={form.type}
                options={TYPE_OPTIONS}
                onChange={(e) => update('type', e.target.value)}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="notif-user">
                Usuário (opcional)
              </label>
              <Input
                id="notif-user"
                placeholder="Deixe vazio para enviar para todos"
                value={form.targetUserId}
                onChange={(e) => update('targetUserId', e.target.value)}
              />
            </div>

            <Button
              fullWidth
              leftIcon="arrow-right"
              loading={sending}
              disabled={!canSend}
              onClick={handleSend}
              className={styles.sendBtn}
            >
              {sending ? 'Enviando...' : 'Enviar Notificação'}
            </Button>
          </div>
        </section>

        {/* ── Histórico ────────────────────────────────────────── */}
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle}>
              <Icon name="bell" size={18} />
              Histórico de Notificações
            </h2>
            {history.length > 0 && (
              <button type="button" className={styles.clearBtn} onClick={clearAll}>
                <Icon name="trash" size={15} /> Limpar tudo
              </button>
            )}
          </div>

          {loading ? (
            <div className={styles.empty}>
              <Icon name="bell" size={48} className={styles.emptyIcon} />
              <p>Carregando…</p>
            </div>
          ) : history.length === 0 ? (
            <div className={styles.empty}>
              <Icon name="bell" size={48} className={styles.emptyIcon} />
              <p>Nenhuma notificação enviada ainda</p>
            </div>
          ) : (
            <div className={styles.historyList}>
              {history.map((n) => (
                <article key={n.id} className={styles.item}>
                  <div className={styles.itemBody}>
                    <h4 className={styles.itemTitle}>{n.title}</h4>
                    <p className={styles.itemText}>{n.body}</p>
                    <div className={styles.itemMeta}>
                      <span
                        className={cx(styles.dot, styles[`dot_${n.type}`])}
                      />
                      <span className={styles.metaType}>
                        {TYPE_LABEL[n.type]}
                      </span>
                      <span className={styles.metaSep}>•</span>
                      <span className={styles.metaTime}>
                        {formatStamp(n.timestamp)}
                      </span>
                      {n.targetUserId ? (
                        <>
                          <span className={styles.metaSep}>•</span>
                          <span className={styles.metaTime}>
                            {n.targetUserName || `#${n.targetUserId}`}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className={styles.metaSep}>•</span>
                          <span className={styles.metaTime}>Todos</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span
                    className={cx(
                      styles.status,
                      n.read ? styles.statusRead : styles.statusUnread
                    )}
                    aria-label={n.read ? 'Lida' : 'Não lida'}
                  />
                  <button
                    type="button"
                    className={styles.trashBtn}
                    onClick={() => removeOne(n.id)}
                    aria-label="Remover"
                    title="Remover"
                  >
                    <Icon name="trash" size={15} />
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── Estatísticas ───────────────────────────────────────── */}
      <section className={styles.card}>
        <div className={styles.cardHead}>
          <h2 className={styles.cardTitle}>Estatísticas de Notificações</h2>
        </div>

        <div className={styles.stats}>
          <div className={cx(styles.stat, styles.statInfo)}>
            <Icon name="bell" size={28} />
            <span className={styles.statValue}>{total}</span>
            <span className={styles.statLabel}>Total Enviadas</span>
          </div>
          <div className={cx(styles.stat, styles.statSuccess)}>
            <Icon name="package" size={28} />
            <span className={styles.statValue}>{ordersCount}</span>
            <span className={styles.statLabel}>Pedidos</span>
          </div>
          <div className={cx(styles.stat, styles.statPurple)}>
            <Icon name="chat" size={28} />
            <span className={styles.statValue}>{chatCount}</span>
            <span className={styles.statLabel}>Chat</span>
          </div>
          <div className={cx(styles.stat, styles.statBrand)}>
            <Icon name="bolt" size={28} />
            <span className={styles.statValue}>{unreadCount}</span>
            <span className={styles.statLabel}>Não Lidas</span>
          </div>
        </div>
      </section>
    </div>
  );
}
