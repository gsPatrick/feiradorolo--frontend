'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { cx } from '@/lib/cx';
import { onlyDigits, maskCPF } from '@/lib/masks';
import { useCart } from '@/components/providers/CartProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { addressService, couponService, shipmentService, orderService, paymentService, productService, ApiError } from '@/lib/api';
import Button from '@/components/atoms/Button/Button';
import Input from '@/components/atoms/Input/Input';
import Select from '@/components/atoms/Select/Select';
import Icon from '@/components/atoms/Icon/Icon';
import Badge from '@/components/atoms/Badge/Badge';
import Spinner from '@/components/atoms/Spinner/Spinner';
import Modal from '@/components/organisms/Modal/Modal';
import VerificationModal from '@/components/organisms/VerificationModal/VerificationModal';
import SellerTrust from '@/components/molecules/SellerTrust/SellerTrust';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const STEPS = 3;
const MP_SDK_SRC = 'https://sdk.mercadopago.com/js/v2';
const POLL_INTERVAL = 4000;

// Carrega o SDK do Mercado Pago uma única vez e resolve quando window.MercadoPago existir.
function loadMercadoPagoSdk() {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'));
  if (window.MercadoPago) return Promise.resolve(window.MercadoPago);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${MP_SDK_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.MercadoPago));
      existing.addEventListener('error', () => reject(new Error('Falha ao carregar o SDK do Mercado Pago.')));
      if (window.MercadoPago) resolve(window.MercadoPago);
      return;
    }
    const script = document.createElement('script');
    script.src = MP_SDK_SRC;
    script.async = true;
    script.onload = () => resolve(window.MercadoPago);
    script.onerror = () => reject(new Error('Falha ao carregar o SDK do Mercado Pago.'));
    document.body.appendChild(script);
  });
}

// 'approved' | 'paid' contam como pagamento concluído.
function isPaid(status) {
  const s = String(status || '').toLowerCase();
  return s === 'approved' || s === 'paid';
}

// Mensagem amigável a partir do status_detail do gateway (cartão recusado).
function cardStatusMessage(detail) {
  const map = {
    cc_rejected_insufficient_amount: 'Saldo ou limite insuficiente.',
    cc_rejected_bad_filled_card_number: 'Número do cartão inválido.',
    cc_rejected_bad_filled_date: 'Data de validade inválida.',
    cc_rejected_bad_filled_security_code: 'Código de segurança (CVV) inválido.',
    cc_rejected_bad_filled_other: 'Dados do cartão incorretos.',
    cc_rejected_call_for_authorize: 'Autorize o pagamento com o seu banco.',
    cc_rejected_card_disabled: 'Cartão desabilitado. Contate o seu banco.',
    cc_rejected_high_risk: 'Pagamento recusado por segurança. Tente outro meio.',
    cc_rejected_max_attempts: 'Muitas tentativas. Use outro cartão.',
    cc_rejected_duplicated_payment: 'Pagamento duplicado.',
  };
  return map[detail] || 'Pagamento não autorizado. Tente outro cartão ou meio de pagamento.';
}

// Mensagens amigáveis por código de erro do backend. Sempre mostramos o MOTIVO
// ao usuário (nunca "erro 400/500" nem stack). Códigos não mapeados caem na
// própria e.message.
const FRIENDLY = {
  CANNOT_BUY_OWN_PRODUCT: { title: 'Não dá pra comprar seu próprio anúncio', message: 'Este produto é seu — você não pode comprá-lo. Use outra conta para testar a compra.' },
  PRODUCT_NOT_AVAILABLE: { title: 'Produto indisponível', message: 'Este produto não está mais disponível para compra.' },
  INSUFFICIENT_STOCK: { title: 'Estoque insuficiente', message: 'Não há estoque suficiente para a quantidade escolhida.' },
  PRODUCT_NOT_FOUND: { title: 'Produto não encontrado', message: 'Não encontramos este produto. Atualize a página e tente de novo.' },
  PAYMENT_NOT_CONFIGURED: { title: 'Pagamento indisponível', message: 'O meio de pagamento não está configurado no momento. Tente mais tarde.' },
};

// Converte um erro qualquer em { title, message } amigável.
function friendlyError(e) {
  return FRIENDLY[e?.code] || { title: 'Não foi possível concluir', message: e?.message || 'Tente novamente em instantes.' };
}

const UF_OPTIONS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC',
  'SP', 'SE', 'TO',
];

const EMPTY_NEW_ADDRESS = {
  recipient: '',
  cep: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
};

function maskCep(v) {
  const d = v.replace(/\D/g, '').slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}
