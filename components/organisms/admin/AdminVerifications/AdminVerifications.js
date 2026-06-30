'use client';

import { useState, useEffect } from 'react';
import styles from './AdminVerifications.module.css';
import { cx } from '@/lib/cx';
import Button from '@/components/atoms/Button/Button';
import Textarea from '@/components/atoms/Textarea/Textarea';
import Badge from '@/components/atoms/Badge/Badge';
import Icon from '@/components/atoms/Icon/Icon';
import Modal from '@/components/organisms/Modal/Modal';
import { useToast } from '@/components/providers/ToastProvider';
import { adminService, ApiError } from '@/lib/api';

/* — Data PT-BR (curta) — */
function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/* — Status: rótulo PT + variante do Badge — */
const STATUS_META = {
  pending: { label: 'Pendente', variant: 'info' },
  approved: { label: 'Aprovada', variant: 'success' },
  rejected: { label: 'Rejeitada', variant: 'danger' },
  expired: { label: 'Expirada', variant: 'neutral' },
};
const statusMeta = (s) => STATUS_META[s] || { label: s || 'Desconhecido', variant: 'neutral' };

/* — PF/PJ a partir do person_type (aceita rótulos do model e do wizard) — */
function personType(v) {
  const meta = v.metadata || {};
  const raw = String(meta.person_type || (v.user && v.user.person_type) || '').toLowerCase();
  if (raw === 'company' || raw === 'pj') return { label: 'PJ', full: 'Pessoa Jurídica' };
  if (raw === 'individual' || raw === 'pf') return { label: 'PF', full: 'Pessoa Física' };
  return { label: 'PF', full: 'Pessoa Física' };
}

/* — Documento (CPF/CNPJ) formatado a partir do usuário — */
function maskDocument(v) {
  const u = v.user || {};
  const pj = personType(v).label === 'PJ';
  const digits = String((pj ? u.cnpj : u.cpf) || u.document || '').replace(/\D/g, '');
  if (!digits) return '—';
  if (pj && digits.length === 14)
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  if (digits.length === 11)
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  return digits;
}

const displayName = (v) =>
  (v.user && (v.user.name || v.user.email)) ||
  (v.metadata && v.metadata.full_name) ||
  'Usuário';

const nationalityOf = (v) =>
  (v.metadata && v.metadata.nationality) ||
  (v.user && v.user.metadata && v.user.metadata.kyc && v.user.metadata.kyc.nationality) ||
  '—';

const birthDateOf = (v) => formatDate(v.user && v.user.birth_date);

/* — URLs dos documentos (frente/verso) com fallbacks — */
function docUrls(v) {
  const meta = v.metadata || {};
  const front = meta.document_front_url || v.document_url || null;
  const back = meta.document_back_url || null;
  return { front, back };
}

const isVerified = (val) => val === true || (typeof val === 'string' && val.length > 0) || val instanceof Date;
function emailVerified(v) {
  const u = v.user || {};
  return isVerified(u.email_verified) || isVerified(u.email_verified_at) || isVerified(u.is_email_verified);
}
function phoneVerified(v) {
  const u = v.user || {};
  return isVerified(u.phone_verified) || isVerified(u.phone_verified_at) || isVerified(u.is_phone_verified);
}

