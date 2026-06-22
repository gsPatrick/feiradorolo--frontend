'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import styles from './page.module.css';
import { cx } from '@/lib/cx';
import Icon from '@/components/atoms/Icon/Icon';
import Button from '@/components/atoms/Button/Button';
import Spinner from '@/components/atoms/Spinner/Spinner';
import EmptyState from '@/components/molecules/EmptyState/EmptyState';
import SellerTrust from '@/components/molecules/SellerTrust/SellerTrust';
import { authService, chatService, ApiError } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/components/providers/AuthProvider';
import { useToast } from '@/components/providers/ToastProvider';

const ISend = (p) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" />
  </svg>
);
const IWarn = (p) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" />
  </svg>
);

function ago(d) {
  if (!d) return '';
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return 'agora';
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  if (s < 604800) return `${Math.floor(s / 86400)} d`;
  return new Date(d).toLocaleDateString('pt-BR');
}

const ts = (m) => m.created_at || m.createdAt;
const isBlocked = (m) => m.moderation_status === 'blocked' || m.moderation_status === 'flagged' || m.contains_blocked_words;
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const productImg = (p) => (p && Array.isArray(p.images) && p.images[0]) || '';
const productPrice = (p) => (p ? Number(p.promotional_price != null ? p.promotional_price : p.price) : null);