function maskCardNumber(v) {
  const d = v.replace(/\D/g, '').slice(0, 16);
  return d.replace(/(.{4})/g, '$1 ').trim();
}
function maskExpiry(v) {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

export default function FinalizarCompraPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { items, totalPrice, totalItems, clear } = useCart();
  const { user, openAuth } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);

  // Método de entrega: 'shipping' (Melhor Envio) | 'pickup' (retirada presencial)
  const [deliveryMethod, setDeliveryMethod] = useState('shipping');
  const isPickup = deliveryMethod === 'pickup';

  // Retirada presencial só é oferecida quando TODOS os itens permitem retirada.
  // Itens antigos no carrinho podem não ter o flag `allowPickup`; nesse caso
  // buscamos o produto real e guardamos o `allow_pickup` aqui (cache por id).
  const [pickupOverrides, setPickupOverrides] = useState({});

  // Descobre o allow_pickup real dos itens sem flag (undefined). Em paralelo,
  // com cache. Se o fetch falhar, assume false (= só frete) — nunca quebra.
  useEffect(() => {
    const unknown = items.filter(
      (it) => it.allowPickup === undefined && pickupOverrides[it.id] === undefined
    );
    if (unknown.length === 0) return;
    let active = true;
    Promise.all(
      unknown.map((it) =>
        productService
          .getById(it.id)
          .then((raw) => {
            const meta = (raw && raw.metadata) || {};
            const allow = !!(meta.allow_pickup || meta.pickup_available || (raw && raw.allow_pickup));
            return [it.id, allow];
          })
          .catch(() => [it.id, false])
      )
    ).then((entries) => {
      if (!active) return;
      setPickupOverrides((prev) => {
        const next = { ...prev };
        entries.forEach(([id, allow]) => {
          next[id] = allow;
        });
        return next;
      });
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  // Só oferece retirada se TODOS os itens permitirem. Para itens sem flag,
  // usa o valor resolvido pelo fetch (pickupOverrides); ausente = ainda não sei
  // → trata como "não permite" até resolver (false-safe).
  const canPickup =
    items.length > 0 &&
    items.every((it) =>
      it.allowPickup === undefined ? pickupOverrides[it.id] === true : it.allowPickup === true
    );

  // Se a retirada não é possível, garante que o método fique em 'shipping'.
  useEffect(() => {
    if (!canPickup && deliveryMethod === 'pickup') {
      setDeliveryMethod('shipping');
    }
  }, [canPickup, deliveryMethod]);

  // Endereço
  const [addresses, setAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [addressesError, setAddressesError] = useState('');
  const [addressMode, setAddressMode] = useState('saved'); // 'saved' | 'new'
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [newAddress, setNewAddress] = useState(EMPTY_NEW_ADDRESS);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState('');
  const [savingAddr, setSavingAddr] = useState(false);

  // Cupom
  const [couponInput, setCouponInput] = useState('');
  const [couponApplied, setCouponApplied] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponLoading, setCouponLoading] = useState(false);

  // Frete — opções REAIS do Melhor Envio (array vindo de shipmentService.quote)
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingOptions, setShippingOptions] = useState([]);
  const [shippingUnavailable, setShippingUnavailable] = useState(false);
  const [selectedShippingId, setSelectedShippingId] = useState(null);

  // Pagamento
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [installments, setInstallments] = useState('1');
  const [card, setCard] = useState({ number: '', name: '', expiry: '', cvv: '', cpf: '' });

  // Modais
  const [showPix, setShowPix] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [showBoleto, setShowBoleto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Modal de erro amigável: guarda { title, message } e mostra o MOTIVO ao usuário.
  const [errModal, setErrModal] = useState(null);

  // Checkout Transparente (Mercado Pago)
  const [publicKey, setPublicKey] = useState('');
  const mpRef = useRef(null); // instância MercadoPago
  const orderIdRef = useRef(null); // pedido criado uma única vez (ensureOrder)
  const pollRef = useRef(null); // setInterval do polling PIX/boleto
  const [pixData, setPixData] = useState(null); // { qr_code, qr_code_base64, ticket_url, paymentId }
  const [boletoData, setBoletoData] = useState(null); // { url, barcode, paymentId }
  const [cardResult, setCardResult] = useState(null); // { status, status_detail }
  const [paid, setPaid] = useState(false); // pagamento confirmado (PIX/boleto)
  const [copied, setCopied] = useState(false);

  // Verificação obrigatória (e-mail/WhatsApp) exigida pelo backend.
  const [verifyChannel, setVerifyChannel] = useState(null); // 'email' | 'phone' | null
  const pendingActionRef = useRef(null); // ação a repetir após confirmar o código

  // Pré-preenche o CPF do titular com o do usuário logado, se existir.
  useEffect(() => {
    const userCpf = user?.cpf || user?.document || '';
    if (userCpf) setCard((c) => (c.cpf ? c : { ...c, cpf: maskCPF(userCpf) }));
  }, [user]);

  // Carrega a public key + inicializa o SDK no mount.
  useEffect(() => {
    let active = true;
    paymentService
      .publicKey()
      .then(async (res) => {
        const key = res?.public_key;
        if (!active || !key) return;
        setPublicKey(key);
        try {
          const MP = await loadMercadoPagoSdk();
          if (active && MP) mpRef.current = new MP(key, { locale: 'pt-BR' });
        } catch {
          // SDK indisponível: a tokenização de cartão ficará indisponível, mas PIX/boleto seguem.
        }
      })
      .catch(() => {
        // Gateway não configurado: tratado ao tentar pagar.
      });
    return () => {
      active = false;
    };
  }, []);

  // Encerra qualquer polling pendente ao desmontar.
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  // Cria a ordem uma única vez e reusa o id nas tentativas seguintes.
  async function ensureOrder() {
    if (orderIdRef.current) return orderIdRef.current;
    const created = await orderService.checkout({
      items: items.map((i) => ({ product_id: i.id, quantity: i.qty || i.quantity || 1 })),
      coupon_code: couponApplied || undefined,
      // Na retirada presencial o endereço é opcional.
      address_id:
        !isPickup && addressMode === 'saved' ? selectedAddressId || undefined : undefined,
      // Endereço completo (salvo ou novo) para o pedido exibir a entrega depois.
      shipping_address:
        !isPickup && selectedAddress
          ? {
              recipient: selectedAddress.recipient || '',
              cep: selectedAddress.cep || '',
              street: selectedAddress.street || '',
              number: selectedAddress.number || '',
              complement: selectedAddress.complement || '',
              neighborhood: selectedAddress.neighborhood || '',
              city: selectedAddress.city || '',
              state: selectedAddress.state || '',
            }
          : undefined,
      delivery_method: deliveryMethod,
      // Frete escolhido (apenas para envio; retirada presencial não tem frete).
      shipping_option:
        !isPickup && selectedShipping
          ? {
              service_code: selectedShipping.service_code,
              service_name: selectedShipping.service_name,
              company: selectedShipping.company || '',
              delivery_time: selectedShipping.delivery_time ?? null,
              price: shippingCost,
              cost: shippingCost,
            }
          : undefined,
    });
    const orders = Array.isArray(created) ? created : created ? [created] : [];
    const orderId = orders[0]?.id;
    if (!orderId) throw new Error('Pedido criado sem identificador. Tente novamente.');
    orderIdRef.current = orderId;
    return orderId;
  }

  // Sucesso de pagamento → limpa carrinho e leva para os pedidos.
  function goToSuccess() {
    stopPolling();
    if (typeof clear === 'function') clear();
    router.push('/minha-conta?tab=pedidos');
  }

  // Inicia o polling de status (PIX/boleto).
  function startPolling(paymentId) {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await paymentService.getById(paymentId);
        if (isPaid(res?.status)) {
          setPaid(true);
          stopPolling();
          toast({ title: 'Pagamento confirmado!', variant: 'success' });
          setTimeout(goToSuccess, 1200);
        }
      } catch {
        // Mantém o polling em caso de erro transitório.
      }
    }, POLL_INTERVAL);
  }

  // Executa uma ação que pode ser bloqueada por verificação obrigatória do
  // backend (EMAIL_NOT_VERIFIED / PHONE_NOT_VERIFIED). Nesses casos guarda a
  // própria ação para repetir e abre o modal de verificação; demais erros
  // seguem o fluxo normal (relançados para o try/catch do chamador).
  async function runWithVerification(fn) {
    try {
      return await fn();
    } catch (e) {
      if (e?.code === 'EMAIL_NOT_VERIFIED') {
        pendingActionRef.current = fn;
        setVerifyChannel('email');
        return undefined;
      }
      if (e?.code === 'PHONE_NOT_VERIFIED') {
        pendingActionRef.current = fn;
        setVerifyChannel('phone');
        return undefined;
      }
      throw e;
    }
  }

  // ===== PIX =====
  async function payWithPix() {
    if (submitting) return;
    setSubmitting(true);
    setPixData(null);
    setPaid(false);
    try {
      await runWithVerification(async () => {
        const orderId = await ensureOrder();
        const res = await paymentService.createPayment(orderId, { payment_method_id: 'pix' });
        const pix = res?.pix;
        const paymentId = res?.payment?.id;
        if (!pix?.qr_code_base64 && !pix?.qr_code) {
          throw new Error('Não foi possível gerar o PIX. Tente novamente.');
        }
        setPixData({
          qr_code: pix.qr_code,
          qr_code_base64: pix.qr_code_base64,
          ticket_url: pix.ticket_url,
          paymentId,
        });
        if (paymentId) startPolling(paymentId);
      });
    } catch (e) {
      // Verificação (e-mail/telefone) já é tratada por runWithVerification.
      setSubmitting(false);
      setErrModal(friendlyError(e));
    } finally {
      setSubmitting(false);
    }
  }

  // ===== Boleto =====
  async function payWithBoleto() {
    if (submitting) return;
    setSubmitting(true);
    setBoletoData(null);
    setPaid(false);
    try {
      await runWithVerification(async () => {
        const orderId = await ensureOrder();
        const res = await paymentService.createPayment(orderId, { payment_method_id: 'bolbradesco' });
        const boleto = res?.boleto;
        const paymentId = res?.payment?.id;
        if (!boleto?.url) {
          throw new Error('Não foi possível gerar o boleto. Tente novamente.');
        }
        setBoletoData({ url: boleto.url, barcode: boleto.barcode, paymentId });
        if (paymentId) startPolling(paymentId);
      });
    } catch (e) {
      // Verificação (e-mail/telefone) já é tratada por runWithVerification.
      setSubmitting(false);
      setErrModal(friendlyError(e));
    } finally {
      setSubmitting(false);
    }
  }

  // ===== Cartão =====
  async function payWithCard() {
    if (submitting) return;
    const mp = mpRef.current;
    if (!mp) {
      toast({
        title: 'Pagamento por cartão indisponível',
        description: 'Não foi possível inicializar o pagamento seguro. Tente PIX ou boleto.',
        variant: 'destructive',
      });
      return;
    }
    const numberDigits = onlyDigits(card.number);
    const cpfDigits = onlyDigits(card.cpf);
    const exp = onlyDigits(card.expiry);
    if (numberDigits.length < 13 || !card.name.trim() || exp.length < 4 || card.cvv.length < 3) {
      toast({ title: 'Preencha todos os dados do cartão.', variant: 'destructive' });
      return;
    }
    if (cpfDigits.length !== 11) {
      toast({ title: 'Informe um CPF válido do titular.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    setCardResult(null);
    try {
      const mm = exp.slice(0, 2);
      const yy = exp.slice(2, 4);
      const yyyy = `20${yy}`;

      // Detecta a bandeira a partir do BIN.
      const bin = numberDigits.slice(0, 8);
      const { results } = await mp.getPaymentMethods({ bin });
      const paymentMethodId = results?.[0]?.id;
      if (!paymentMethodId) {
        throw new Error('Cartão não reconhecido. Verifique o número informado.');
      }

      // Tokeniza o cartão (nunca enviamos o cartão cru ao backend).
      const tk = await mp.createCardToken({
        cardNumber: numberDigits,
        cardholderName: card.name,
        cardExpirationMonth: mm,
        cardExpirationYear: yyyy,
        securityCode: card.cvv,
        identificationType: 'CPF',
        identificationNumber: cpfDigits,
      });
      if (!tk?.id) throw new Error('Não foi possível validar o cartão. Revise os dados.');

      await runWithVerification(async () => {
        const orderId = await ensureOrder();
        const res = await paymentService.createPayment(orderId, {
          token: tk.id,
          payment_method_id: paymentMethodId,
          installments: Number(installments) || 1,
        });
        const status = res?.gateway?.status || res?.payment?.status;
        const statusDetail = res?.gateway?.status_detail;
        setCardResult({ status, status_detail: statusDetail });

        if (isPaid(status)) {
          toast({ title: 'Pagamento aprovado!', variant: 'success' });
          setTimeout(goToSuccess, 1200);
        } else if (status === 'in_process' || status === 'pending') {
          toast({ title: 'Pagamento em análise', description: 'Avisaremos quando for aprovado.', variant: 'default' });
        } else {
          toast({
            title: 'Pagamento recusado',
            description: cardStatusMessage(statusDetail),
            variant: 'destructive',
          });
        }
      });
    } catch (e) {
      // Verificação (e-mail/telefone) já é tratada por runWithVerification.
      // Erros do SDK costumam vir como array em e.cause/e.message.
      setSubmitting(false);
      const msg =
        (Array.isArray(e?.cause) && e.cause[0]?.description) ||
        e?.message ||
        'Não foi possível processar o cartão.';
      // Mantém o mapeamento por código (ex.: PAYMENT_NOT_CONFIGURED) e cai na
      // mensagem do SDK quando não houver código mapeado.
      setErrModal(FRIENDLY[e?.code] || { title: 'Não foi possível concluir', message: msg });
    } finally {
      setSubmitting(false);
    }
  }

  function copyPix() {
    if (!pixData?.qr_code) return;
    try {
      navigator.clipboard.writeText(pixData.qr_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Não foi possível copiar.', variant: 'destructive' });
    }
  }

  // Carrega os endereços reais do usuário logado.
  useEffect(() => {
    if (!user) {
      setAddresses([]);
      setSelectedAddressId(null);
      return;
    }
    let active = true;
    setAddressesLoading(true);
    setAddressesError('');
    addressService
      .list()
      .then((rows) => {
        if (!active) return;
        const list = (Array.isArray(rows) ? rows : []).map((a) => ({
          id: a.id,
          label: a.label || 'Endereço',
          recipient: a.recipient_name || '',
          cep: a.zip_code || '',
          street: a.street || '',
          number: a.number || '',
          complement: a.complement || '',
          neighborhood: a.neighborhood || '',
          city: a.city || '',
          state: a.state || '',
          isDefault: !!a.is_default,
        }));
        setAddresses(list);
        const def = list.find((a) => a.isDefault) || list[0];
        setSelectedAddressId((cur) => cur || (def ? def.id : null));
        // Sem endereços salvos: abre direto o formulário de novo endereço
        // (não mostra a aba "Endereços salvos" vazia com erro).
        if (list.length === 0) setAddressMode('new');
      })
      .catch((e) => {
        if (!active) return;
        setAddressesError(e?.message || 'Não foi possível carregar seus endereços.');
      })
      .finally(() => {
        if (active) setAddressesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const selectedAddress = useMemo(() => {
    if (addressMode === 'new') {
      if (!newAddress.street || !newAddress.cep) return null;
      return newAddress;
    }
    return addresses.find((a) => a.id === selectedAddressId) || null;
  }, [addressMode, newAddress, selectedAddressId, addresses]);

  const selectedShipping = useMemo(
    () => shippingOptions.find((o) => o.service_code === selectedShippingId) || null,
    [shippingOptions, selectedShippingId]
  );

  // Vendedores únicos do carrinho (para o selo de confiança no resumo).
  // Itens antigos sem sellerId são ignorados (não quebra).
  const cartSellerIds = useMemo(() => {
    const seen = new Set();
    items.forEach((i) => {
      if (i.sellerId != null && i.sellerId !== '') seen.add(i.sellerId);
    });
    return Array.from(seen);
  }, [items]);

  const shippingCost = isPickup
    ? 0
    : selectedShipping
    ? (selectedShipping.free_shipping ? 0 : Number(selectedShipping.price) || 0)
    : 0;
  const discount = Math.min(couponDiscount, totalPrice);
  const total = Math.max(0, totalPrice - discount + shippingCost);

  // Loja vazia: redireciona convidando a comprar (não bloqueia render)
  const cartEmpty = items.length === 0;

  async function buscarCep() {
    const digits = newAddress.cep.replace(/\D/g, '');
    if (digits.length !== 8) {
      setCepError('Informe um CEP válido (8 dígitos).');
      return;
    }
    setCepLoading(true);
    setCepError('');
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) {
        setCepError('CEP não encontrado.');
        return;
      }
      setNewAddress((p) => ({
        ...p,
        street: data.logradouro || p.street,
        neighborhood: data.bairro || p.neighborhood,
        city: data.localidade || p.city,
        state: data.uf || p.state,
      }));
    } catch {
      setCepError('Não foi possível consultar o CEP.');
    } finally {
      setCepLoading(false);
    }
  }

  // Salva o endereço digitado na conta do usuário (para reutilizar depois).
  async function saveNewAddress() {
    if (!user) { openAuth('login'); return; }
    const miss = !newAddress.cep || !newAddress.street || !newAddress.number || !newAddress.neighborhood || !newAddress.city || !newAddress.state;
    if (miss) {
      toast({ title: 'Preencha o endereço completo para salvar.', variant: 'destructive' });
      return;
    }
    setSavingAddr(true);
    try {
      const created = await addressService.create({
        label: 'Endereço',
        recipient_name: newAddress.recipient || (user && user.name) || '',
        zip_code: newAddress.cep.replace(/\D/g, ''),
        street: newAddress.street,
        number: newAddress.number,
        complement: newAddress.complement,
        neighborhood: newAddress.neighborhood,
        city: newAddress.city,
        state: newAddress.state,
      });
      const rows = await addressService.list();
      const list = (Array.isArray(rows) ? rows : []).map((a) => ({
        id: a.id, label: a.label || 'Endereço', recipient: a.recipient_name || '', cep: a.zip_code || '',
        street: a.street || '', number: a.number || '', complement: a.complement || '',
        neighborhood: a.neighborhood || '', city: a.city || '', state: a.state || '', isDefault: !!a.is_default,
      }));
      setAddresses(list);
      const newId = (created && created.id) || (list[list.length - 1] && list[list.length - 1].id);
      if (newId) { setSelectedAddressId(newId); setAddressMode('saved'); }
      toast({ title: '✓ Endereço salvo na sua conta!', variant: 'success' });
    } catch (e) {
      toast({ title: 'Não foi possível salvar o endereço', description: e?.message, variant: 'destructive' });
    } finally {
      setSavingAddr(false);
    }
  }

  async function loadShipping() {
    setShippingLoading(true);
    setShippingUnavailable(false);
    setShippingOptions([]);
    setSelectedShippingId(null);
    const toZip = (selectedAddress?.cep || '').replace(/\D/g, '');
    try {
      // shipmentService.quote retorna um ARRAY de opções reais do Melhor Envio.
      const result = await shipmentService.quote({
        from_zip: '01001000',
        to_zip: toZip,
        products: items.map((i) => ({
          quantity: i.qty || i.quantity || 1,
          weight: 0.5, // peso estimado por item (kg)
        })),
        order_amount: totalPrice,
        category_ids: [],
      });
      const options = Array.isArray(result) ? result : [];
      setShippingOptions(options);
      if (options.length > 0) {
        setSelectedShippingId(options[0].service_code);
      }
    } catch (e) {
      // 503 / SHIPPING_NOT_CONFIGURED → cálculo indisponível (sem opções falsas).
      const notConfigured =
        e instanceof ApiError &&
        (e.status === 503 || e.code === 'SHIPPING_NOT_CONFIGURED');
      setShippingUnavailable(true);
      setShippingOptions([]);
      setSelectedShippingId(null);
      toast({
        title: 'Cálculo de frete indisponível',
        description: notConfigured
          ? 'Cálculo de frete indisponível no momento.'
          : e?.message || 'Não foi possível calcular o frete.',
        variant: 'destructive',
      });
    } finally {
      setShippingLoading(false);
    }
  }

  // Na etapa 2 (modalidade de envio), calcula o frete automaticamente assim que
  // houver um endereço selecionado e ainda não existirem opções carregadas.
  useEffect(() => {
    if (
      currentStep === 2 &&
      !isPickup &&
      selectedAddress &&
      shippingOptions.length === 0 &&
      !shippingLoading
    ) {
      loadShipping();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, isPickup, selectedAddress, shippingOptions.length, shippingLoading]);

  async function applyCoupon() {
    const code = couponInput.trim();
    if (!code) return;
    setCouponLoading(true);
    try {
      const res = await couponService.validate(code, totalPrice);
      setCouponApplied(res?.code || code);
      setCouponDiscount(Number(res?.discount) || 0);
      toast({ title: 'Cupom aplicado!', variant: 'success' });
    } catch (e) {
      setCouponApplied('');
      setCouponDiscount(0);
      toast({ title: 'Cupom inválido', description: e?.message, variant: 'destructive' });
    } finally {
      setCouponLoading(false);
    }
  }

  function next() {
    if (currentStep === 1) {
      // Etapa 1 — Endereço: obrigatório (para envio). O endereço também é usado
      // para cotar o frete na etapa 2; por isso exigimos sempre aqui.
      if (!selectedAddress) {
        toast({
          title: 'Endereço obrigatório',
          description: 'Selecione ou preencha um endereço para continuar.',
          variant: 'destructive',
        });
        return;
      }
    } else if (currentStep === 2) {
      // Etapa 2 — Modalidade de envio. Na retirada presencial não há frete.
      if (!isPickup && !selectedShipping) {
        toast({ title: 'Selecione uma opção de frete.', variant: 'destructive' });
        return;
      }
    }
    if (currentStep < STEPS) setCurrentStep((s) => s + 1);
  }
  function prev() {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  }

  function handleConfirm() {
    if (!paymentMethod) {
      toast({ title: 'Selecione um método de pagamento.', variant: 'destructive' });
      return;
    }
    // Reseta o estado do modal antes de abrir.
    setPaid(false);
    if (paymentMethod === 'pix') {
      setPixData(null);
      setShowPix(true);
    } else if (paymentMethod === 'credit') {
      setCardResult(null);
      setShowCard(true);
    } else if (paymentMethod === 'boleto') {
      setBoletoData(null);
      setShowBoleto(true);
    }
  }

  // Fechamento dos modais — encerra o polling pendente.
  function closePix() {
    stopPolling();
    setShowPix(false);
  }
  function closeBoleto() {
    stopPolling();
    setShowBoleto(false);
  }
  function closeCard() {
    setShowCard(false);
  }

  const confirmLabel =
    paymentMethod === 'pix'
      ? 'Gerar PIX'
      : paymentMethod === 'credit'
      ? 'Inserir dados do cartão'
      : paymentMethod === 'boleto'
      ? 'Gerar boleto'
      : 'Finalizar Compra';

  if (cartEmpty) {
    return (
      <main className={styles.page}>
        <div className={styles.emptyWrap}>
          <Icon name="cart" size={64} className={styles.emptyIcon} />
          <h2 className={styles.emptyTitle}>Carrinho vazio</h2>
          <p className={styles.emptyText}>Adicione produtos ao carrinho para continuar.</p>
          <Button onClick={() => router.push('/produtos')}>Continuar comprando</Button>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      {/* Topo minimalista */}
      <div className={styles.topbar}>
        <div className={styles.topbarInner}>
          <button type="button" className={styles.backLink} onClick={() => router.push('/produtos')}>
            <Icon name="arrow-left" size={16} />
            Voltar
          </button>
          <span className={styles.brand}>feiradorolo.com.br</span>

          <div className={styles.steps}>
            {[1, 2, 3].map((step) => (
              <div key={step} className={styles.stepWrap}>
                <div
                  className={cx(
                    styles.stepDot,
                    step === currentStep && styles.stepActive,
                    step < currentStep && styles.stepDone
                  )}
                >
                  {step < currentStep ? <Icon name="check" size={16} /> : step}
                </div>
                {step < STEPS && (
                  <div className={cx(styles.stepBar, currentStep > step && styles.stepBarActive)} />
                )}
              </div>
            ))}
          </div>

          <span className={styles.cartCount}>Carrinho ({totalItems})</span>
        </div>
      </div>

      <div className={styles.container}>
        {/* ETAPA 1 — ENDEREÇO DE ENTREGA */}
        {currentStep === 1 && (
          <div className={styles.stepBody}>
            <header className={styles.stepHeader}>
              <h1 className={styles.stepH1}>Endereço de entrega</h1>
              <p className={styles.stepLead}>
                Confirme, selecione ou cadastre o endereço para onde enviar.
              </p>
            </header>

            {addresses.length > 0 ? (
              <div className={styles.modeTabs}>
                <button
                  type="button"
                  className={cx(styles.modeTab, addressMode === 'saved' && styles.modeTabActive)}
                  onClick={() => setAddressMode('saved')}
                >
                  Endereços salvos
                </button>
                <button
                  type="button"
                  className={cx(styles.modeTab, addressMode === 'new' && styles.modeTabActive)}
                  onClick={() => setAddressMode('new')}
                >
                  Novo endereço
                </button>
              </div>
            ) : (
              user &&
              !addressesLoading &&
              !addressesError && (
                <div className={styles.newAddressHead}>
                  <Icon name="map-pin" size={18} className={styles.newAddressHeadIcon} />
                  <span>Informe o endereço de entrega</span>
                </div>
              )
            )}

            {!user ? (
              <div className={styles.confirmBox}>
                <Icon name="user" size={18} className={styles.confirmIcon} />
                <div>
                  <div className={styles.confirmTitle}>Faça login para usar seus endereços</div>
                  <div className={styles.confirmLine}>
                    Entre na sua conta para selecionar um endereço salvo ou cadastre um novo.
                  </div>
                  <div className={styles.navCenter}>
                    <Button variant="outline" onClick={() => openAuth('login')}>
                      Entrar
                    </Button>
                  </div>
                </div>
              </div>
            ) : addressesLoading ? (
              <div className={styles.loadingBox}>
                <Spinner size={32} />
                <p>Carregando seus endereços...</p>
              </div>
            ) : addressesError ? (
              <p className={styles.fieldError}>{addressesError}</p>
            ) : addressMode === 'saved' && addresses.length > 0 ? (
              <div className={styles.addressList}>
                {addresses.map((a) => {
                  const sel = selectedAddressId === a.id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      className={cx(styles.addressCard, sel && styles.addressCardSel)}
                      onClick={() => setSelectedAddressId(a.id)}
                    >
                      <span className={cx(styles.radio, sel && styles.radioOn)}>
                        {sel && <span className={styles.radioDot} />}
                      </span>
                      <span className={styles.addressBody}>
                        <span className={styles.addressTop}>
                          <strong>{a.label}</strong>
                          {a.isDefault && <Badge variant="brand" size="sm">Principal</Badge>}
                        </span>
                        <span className={styles.addressLine}>
                          {a.street}, {a.number}
                          {a.complement && ` - ${a.complement}`}
                        </span>
                        <span className={styles.addressSub}>
                          {a.neighborhood}, {a.city} - {a.state} · CEP {a.cep}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className={styles.newAddress}>
                <div className={styles.fieldRow}>
                  <div className={cx(styles.field, styles.fieldCep)}>
                    <label className={styles.label}>CEP *</label>
                    <Input
                      value={newAddress.cep}
                      inputMode="numeric"
                      maxLength={9}
                      placeholder="12345-678"
                      onChange={(e) => {
                        setNewAddress((p) => ({ ...p, cep: maskCep(e.target.value) }));
                        setCepError('');
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && buscarCep()}
                    />
                  </div>
                  <div className={styles.fieldCepBtn}>
                    <Button variant="outline" onClick={buscarCep} loading={cepLoading}>
                      Buscar CEP
                    </Button>
                  </div>
                </div>
                {cepError && <p className={styles.fieldError}>{cepError}</p>}

                <div className={styles.field}>
                  <label className={styles.label}>Destinatário *</label>
                  <Input
                    value={newAddress.recipient}
                    placeholder="Nome de quem recebe"
                    onChange={(e) => setNewAddress((p) => ({ ...p, recipient: e.target.value }))}
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Rua / Logradouro *</label>
                  <Input
                    value={newAddress.street}
                    placeholder="Ex: Rua das Flores"
                    onChange={(e) => setNewAddress((p) => ({ ...p, street: e.target.value }))}
                  />
                </div>

                <div className={styles.grid2}>
                  <div className={styles.field}>
                    <label className={styles.label}>Número *</label>
                    <Input
                      value={newAddress.number}
                      placeholder="100"
                      onChange={(e) => setNewAddress((p) => ({ ...p, number: e.target.value }))}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Complemento</label>
                    <Input
                      value={newAddress.complement}
                      placeholder="Apto, bloco..."
                      onChange={(e) => setNewAddress((p) => ({ ...p, complement: e.target.value }))}
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Bairro *</label>
                  <Input
                    value={newAddress.neighborhood}
                    placeholder="Bairro"
                    onChange={(e) => setNewAddress((p) => ({ ...p, neighborhood: e.target.value }))}
                  />
                </div>

                <div className={styles.grid2}>
                  <div className={styles.field}>
                    <label className={styles.label}>Cidade *</label>
                    <Input
                      value={newAddress.city}
                      placeholder="Cidade"
                      onChange={(e) => setNewAddress((p) => ({ ...p, city: e.target.value }))}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>UF *</label>
                    <Select
                      value={newAddress.state}
                      placeholder="UF"
                      options={UF_OPTIONS}
                      onChange={(e) => setNewAddress((p) => ({ ...p, state: e.target.value }))}
                    />
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={saveNewAddress}
                  loading={savingAddr}
                  leftIcon="check"
                  fullWidth
                  style={{ marginTop: 6 }}
                >
                  Salvar este endereço na minha conta
                </Button>
                <p style={{ margin: '8px 0 0', fontSize: '0.82rem', color: 'var(--muted-foreground)', textAlign: 'center' }}>
                  Salve para reutilizar nas próximas compras (opcional).
                </p>
              </div>
            )}

            {selectedAddress && (
              <div className={styles.confirmBox}>
                <Icon name="check" size={18} className={styles.confirmIcon} />
                <div>
                  <div className={styles.confirmTitle}>Endereço selecionado</div>
                  <div className={styles.confirmLine}>
                    {selectedAddress.street}, {selectedAddress.number}
                    {selectedAddress.complement && ` - ${selectedAddress.complement}`}
                  </div>
                  <div className={styles.confirmLine}>
                    {selectedAddress.neighborhood}, {selectedAddress.city} - {selectedAddress.state}
                  </div>
                  <div className={styles.confirmLine}>CEP: {selectedAddress.cep}</div>
                </div>
              </div>
            )}

            <div className={styles.navCenter}>
              <Button onClick={next} disabled={!selectedAddress} size="lg" rightIcon="arrow-right">
                Continuar para o envio
              </Button>
            </div>
          </div>
        )}

        {/* ETAPA 2 — MODALIDADE DE ENVIO (frete real do vendedor + retirada) */}
        {currentStep === 2 && (
          <div className={styles.stepBody}>
            <header className={styles.stepHeader}>
              <h1 className={styles.stepH1}>Modalidade de envio</h1>
              <p className={styles.stepLead}>
                Escolha como receber seus produtos.
              </p>
            </header>

            {/* Seletor de modalidade: envio x retirada (retirada só se canPickup) */}
            <div className={styles.methodGrid}>
              <button
                type="button"
                className={cx(styles.methodCard, !isPickup && styles.methodCardActive)}
                onClick={() => setDeliveryMethod('shipping')}
                aria-pressed={!isPickup}
              >
                {!isPickup && (
                  <span className={styles.methodCheck}>
                    <Icon name="check" size={16} />
                  </span>
                )}
                <span className={styles.methodEmoji}>📦</span>
                <span className={styles.methodTitle}>Envio (Melhor Envio)</span>
                <span className={styles.methodSub}>
                  Receba em casa pelos Correios ou transportadora
                </span>
              </button>

              {canPickup && (
                <button
                  type="button"
                  className={cx(styles.methodCard, isPickup && styles.methodCardActive)}
                  onClick={() => setDeliveryMethod('pickup')}
                  aria-pressed={isPickup}
                >
                  {isPickup && (
                    <span className={styles.methodCheck}>
                      <Icon name="check" size={16} />
                    </span>
                  )}
                  <span className={styles.methodEmoji}>🤝</span>
                  <span className={styles.methodTitle}>Retirada presencial</span>
                  <span className={styles.methodSub}>
                    Combine o encontro com o vendedor pelo chat
                  </span>
                </button>
              )}
            </div>

            {!canPickup && (
              <p className={styles.stepLead} style={{ textAlign: 'center' }}>
                A retirada presencial não está disponível para um ou mais itens deste pedido.
              </p>
            )}

            {/* Opções de frete (somente as disponibilizadas pelo vendedor) */}
            {!isPickup && (
              <>
                {selectedAddress && (
                  <div className={styles.calcShipRow}>
                    <Button
                      variant="outline"
                      onClick={loadShipping}
                      loading={shippingLoading}
                      leftIcon="truck"
                    >
                      Recalcular frete
                    </Button>
                  </div>
                )}

                {!selectedAddress ? (
                  <div className={styles.panel}>
                    <h3 className={styles.panelTitle}>
                      <Icon name="truck" size={20} className={styles.panelIcon} />
                      Opções de entrega
                    </h3>
                    <div className={styles.shipEmpty}>
                      <span className={styles.shipEmptyIcon}>
                        <Icon name="map-pin" size={26} />
                      </span>
                      <div className={styles.shipEmptyTitle}>Falta o endereço</div>
                      <p className={styles.shipEmptyText}>
                        Volte e selecione um endereço para calcularmos o frete.
                      </p>
                    </div>
                  </div>
                ) : shippingLoading ? (
                  <div className={styles.loadingBox}>
                    <Spinner size={32} />
                    <p>Calculando frete…</p>
                  </div>
                ) : shippingUnavailable ? (
                  <div className={styles.panel}>
                    <h3 className={styles.panelTitle}>
                      <Icon name="truck" size={20} className={styles.panelIcon} />
                      Opções de entrega
                    </h3>
                    <p className={styles.fieldError}>Cálculo de frete indisponível no momento.</p>
                  </div>
                ) : shippingOptions.length === 0 ? (
                  <div className={styles.panel}>
                    <h3 className={styles.panelTitle}>
                      <Icon name="truck" size={20} className={styles.panelIcon} />
                      Opções de entrega
                    </h3>
                    <p className={styles.fieldError}>
                      Nenhuma opção de frete disponível para este endereço.
                    </p>
                  </div>
                ) : (
                  <div className={styles.panel}>
                    <h3 className={styles.panelTitle}>
                      <Icon name="truck" size={20} className={styles.panelIcon} />
                      Opções de entrega
                    </h3>
                    <div className={styles.shippingList}>
                      {shippingOptions.map((opt) => {
                        const sel = selectedShippingId === opt.service_code;
                        const isFree = !!opt.free_shipping || Number(opt.price) === 0;
                        return (
                          <button
                            key={opt.service_code}
                            type="button"
                            className={cx(styles.shippingRow, sel && styles.shippingRowSel)}
                            onClick={() => setSelectedShippingId(opt.service_code)}
                          >
                            <span className={styles.shippingLeft}>
                              <span className={cx(styles.radio, sel && styles.radioOn)}>
                                {sel && <span className={styles.radioDot} />}
                              </span>
                              <span>
                                <span className={styles.shippingName}>{opt.service_name}</span>
                                <span className={styles.shippingSub}>{opt.company}</span>
                                {opt.delivery_time != null && (
                                  <span className={styles.shippingSub}>
                                    {opt.delivery_time} dia{Number(opt.delivery_time) === 1 ? '' : 's'} úteis
                                  </span>
                                )}
                              </span>
                            </span>
                            <span className={styles.shippingPrice}>
                              {isFree ? 'Grátis' : BRL.format(Number(opt.price) || 0)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Retirada presencial: passos do encontro seguro */}
            {isPickup && (
              <div className={styles.pickupCard}>
              <div className={styles.pickupHero}>
                <span className={styles.pickupHeroIcon}>
                  <Icon name="shield" size={30} />
                </span>
                <div>
                  <div className={styles.pickupHeroTitle}>Retirada presencial</div>
                  <div className={styles.pickupHeroSub}>
                    Pagamento protegido — só liberado quando você receber o produto.
                  </div>
                </div>
              </div>

              <ol className={styles.pickupSteps}>
                <li className={styles.pickupStep}>
                  <span className={styles.pickupStepNum}>1</span>
                  <span className={styles.pickupStepText}>
                    <strong>Pague pela plataforma</strong>
                    <span className={styles.pickupStepSub}>
                      Seu pagamento fica retido com segurança até a entrega.
                    </span>
                  </span>
                </li>
                <li className={styles.pickupStep}>
                  <span className={styles.pickupStepNum}>2</span>
                  <span className={styles.pickupStepText}>
                    <strong>Receba um código de 6 dígitos</strong>
                    <span className={styles.pickupStepSub}>
                      Ele é gerado para você logo após o pagamento.
                    </span>
                  </span>
                </li>
                <li className={styles.pickupStep}>
                  <span className={styles.pickupStepNum}>3</span>
                  <span className={styles.pickupStepText}>
                    <strong>Encontre o vendedor em local público</strong>
                    <span className={styles.pickupStepSub}>
                      Combine o ponto de encontro pelo chat.
                    </span>
                  </span>
                </li>
                <li className={styles.pickupStep}>
                  <span className={styles.pickupStepNum}>4</span>
                  <span className={styles.pickupStepText}>
                    <strong>Informe o código só ao receber o produto</strong>
                    <span className={styles.pickupStepSub}>
                      É isso que libera o pagamento para o vendedor.
                    </span>
                  </span>
                </li>
              </ol>

              <div className={styles.pickupWarnBox}>
                <span className={styles.pickupWarnEmoji}>⚠️</span>
                <span>Encontre-se em local público e movimentado.</span>
              </div>
              </div>
            )}

            <div className={styles.navBetween}>
              <Button variant="outline" onClick={prev} size="lg" leftIcon="arrow-left">
                Voltar
              </Button>
              <Button
                onClick={next}
                disabled={!isPickup && !selectedShipping}
                size="lg"
                rightIcon="arrow-right"
              >
                Continuar para o pagamento
              </Button>
            </div>
          </div>
        )}

        {/* ETAPA 3 — PAGAMENTO (estilo ML: resumo no topo, CTA de pagar alto) */}
        {currentStep === 3 && (
          <div className={styles.grid3}>
            {/* Coluna principal (esquerda) — resumo no topo, depois pagamento + CTA */}
            <div className={styles.colMain}>
              {/* Resumo compacto do pedido + vendedor (TOPO ESQUERDA) */}
              <div className={cx(styles.panel, styles.orderHeader)}>
                <div className={styles.orderHeaderTop}>
                  <h3 className={styles.panelTitlePlain}>Resumo do pedido</h3>
                  <span className={styles.orderHeaderTotal}>{BRL.format(total)}</span>
                </div>
                <div className={styles.summaryItems}>
                  {items.map((item) => (
                    <div key={item.id} className={styles.summaryItem}>
                      <div className={styles.summaryItemInfo}>
                        <div className={styles.summaryItemName}>{item.title}</div>
                        <div className={styles.summaryItemQty}>Qtd: {item.qty}</div>
                      </div>
                      <div className={styles.summaryItemPrice}>
                        {BRL.format(item.price * item.qty)}
                      </div>
                    </div>
                  ))}
                </div>
                {cartSellerIds.length > 0 && (
                  <div className={styles.sellerTrustBlock}>
                    <span className={styles.sellerTrustLabel}>
                      {cartSellerIds.length === 1 ? 'Vendedor' : 'Vendedores'}
                    </span>
                    {cartSellerIds.map((sid) => (
                      <SellerTrust key={sid} sellerId={sid} compact className={styles.sellerTrustItem} />
                    ))}
                  </div>
                )}
              </div>

              {/* Pagamento — cards claros de cada método */}
              <div className={styles.panel}>
                <h3 className={styles.panelTitle}>
                  <Icon name="card" size={20} className={styles.panelIcon} />
                  Pagamento
                </h3>

                <div className={styles.secureRow}>
                  <Icon name="shield" size={18} className={styles.secureIcon} />
                  <span className={styles.secureText}>Pagamento Seguro</span>
                </div>

                <div className={styles.payList}>
                  {/* PIX */}
                  <button
                    type="button"
                    className={cx(styles.payRow, paymentMethod === 'pix' && styles.payRowSel)}
                    onClick={() => setPaymentMethod('pix')}
                  >
                    <span className={styles.payLeft}>
                      <span className={cx(styles.radio, paymentMethod === 'pix' && styles.radioOn)}>
                        {paymentMethod === 'pix' && <span className={styles.radioDot} />}
                      </span>
                      <span className={styles.payBadgePix}>PIX</span>
                      <span>
                        <span className={styles.payName}>PIX</span>
                        <span className={styles.paySub}>Aprovação instantânea</span>
                      </span>
                    </span>
                    <Badge variant="success" size="sm">Recomendado</Badge>
                  </button>

                  {/* Cartão */}
                  <button
                    type="button"
                    className={cx(styles.payRow, paymentMethod === 'credit' && styles.payRowSel)}
                    onClick={() => setPaymentMethod('credit')}
                  >
                    <span className={styles.payLeft}>
                      <span className={cx(styles.radio, paymentMethod === 'credit' && styles.radioOn)}>
                        {paymentMethod === 'credit' && <span className={styles.radioDot} />}
                      </span>
                      <Icon name="card" size={24} className={styles.payIconBlue} />
                      <span>
                        <span className={styles.payName}>Cartão de Crédito</span>
                        <span className={styles.paySub}>Parcelamento disponível</span>
                      </span>
                    </span>
                  </button>

                  {/* Boleto */}
                  <button
                    type="button"
                    className={cx(styles.payRow, paymentMethod === 'boleto' && styles.payRowSel)}
                    onClick={() => setPaymentMethod('boleto')}
                  >
                    <span className={styles.payLeft}>
                      <span className={cx(styles.radio, paymentMethod === 'boleto' && styles.radioOn)}>
                        {paymentMethod === 'boleto' && <span className={styles.radioDot} />}
                      </span>
                      <Icon name="barcode" size={24} className={styles.payIconOrange} />
                      <span>
                        <span className={styles.payName}>Boleto Bancário</span>
                        <span className={styles.paySub}>Vencimento em 3 dias úteis</span>
                      </span>
                    </span>
                  </button>
                </div>

                {/* CTA de pagar em destaque e ALTO (logo abaixo dos métodos) */}
                <div className={styles.payCta}>
                  <div className={styles.payCtaTotal}>
                    <span>Total a pagar</span>
                    <strong>{BRL.format(total)}</strong>
                  </div>
                  <Button onClick={handleConfirm} fullWidth size="lg" className={styles.confirmBtn}>
                    {confirmLabel}
                  </Button>
                </div>

                <div className={styles.secureFoot}>
                  <span className={styles.secureFootItem}>
                    <Icon name="shield" size={15} /> 100% seguro
                  </span>
                  <span className={styles.secureFootItem}>
                    <Icon name="check" size={15} /> SSL
                  </span>
                  <span className={styles.secureFootItem}>
                    <Icon name="card" size={15} /> Mercado Pago
                  </span>
                </div>
              </div>

              {/* Entrega — abaixo (não atrapalha o CTA) */}
              {isPickup ? (
                <div className={styles.panel}>
                  <h3 className={styles.panelTitle}>
                    <Icon name="map-pin" size={20} className={styles.panelIcon} />
                    Retirada presencial
                  </h3>
                  <div className={styles.reviewLines}>
                    <div className={styles.reviewStrong}>Combine o encontro com o vendedor pelo chat.</div>
                    <div className={styles.reviewSub}>
                      Um código de 6 dígitos será gerado para liberar o pagamento no encontro.
                    </div>
                    <div className={styles.reviewSub}>
                      ⚠️ Encontre-se em local público e movimentado.
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className={styles.panel}>
                    <h3 className={styles.panelTitle}>
                      <Icon name="map-pin" size={20} className={styles.panelIcon} />
                      Endereço de entrega
                    </h3>
                    <div className={styles.reviewLines}>
                      <div className={styles.reviewStrong}>
                        {selectedAddress?.street}, {selectedAddress?.number}
                        {selectedAddress?.complement && ` - ${selectedAddress.complement}`}
                      </div>
                      <div className={styles.reviewSub}>
                        {selectedAddress?.neighborhood}, {selectedAddress?.city} - {selectedAddress?.state}
                      </div>
                      <div className={styles.reviewSub}>CEP: {selectedAddress?.cep}</div>
                    </div>
                  </div>

                  <div className={styles.panel}>
                    <h3 className={styles.panelTitle}>
                      <Icon name="truck" size={20} className={styles.panelIcon} />
                      Método de entrega
                    </h3>
                    <div className={styles.reviewLines}>
                      <div className={styles.reviewStrong}>{selectedShipping?.service_name}</div>
                      <div className={styles.reviewSub}>{selectedShipping?.company}</div>
                      {selectedShipping?.delivery_time != null && (
                        <div className={styles.reviewSub}>
                          {selectedShipping.delivery_time} dia
                          {Number(selectedShipping.delivery_time) === 1 ? '' : 's'} úteis
                        </div>
                      )}
                      <div className={styles.reviewShip}>
                        Frete: {shippingCost === 0 ? 'Grátis' : BRL.format(shippingCost)}
                      </div>
                    </div>
                  </div>
                </>
              )}

              <Button variant="outline" onClick={prev} fullWidth leftIcon="arrow-left">
                Voltar para o envio
              </Button>
            </div>

            {/* Coluna lateral (direita, desktop) — totais sticky + CTA repetido */}
            <div className={styles.colSide}>
              <div className={styles.panel}>
                <h3 className={styles.panelTitlePlain}>Valores</h3>
                <div className={styles.field}>
                  <label className={styles.label}>Cupom de desconto</label>
                  <div className={styles.copyRow}>
                    <Input
                      value={couponInput}
                      placeholder="Digite seu cupom"
                      className={styles.copyInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && applyCoupon()}
                    />
                    <Button variant="outline" onClick={applyCoupon} loading={couponLoading}>
                      Aplicar
                    </Button>
                  </div>
                </div>
                <div className={styles.summaryTotals}>
                  <div className={styles.summaryRow}>
                    <span>Subtotal</span>
                    <span>{BRL.format(totalPrice)}</span>
                  </div>
                  {discount > 0 && (
                    <div className={styles.summaryRow}>
                      <span>Desconto{couponApplied ? ` (${couponApplied})` : ''}</span>
                      <span className={styles.free}>- {BRL.format(discount)}</span>
                    </div>
                  )}
                  <div className={styles.summaryRow}>
                    <span>Frete</span>
                    <span className={shippingCost === 0 ? styles.free : undefined}>
                      {shippingCost === 0 ? 'GRÁTIS' : BRL.format(shippingCost)}
                    </span>
                  </div>
                  <div className={styles.summaryTotal}>
                    <span>Total</span>
                    <span>{BRL.format(total)}</span>
                  </div>
                </div>
                <Button onClick={handleConfirm} fullWidth size="lg" className={styles.confirmBtn} style={{ marginTop: 14 }}>
                  {confirmLabel}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL PIX */}
      <Modal
        open={showPix}
        onClose={closePix}
        size="sm"
        title={
          <span className={styles.modalTitle}>
            <Icon name="pix" size={22} className={styles.pixTitleIcon} />
            Pagamento PIX
          </span>
        }
        footer={
          <>
            <Button variant="outline" onClick={closePix} disabled={submitting}>
              Fechar
            </Button>
            {!pixData && (
              <Button onClick={payWithPix} loading={submitting}>
                Gerar QR Code
              </Button>
            )}
          </>
        }
      >
        {paid ? (
          <div className={styles.paySuccess}>
            <Icon name="check" size={48} className={styles.paySuccessIcon} />
            <div className={styles.paySuccessTitle}>Pagamento confirmado!</div>
            <p className={styles.paySuccessText}>Redirecionando para os seus pedidos…</p>
          </div>
        ) : !pixData ? (
          submitting ? (
            <div className={styles.loadingBox}>
              <Spinner size={32} />
              <p>Gerando seu PIX…</p>
            </div>
          ) : (
            <>
              <div className={styles.modalInfo}>
                <div className={styles.modalInfoRow}>
                  <span>Valor:</span>
                  <strong>{BRL.format(total)}</strong>
                </div>
                <div className={styles.modalInfoRow}>
                  <span>Método:</span>
                  <span>PIX</span>
                </div>
              </div>
              <ol className={styles.pixSteps}>
                <li>Clique em &quot;Gerar QR Code&quot;</li>
                <li>Escaneie o QR ou use o Copia e Cola no app do seu banco</li>
                <li>O pagamento é confirmado automaticamente</li>
              </ol>
            </>
          )
        ) : (
          <>
            {pixData.qr_code_base64 && (
              <div className={styles.pixQrWrap}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className={styles.pixQrImg}
                  src={`data:image/png;base64,${pixData.qr_code_base64}`}
                  alt="QR Code PIX"
                  width={192}
                  height={192}
                />
              </div>
            )}

            {pixData.qr_code && (
              <div className={styles.field}>
                <label className={styles.label}>PIX Copia e Cola</label>
                <div className={styles.copyRow}>
                  <Input value={pixData.qr_code} readOnly className={styles.copyInput} />
                  <Button variant="outline" onClick={copyPix}>
                    {copied ? 'Copiado!' : 'Copiar'}
                  </Button>
                </div>
              </div>
            )}

            <div className={styles.modalInfo}>
              <div className={styles.modalInfoRow}>
                <span>Valor:</span>
                <strong>{BRL.format(total)}</strong>
              </div>
              <div className={styles.modalInfoRow}>
                <span>Status:</span>
                <Badge variant="neutral" size="sm">Aguardando pagamento…</Badge>
              </div>
            </div>

            <div className={styles.pollRow}>
              <Spinner size={16} />
              <span>Confirmaremos automaticamente assim que pagar.</span>
            </div>
            {pixData.ticket_url && (
              <a
                className={styles.ticketLink}
                href={pixData.ticket_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir comprovante PIX
              </a>
            )}
          </>
        )}
      </Modal>

      {/* MODAL CARTÃO */}
      <Modal
        open={showCard}
        onClose={closeCard}
        size="sm"
        title={
          <span className={styles.modalTitle}>
            <Icon name="card" size={22} className={styles.payIconBlue} />
            Cartão de Crédito
          </span>
        }
        footer={
          <>
            <Button variant="outline" onClick={closeCard} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={payWithCard} loading={submitting}>
              Pagar {BRL.format(total)}
            </Button>
          </>
        }
      >
        {cardResult && isPaid(cardResult.status) ? (
          <div className={styles.paySuccess}>
            <Icon name="check" size={48} className={styles.paySuccessIcon} />
            <div className={styles.paySuccessTitle}>Pagamento aprovado!</div>
            <p className={styles.paySuccessText}>Redirecionando para os seus pedidos…</p>
          </div>
        ) : (
          <>
            {cardResult && (cardResult.status === 'in_process' || cardResult.status === 'pending') && (
              <div className={styles.confirmBox}>
                <Icon name="shield" size={18} className={styles.confirmIcon} />
                <div>
                  <div className={styles.confirmTitle}>Pagamento em análise</div>
                  <div className={styles.confirmLine}>
                    Estamos confirmando o seu pagamento. Avisaremos assim que for aprovado.
                  </div>
                </div>
              </div>
            )}
            {cardResult && !isPaid(cardResult.status) && cardResult.status !== 'in_process' && cardResult.status !== 'pending' && (
              <p className={styles.fieldError}>{cardStatusMessage(cardResult.status_detail)}</p>
            )}

            <div className={styles.field}>
              <label className={styles.label}>Número do cartão</label>
              <Input
                placeholder="1234 5678 9012 3456"
                inputMode="numeric"
                value={card.number}
                onChange={(e) => setCard((c) => ({ ...c, number: maskCardNumber(e.target.value) }))}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Nome no cartão</label>
              <Input
                placeholder="JOÃO DA SILVA"
                value={card.name}
                onChange={(e) => setCard((c) => ({ ...c, name: e.target.value.toUpperCase() }))}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>CPF do titular</label>
              <Input
                placeholder="000.000.000-00"
                inputMode="numeric"
                value={card.cpf}
                onChange={(e) => setCard((c) => ({ ...c, cpf: maskCPF(e.target.value) }))}
              />
            </div>
            <div className={styles.grid2}>
              <div className={styles.field}>
                <label className={styles.label}>Validade</label>
                <Input
                  placeholder="MM/AA"
                  inputMode="numeric"
                  value={card.expiry}
                  onChange={(e) => setCard((c) => ({ ...c, expiry: maskExpiry(e.target.value) }))}
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>CVV</label>
                <Input
                  placeholder="123"
                  inputMode="numeric"
                  maxLength={4}
                  value={card.cvv}
                  onChange={(e) => setCard((c) => ({ ...c, cvv: e.target.value.replace(/\D/g, '') }))}
                />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Parcelas</label>
              <Select
                value={installments}
                onChange={(e) => setInstallments(e.target.value)}
                options={Array.from({ length: 12 }, (_, i) => {
                  const n = i + 1;
                  return { value: String(n), label: `${n}x de ${BRL.format(total / n)}${n === 1 ? ' à vista' : ' sem juros'}` };
                })}
              />
            </div>
            <div className={styles.modalTotal}>
              <span>Total:</span>
              <strong>{BRL.format(total)}</strong>
            </div>
          </>
        )}
      </Modal>

      {/* MODAL BOLETO */}
      <Modal
        open={showBoleto}
        onClose={closeBoleto}
        size="md"
        title={
          <span className={styles.modalTitle}>
            <Icon name="barcode" size={22} className={styles.payIconOrange} />
            Boleto Bancário
          </span>
        }
        footer={
          <>
            <Button variant="outline" onClick={closeBoleto} disabled={submitting}>
              Fechar
            </Button>
            {!boletoData && (
              <Button onClick={payWithBoleto} loading={submitting}>
                Gerar boleto
              </Button>
            )}
          </>
        }
      >
        {paid ? (
          <div className={styles.paySuccess}>
            <Icon name="check" size={48} className={styles.paySuccessIcon} />
            <div className={styles.paySuccessTitle}>Pagamento confirmado!</div>
            <p className={styles.paySuccessText}>Redirecionando para os seus pedidos…</p>
          </div>
        ) : submitting && !boletoData ? (
          <div className={styles.loadingBox}>
            <Spinner size={32} />
            <p>Gerando o seu boleto…</p>
          </div>
        ) : boletoData ? (
          <>
            <div className={styles.boletoBanner}>
              <Icon name="barcode" size={22} className={styles.confirmIcon} />
              <div>
                <div className={styles.confirmTitle}>Boleto gerado!</div>
                <div className={styles.confirmLine}>
                  Vencimento em 3 dias úteis. O pedido será liberado após a compensação.
                </div>
              </div>
            </div>

            {boletoData.barcode && (
              <div className={styles.field}>
                <label className={styles.label}>Linha digitável</label>
                <Input value={boletoData.barcode} readOnly className={styles.copyInput} />
              </div>
            )}

            <div className={styles.modalInfo}>
              <div className={styles.modalInfoRow}>
                <span>Valor:</span>
                <strong>{BRL.format(total)}</strong>
              </div>
              <div className={styles.modalInfoRow}>
                <span>Método:</span>
                <span>Boleto Bancário</span>
              </div>
            </div>

            <div className={styles.boletoActions}>
              <a href={boletoData.url} target="_blank" rel="noopener noreferrer">
                <Button fullWidth leftIcon="barcode">Abrir boleto</Button>
              </a>
            </div>
            <div className={styles.pollRow}>
              <Spinner size={16} />
              <span>Confirmaremos automaticamente após o pagamento.</span>
            </div>
          </>
        ) : (
          <>
            <div className={styles.boletoBanner}>
              <Icon name="barcode" size={22} className={styles.confirmIcon} />
              <div>
                <div className={styles.confirmTitle}>Boleto pelo Mercado Pago</div>
                <div className={styles.confirmLine}>
                  A linha digitável será emitida agora, com vencimento em 3 dias úteis.
                </div>
              </div>
            </div>

            <div className={styles.modalInfo}>
              <div className={styles.modalInfoRow}>
                <span>Valor:</span>
                <strong>{BRL.format(total)}</strong>
              </div>
              <div className={styles.modalInfoRow}>
                <span>Método:</span>
                <span>Boleto Bancário</span>
              </div>
            </div>
          </>
        )}
      </Modal>

      {/* MODAL DE ERRO AMIGÁVEL — mostra sempre o MOTIVO, nunca o erro cru */}
      <Modal
        open={!!errModal}
        onClose={() => setErrModal(null)}
        size="sm"
        title={
          <span className={styles.modalTitle}>
            <span aria-hidden="true">⚠️</span>
            {errModal?.title}
          </span>
        }
        footer={
          <Button onClick={() => setErrModal(null)}>Entendi</Button>
        }
      >
        <p className={styles.confirmLine}>{errModal?.message}</p>
      </Modal>

      {/* MODAL DE VERIFICAÇÃO (e-mail / WhatsApp) — exigido pelo backend */}
      <VerificationModal
        open={!!verifyChannel}
        channel={verifyChannel || 'email'}
        onClose={() => setVerifyChannel(null)}
        onVerified={() => {
          setVerifyChannel(null);
          const fn = pendingActionRef.current;
          pendingActionRef.current = null;
          if (fn) fn(); // repete a ação que estava bloqueada
        }}
      />
    </main>
  );
}
