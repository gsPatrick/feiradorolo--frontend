'use client';

import { useState, useEffect, useMemo } from 'react';
import styles from './AdminDisputes.module.css';
import { cx } from '@/lib/cx';
import Button from '@/components/atoms/Button/Button';
import Input from '@/components/atoms/Input/Input';
import Textarea from '@/components/atoms/Textarea/Textarea';
import Badge from '@/components/atoms/Badge/Badge';
import Icon from '@/components/atoms/Icon/Icon';
import Modal from '@/components/organisms/Modal/Modal';
import { useToast } from '@/components/providers/ToastProvider';
import { adminService, ApiError } from '@/lib/api';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const formatCurrency = (value) => BRL.format(Number(value) || 0);

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/* — Rótulos PT dos motivos de disputa — */
const REASON_LABELS = {
  not_received: 'Não recebido',
  not_as_described: 'Diferente do anunciado',
  damaged: 'Produto danificado',
  fraud: 'Fraude / golpe',
  other: 'Outro motivo',
};
const reasonLabel = (r) => REASON_LABELS[r] || r || 'Não informado';

/* — Status: rótulo PT + variante do Badge — */
const STATUS_META = {
  open: { label: 'Aberta', variant: 'brand' },
  resolved: { label: 'Resolvida', variant: 'success' },
  rejected: { label: 'Rejeitada', variant: 'danger' },
  in_review: { label: 'Em análise', variant: 'info' },
  closed: { label: 'Encerrada', variant: 'neutral' },
};
const statusMeta = (s) =>
  STATUS_META[s] || { label: s || 'Desconhecido', variant: 'neutral' };

/* — Rótulos PT das resoluções — */
const RESOLUTION_LABELS = {
  refund_buyer: 'Comprador reembolsado',
  release_seller: 'Vendedor liberado',
  partial_refund: 'Reembolso parcial',
  none: 'Sem resolução',
};

/* — Rótulos PT das respostas do questionário — */
const QUESTION_LABELS = {
  opened: 'Abriu a embalagem?',
  used: 'Usou o produto?',
  complete: 'Está completo (acessórios/peças)?',
  defect: 'Apresenta defeito?',
};
const questionLabel = (key) =>
  QUESTION_LABELS[key] || key.replace(/_/g, ' ');

function answerText(value) {
  if (value === true) return 'Sim';
  if (value === false) return 'Não';
  if (value == null || value === '') return '—';
  return String(value);
}

/* — Identificador curto do pedido — */
function orderLabel(d) {
  const num = d.order && (d.order.order_number || d.order.number);
  if (num) return `#${num}`;
  if (d.order_id) return `#${String(d.order_id).slice(0, 8)}`;
  return `#${String(d.id).slice(0, 8)}`;
}

const FILTERS = [
  { k: 'all', label: 'Todas' },
  { k: 'open', label: 'Abertas' },
  { k: 'resolved', label: 'Resolvidas' },
];

