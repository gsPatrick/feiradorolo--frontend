const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333/api/v1';
const TOKEN_KEY = 'fdr.token';

export function getToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request(path, { method = 'GET', body, headers = {}, auth = true } = {}) {
  const finalHeaders = { 'Content-Type': 'application/json', ...headers };
  if (auth) {
    const token = getToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers: finalHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new ApiError('Não foi possível conectar ao servidor.', 0, 'NETWORK');
  }

  const isJson = (res.headers.get('content-type') || '').includes('application/json');
  const payload = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const err = payload && payload.error;
    throw new ApiError(
      (err && err.message) || 'Ocorreu um erro inesperado.',
      res.status,
      err && err.code,
      err && err.details
    );
  }

  return payload ? payload.data : null;
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  del: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
};

/** Upload de imagem (multipart) → { url, filename }. Exige sessão. */
export async function uploadImage(file) {
  const fd = new FormData();
  fd.append('file', file);
  const token = getToken();
  let res;
  try {
    res = await fetch(`${API_URL}/uploads`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    });
  } catch (e) {
    throw new ApiError('Não foi possível conectar ao servidor.', 0, 'NETWORK');
  }
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const err = payload && payload.error;
    throw new ApiError((err && err.message) || 'Falha no upload.', res.status, err && err.code);
  }
  return payload ? payload.data : null;
}

/* Services de exemplo já apontando para a nova API. */
export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }, { auth: false }),
  register: (data) => api.post('/auth/register', data, { auth: false }),
  me: () => api.get('/auth/me'),
};

/* Perfil do usuário logado. */
export const userService = {
  updateMe: (data) => api.patch('/users/me', data),
  // Perfil público do vendedor (rating, verificações, reputação, etc.) — sem auth.
  sellerProfile: (id) => api.get(`/users/${id}/seller-profile`, { auth: false }),
};

export const productService = {
  list: (params = '') => api.get(`/products${params}`, { auth: false }),
  getById: (id) => api.get(`/products/${id}`, { auth: false }),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  remove: (id) => api.del(`/products/${id}`),
  // Busca/listagem com filtros server-side. `query` = { q, category_id, price_min,
  // price_max, condition, state, sort, page, limit }. Retorna { products, total, facets }.
  search: (query = {}) => {
    const qs = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v != null && v !== '' && !(Array.isArray(v) && !v.length)) qs.set(k, Array.isArray(v) ? v.join(',') : v);
    });
    qs.set('facets', '1');
    return api.get(`/products?${qs.toString()}`, { auth: false });
  },
  // Compra um destaque (Prata/Ouro/Diamante) — gera Pix dinâmico via Mercado Pago.
  highlight: (id, data) => api.post(`/products/${id}/highlight`, data),
  // Catálogo público dos pacotes de destaque → [{ tier, name, price, duration_days }].
  highlightPackages: () => api.get('/products/highlight-packages', { auth: false }),
  // Histórico/status de destaque de um produto (dono) → { current, has_active_or_pending, history }.
  highlights: (id) => api.get(`/products/${id}/highlights`),
  // Gera/retoma o pagamento Pix de um destaque pendente → { payment, pix, ... }.
  payHighlight: (productId, highlightId) =>
    api.post(`/products/${productId}/highlights/${highlightId}/pay`),
};

/** Converte um produto da API no formato consumido pelo ProductCard/listagens. */
export function mapProduct(p) {
  if (!p) return null;
  const meta = p.metadata || {};
  const price = Number(p.price) || 0;
  const promo = p.promotional_price != null ? Number(p.promotional_price) : null;
  const images = Array.isArray(p.images) ? p.images : [];
  return {
    id: p.id,
    title: p.title,
    price: promo != null ? promo : price,
    oldPrice: promo != null ? price : null,
    image: images[0] || '',
    seller: (p.seller && (p.seller.name || p.seller.email)) || 'Vendedor',
    // Objeto seller enriquecido da API (verification_level, *_verified, tier…)
    // preservado para o selo de confiança nos cards sem fetch extra.
    sellerInfo: (p.seller && typeof p.seller === 'object') ? p.seller : null,
    sellerId: (p.seller && p.seller.id) || p.seller_id || null,
    category: (p.category && p.category.slug) || '',
    brand: meta.brand || '',
    condition: p.condition || 'new',
    freeShipping: !!meta.free_shipping,
    rating: Number(p.rating) || 0,
    reviewsCount: Number(p.reviews_count) || 0,
    sold: Number(p.sold) || 0,
    highlightTier: p.highlight_tier && p.highlight_tier !== 'none' ? p.highlight_tier : null,
  };
}

