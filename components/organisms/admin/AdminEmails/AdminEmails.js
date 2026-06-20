'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './AdminEmails.module.css';
import { cx } from '@/lib/cx';
import Icon from '@/components/atoms/Icon/Icon';
import Input from '@/components/atoms/Input/Input';
import Textarea from '@/components/atoms/Textarea/Textarea';
import Select from '@/components/atoms/Select/Select';
import Modal from '@/components/organisms/Modal/Modal';
import { useToast } from '@/components/providers/ToastProvider';
import { adminService, ApiError } from '@/lib/api';

const sv = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
const IPhone = (p) => <svg {...sv} {...p}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.69 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.33 1.85.56 2.81.69A2 2 0 0 1 22 16.92Z" /></svg>;
const IInbox = (p) => <svg {...sv} {...p}><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></svg>;
const IRefresh = (p) => <svg {...sv} {...p}><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" /></svg>;
const ISend = (p) => <svg {...sv} {...p}><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>;
const ICheck = (p) => <svg {...sv} {...p}><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>;

const ACCOUNTS = [
  { id: 'contato', email: 'contato@feiradorolo.com.br', label: 'Principal', icon: 'mail', desc: 'Comunicação geral' },
  { id: 'suporte', email: 'suporte@feiradorolo.com.br', label: 'Suporte', icon: 'user', desc: 'Suporte técnico' },
  { id: 'vendas', email: 'vendas@feiradorolo.com.br', label: 'Vendas', Comp: IPhone, desc: 'Comercial' },
  { id: 'financeiro', email: 'financeiro@feiradorolo.com.br', label: 'Financeiro', icon: 'card', desc: 'Pagamentos' },
  { id: 'pix', email: 'pix@feiradorolo.com.br', label: 'PIX', icon: 'pix', desc: 'Transações PIX' },
];

// Normaliza um template da API para o formato consumido pela UI.
function normalizeTemplate(t) {
  const body = t.body || '';
  return {
    id: t.id ?? null,
    key: t.key || '',
    label: t.name || t.label || t.key || 'Sem título',
    desc: t.desc || t.subject || '',
    preview: t.preview || (body ? `${body.slice(0, 80)}${body.length > 80 ? '...' : ''}` : ''),
    subject: t.subject || '',
    body,
  };
}

function AccountIcon({ acc, size = 24 }) {
  if (acc.Comp) return <acc.Comp width={size} height={size} />;
  return <Icon name={acc.icon} size={size} />;
}

