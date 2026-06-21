'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import styles from './page.module.css';
import ProductSection from '@/components/organisms/ProductSection/ProductSection';
import Breadcrumb from '@/components/molecules/Breadcrumb/Breadcrumb';
import Gallery from '@/components/molecules/Gallery/Gallery';
import Rating from '@/components/molecules/Rating/Rating';
import Badge from '@/components/atoms/Badge/Badge';
import Icon from '@/components/atoms/Icon/Icon';
import Skeleton from '@/components/atoms/Skeleton/Skeleton';
import EmptyState from '@/components/molecules/EmptyState/EmptyState';
import ReviewForm from '@/components/organisms/ReviewForm/ReviewForm';
import ProductQA from '@/components/organisms/ProductQA/ProductQA';
import Modal from '@/components/organisms/Modal/Modal';
import { useCart } from '@/components/providers/CartProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { productService, reviewService, questionService, chatService, reportService, shipmentService, mapProduct, ApiError } from '@/lib/api';
import { maskCEP } from '@/lib/masks';
import { recordView } from '@/lib/history';

/* Motivos de denúncia aceitos pela API + rótulos pt-BR. */
/* Ícone "bandeira" inline (lucide) — não existe no Icon.js. */
function FlagIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'offensive', label: 'Ofensivo' },
  { value: 'inappropriate', label: 'Inapropriado' },
  { value: 'fraud', label: 'Fraude' },
  { value: 'external_contact', label: 'Contato externo' },
  { value: 'other', label: 'Outro' },
];

/** Formata uma data ISO no padrão pt-BR (curto). */
function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Monta o objeto de produto consumido pelo layout a partir do bruto da API. */
function buildProduct(raw) {
  const mapped = mapProduct(raw);
  if (!mapped) return null;
  const meta = raw.metadata || {};
  const images = Array.isArray(raw.images) ? raw.images : [];
  const condition = raw.condition || 'new';
  const categoryName = (raw.category && raw.category.name) || mapped.category || '';
  const specsFromApi = Array.isArray(raw.specifications) ? raw.specifications : null;
  return {
    ...mapped,
    images: images.length ? images : (mapped.image ? [mapped.image] : []),
    description: raw.description || '',
    stock: typeof raw.stock === 'number' ? raw.stock : 5,
    sales: Number(raw.favorites_count) || 0,
    installments: 12,
    categoryLabel: categoryName,
    specs: specsFromApi || [
      { label: 'Marca', value: mapped.brand || '—' },
      { label: 'Condição', value: condition === 'new' ? 'Novo' : 'Usado' },
      { label: 'Garantia', value: '90 dias' },
      { label: 'Origem', value: 'Brasil' },
      { label: 'Categoria', value: categoryName || '—' },
    ],
  };
}