export const categoryService = {
  tree: () => api.get('/categories/tree', { auth: false }),
  list: () => api.get('/categories', { auth: false }),
  fields: (categoryId) => api.get(`/categories/${categoryId}/fields`, { auth: false }),
  addField: (categoryId, data) => api.post(`/categories/${categoryId}/fields`, data),
  updateField: (fieldId, data) => api.put(`/categories/fields/${fieldId}`, data),
  removeField: (fieldId) => api.del(`/categories/fields/${fieldId}`),
};

/* Configuração dinâmica do site (editável pelo admin). */
export const configService = {
  public: () => api.get('/config/public', { auth: false }),
  fees: () => api.get('/config/fees', { auth: false }),
};

export const bannerService = {
  list: (position) =>
    api.get(`/banners${position ? `?position=${encodeURIComponent(position)}` : ''}`, { auth: false }),
};

export const contentService = {
  get: (slug) => api.get(`/content-pages/${slug}`, { auth: false }),
  list: () => api.get('/content-pages', { auth: false }),
};

/* ===== Admin (leitura/gestão) — exigem token de admin ===== */
export const adminService = {
  orders: (params = '') => api.get(`/orders/admin/all${params}`),
  users: (params = '') => api.get(`/users${params}`),
  flaggedChats: (params = '') => api.get(`/chats/admin/flagged${params}`),
  moderateMessage: (id, status) => api.patch(`/chats/messages/${id}/moderate`, { moderation_status: status }),
  // Acesso completo às conversas (ver todas, ler, enviar como suporte)
  allChats: (params = '') => api.get(`/chats/admin/all${params}`),
  chatMessages: (id) => api.get(`/chats/admin/${id}/messages`),
  sendChatMessage: (id, content) => api.post(`/chats/admin/${id}/messages`, { content }),
  settingLogs: (params = '') => api.get(`/admin/setting-logs${params}`),
  blockedWords: () => api.get('/admin/blocked-words'),
  createBlockedWord: (data) => api.post('/admin/blocked-words', data),
  updateBlockedWord: (id, data) => api.put(`/admin/blocked-words/${id}`, data),
  deleteBlockedWord: (id) => api.del(`/admin/blocked-words/${id}`),
  commissionRules: () => api.get('/admin/commission-rules'),
  createCommissionRule: (data) => api.post('/admin/commission-rules', data),
  updateCommissionRule: (id, data) => api.put(`/admin/commission-rules/${id}`, data),
  deleteCommissionRule: (id) => api.del(`/admin/commission-rules/${id}`),
  highlightPackages: () => api.get('/admin/highlight-packages'),
  createHighlightPackage: (data) => api.post('/admin/highlight-packages', data),
  updateHighlightPackage: (id, data) => api.put(`/admin/highlight-packages/${id}`, data),
  deleteHighlightPackage: (id) => api.del(`/admin/highlight-packages/${id}`),
  shippingSettings: () => api.get('/admin/shipping-settings'),
  createShippingSetting: (data) => api.post('/admin/shipping-settings', data),
  updateShippingSetting: (id, data) => api.put(`/admin/shipping-settings/${id}`, data),
  deleteShippingSetting: (id) => api.del(`/admin/shipping-settings/${id}`),
  // Métricas
  analytics: (params = '') => api.get(`/analytics/overview${params}`),
  systemHealth: () => api.get('/analytics/system'),
  dashboard: () => api.get('/analytics/dashboard'),
  // Templates de e-mail
  emailTemplates: () => api.get('/email-templates'),
  createEmailTemplate: (data) => api.post('/email-templates', data),
  updateEmailTemplate: (id, data) => api.put(`/email-templates/${id}`, data),
  deleteEmailTemplate: (id) => api.del(`/email-templates/${id}`),
  // Notificações (admin)
  notifications: (params = '') => api.get(`/notifications/admin${params}`),
  sendNotification: (data) => api.post('/notifications/admin', data),
  deleteNotification: (id) => api.del(`/notifications/admin/${id}`),
  clearNotifications: () => api.del('/notifications/admin/all'),

  // Denúncias (admin)
  reports: (params = '') => api.get(`/reports/admin${params}`),
  resolveReport: (id, data) => api.patch(`/reports/admin/${id}`, data),

  // Disputas / Devoluções (admin) — mediação de devoluções
  disputes: (params = '') => api.get(`/disputes/admin/all${params}`),
  resolveDispute: (id, data) => api.post(`/disputes/${id}/resolve`, data),

  // Planos (admin)
  plans: () => api.get('/plans/admin'),
  createPlan: (data) => api.post('/plans/admin', data),
  updatePlan: (id, data) => api.put(`/plans/admin/${id}`, data),
  deletePlan: (id) => api.del(`/plans/admin/${id}`),
};