export default function AdminVerifications() {
  const { toast } = useToast();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [selected, setSelected] = useState(null); // verificação aberta no detalhe
  const [notes, setNotes] = useState('');
  const [acting, setActing] = useState(false);
  const [zoom, setZoom] = useState(null); // url da imagem em tela cheia

  const load = (active = { current: true }) => {
    setLoading(true);
    setError(false);
    return adminService
      .verifications('?status=pending')
      .then((data) => {
        if (!active.current) return;
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data && data.items)
            ? data.items
            : Array.isArray(data && data.verifications)
              ? data.verifications
              : [];
        // Garante apenas pendentes mesmo se o backend ignorar o filtro.
        setItems(list.filter((v) => !v.status || v.status === 'pending'));
      })
      .catch(() => {
        if (!active.current) return;
        setItems([]);
        setError(true);
      })
      .finally(() => {
        if (active.current) setLoading(false);
      });
  };

  useEffect(() => {
    const active = { current: true };
    load(active);
    return () => {
      active.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDetail = (v) => {
    setSelected(v);
    setNotes('');
  };

  const closeDetail = () => {
    if (acting) return;
    setSelected(null);
  };

  /* — Aprova ou rejeita a verificação selecionada — */
  const review = async (status) => {
    if (!selected) return;
    const rejection = notes.trim();
    if (status === 'rejected' && !window.confirm('Rejeitar esta verificação de identidade?')) return;

    setActing(true);
    try {
      // Backend lê `rejection_reason`; enviamos `notes` também por compatibilidade.
      await adminService.reviewVerification(selected.id, {
        status,
        rejection_reason: rejection || undefined,
        notes: rejection || undefined,
      });
      toast({
        title: status === 'approved' ? 'Verificação aprovada' : 'Verificação rejeitada',
        description:
          status === 'approved'
            ? `${displayName(selected)} foi verificado com sucesso.`
            : `A verificação de ${displayName(selected)} foi rejeitada.`,
        variant: status === 'approved' ? 'success' : 'info',
      });
      // Remove da lista de pendentes e fecha.
      setItems((prev) => prev.filter((v) => v.id !== selected.id));
      setSelected(null);
    } catch (err) {
      toast({
        title: 'Não foi possível concluir',
        description: err instanceof ApiError ? err.message : 'Tente novamente.',
        variant: 'error',
      });
    } finally {
      setActing(false);
    }
  };

  /* — Lista de pendentes — */
  const renderList = () => {
    if (loading) {
      return (
        <div className={styles.stateBox}>
          <span className={styles.spinner} aria-hidden="true" />
          <span>Carregando verificações…</span>
        </div>
      );
    }
    if (!items.length) {
      return (
        <div className={styles.stateBox}>
          <Icon name="shield" size={28} />
          <p className={styles.stateTitle}>Nenhuma verificação pendente</p>
          <p className={styles.stateText}>
            {error
              ? 'Não foi possível carregar as verificações agora. Verifique se o endpoint de listagem está disponível.'
              : 'Não há documentos de identidade aguardando análise.'}
          </p>
        </div>
      );
    }
    return (
      <div className={styles.list}>
        {items.map((v) => {
          const pt = personType(v);
          const { front } = docUrls(v);
          return (
            <button key={v.id} type="button" className={styles.row} onClick={() => openDetail(v)}>
              <div className={styles.rowLeft}>
                <span className={styles.thumb}>
                  {front ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={front} alt="Documento" />
                  ) : (
                    <Icon name="user" size={20} />
                  )}
                </span>
                <div className={styles.rowInfo}>
                  <p className={styles.rowName}>{displayName(v)}</p>
                  <p className={styles.rowMeta}>
                    {pt.full} · {formatDate(v.created_at)}
                  </p>
                </div>
              </div>
              <div className={styles.rowRight}>
                <Badge variant="neutral" size="sm">{pt.label}</Badge>
                <Badge variant="info" size="sm">Pendente</Badge>
                <Icon name="chevron-left" size={18} className={styles.rowChevron} />
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  /* — Detalhe da verificação (modal) — */
  const renderDetail = () => {
    if (!selected) return null;
    const v = selected;
    const pt = personType(v);
    const sm = statusMeta(v.status || 'pending');
    const { front, back } = docUrls(v);
    const eVer = emailVerified(v);
    const pVer = phoneVerified(v);

    const photo = (url, label) => (
      <div className={styles.docCol}>
        <span className={styles.docLabel}>{label}</span>
        {url ? (
          <button
            type="button"
            className={styles.docThumb}
            onClick={() => setZoom(url)}
            aria-label={`Ampliar ${label}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={label} />
            <span className={styles.docZoom}><Icon name="eye" size={16} /></span>
          </button>
        ) : (
          <div className={cx(styles.docThumb, styles.docEmpty)}>
            <Icon name="image" size={20} />
            <span>Sem imagem</span>
          </div>
        )}
      </div>
    );

    return (
      <Modal
        open
        onClose={closeDetail}
        size="lg"
        title="Revisão de identidade"
        footer={
          <div className={styles.footer}>
            <Button variant="ghost" onClick={closeDetail} disabled={acting}>
              Fechar
            </Button>
            <Button
              variant="outline"
              leftIcon="close"
              disabled={acting}
              onClick={() => review('rejected')}
            >
              Rejeitar
            </Button>
            <Button
              variant="primary"
              leftIcon="check"
              loading={acting}
              disabled={acting}
              className={styles.approveBtn}
              onClick={() => review('approved')}
            >
              Aprovar
            </Button>
          </div>
        }
      >
        <div className={styles.detail}>
          {/* — Resumo — */}
          <div className={styles.detailHead}>
            <Badge variant={sm.variant} size="md">{sm.label}</Badge>
            <span className={styles.detailName}>{displayName(v)}</span>
            <Badge variant="neutral" size="sm">{pt.full}</Badge>
            <span className={styles.detailDate}>{formatDate(v.created_at)}</span>
          </div>

          {/* — Dados enviados — */}
          <section className={styles.block}>
            <h4 className={styles.blockTitle}>Dados enviados</h4>
            <dl className={styles.dataGrid}>
              <div className={styles.dataItem}>
                <dt>Nome</dt>
                <dd>{displayName(v)}</dd>
              </div>
              <div className={styles.dataItem}>
                <dt>{pt.label === 'PJ' ? 'CNPJ' : 'CPF'}</dt>
                <dd>{maskDocument(v)}</dd>
              </div>
              <div className={styles.dataItem}>
                <dt>Nascimento</dt>
                <dd>{birthDateOf(v)}</dd>
              </div>
              <div className={styles.dataItem}>
                <dt>Nacionalidade</dt>
                <dd>{nationalityOf(v)}</dd>
              </div>
              {v.user && v.user.email && (
                <div className={styles.dataItem}>
                  <dt>E-mail</dt>
                  <dd>{v.user.email}</dd>
                </div>
              )}
            </dl>
          </section>

          {/* — Status de contato — */}
          <section className={styles.block}>
            <h4 className={styles.blockTitle}>Contato verificado</h4>
            <div className={styles.verifyRow}>
              <Badge variant={eVer ? 'success' : 'neutral'} size="sm">
                {eVer ? '✓ ' : ''}E-mail {eVer ? 'verificado' : 'não verificado'}
              </Badge>
              <Badge variant={pVer ? 'success' : 'neutral'} size="sm">
                {pVer ? '✓ ' : ''}Telefone {pVer ? 'verificado' : 'não verificado'}
              </Badge>
            </div>
          </section>

          {/* — Documentos (frente/verso) — */}
          <section className={styles.block}>
            <h4 className={styles.blockTitle}>Documentos</h4>
            <div className={styles.docs}>
              {photo(front, 'Frente')}
              {photo(back, 'Verso')}
            </div>
          </section>

          {/* — Motivo da rejeição (opcional) — */}
          <section className={styles.block}>
            <h4 className={styles.blockTitle}>Motivo da rejeição (opcional)</h4>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Se for rejeitar, descreva o motivo (enviado ao vendedor)…"
            />
          </section>
        </div>
      </Modal>
    );
  };

  return (
    <div className={styles.root}>
      <section className={styles.card}>
        <header className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>
            <Icon name="shield" size={20} />
            <span>Verificações de identidade</span>
          </h2>
          {!loading && items.length > 0 && (
            <Badge variant="info" size="sm">{items.length} pendente{items.length > 1 ? 's' : ''}</Badge>
          )}
        </header>
        <div className={styles.cardBody}>{renderList()}</div>
      </section>

      {renderDetail()}

      {/* — Visualizador de documento em tela cheia — */}
      {zoom && (
        <Modal open onClose={() => setZoom(null)} size="lg" title="Documento">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom} alt="Documento" className={styles.zoomFull} />
        </Modal>
      )}
    </div>
  );
}
