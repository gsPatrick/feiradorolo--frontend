'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import styles from './AdminChatModeration.module.css';
import { cx } from '@/lib/cx';
import Icon from '@/components/atoms/Icon/Icon';
import Button from '@/components/atoms/Button/Button';
import Badge from '@/components/atoms/Badge/Badge';
import { useToast } from '@/components/providers/ToastProvider';
import { adminService, ApiError } from '@/lib/api';

/* — SVGs inline (lucide) para ícones ausentes no Icon.js — */
function FlagIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}
function BanIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="m4.9 4.9 14.2 14.2" />
    </svg>
  );
}
function ThumbsUpIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 10v12" />
      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
    </svg>
  );
}
function ThumbsDownIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 14V2" />
      <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z" />
    </svg>
  );
}
function BarChartIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 3v18h18" />
      <rect x="7" y="11" width="3" height="7" />
      <rect x="12" y="7" width="3" height="11" />
      <rect x="17" y="13" width="3" height="5" />
    </svg>
  );
}
function CheckCircleIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21.801 10A10 10 0 1 1 17 3.335" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  );
}

/* — DADOS MOCK — */
const REPORTS = [
  {
    id: 1, status: 'pending', reason: 'spam',
    createdAt: '2026-06-18',
    questionText: 'Esse produto é original? Compre no meu site www.ofertas-imperdiveis.xyz com 90% OFF!!!',
    questionUserName: 'mega_promo_22', productName: 'iPhone 14 Pro Max 256GB',
    description: 'Usuário está divulgando link externo suspeito nas perguntas.',
    reporterName: 'Carla Mendes',
  },
  {
    id: 2, status: 'pending', reason: 'offensive',
    createdAt: '2026-06-17',
    questionText: 'Que produto lixo, o vendedor é um golpista e não merece estar aqui.',
    questionUserName: 'joao_revoltado', productName: 'Tênis Nike Air Max',
    description: 'Linguagem ofensiva direcionada ao vendedor.',
    reporterName: 'TechStore Oficial',
  },
  {
    id: 3, status: 'pending', reason: 'inappropriate',
    createdAt: '2026-06-16',
    questionText: 'Me passa seu WhatsApp e número da conta pra eu fazer o pagamento por fora?',
    questionUserName: 'comprador_fantasma', productName: 'PlayStation 5 Slim',
    description: 'Tentativa de negociação fora da plataforma.',
    reporterName: 'Rodrigo Lima',
  },
  { id: 4, status: 'approved', reason: 'spam', createdAt: '2026-06-12' },
  { id: 5, status: 'approved', reason: 'offensive', createdAt: '2026-06-10' },
  { id: 6, status: 'rejected', reason: 'inappropriate', createdAt: '2026-06-09' },
  { id: 7, status: 'rejected', reason: 'outros', createdAt: '2026-06-08' },
];

const SUSPICIOUS_MESSAGES = [
  {
    id: 1, category: 'Contato externo', timestamp: '2026-06-18',
    content: 'Bora fechar por fora? Te chamo no zap 11 9 8888-7777, sai mais barato.',
    senderName: 'vendedor_esperto', flagReason: 'Compartilhamento de telefone / negociação externa',
  },
  {
    id: 2, category: 'Pagamento suspeito', timestamp: '2026-06-17',
    content: 'Faz um Pix adiantado pra essa chave que eu reservo o produto pra você.',
    senderName: 'oferta_relampago', flagReason: 'Solicitação de pagamento antecipado fora do checkout',
  },
  {
    id: 3, category: 'Linguagem ofensiva', timestamp: '2026-06-16',
    content: 'Você é muito lerdo pra responder, seu atendimento é uma vergonha.',
    senderName: 'cliente_nervoso', flagReason: 'Palavras detectadas pelo filtro automático de ofensas',
  },
];

const TABS = [
  { k: 'reports', l: 'Denúncias', icon: 'flag' },
  { k: 'messages', l: 'Mensagens', icon: 'chat' },
  { k: 'conversations', l: 'Conversas', icon: 'chat' },
  { k: 'stats', l: 'Estatísticas', icon: 'bar' },
];

const REASON_LABEL = { spam: 'Spam', offensive: 'Ofensivo', inappropriate: 'Inapropriado', outros: 'Outros' };

function fmtDate(s) {
  if (!s) return '';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR');
}