export default function MensagensPage() {
  const { openAuth } = useAuth();
  const { toast } = useToast();

  const [me, setMe] = useState(null);
  const [chats, setChats] = useState([]);
  const [listState, setListState] = useState('loading'); // loading | ready | unauth | error
  const [search, setSearch] = useState('');

  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const msgsRef = useRef(null);
  const selectedRef = useRef(null);
  selectedRef.current = selectedId;

  // Carrega usuário + conversas.
  useEffect(() => {
    let active = true;
    Promise.all([authService.me().catch(() => null), chatService.listMine()])
      .then(([user, list]) => {
        if (!active) return;
        setMe(user);
        setChats(Array.isArray(list) ? list : []);
        setListState('ready');
        try {
          const c = new URLSearchParams(window.location.search).get('chat');
          if (c) setSelectedId(c);
        } catch {}
      })
      .catch((err) => {
        if (!active) return;
        setListState(err instanceof ApiError && err.status === 401 ? 'unauth' : 'error');
      });
    return () => {
      active = false;
    };
  }, []);

  // Socket: anexa mensagens novas (dedupe por id).
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onNew = (msg) => {
      if (!msg || msg.chat_id !== selectedRef.current) return;
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
    };
    socket.on('message:new', onNew);
    return () => socket.off('message:new', onNew);
  }, []);

  // Troca de conversa: busca histórico + entra na sala.
  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    setMsgLoading(true);
    chatService
      .messages(selectedId)
      .then((rows) => active && setMessages(Array.isArray(rows) ? rows : []))
      .catch(() => active && setMessages([]))
      .finally(() => active && setMsgLoading(false));
    const socket = getSocket();
    if (socket) socket.emit('chat:join', selectedId);
    return () => {
      active = false;
      if (socket) socket.emit('chat:leave', selectedId);
    };
  }, [selectedId]);

  // Rola apenas o container de mensagens (não a página inteira).
  useEffect(() => {
    const el = msgsRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, msgLoading]);

  const counterpart = useCallback(
    (chat) => {
      const myId = me && me.id;
      return chat.buyer_id === myId ? chat.seller : chat.buyer;
    },
    [me]
  );

  const selectedChat = chats.find((c) => c.id === selectedId);

  async function send(e) {
    e.preventDefault();
    const content = text.trim();
    if (!content || !selectedId) return;
    setSending(true);
    try {
      const msg = await chatService.send(selectedId, content);
      if (msg) setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      setText('');
    } catch (err) {
      toast({ title: 'Não foi possível enviar', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  }

  const filtered = chats.filter((c) => {
    const cp = counterpart(c);
    return !search || (cp && cp.name && cp.name.toLowerCase().includes(search.toLowerCase()));
  });

  // ---- Estados de página inteira ----
  if (listState === 'unauth') {
    return (
      <main className={styles.page}>
        <div className={styles.container}>
          <EmptyState
            icon="chat"
            title="Entre para ver suas conversas"
            description="Faça login para conversar com vendedores sobre os produtos."
            action={<Button variant="primary" onClick={() => openAuth('login')} rightIcon="arrow-right">Entrar</Button>}
          />
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={cx(styles.layout, selectedId && styles.threadOpen)}>
          {/* ----- Lista de conversas ----- */}
          <aside className={styles.list}>
            <div className={styles.listHead}>
              <h1>Mensagens</h1>
            </div>
            <div className={styles.searchWrap}>
              <Icon name="search" size={16} className={styles.searchIcon} />
              <input
                className={styles.search}
                placeholder="Buscar conversas..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className={styles.convs}>
              {listState === 'loading' ? (
                <div className={styles.center}><Spinner size={26} /></div>
              ) : filtered.length === 0 ? (
                <div className={styles.emptyList}>
                  <Icon name="chat" size={40} />
                  <strong>Nenhuma conversa ainda</strong>
                  <p>Converse com vendedores nos produtos.</p>
                </div>
              ) : (
                filtered.map((chat) => {
                  const cp = counterpart(chat) || {};
                  const initial = (cp.name || 'U').charAt(0).toUpperCase();
                  return (
                    <button
                      key={chat.id}
                      className={cx(styles.conv, chat.id === selectedId && styles.convActive)}
                      onClick={() => setSelectedId(chat.id)}
                    >
                      <span className={styles.avatar}>{initial}</span>
                      <span className={styles.convBody}>
                        <span className={styles.convTop}>
                          <strong className={styles.convName}>{cp.name || 'Usuário'}</strong>
                          <span className={styles.convTime}>{ago(chat.last_message_at || chat.lastMessageAt)}</span>
                        </span>
                        <span className={styles.convSub}>
                          {chat.product ? `Sobre: ${chat.product.title}` : 'Conversa'}
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* ----- Janela de conversa ----- */}
          <section className={styles.window}>
            {!selectedChat ? (
              <div className={styles.noChat}>
                <Icon name="chat" size={48} />
                <strong>Selecione uma conversa</strong>
                <p>Escolha uma conversa à esquerda para ver as mensagens.</p>
              </div>
            ) : (
              <>
                <header className={styles.winHead}>
                  <button className={styles.back} onClick={() => setSelectedId(null)} aria-label="Voltar">
                    <Icon name="arrow-left" size={20} />
                  </button>
                  <span className={styles.avatar}>{((counterpart(selectedChat) || {}).name || 'U').charAt(0).toUpperCase()}</span>
                  <div className={styles.winInfo}>
                    <strong>{(counterpart(selectedChat) || {}).name || 'Usuário'}</strong>
                    <span>{selectedChat.product ? 'Conversa sobre produto' : 'Chat'}</span>
                  </div>
                  {(() => {
                    // Selo de confiança do VENDEDOR da conversa (independe de quem sou eu).
                    const sellerId = selectedChat.seller_id || selectedChat.seller?.id || null;
                    return sellerId ? (
                      <SellerTrust sellerId={sellerId} compact className={styles.winTrust} />
                    ) : null;
                  })()}
                </header>

                {selectedChat.product && (
                  <a className={styles.productBar} href={`/produto/${selectedChat.product.id}`}>
                    {productImg(selectedChat.product) ? (
                      <img src={productImg(selectedChat.product)} alt="" className={styles.productThumb} />
                    ) : (
                      <span className={styles.productThumb} />
                    )}
                    <div className={styles.productInfo}>
                      <span className={styles.productLabel}>Conversa sobre</span>
                      <strong className={styles.productTitle}>{selectedChat.product.title}</strong>
                    </div>
                    {productPrice(selectedChat.product) != null && (
                      <span className={styles.productPrice}>{BRL.format(productPrice(selectedChat.product))}</span>
                    )}
                  </a>
                )}

                <div ref={msgsRef} className={styles.msgs}>
                  {msgLoading ? (
                    <div className={styles.center}><Spinner size={26} /></div>
                  ) : (
                    <>
                      {messages.map((m) => {
                        const mine = me && m.sender_id === me.id;
                        const blocked = isBlocked(m);
                        return (
                          <div key={m.id} className={cx(styles.row, mine ? styles.rowMine : styles.rowTheirs)}>
                            <div className={cx(styles.bubble, mine && styles.bubbleMine, blocked && styles.bubbleBlocked)}>
                              {blocked ? (
                                <div className={styles.blocked}>
                                  <span className={styles.blockedHead}><IWarn /> Mensagem bloqueada</span>
                                  <p>{m.flagged_reason || 'Conteúdo não permitido fora da plataforma.'}</p>
                                </div>
                              ) : (
                                <>
                                  <p className={styles.bubbleText}>{m.content}</p>
                                  <span className={styles.bubbleTime}>{ago(ts(m))}</span>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>

                <form className={styles.composer} onSubmit={send}>
                  <input
                    className={styles.input}
                    placeholder="Digite sua mensagem..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    disabled={sending}
                  />
                  <button className={styles.sendBtn} type="submit" disabled={sending || !text.trim()} aria-label="Enviar">
                    <ISend />
                  </button>
                </form>
                <p className={styles.notice}>🔒 As conversas são monitoradas para a sua segurança.</p>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