export default function AdminEmails() {
  const { toast } = useToast();
  const [selected, setSelected] = useState('contato');
  const [showCompose, setShowCompose] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [email, setEmail] = useState({ to: '', subject: '', body: '' });
  const [template, setTemplate] = useState('');

  const [templates, setTemplates] = useState([]);
  const [tplLoading, setTplLoading] = useState(true);
  const [editing, setEditing] = useState(null); // { id, key, label, subject, body } | null
  const [saving, setSaving] = useState(false);

  const acc = ACCOUNTS.find((a) => a.id === selected);

  const loadTemplates = useCallback(async () => {
    setTplLoading(true);
    try {
      const data = await adminService.emailTemplates();
      const list = Array.isArray(data) ? data : data?.data;
      setTemplates(Array.isArray(list) ? list.map(normalizeTemplate) : []);
    } catch (err) {
      // erro/401: sem dados reais, mostra estado vazio
      if (!(err instanceof ApiError)) console.error(err);
      setTemplates([]);
    } finally {
      setTplLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  function applyTemplate(t) {
    setEmail({ to: '', subject: t.subject, body: t.body });
    setTemplate(t.key);
    setShowTemplates(false);
    setShowCompose(true);
  }

  function openEditor(t) {
    setEditing(t ? { id: t.id, key: t.key, label: t.label, subject: t.subject, body: t.body } : { id: null, key: '', label: '', subject: '', body: '' });
  }

  async function saveEditing() {
    if (!editing) return;
    if (!editing.label.trim() || !editing.subject.trim()) {
      toast({ title: 'Preencha nome e assunto do template.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (editing.id) {
        await adminService.updateEmailTemplate(editing.id, { name: editing.label, subject: editing.subject, body: editing.body });
        toast({ title: 'Template atualizado!', variant: 'success' });
      } else {
        const key = editing.key.trim() || editing.label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        await adminService.createEmailTemplate({ key, name: editing.label, subject: editing.subject, body: editing.body });
        toast({ title: 'Template criado!', variant: 'success' });
      }
      setEditing(null);
      await loadTemplates();
    } catch (err) {
      toast({ title: 'Não foi possível salvar o template.', description: err instanceof ApiError ? err.message : undefined, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  function send() {
    if (!email.to || !email.subject) {
      toast({ title: 'Preencha destinatário e assunto.', variant: 'destructive' });
      return;
    }
    toast({ title: 'Email enviado!', description: `Enviado de ${acc.email}`, variant: 'success' });
    setEmail({ to: '', subject: '', body: '' });
    setShowCompose(false);
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div>
          <h1>Gerenciamento de Email</h1>
          <p>Gerencie emails de todos os endereços da Feira do Rolo</p>
        </div>
        <span className={styles.online}><ICheck width={14} height={14} /> Online</span>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}><Icon name="mail" size={20} /> Selecionar Conta de Email</h2>
        <div className={styles.accGrid}>
          {ACCOUNTS.map((a) => (
            <button key={a.id} className={cx(styles.accBtn, selected === a.id && styles.accBtnSel)} onClick={() => setSelected(a.id)}>
              <AccountIcon acc={a} size={24} />
              <span className={styles.accLabel}>{a.label}</span>
              <span className={styles.accDesc}>{a.desc}</span>
              <span className={styles.accEmail}>{a.email}</span>
            </button>
          ))}
        </div>
      </div>

      <div className={styles.grid3}>
        <div className={styles.card}>
          <h2 className={styles.cardTitle}><AccountIcon acc={acc} size={20} /> Conta Atual</h2>
          <div className={styles.curr}>
            <strong>{acc.label}</strong>
            <span className={styles.muted}>{acc.email}</span>
            <span>{acc.desc}</span>
          </div>
          <div className={styles.currActions}>
            <button className={styles.btnPrimary} onClick={() => { setEmail({ to: '', subject: '', body: '' }); setTemplate(''); setShowCompose(true); }}>
              <Icon name="plus" size={16} /> Novo Email
            </button>
            <button className={styles.btnIcon} onClick={() => toast({ title: 'Caixa de entrada sincronizada', variant: 'success' })} aria-label="Atualizar">
              <IRefresh width={16} height={16} />
            </button>
          </div>
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}><IInbox width={20} height={20} /> Status da Conta</h2>
          <div className={styles.statList}>
            <div className={styles.statRow}><span>Endereço:</span><span className={styles.muted}>{acc.email}</span></div>
            <div className={styles.statRow}><span>Tipo:</span><span>{acc.desc}</span></div>
            <div className={styles.statRow}><span>Status:</span><span className={styles.badgeGreen}>Configurada</span></div>
          </div>
        </div>

        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Ações Rápidas</h2>
          <div className={styles.qaList}>
            <button className={styles.qaBtn} onClick={() => setShowTemplates(true)}><Icon name="mail" size={16} /> Templates de Email</button>
            <button className={styles.qaBtn} onClick={() => toast({ title: 'Sincronizando...', description: 'Atualizando todas as contas de email' })}><IRefresh width={16} height={16} /> Sincronizar Todas</button>
            <button className={styles.qaBtn} onClick={() => toast({ title: 'Em desenvolvimento', description: 'Marcar como lidas será implementado em breve' })}><ICheck width={16} height={16} /> Marcar Como Lidas</button>
          </div>
        </div>
      </div>

      <Modal
        open={showCompose}
        onClose={() => setShowCompose(false)}
        title={<span className={styles.modalTitle}><ISend width={20} height={20} /> Novo Email — {acc.label}</span>}
        size="lg"
        footer={
          <>
            <button className={styles.btnOutline} onClick={() => setShowCompose(false)}>Cancelar</button>
            <button className={styles.btnPrimary} onClick={send}><ISend width={16} height={16} /> Enviar Email</button>
          </>
        }
      >
        <p className={styles.modalDesc}>Enviando de: {acc.email}</p>
        <div className={styles.field}>
          <label>Template (opcional):</label>
          <Select value={template} placeholder="Selecione um template" options={templates.map((t) => ({ value: t.key, label: t.label }))} onChange={(e) => { const t = templates.find((x) => x.key === e.target.value); if (t) applyTemplate(t); }} />
        </div>
        <div className={styles.field}>
          <label>Para:</label>
          <Input value={email.to} onChange={(e) => setEmail((p) => ({ ...p, to: e.target.value }))} placeholder="email@exemplo.com" />
        </div>
        <div className={styles.field}>
          <label>Assunto:</label>
          <Input value={email.subject} onChange={(e) => setEmail((p) => ({ ...p, subject: e.target.value }))} placeholder="Assunto do email" />
        </div>
        <div className={styles.field}>
          <label>Mensagem:</label>
          <Textarea value={email.body} onChange={(e) => setEmail((p) => ({ ...p, body: e.target.value }))} placeholder="Digite sua mensagem aqui..." rows={8} />
        </div>
      </Modal>

      <Modal
        open={showTemplates}
        onClose={() => { setShowTemplates(false); setEditing(null); }}
        title={<span className={styles.modalTitle}><Icon name="mail" size={20} /> Templates de Email</span>}
        size="lg"
        footer={
          <>
            <button className={styles.btnOutline} onClick={() => { setShowTemplates(false); setEditing(null); }}>Fechar</button>
            {!editing && <button className={styles.btnPrimary} onClick={() => openEditor(null)}><Icon name="plus" size={16} /> Novo Template</button>}
          </>
        }
      >
        {editing ? (
          <>
            <p className={styles.modalDesc}>{editing.id ? 'Editar template existente' : 'Criar novo template'}</p>
            <div className={styles.field}>
              <label>Nome:</label>
              <Input value={editing.label} onChange={(e) => setEditing((p) => ({ ...p, label: e.target.value }))} placeholder="Nome do template" />
            </div>
            <div className={styles.field}>
              <label>Assunto:</label>
              <Input value={editing.subject} onChange={(e) => setEditing((p) => ({ ...p, subject: e.target.value }))} placeholder="Assunto do email" />
            </div>
            <div className={styles.field}>
              <label>Mensagem:</label>
              <Textarea value={editing.body} onChange={(e) => setEditing((p) => ({ ...p, body: e.target.value }))} placeholder="Conteúdo do template..." rows={8} />
            </div>
            <div className={styles.tplEditActions}>
              <button className={styles.btnOutline} onClick={() => setEditing(null)} disabled={saving}>Voltar</button>
              <button className={styles.btnPrimary} onClick={saveEditing} disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</button>
            </div>
          </>
        ) : (
          <>
            <p className={styles.modalDesc}>Modelos pré-definidos para respostas rápidas</p>
            {tplLoading ? (
              <p className={styles.tplPreview}>Carregando…</p>
            ) : templates.length === 0 ? (
              <p className={styles.tplEmpty}>Nenhum template cadastrado. Crie o primeiro em “Novo Template”.</p>
            ) : (
              <div className={styles.tplGrid}>
                {templates.map((t) => (
                  <div key={t.id ?? t.key} className={styles.tplCard}>
                    <strong>{t.label}</strong>
                    <span className={styles.tplDesc}>{t.desc}</span>
                    <p className={styles.tplPreview}>{t.preview}</p>
                    <div className={styles.tplCardActions}>
                      <button type="button" className={styles.tplLink} onClick={() => applyTemplate(t)}><ISend width={14} height={14} /> Usar</button>
                      {t.id != null && <button type="button" className={styles.tplLink} onClick={() => openEditor(t)}><Icon name="edit" size={14} /> Editar</button>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