/* ===== Admin (escrita config) — exigem token de admin ===== */
export const adminConfigService = {
  // Settings (key/value)
  settings: () => api.get('/admin/settings'),
  updateSetting: (key, value) => api.put(`/admin/settings/${key}`, { value }),
  restoreSetting: (key) => api.post(`/admin/settings/${key}/restore`),
  // Banners
  banners: () => api.get('/banners/all'),
  createBanner: (data) => api.post('/banners', data),
  updateBanner: (id, data) => api.put(`/banners/${id}`, data),
  deleteBanner: (id) => api.del(`/banners/${id}`),
  // Páginas institucionais / FAQ
  pages: () => api.get('/content-pages/all'),
  savePage: (slug, data) => api.put(`/content-pages/${slug}`, data),
  deletePage: (slug) => api.del(`/content-pages/${slug}`),
  // Gateways de pagamento
  gateways: () => api.get('/admin/gateways'),
  createGateway: (data) => api.post('/admin/gateways', data),
  updateGateway: (id, data) => api.put(`/admin/gateways/${id}`, data),
  activateGateway: (id) => api.post(`/admin/gateways/${id}/activate`),
  // Integrações (email, frete, storage, push)
  integrations: () => api.get('/admin/integrations'),
  createIntegration: (data) => api.post('/admin/integrations', data),
  updateIntegration: (id, data) => api.put(`/admin/integrations/${id}`, data),
  activateIntegration: (id) => api.post(`/admin/integrations/${id}/activate`),
};

/* Favoritos (exigem sessão). */
export const favoriteService = {
  listMine: () => api.get('/favorites'),
  ids: () => api.get('/favorites/ids'),
  add: (productId) => api.post(`/favorites/${productId}`),
  remove: (productId) => api.del(`/favorites/${productId}`),
};

/* Avaliações. listByProduct é pública; mine/create exigem sessão. */
export const reviewService = {
  listByProduct: (productId) => api.get(`/reviews?product_id=${productId}`, { auth: false }),
  listMine: () => api.get('/reviews/mine'),
  create: (data) => api.post('/reviews', data),
  // Só quem comprou pode avaliar → { canReview: boolean }
  canReview: (productId) => api.get(`/reviews/can-review?product_id=${productId}`),
};

/* Pedidos do usuário (exigem sessão). */
export const orderService = {
  listMine: () => api.get('/orders'),
  listSales: () => api.get('/orders?role=seller'),
  getById: (id) => api.get(`/orders/${id}`),
  checkout: (data) => api.post('/orders/checkout', data),
  cancel: (id) => api.post(`/orders/${id}/cancel`),
};

/* Cupons. Listagem pública; validar exige sessão. */
export const couponService = {
  list: () => api.get('/coupons', { auth: false }),
  validate: (code, subtotal) => api.post('/coupons/validate', { code, subtotal }),
};

/* Agenda de endereços (exige sessão). */
export const addressService = {
  list: () => api.get('/addresses'),
  create: (data) => api.post('/addresses', data),
  update: (id, data) => api.put(`/addresses/${id}`, data),
  setDefault: (id) => api.post(`/addresses/${id}/default`),
  remove: (id) => api.del(`/addresses/${id}`),
};

/* Cotação de frete (exige sessão). */
export const shipmentService = {
  quote: (data) => api.post('/shipments/quote', data),
  // Transportadoras reais do Melhor Envio (público). Retorna [{ code, name, company, picture, description }].
  carriers: () => api.get('/shipments/carriers'),
};

/* Escrow / custódia (exige sessão). */
export const escrowService = {
  getByOrder: (orderId) => api.get(`/escrow/order/${orderId}`),
  releaseManual: (orderId) => api.post(`/escrow/order/${orderId}/release`),
  releaseByToken: (orderId, token) => api.post(`/escrow/order/${orderId}/release-token`, { token }),
  freeze: (orderId, reason) => api.post(`/escrow/admin/order/${orderId}/freeze`, { reason }),
  unfreeze: (orderId) => api.post(`/escrow/admin/order/${orderId}/unfreeze`),
};