export default function AdminDisputes() {
  const { toast } = useToast();

  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState('all');

  /* — Detalhe / mediação — */
  const [selected, setSelected] = useState(null); // disputa selecionada
  const [notes, setNotes] = useState('');
  const [partialAmount, setPartialAmount] = useState('');
  const [showPartial, setShowPartial] = useState(false);
  const [acting, setActing] = useState(false);

  /* — Visualização de foto em tamanho cheio — */
  const [photo, setPhoto] = useState(null);

  const load = (active = { current: true }) => {
    setLoading(true);
    setError(false);
    return adminService
      .disputes()
      .then((data) => {
        if (!active.current) return;
        setDisputes(Array.isArray(data) ? data : Array.isArray(data && data.items) ? data.items : []);
      })
      .catch(() => {
        // Erro/401 → fallback: lista vazia, não quebra.
        if (!active.current) return;
        setDisputes([]);
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

  const filtered = useMemo(() => {
    if (filter === 'all') return disputes;
    if (filter === 'open') return disputes.filter((d) => d.status === 'open');
    if (filter === 'resolved')
      return disputes.filter((d) => d.status === 'resolved' || d.status === 'closed');
    return disputes;
  }, [disputes, filter]);

  const openDetail = (d) => {
    setSelected(d);
    setNotes('');
    setPartialAmount(d.amount_disputed != null ? String(d.amount_disputed) : '');
    setShowPartial(false);
  };

  const closeDetail = () => {
    if (acting) return;
    setSelected(null);
    setShowPartial(false);
  };

  /* — Executa uma resolução (reembolsar / liberar / parcial) — */
  const resolve = async (resolution) => {
    if (!selected) return;

    let amount;
    if (resolution === 'partial_refund') {
      amount = Number(partialAmount);
      if (!partialAmount || Number.isNaN(amount) || amount <= 0) {
        toast({
          title: 'Valor inválido',
          description: 'Informe um valor maior que zero para o reembolso parcial.',
          variant: 'error',
        });
        return;
      }
    }

    const labels = {
      refund_buyer: 'reembolsar o comprador',
      release_seller: 'liberar o vendedor',
      partial_refund: `reembolsar ${formatCurrency(amount)} ao comprador`,
    };
    if (!window.confirm(`Confirmar: ${labels[resolution]}?`)) return;

    const payload = { resolution, notes: notes || undefined };
    if (resolution === 'partial_refund') payload.amount = amount;

    setActing(true);
    try {
      await adminService.resolveDispute(selected.id, payload);
      toast({
        title: 'Disputa mediada',
        description: `Resolução aplicada: ${RESOLUTION_LABELS[resolution] || resolution}.`,
        variant: 'success',
      });
      setSelected(null);
      setShowPartial(false);
      await load();
    } catch (err) {
      toast({
        title: 'Não foi possível resolver',
        description: err instanceof ApiError ? err.message : 'Tente novamente.',
        variant: 'error',
      });
    } finally {
      setActing(false);
    }
  };

  /* — Conteúdo da lista — */
  const renderList = () => {
    if (loading) {
      return (
        <div className={styles.stateBox}>
          <span className={styles.spinner} aria-hidden="true" />
          <span>Carregando disputas…</span>
        </div>
      );
    }
    if (!filtered.length) {
      return (
        <div className={styles.stateBox}>
          <Icon name="shield" size={28} />
          <p className={styles.stateTitle}>Nenhuma disputa</p>
          <p className={styles.stateText}>
            {error
              ? 'Não foi possível carregar as disputas agora.'
              : filter === 'all'
                ? 'Nenhuma devolução foi aberta até o momento.'
                : 'Nenhuma disputa nesse filtro.'}
          </p>
        </div>
      );
    }
    return (
      <div className={styles.list}>
        {filtered.map((d) => {
          const sm = statusMeta(d.status);
          return (
            <button key={d.id} type="button" className={styles.row} onClick={() => openDetail(d)}>
              <div className={styles.rowLeft}>
                <span className={styles.rowOrder}>{orderLabel(d)}</span>
                <div className={styles.rowInfo}>
                  <p className={styles.rowReason}>{reasonLabel(d.reason)}</p>
                  <p className={styles.rowMeta}>{formatDate(d.created_at)}</p>
                </div>
              </div>
              <div className={styles.rowRight}>
                {d.amount_disputed != null && (
                  <span className={styles.rowValue}>{formatCurrency(d.amount_disputed)}</span>
                )}
                <Badge variant={sm.variant} size="sm">
                  {sm.label}
                </Badge>
                <Icon name="chevron-left" size={18} className={styles.rowChevron} />
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  /* — Detalhe da disputa selecionada — */
  const renderDetail = () => {
    if (!selected) return null;
    const d = selected;
    const sm = statusMeta(d.status);
    const isOpen = d.status === 'open';
    const evidence = d.evidence || {};
    const questionnaire = evidence.questionnaire || {};
    const photos = Array.isArray(evidence.photos) ? evidence.photos : [];
    const qEntries = Object.entries(questionnaire);
    const buyerId = d.opened_by;
    const sellerId = d.against_id;

    return (
      <Modal
        open
        onClose={closeDetail}
        size="lg"
        title={`Disputa ${orderLabel(d)}`}
        footer={
          isOpen ? (
            <div className={styles.footer}>
              {showPartial ? (
                <div className={styles.partialBox}>
                  <label htmlFor="dispute-partial" className={styles.partialLabel}>
                    Valor do reembolso parcial (R$)
                  </label>
                  <div className={styles.partialRow}>
                    <Input
                      id="dispute-partial"
                      type="number"
                      min="0"
                      step="0.01"
                      value={partialAmount}
                      onChange={(e) => setPartialAmount(e.target.value)}
                      placeholder="0,00"
                    />
                    <Button
                      variant="ghost"
                      onClick={() => setShowPartial(false)}
                      disabled={acting}
                    >
                      Voltar
                    </Button>
                    <Button
                      variant="primary"
                      loading={acting}
                      disabled={acting}
                      onClick={() => resolve('partial_refund')}
                    >
                      Confirmar parcial
                    </Button>
                  </div>
                </div>
              ) : (
                <div className={styles.actions}>
                  <Button
                    variant="primary"
                    leftIcon="dollar"
                    loading={acting}
                    disabled={acting}
                    onClick={() => resolve('refund_buyer')}
                  >
                    Reembolsar comprador
                  </Button>
                  <Button
                    variant="outline"
                    leftIcon="check"
                    disabled={acting}
                    onClick={() => resolve('release_seller')}
                  >
                    Liberar vendedor
                  </Button>
                  <Button
                    variant="ghost"
                    leftIcon="tag"
                    disabled={acting}
                    onClick={() => setShowPartial(true)}
                  >
                    Reembolso parcial
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.footer}>
              <p className={styles.resolvedNote}>
                <Icon name="check" size={16} />
                <span>
                  {d.resolution && d.resolution !== 'none'
                    ? `Mediada: ${RESOLUTION_LABELS[d.resolution] || d.resolution}.`
                    : 'Esta disputa não está aberta para mediação.'}
                </span>
              </p>
              <Button variant="ghost" onClick={closeDetail}>
                Fechar
              </Button>
            </div>
          )
        }
      >
        <div className={styles.detail}>
          {/* — Resumo: status, motivo, valor, data — */}
          <div className={styles.detailHead}>
            <Badge variant={sm.variant} size="md">
              {sm.label}
            </Badge>
            <span className={styles.detailReason}>{reasonLabel(d.reason)}</span>
            {d.amount_disputed != null && (
              <span className={styles.detailAmount}>{formatCurrency(d.amount_disputed)}</span>
            )}
            <span className={styles.detailDate}>{formatDate(d.created_at)}</span>
          </div>

          {/* — Partes envolvidas — */}
          <div className={styles.parties}>
            <div className={styles.party}>
              <span className={styles.partyTag}>Comprador</span>
              <span className={styles.partyId}>{buyerId ? String(buyerId) : '—'}</span>
            </div>
            <Icon name="arrow-right" size={18} className={styles.partyVs} />
            <div className={styles.party}>
              <span className={styles.partyTag}>Vendedor</span>
              <span className={styles.partyId}>{sellerId ? String(sellerId) : '—'}</span>
            </div>
          </div>

          {/* — Descrição — */}
          {d.description && (
            <section className={styles.block}>
              <h4 className={styles.blockTitle}>Descrição do comprador</h4>
              <p className={styles.description}>{d.description}</p>
            </section>
          )}

          {/* — Respostas do questionário — */}
          {qEntries.length > 0 && (
            <section className={styles.block}>
              <h4 className={styles.blockTitle}>Respostas do questionário</h4>
              <ul className={styles.qList}>
                {qEntries.map(([key, val]) => (
                  <li key={key} className={styles.qItem}>
                    <span className={styles.qLabel}>{questionLabel(key)}</span>
                    <span className={styles.qAnswer}>{answerText(val)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* — Fotos / evidências — */}
          {photos.length > 0 && (
            <section className={styles.block}>
              <h4 className={styles.blockTitle}>Fotos enviadas ({photos.length})</h4>
              <div className={styles.photos}>
                {photos.map((url, i) => (
                  <button
                    key={`${url}-${i}`}
                    type="button"
                    className={styles.photoThumb}
                    onClick={() => setPhoto(url)}
                    aria-label={`Ver foto ${i + 1}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Evidência ${i + 1}`} />
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* — Observações da mediação (notes) — */}
          {isOpen && (
            <section className={styles.block}>
              <h4 className={styles.blockTitle}>Observações da mediação</h4>
              <Textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anote o motivo da decisão (enviado junto da resolução)…"
              />
            </section>
          )}
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
            <span>Disputas &amp; Devoluções</span>
          </h2>
          <div className={styles.filters} role="tablist" aria-label="Filtrar disputas">
            {FILTERS.map((f) => (
              <button
                key={f.k}
                type="button"
                role="tab"
                aria-selected={filter === f.k}
                className={cx(styles.filter, filter === f.k && styles.filterActive)}
                onClick={() => setFilter(f.k)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </header>
        <div className={styles.cardBody}>{renderList()}</div>
      </section>

      {renderDetail()}

      {/* — Visualizador de foto em tela cheia — */}
      {photo && (
        <Modal open onClose={() => setPhoto(null)} size="lg" title="Evidência">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt="Evidência" className={styles.photoFull} />
        </Modal>
      )}
    </div>
  );
}