/* Data relativa em pt-BR ("há 5 min", "há 2 h", "há 3 dias"). */
function fmtRelative(s) {
  if (!s) return '';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '';
  const diff = Math.round((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'agora';
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)} h`;
  const days = Math.floor(diff / 86400);
  if (days < 30) return `há ${days} ${days === 1 ? 'dia' : 'dias'}`;
  return d.toLocaleDateString('pt-BR');
}

function fmtDateTime(s) {
  if (!s) return '';
  const d = new Date(s);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

/* Determina o "papel" do remetente de uma mensagem em relação aos participantes do chat. */
function senderRole(msg, chat) {
  const sid = msg.sender_id ?? msg.sender?.id;
  if (sid != null && chat?.seller?.id != null && String(sid) === String(chat.seller.id)) return 'seller';
  if (sid != null && chat?.buyer?.id != null && String(sid) === String(chat.buyer.id)) return 'buyer';
  // Remetente que não é comprador nem vendedor = admin/suporte.
  return 'support';
}

function isFlaggedMsg(msg) {
  const st = msg.moderation_status;
  return st === 'flagged' || st === 'blocked' || !!msg.flagged_reason;
}

/* Normaliza um item sinalizado da API (chat OU mensagem) para o formato do card de mensagens. */
function mapFlagged(item) {
  if (!item || typeof item !== 'object') return null;
  const sender = item.sender || item.buyer || item.seller || {};
  const product = item.product || {};
  return {
    // pode ser um id de mensagem (moderável) ou de chat
    id: item.id,
    messageId: item.message_id || (item.content !== undefined ? item.id : null),
    category: item.moderation_status || item.status || 'Sinalizado',
    timestamp: item.last_message_at || item.created_at || item.createdAt || null,
    content: item.content || item.subject || (product.title ? `Conversa sobre: ${product.title}` : 'Conteúdo sinalizado'),
    senderName: sender.name || item.sender_name || 'Usuário',
    flagReason: item.flagged_reason || item.flag_reason || 'Sinalizado pelo filtro de moderação',
  };
}

export default function AdminChatModeration() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('reports');
  const [reports, setReports] = useState(REPORTS);
  const [messages, setMessages] = useState(SUSPICIOUS_MESSAGES);
  const [loadingMessages, setLoadingMessages] = useState(true);

  const loadFlagged = useCallback(async () => {
    setLoadingMessages(true);
    try {
      const data = await adminService.flaggedChats('?limit=50');
      const mapped = (Array.isArray(data) ? data : []).map(mapFlagged).filter(Boolean);
      // Dado real (mesmo vazio) substitui o mock — empty state é tratado na renderização.
      setMessages(mapped);
    } catch (err) {
      // Erro/401 (ApiError) ou erro inesperado: mantém o mock atual para não quebrar o painel.
      void err;
      setMessages(SUSPICIOUS_MESSAGES);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    loadFlagged();
  }, [loadFlagged]);

  /* — Conversas — */
  const [chats, setChats] = useState([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [chatsError, setChatsError] = useState(null); // 'auth' | 'generic' | null
  const [selectedChat, setSelectedChat] = useState(null);
  const [thread, setThread] = useState([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [threadError, setThreadError] = useState(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const threadRef = useRef(null);

  const scrollThreadToBottom = useCallback(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const loadChats = useCallback(async () => {
    setLoadingChats(true);
    setChatsError(null);
    try {
      const data = await adminService.allChats('?limit=50');
      setChats(Array.isArray(data) ? data : []);
    } catch (err) {
      setChats([]);
      setChatsError(err instanceof ApiError && (err.status === 401 || err.status === 403) ? 'auth' : 'generic');
    } finally {
      setLoadingChats(false);
    }
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  const loadThread = useCallback(async (chatId) => {
    setLoadingThread(true);
    setThreadError(null);
    try {
      const data = await adminService.chatMessages(chatId);
      setThread(Array.isArray(data) ? data : []);
      requestAnimationFrame(scrollThreadToBottom);
    } catch (err) {
      setThread([]);
      setThreadError(err instanceof ApiError && (err.status === 401 || err.status === 403) ? 'auth' : 'generic');
    } finally {
      setLoadingThread(false);
    }
  }, [scrollThreadToBottom]);

  function selectChat(chat) {
    setSelectedChat(chat);
    setDraft('');
    loadThread(chat.id);
  }

  async function sendMessage(e) {
    e?.preventDefault?.();
    const content = draft.trim();
    if (!content || !selectedChat || sending) return;
    setSending(true);
    try {
      await adminService.sendChatMessage(selectedChat.id, content);
      setDraft('');
      await loadThread(selectedChat.id);
    } catch (err) {
      const desc = err instanceof ApiError ? err.message : 'Não foi possível enviar a mensagem.';
      toast({ title: 'Erro ao enviar', description: desc, variant: 'destructive', duration: 2500 });
    } finally {
      setSending(false);
    }
  }

  async function moderate(message, status, successMsg) {
    if (!message.messageId) {
      toast({ title: '🚫 Usuário bloqueado', description: `${message.senderName} foi bloqueado.`, duration: 2000 });
      return;
    }
    try {
      await adminService.moderateMessage(message.messageId, status);
      toast({ title: successMsg.title, description: successMsg.description, variant: successMsg.variant, duration: 2000 });
      await loadFlagged();
    } catch (err) {
      const desc = err instanceof ApiError ? err.message : 'Não foi possível concluir a ação.';
      toast({ title: 'Erro na moderação', description: desc, variant: 'destructive', duration: 2500 });
    }
  }

  const pending = reports.filter((r) => r.status === 'pending');
  const approved = reports.filter((r) => r.status === 'approved');
  const rejected = reports.filter((r) => r.status === 'rejected');
  const blockedUsers = 5;

  function approve(id) {
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'approved' } : r)));
    toast({ title: '✅ Denúncia aprovada', description: 'Pergunta removida com sucesso.', variant: 'success', duration: 2000 });
  }
  function reject(id) {
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'rejected' } : r)));
    toast({ title: '❌ Denúncia rejeitada', description: 'Pergunta mantida na plataforma.', duration: 2000 });
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>
            <Icon name="shield" size={20} />
            <span>Sistema de Moderação</span>
          </h2>
        </div>

        <div className={styles.cardBody}>
          {/* — Estatísticas — */}
          <div className={styles.statsGrid}>
            <div className={cx(styles.stat, styles.statRed)}>
              <FlagIcon size={32} />
              <p className={styles.statValue}>{pending.length}</p>
              <p className={styles.statLabel}>Denúncias Pendentes</p>
            </div>
            <div className={cx(styles.stat, styles.statOrange)}>
              <Icon name="chat" size={32} />
              <p className={styles.statValue}>{messages.length}</p>
              <p className={styles.statLabel}>Mensagens Suspeitas</p>
            </div>
            <div className={cx(styles.stat, styles.statGreen)}>
              <CheckCircleIcon size={32} />
              <p className={styles.statValue}>{approved.length}</p>
              <p className={styles.statLabel}>Aprovadas</p>
            </div>
            <div className={cx(styles.stat, styles.statGray)}>
              <BanIcon size={32} />
              <p className={styles.statValue}>{blockedUsers}</p>
              <p className={styles.statLabel}>Usuários Bloqueados</p>
            </div>
          </div>

          {/* — Sub-abas — */}
          <div className={styles.tabs}>
            {TABS.map((t) => (
              <button
                key={t.k}
                type="button"
                className={cx(styles.tab, activeTab === t.k && styles.tabActive)}
                onClick={() => setActiveTab(t.k)}
              >
                {t.icon === 'flag' ? <FlagIcon size={16} /> : t.icon === 'bar' ? <BarChartIcon size={16} /> : <Icon name="chat" size={16} />}
                <span>{t.l}</span>
              </button>
            ))}
          </div>

          <div className={styles.tabContent} key={activeTab}>
            {/* — Denúncias — */}
            {activeTab === 'reports' && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Denúncias de Perguntas</h3>
                {pending.length === 0 ? (
                  <div className={styles.empty}>
                    <span className={styles.emptyIcon}><FlagIcon size={48} /></span>
                    <p>Nenhuma denúncia pendente</p>
                  </div>
                ) : (
                  <div className={styles.list}>
                    {pending.map((report) => (
                      <div key={report.id} className={cx(styles.reportCard, styles.borderRed)}>
                        <div className={styles.reportRow}>
                          <div className={styles.reportMain}>
                            <div className={styles.reportMeta}>
                              <Badge variant="danger" size="sm">{REASON_LABEL[report.reason] || report.reason}</Badge>
                              <span className={styles.date}>{fmtDate(report.createdAt)}</span>
                            </div>
                            <div className={styles.reportBody}>
                              <p className={styles.strongLabel}>Pergunta denunciada:</p>
                              <div className={styles.quote}>
                                <p className={styles.quoteText}>{report.questionText}</p>
                                <p className={styles.quoteBy}>
                                  Por: <strong>{report.questionUserName}</strong> em <strong>{report.productName}</strong>
                                </p>
                              </div>
                              {report.description && (
                                <div>
                                  <p className={styles.strongLabel}>Descrição da denúncia:</p>
                                  <p className={styles.muted}>{report.description}</p>
                                </div>
                              )}
                              <p className={styles.tinyMuted}>
                                Denunciado por: <strong>{report.reporterName}</strong>
                              </p>
                            </div>
                          </div>
                          <div className={styles.actions}>
                            <Button size="sm" variant="danger" onClick={() => approve(report.id)}>
                              <ThumbsUpIcon size={16} /> Aprovar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => reject(report.id)}>
                              <ThumbsDownIcon size={16} /> Rejeitar
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* — Mensagens — */}
            {activeTab === 'messages' && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Mensagens de Chat Suspeitas</h3>
                {loadingMessages ? (
                  <div className={styles.empty}>
                    <span className={styles.emptyIcon}><Icon name="chat" size={48} /></span>
                    <p>Carregando…</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className={styles.empty}>
                    <span className={styles.emptyIcon}><Icon name="chat" size={48} /></span>
                    <p>Nenhuma mensagem sinalizada</p>
                    <p className={styles.emptySub}>Sistema de moderação automática funcionando!</p>
                  </div>
                ) : (
                  <div className={styles.list}>
                    {messages.map((message) => (
                      <div key={message.id} className={cx(styles.reportCard, styles.borderOrange)}>
                        <div className={styles.reportRow}>
                          <div className={styles.reportMain}>
                            <div className={styles.reportMeta}>
                              <Badge variant="neutral" size="sm">{message.category}</Badge>
                              <span className={styles.date}>{fmtDate(message.timestamp)}</span>
                            </div>
                            <div className={styles.msgQuote}>
                              <p className={styles.quoteText}>{message.content}</p>
                              <p className={styles.quoteBy}>Por: <strong>{message.senderName}</strong></p>
                            </div>
                            <p className={styles.flagReason}>Motivo: {message.flagReason}</p>
                          </div>
                          <div className={styles.actions}>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => moderate(message, 'reviewed', { title: '✅ Mensagem aprovada', description: `Mensagem de ${message.senderName} marcada como revisada.`, variant: 'success' })}
                            >
                              <ThumbsUpIcon size={16} /> Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => moderate(message, 'blocked', { title: '🚫 Mensagem bloqueada', description: `Mensagem de ${message.senderName} foi bloqueada.`, variant: 'destructive' })}
                            >
                              <BanIcon size={16} /> Bloquear
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* — Conversas — */}
            {activeTab === 'conversations' && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Conversas</h3>
                {loadingChats ? (
                  <div className={styles.empty}>
                    <span className={styles.emptyIcon}><Icon name="chat" size={48} /></span>
                    <p>Carregando…</p>
                  </div>
                ) : chatsError === 'auth' ? (
                  <div className={styles.empty}>
                    <span className={styles.emptyIcon}><Icon name="shield" size={48} /></span>
                    <p>Faça login como administrador</p>
                  </div>
                ) : chatsError ? (
                  <div className={styles.empty}>
                    <span className={styles.emptyIcon}><Icon name="chat" size={48} /></span>
                    <p>Não foi possível carregar as conversas</p>
                    <Button size="sm" variant="outline" onClick={loadChats}>Tentar novamente</Button>
                  </div>
                ) : chats.length === 0 ? (
                  <div className={styles.empty}>
                    <span className={styles.emptyIcon}><Icon name="chat" size={48} /></span>
                    <p>Nenhuma conversa</p>
                  </div>
                ) : (
                  <div className={styles.convLayout}>
                    {/* Lista de conversas */}
                    <div className={cx(styles.convList, selectedChat && styles.convListCollapsed)}>
                      {chats.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className={cx(styles.convItem, selectedChat?.id === c.id && styles.convItemActive)}
                          onClick={() => selectChat(c)}
                        >
                          <div className={styles.convItemHead}>
                            <span className={styles.convParties}>
                              <strong>{c.buyer?.name || 'Comprador'}</strong>
                              <span className={styles.convArrow}> ↔ </span>
                              <strong>{c.seller?.name || 'Vendedor'}</strong>
                            </span>
                            {c.is_flagged && <Badge variant="danger" size="sm">Sinalizado</Badge>}
                          </div>
                          {c.product?.title && (
                            <span className={styles.convProduct}>{c.product.title}</span>
                          )}
                          <span className={styles.convDate}>{fmtRelative(c.last_message_at)}</span>
                        </button>
                      ))}
                    </div>

                    {/* Thread */}
                    <div className={cx(styles.convThread, !selectedChat && styles.convThreadHidden)}>
                      {!selectedChat ? (
                        <div className={styles.convPlaceholder}>
                          <Icon name="chat" size={40} />
                          <p>Selecione uma conversa para ver as mensagens</p>
                        </div>
                      ) : (
                        <>
                          <div className={styles.convThreadHeader}>
                            <button
                              type="button"
                              className={styles.convBack}
                              onClick={() => setSelectedChat(null)}
                              aria-label="Voltar"
                            >
                              <Icon name="arrow-left" size={18} />
                            </button>
                            <div className={styles.convThreadTitle}>
                              <strong>{selectedChat.buyer?.name || 'Comprador'}</strong>
                              <span className={styles.convArrow}> ↔ </span>
                              <strong>{selectedChat.seller?.name || 'Vendedor'}</strong>
                              {selectedChat.product?.title && (
                                <span className={styles.convThreadProduct}>{selectedChat.product.title}</span>
                              )}
                            </div>
                          </div>

                          <div className={styles.convMessages} ref={threadRef}>
                            {loadingThread ? (
                              <p className={styles.convLoading}>Carregando…</p>
                            ) : threadError === 'auth' ? (
                              <p className={styles.convLoading}>Faça login como administrador</p>
                            ) : threadError ? (
                              <p className={styles.convLoading}>Erro ao carregar mensagens</p>
                            ) : thread.length === 0 ? (
                              <p className={styles.convLoading}>Nenhuma mensagem nesta conversa</p>
                            ) : (
                              thread.map((m) => {
                                const role = senderRole(m, selectedChat);
                                const flagged = isFlaggedMsg(m);
                                return (
                                  <div
                                    key={m.id}
                                    className={cx(
                                      styles.bubbleRow,
                                      role === 'seller' && styles.bubbleRight,
                                      role === 'support' && styles.bubbleCenter
                                    )}
                                  >
                                    <div
                                      className={cx(
                                        styles.bubble,
                                        role === 'seller' && styles.bubbleSeller,
                                        role === 'support' && styles.bubbleSupport,
                                        flagged && styles.bubbleFlagged
                                      )}
                                    >
                                      <span className={styles.bubbleSender}>
                                        {role === 'support' ? 'Suporte' : (m.sender?.name || 'Usuário')}
                                      </span>
                                      <p className={styles.bubbleText}>{m.content}</p>
                                      {flagged && m.flagged_reason && (
                                        <p className={styles.bubbleFlag}>⚠ {m.flagged_reason}</p>
                                      )}
                                      <span className={styles.bubbleTime}>
                                        {fmtDateTime(m.created_at || m.createdAt)}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          <form className={styles.composer} onSubmit={sendMessage}>
                            <input
                              type="text"
                              className={styles.composerInput}
                              placeholder="Escreva como suporte…"
                              value={draft}
                              onChange={(e) => setDraft(e.target.value)}
                              disabled={sending}
                            />
                            <Button type="submit" size="sm" disabled={sending || !draft.trim()}>
                              {sending ? 'Enviando…' : 'Enviar'}
                            </Button>
                          </form>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* — Estatísticas — */}
            {activeTab === 'stats' && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Estatísticas de Moderação</h3>
                <div className={styles.statsCards}>
                  <div className={styles.subCard}>
                    <div className={styles.subCardHeader}><h4>Atividade Recente (30 dias)</h4></div>
                    <div className={styles.subCardBody}>
                      <div className={styles.kv}><span>Total de denúncias:</span><strong>{reports.length}</strong></div>
                      <div className={styles.kv}><span>Denúncias aprovadas:</span><strong className={styles.green}>{approved.length}</strong></div>
                      <div className={styles.kv}><span>Denúncias rejeitadas:</span><strong className={styles.red}>{rejected.length}</strong></div>
                      <div className={styles.kv}><span>Pendentes:</span><strong className={styles.orange}>{pending.length}</strong></div>
                    </div>
                  </div>

                  <div className={styles.subCard}>
                    <div className={styles.subCardHeader}><h4>Tipos de Denúncia Mais Comuns</h4></div>
                    <div className={styles.subCardBody}>
                      <div className={styles.kv}><span>Spam:</span><strong>{reports.filter((r) => r.reason === 'spam').length}</strong></div>
                      <div className={styles.kv}><span>Conteúdo inapropriado:</span><strong>{reports.filter((r) => r.reason === 'inappropriate').length}</strong></div>
                      <div className={styles.kv}><span>Linguagem ofensiva:</span><strong>{reports.filter((r) => r.reason === 'offensive').length}</strong></div>
                      <div className={styles.kv}><span>Outros:</span><strong>{reports.filter((r) => !['spam', 'inappropriate', 'offensive'].includes(r.reason)).length}</strong></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