/* Pagamentos (Mercado Pago — exige sessão). */
export const paymentService = {
  // Cria a preferência (Checkout Pro) e retorna { init_point, ... } para redirecionar.
  createPreference: (orderId, data = {}) => api.post(`/payments/order/${orderId}/preference`, data),
  // Pagamento direto (Checkout Transparente: PIX/cartão/boleto) — retorna { payment, gateway, pix, boleto }.
  createPayment: (orderId, data = {}) => api.post(`/payments/order/${orderId}/pay`, data),
  // Public Key do gateway ativo (para o SDK MercadoPago.js tokenizar cartão).
  publicKey: () => api.get('/payments/public-key'), // { public_key, environment }
  // Consulta o status de um pagamento (polling do PIX/boleto).
  getById: (paymentId) => api.get(`/payments/${paymentId}`),
  // Vínculo da conta de recebimento do vendedor (split/repasse via OAuth do Mercado Pago).
  connectMercadoPago: () => api.get('/payments/connect/mercado-pago'), // { url }
  connectStatus: () => api.get('/payments/connect/status'), // { linked, mp_user_id, ... } | null
  disconnectMercadoPago: () => api.del('/payments/connect/mercado-pago'),
  // Histórico de pagamentos do usuário logado → { data, summary, pagination }.
  // params: { page, limit, status, group } (group = pending | done | other).
  mine: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') qs.set(k, v);
    });
    const q = qs.toString();
    return api.get(`/payments/mine${q ? `?${q}` : ''}`);
  },
  // Resumo agregado (total gasto + contagens por status).
  mineSummary: () => api.get('/payments/mine/summary'),
};

/* Planos de categoria (assinatura — exige sessão). */
export const planService = {
  list: (params = '') => api.get(`/plans${params}`),
  mine: () => api.get('/plans/mine'),
  subscribe: (planId, data = {}) => api.post(`/plans/${planId}/subscribe`, data),
  // Re-gera/garante o PIX de uma assinatura pendente → { subscription, payment, pix }.
  paySubscription: (id) => api.post(`/plans/subscriptions/${id}/pay`),
};

/* Notificações do usuário (exige sessão). */
export const notificationService = {
  listMine: (params = '') => api.get(`/notifications${params}`),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.post('/notifications/read-all'),
};

/* Chat comprador↔vendedor (exige sessão). Realtime via lib/socket.js. */
/* Devolução / Disputa (custódia). */
export const disputeService = {
  list: () => api.get('/disputes'),
  getById: (id) => api.get(`/disputes/${id}`),
  // data: { order_id, reason, description, product_state: {...}, evidence: [urls] }
  requestReturn: (data) => api.post('/disputes', data),
  approve: (id) => api.post(`/disputes/${id}/approve`, {}),
  reject: (id, notes) => api.post(`/disputes/${id}/reject`, { notes }),
  returnLabel: (id) => api.post(`/disputes/${id}/return-label`, {}),
};

export const chatService = {
  listMine: () => api.get('/chats'),
  messages: (chatId) => api.get(`/chats/${chatId}/messages`),
  open: (sellerId, productId = null) => api.post('/chats', { sellerId, productId }),
  send: (chatId, content) => api.post(`/chats/${chatId}/messages`, { content }),
  close: (chatId) => api.post(`/chats/${chatId}/close`),
};

/* Perguntas & respostas. listByProduct é pública; perguntar/responder exigem sessão. */
export const questionService = {
  listByProduct: (productId) => api.get(`/questions?product_id=${productId}`, { auth: false }),
  ask: (productId, question) => api.post('/questions', { product_id: productId, question }),
  answer: (questionId, answer) => api.post(`/questions/${questionId}/answer`, { answer }),
};

/* Verificação de e-mail e telefone/WhatsApp (exige sessão). */
export const verificationService = {
  status: () => api.get('/verification/status'),
  requestEmail: () => api.post('/verification/email/request', {}),
  confirmEmail: (code) => api.post('/verification/email/confirm', { code }),
  requestPhone: () => api.post('/verification/phone/request', {}),
  confirmPhone: (code) => api.post('/verification/phone/confirm', { code }),
  // Valida o documento (PF=CPF matemático / PJ=CNPJ na ReceitaWS) do usuário logado.
  validateDocument: () => api.post('/verification/document/validate', {}),
};

/* Denúncias de conteúdo (exige sessão). */
export const reportService = {
  // data: { target_type, target_id, reason, description }
  create: (data) => api.post('/reports', data),
};