export default function ProdutoPage() {
  const params = useParams();
  const id = params?.id;
  const { addItem, openCart } = useCart();
  const { toast } = useToast();
  const { openAuth, user } = useAuth();
  const router = useRouter();
  const [chatLoading, setChatLoading] = useState(false);
  const [qty, setQty] = useState(1);
  const [cep, setCep] = useState('');
  const [geo, setGeo] = useState(null);
  const [canReview, setCanReview] = useState(false);
  const [shipLoading, setShipLoading] = useState(false);
  const [shipOptions, setShipOptions] = useState(null);
  const [shipError, setShipError] = useState(null);

  async function calcShipping() {
    const digits = cep.replace(/\D/g, '');
    if (digits.length < 8) {
      toast({ title: 'Digite um CEP válido', duration: 1500 });
      return;
    }
    setShipLoading(true);
    setShipError(null);
    setShipOptions(null);
    try {
      const res = await shipmentService.quote({ to_zip: digits, product_id: id, quantity: qty });
      setShipOptions(Array.isArray(res) ? res : []);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : err && err.code;
      if (code === 'SHIPPING_NOT_CONFIGURED') setShipError('config');
      else if (code === 'SHIPPING_NO_ORIGIN') setShipError('origin');
      else setShipError('generic');
    } finally {
      setShipLoading(false);
    }
  }

  function locateMe() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      toast({ title: 'Geolocalização indisponível', variant: 'destructive', duration: 2000 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast({ title: 'Localização capturada', variant: 'success', duration: 1500 });
      },
      (err) => {
        const denied = err && err.code === err.PERMISSION_DENIED;
        toast({
          title: denied ? 'Permissão de localização negada' : 'Não foi possível obter a localização',
          variant: 'destructive',
          duration: 2000,
        });
      }
    );
  }

  async function startChat() {
    if (!product || !product.sellerId) return;
    setChatLoading(true);
    try {
      const chat = await chatService.open(product.sellerId, id);
      router.push(`/mensagens?chat=${chat.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) openAuth('login');
      else toast({ title: 'Não foi possível abrir o chat', description: err.message, variant: 'destructive' });
    } finally {
      setChatLoading(false);
    }
  }
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reviews, setReviews] = useState(null);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewFormOpen, setReviewFormOpen] = useState(false);
  const [questions, setQuestions] = useState(null);
  const [qaOpen, setQaOpen] = useState(false);
  // Denúncia de pergunta: { id } | null + formulário
  const [reportTarget, setReportTarget] = useState(null);
  const [reportReason, setReportReason] = useState('spam');
  const [reportDescription, setReportDescription] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);

  function openReport(questionId) {
    setReportTarget(questionId);
    setReportReason('spam');
    setReportDescription('');
  }

  async function submitReport(e) {
    e?.preventDefault?.();
    if (reportTarget == null || reportSubmitting) return;
    setReportSubmitting(true);
    try {
      await reportService.create({
        target_type: 'question',
        target_id: reportTarget,
        reason: reportReason,
        description: reportDescription.trim() || undefined,
      });
      setReportTarget(null);
      toast({ title: 'Denúncia enviada', description: 'Obrigado, nossa equipe vai analisar.', variant: 'success', duration: 2000 });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        toast({ title: 'Faça login para denunciar', variant: 'destructive', duration: 2500 });
      } else {
        toast({
          title: 'Não foi possível enviar',
          description: (err && err.message) || 'Tente novamente.',
          variant: 'destructive',
          duration: 2500,
        });
      }
    } finally {
      setReportSubmitting(false);
    }
  }

  const loadReviews = useCallback(() => {
    if (!id) return Promise.resolve();
    setReviewsLoading(true);
    return reviewService
      .listByProduct(id)
      .then((res) => {
        setReviews(res || { reviews: [], count: 0, average: 0 });
      })
      .catch(() => {
        setReviews({ reviews: [], count: 0, average: 0 });
      })
      .finally(() => setReviewsLoading(false));
  }, [id]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const loadQuestions = useCallback(() => {
    if (!id) return Promise.resolve();
    return questionService
      .listByProduct(id)
      .then((res) => {
        setQuestions(res || { questions: [], total: 0, answered: 0 });
      })
      .catch(() => {
        setQuestions({ questions: [], total: 0, answered: 0 });
      });
  }, [id]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  async function handleQuestionSubmit(text) {
    try {
      await questionService.ask(id, text);
      await loadQuestions();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        toast({ title: 'Faça login para perguntar', variant: 'destructive', duration: 2000 });
      } else {
        toast({
          title: 'Não foi possível enviar',
          description: (e && e.message) || 'Tente novamente.',
          variant: 'destructive',
          duration: 2000,
        });
      }
    }
  }

  async function handleReviewSubmit(payload) {
    try {
      await reviewService.create({
        product_id: id,
        rating: payload.rating,
        title: payload.title,
        comment: payload.comment,
      });
      setReviewFormOpen(false);
      toast({ title: '✓ Avaliação enviada!', variant: 'success', duration: 1500 });
      await loadReviews();
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        toast({ title: 'Faça login para avaliar', variant: 'destructive', duration: 2000 });
      } else {
        toast({
          title: 'Não foi possível enviar',
          description: (e && e.message) || 'Tente novamente.',
          variant: 'destructive',
          duration: 2000,
        });
      }
    }
  }

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(false);
    setProduct(null);
    productService
      .getById(id)
      .then((raw) => {
        if (!active) return;
        const built = buildProduct(raw);
        if (!built) {
          setError(true);
        } else {
          setProduct(built);
        }
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    let active = true;
    if (!id || !user) {
      setCanReview(false);
      return () => { active = false; };
    }
    reviewService
      .canReview(id)
      .then((res) => {
        if (active) setCanReview(!!(res && res.canReview));
      })
      .catch(() => {
        if (active) setCanReview(false);
      });
    return () => {
      active = false;
    };
  }, [id, user]);

  useEffect(() => {
    if (!product) return;
    recordView({
      id: product.id,
      title: product.title,
      image: product.image || (product.images && product.images[0]) || null,
      price: product.price,
    });
  }, [product]);

  useEffect(() => {
    let active = true;
    productService
      .list('?limit=8')
      .then((res) => {
        if (!active) return;
        const items = Array.isArray(res) ? res : (res && res.items) || [];
        setRelated(items.map(mapProduct).filter(Boolean));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return (
      <main>
        <div className={styles.page}>
          <div className={styles.container}>
            <Skeleton width={320} height={18} radius={6} style={{ marginBottom: 16 }} />
            <div className={styles.layout}>
              <div className={styles.left}>
                <Skeleton width="100%" height={420} radius={12} />
                <section className={styles.card}>
                  <Skeleton width={220} height={20} radius={6} style={{ marginBottom: 16 }} />
                  <div className={styles.specsGrid}>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className={styles.specItem}>
                        <Skeleton width={80} height={12} radius={4} />
                        <Skeleton width={120} height={14} radius={4} />
                      </div>
                    ))}
                  </div>
                </section>
              </div>
              <aside className={styles.sidebar}>
                <div className={styles.buyBox}>
                  <Skeleton width={100} height={20} radius={6} style={{ marginBottom: 12 }} />
                  <Skeleton width="90%" height={24} radius={6} style={{ marginBottom: 8 }} />
                  <Skeleton width="60%" height={18} radius={6} style={{ marginBottom: 16 }} />
                  <Skeleton width={160} height={32} radius={6} style={{ marginBottom: 16 }} />
                  <Skeleton width="100%" height={44} radius={10} style={{ marginBottom: 10 }} />
                  <Skeleton width="100%" height={44} radius={10} />
                </div>
              </aside>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main>
        <div className={styles.page}>
          <div className={styles.container}>
            <EmptyState
              icon="package"
              title="Produto não encontrado"
              description="O produto que você procura não está mais disponível."
              action={
                <button className={styles.buy} onClick={() => router.push('/produtos')}>
                  Ver todos os produtos
                </button>
              }
            />
          </div>
        </div>
      </main>
    );
  }

  const catLabel = product.categoryLabel || product.category;
  const discount = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : null;
  const stock = product.stock;

  const qaTotal = (questions && questions.total) || 0;
  const mappedQuestions = ((questions && questions.questions) || []).map((q) => ({
    id: q.id,
    userName: (q.asker && q.asker.name) || 'Usuário',
    createdAt: formatDate(q.created_at || q.createdAt),
    question: q.question,
    isAnswered: q.status === 'answered',
    answer: q.answer,
    sellerName: product.seller,
    answerCreatedAt: q.answered_at ? formatDate(q.answered_at) : '',
  }));

  function add() {
    addItem({ id: product.id, title: product.title, price: product.price, image: product.image }, qty);
    toast({ title: '✓ Adicionado!', variant: 'success', duration: 1000 });
  }
  function buyNow() {
    add();
    openCart();
  }

  return (
    <main>

      <div className={styles.page}>
        <div className={styles.container}>
          <Breadcrumb
            className={styles.crumb}
            items={[
              { label: 'Início', href: '/' },
              { label: catLabel, href: `/categoria/${product.category}` },
              { label: product.title },
            ]}
          />

          <div className={styles.layout}>
            <div className={styles.left}>
              <Gallery images={product.images} alt={product.title} />

              <section className={styles.card}>
                <h2 className={styles.cardTitle}>Especificações do Produto</h2>
                <div className={styles.specsGrid}>
                  {product.specs.map((s) => (
                    <div key={s.label} className={styles.specItem}>
                      <span className={styles.specLabel}>{s.label}</span>
                      <span className={styles.specValue}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className={styles.card}>
                <h2 className={styles.cardTitle}>Descrição</h2>
                <p className={styles.description}>{product.description}</p>
              </section>

              <section className={styles.card}>
                <div className={styles.reviewsHead}>
                  <div>
                    <h2 className={styles.cardTitle}>Avaliações</h2>
                    {reviews && reviews.count > 0 && (
                      <div className={styles.reviewsSummary}>
                        <Rating value={Number(reviews.average) || 0} />
                        <span className={styles.reviewsCount}>
                          {reviews.count} {reviews.count === 1 ? 'avaliação' : 'avaliações'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className={styles.reviewsActions}>
                    <button className={styles.reviewBtn} onClick={() => setQaOpen(true)}>
                      <Icon name="chat" size={16} /> Perguntas e respostas ({qaTotal})
                    </button>
                    {canReview && (
                      <button className={styles.reviewBtn} onClick={() => setReviewFormOpen(true)}>
                        <Icon name="star" size={16} /> Avaliar produto
                      </button>
                    )}
                  </div>
                </div>

                {reviewsLoading ? (
                  <div className={styles.reviewsLoading}>
                    {Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className={styles.reviewItem}>
                        <Skeleton width={140} height={14} radius={6} style={{ marginBottom: 8 }} />
                        <Skeleton width="90%" height={12} radius={4} style={{ marginBottom: 6 }} />
                        <Skeleton width="70%" height={12} radius={4} />
                      </div>
                    ))}
                  </div>
                ) : !reviews || reviews.count === 0 ? (
                  <p className={styles.reviewsEmpty}>
                    Este produto ainda não tem avaliações. Seja o primeiro!
                  </p>
                ) : (
                  <ul className={styles.reviewsList}>
                    {reviews.reviews.map((r) => {
                      const createdAt = r.created_at || r.createdAt;
                      return (
                      <li key={r.id} className={styles.reviewItem}>
                        <div className={styles.reviewMeta}>
                          <span className={styles.reviewUser}>
                            {(r.user && r.user.name) || 'Usuário'}
                          </span>
                          {createdAt && (
                            <span className={styles.reviewDate}>{formatDate(createdAt)}</span>
                          )}
                        </div>
                        <Rating value={Number(r.rating) || 0} size={13} />
                        {r.title && <strong className={styles.reviewTitle}>{r.title}</strong>}
                        {r.comment && <p className={styles.reviewComment}>{r.comment}</p>}
                      </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              {mappedQuestions.length > 0 && (
                <section className={styles.card}>
                  <div className={styles.reviewsHead}>
                    <h2 className={styles.cardTitle}>Perguntas e respostas</h2>
                    <div className={styles.reviewsActions}>
                      <button className={styles.reviewBtn} onClick={() => setQaOpen(true)}>
                        <Icon name="chat" size={16} /> Fazer pergunta
                      </button>
                    </div>
                  </div>
                  <ul className={styles.reviewsList}>
                    {mappedQuestions.map((qa) => (
                      <li key={qa.id} className={styles.reviewItem}>
                        <div className={styles.reviewMeta}>
                          <span className={styles.reviewUser}>{qa.userName}</span>
                          {qa.createdAt && <span className={styles.reviewDate}>{qa.createdAt}</span>}
                          <button
                            type="button"
                            className={styles.reportBtn}
                            onClick={() => openReport(qa.id)}
                            title="Denunciar esta pergunta"
                            aria-label="Denunciar esta pergunta"
                          >
                            <FlagIcon size={13} /> Denunciar
                          </button>
                        </div>
                        <p className={styles.reviewComment}>{qa.question}</p>
                        {qa.isAnswered && qa.answer && (
                          <p className={styles.qaAnswer}>
                            <strong>{qa.sellerName}:</strong> {qa.answer}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>

            <aside className={styles.sidebar}>
              <div className={styles.buyBox}>
                <div className={styles.condition}>
                  <Badge variant={product.condition === 'new' ? 'success' : 'neutral'} size="sm">
                    {product.condition === 'new' ? 'Novo' : 'Usado'}
                  </Badge>
                  <span>· {stock} disponíveis</span>
                </div>

                <h1 className={styles.title}>{product.title}</h1>
                <Rating value={product.rating} sales={product.sales} className={styles.rating} />

                <div className={styles.priceRow}>
                  {product.oldPrice && <span className={styles.old}>{BRL.format(product.oldPrice)}</span>}
                  {discount && <Badge variant="danger" size="sm">-{discount}%</Badge>}
                </div>
                <div className={styles.price}>{BRL.format(product.price)}</div>
                <span className={styles.installments}>em até {product.installments}x sem juros</span>

                <div className={styles.shipping}>
                  <Icon name="truck" size={18} />
                  <div>
                    <strong>{product.freeShipping ? 'Frete grátis' : 'Calcular frete'}</strong>
                    <div className={styles.cep}>
                      <input
                        placeholder="Seu CEP"
                        className={styles.cepInput}
                        value={cep}
                        maxLength={10}
                        inputMode="numeric"
                        onChange={(e) => setCep(maskCEP(e.target.value))}
                        onKeyDown={(e) => { if (e.key === 'Enter') calcShipping(); }}
                      />
                      <button type="button" onClick={calcShipping}>OK</button>
                    </div>
                    <button type="button" className={styles.cepGeo} onClick={locateMe}>
                      Não sei meu CEP
                    </button>

                    {shipLoading && (
                      <p className={styles.shipStatus}>Calculando frete…</p>
                    )}

                    {!shipLoading && shipError === 'config' && (
                      <p className={styles.shipStatus}>Cálculo de frete indisponível no momento.</p>
                    )}
                    {!shipLoading && shipError === 'origin' && (
                      <p className={styles.shipStatus}>Frete indisponível: vendedor sem CEP de origem.</p>
                    )}
                    {!shipLoading && shipError === 'generic' && (
                      <p className={styles.shipStatus}>Não foi possível calcular o frete. Tente novamente.</p>
                    )}

                    {!shipLoading && !shipError && shipOptions && shipOptions.length === 0 && (
                      <p className={styles.shipStatus}>Nenhuma opção de frete para este CEP.</p>
                    )}

                    {!shipLoading && !shipError && shipOptions && shipOptions.length > 0 && (
                      <ul className={styles.shipList}>
                        {shipOptions.map((opt, i) => (
                          <li key={opt.service_code || i} className={styles.shipOption}>
                            <div className={styles.shipInfo}>
                              <span className={styles.shipName}>
                                {opt.company} · {opt.service_name}
                              </span>
                              {opt.delivery_time != null && (
                                <span className={styles.shipEta}>
                                  {opt.delivery_time} {opt.delivery_time === 1 ? 'dia' : 'dias'}
                                </span>
                              )}
                            </div>
                            <span className={styles.shipPrice}>
                              {opt.free_shipping ? 'Grátis' : BRL.format(Number(opt.price) || 0)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className={styles.pickupNote}>
                  <Icon name="shield" size={16} />
                  <span>
                    <strong>Retirada presencial disponível</strong> — escolha no checkout. Um código de
                    6 dígitos protege a entrega; combine em local público e movimentado.
                  </span>
                </div>

                <div className={styles.qty}>
                  <span>Quantidade:</span>
                  <div className={styles.stepper}>
                    <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Diminuir">
                      <Icon name="close" size={14} />
                    </button>
                    <span>{qty}</span>
                    <button onClick={() => setQty((q) => Math.min(stock, q + 1))} aria-label="Aumentar">
                      <Icon name="plus" size={14} />
                    </button>
                  </div>
                </div>

                <button className={styles.buy} onClick={buyNow}>
                  Comprar agora
                </button>
                <button className={styles.addCart} onClick={add}>
                  Adicionar ao carrinho
                </button>

                <p className={styles.soldBy}>
                  Vendido por <a href={`/loja/${product.sellerId || ''}`}>{product.seller}</a> · +{product.sales} vendas
                </p>

                <div className={styles.guarantee}>
                  <div className={styles.guaranteeItem}>
                    <Icon name="shield" size={18} />
                    <div>
                      <strong>Devolução grátis.</strong>
                      <span>Você tem 30 dias a partir da data de recebimento.</span>
                    </div>
                  </div>
                  <div className={styles.guaranteeItem}>
                    <Icon name="shield" size={18} />
                    <div>
                      <strong>Compra Garantida,</strong>
                      <span>receba o produto que está esperando ou devolvemos o dinheiro.</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.sideCard}>
                <div className={styles.sellerHead}>
                  <strong>Vendido por {product.seller}</strong>
                  <a href={`/loja/${product.sellerId || ''}`} className={styles.verPerfil}>Ver Perfil</a>
                </div>
                <Rating value={4.8} sales={product.sales} className={styles.sellerRating} />
                <div className={styles.achievements}>
                  <span className={styles.achTitle}>Conquistas do Vendedor</span>
                  <div className={styles.achBadges}>
                    <Badge variant="gold" size="sm"><Icon name="bolt" size={12} /> Entrega Rápida</Badge>
                    <Badge variant="success" size="sm"><Icon name="chat" size={12} /> Resposta Rápida</Badge>
                  </div>
                </div>
                <div className={styles.sellerLoc}>
                  <Icon name="map-pin" size={15} /> Brasil
                </div>
                <button type="button" className={styles.chatSeller} onClick={startChat} disabled={chatLoading}>
                  <Icon name="chat" size={16} /> {chatLoading ? 'Abrindo…' : 'Falar com vendedor'}
                </button>
              </div>

              <div className={styles.sideCard}>
                <h3 className={styles.cardSubtitle}>Meios de pagamento</h3>
                <ul className={styles.payList}>
                  <li><span className={`${styles.payIcon} ${styles.payCard}`}><Icon name="card" size={16} /></span> Cartão de crédito até 12x sem juros</li>
                  <li><span className={`${styles.payIcon} ${styles.payPix}`}><Icon name="pix" size={16} /></span> PIX com 5% de desconto</li>
                  <li><span className={`${styles.payIcon} ${styles.payBoleto}`}><Icon name="barcode" size={16} /></span> Boleto bancário</li>
                </ul>
                <span className={styles.payNote}>Veja as condições na página de pagamento</span>
              </div>

              <div className={styles.sideCard}>
                <h3 className={styles.cardSubtitle}>Mais benefícios</h3>
                <ul className={styles.benefitList}>
                  <li><span className={styles.bGreen}><Icon name="check" size={15} /></span> Produto com garantia</li>
                  <li><span className={styles.bBlue}><Icon name="truck" size={15} /></span> Envio rápido e seguro</li>
                  <li><span className={styles.bPurple}><Icon name="user" size={15} /></span> Vendedor confiável</li>
                </ul>
              </div>
            </aside>
          </div>

          <div className={styles.related}>
            <ProductSection
              icon="grid"
              iconColor="#2563eb"
              title="Quem viu este produto também viu"
              products={related.filter((p) => p.id !== product.id).slice(0, 6)}
            />
          </div>
        </div>
      </div>

      <ReviewForm
        open={reviewFormOpen}
        onClose={() => setReviewFormOpen(false)}
        productName={product.title}
        onSubmit={handleReviewSubmit}
      />

      <ProductQA
        open={qaOpen}
        onClose={() => setQaOpen(false)}
        productName={product.title}
        questions={mappedQuestions}
        onSubmit={handleQuestionSubmit}
      />

      <Modal
        open={reportTarget != null}
        onClose={() => (reportSubmitting ? null : setReportTarget(null))}
        title="Denunciar pergunta"
        size="sm"
      >
        <form className={styles.reportForm} onSubmit={submitReport}>
          <label className={styles.reportLabel} htmlFor="report-reason">Motivo</label>
          <select
            id="report-reason"
            className={styles.reportSelect}
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
          >
            {REPORT_REASONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>

          <label className={styles.reportLabel} htmlFor="report-desc">Descrição (opcional)</label>
          <textarea
            id="report-desc"
            className={styles.reportTextarea}
            value={reportDescription}
            onChange={(e) => setReportDescription(e.target.value.slice(0, 500))}
            placeholder="Conte o que há de errado com esta pergunta…"
            rows={3}
          />

          <div className={styles.reportActions}>
            <button
              type="button"
              className={styles.reportCancel}
              onClick={() => setReportTarget(null)}
              disabled={reportSubmitting}
            >
              Cancelar
            </button>
            <button type="submit" className={styles.reportSubmit} disabled={reportSubmitting}>
              {reportSubmitting ? 'Enviando…' : 'Enviar denúncia'}
            </button>
          </div>
        </form>
      </Modal>

    </main>
  );
}
