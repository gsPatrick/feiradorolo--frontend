'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { cx } from '@/lib/cx';
import { useCart } from '@/components/providers/CartProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { addressService, couponService, shipmentService, orderService, paymentService, ApiError } from '@/lib/api';
import Button from '@/components/atoms/Button/Button';
import Input from '@/components/atoms/Input/Input';
import Select from '@/components/atoms/Select/Select';
import Icon from '@/components/atoms/Icon/Icon';
import Badge from '@/components/atoms/Badge/Badge';
import Spinner from '@/components/atoms/Spinner/Spinner';
import Modal from '@/components/organisms/Modal/Modal';

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const STEPS = 3;

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

  // Endereço
  const [addresses, setAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [addressesError, setAddressesError] = useState('');
  const [addressMode, setAddressMode] = useState('saved'); // 'saved' | 'new'
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [newAddress, setNewAddress] = useState(EMPTY_NEW_ADDRESS);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState('');

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
  const [card, setCard] = useState({ number: '', name: '', expiry: '', cvv: '' });

  // Modais
  const [showPix, setShowPix] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [showBoleto, setShowBoleto] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  // Na etapa 2 (envio), calcula o frete automaticamente assim que houver um
  // endereço selecionado e ainda não existirem opções carregadas.
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
      // Etapa 1 só escolhe o método; o endereço e o frete ficam na etapa 2 (envio).
      // Não há cotação aqui — o frete é calculado na etapa 2 a partir do endereço.
    } else if (currentStep === 2) {
      if (!isPickup) {
        if (!selectedAddress) {
          toast({
            title: 'Endereço obrigatório',
            description: 'Selecione ou preencha um endereço para continuar.',
            variant: 'destructive',
          });
          return;
        }
        if (!selectedShipping) {
          toast({ title: 'Selecione uma opção de frete.', variant: 'destructive' });
          return;
        }
      }
    }
    if (currentStep < STEPS) setCurrentStep((s) => s + 1);
  }
  function prev() {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  }

  async function finishOrder() {
    if (submitting) return;
    setSubmitting(true);
    try {
      // 1) Cria a(s) ordem(ns).
      const created = await orderService.checkout({
        items: items.map((i) => ({ product_id: i.id, quantity: i.qty || i.quantity || 1 })),
        coupon_code: couponApplied || undefined,
        // Na retirada presencial o endereço é opcional.
        address_id:
          !isPickup && addressMode === 'saved' ? selectedAddressId || undefined : undefined,
        delivery_method: deliveryMethod,
        // Frete escolhido (apenas para envio; retirada presencial não tem frete).
        shipping_option:
          !isPickup && selectedShipping
            ? {
                service_code: selectedShipping.service_code,
                service_name: selectedShipping.service_name,
                price: shippingCost,
                cost: shippingCost,
              }
            : undefined,
      });
      const orders = Array.isArray(created) ? created : created ? [created] : [];
      const orderId = orders[0]?.id;
      if (!orderId) {
        throw new Error('Pedido criado sem identificador. Tente novamente.');
      }

      // 2) Cria a preferência de pagamento (Checkout Pro do Mercado Pago).
      const pref = await paymentService.createPreference(orderId);
      const initPoint = pref?.init_point || pref?.sandbox_init_point;
      if (!initPoint) {
        throw new Error('Não foi possível iniciar o pagamento. Tente novamente.');
      }

      // 3) Redireciona o navegador para o checkout do Mercado Pago.
      // (cartão/Pix/boleto são tratados lá; a retirada presencial usa o mesmo fluxo de cobrança).
      setShowPix(false);
      setShowCard(false);
      setShowBoleto(false);
      if (typeof clear === 'function') clear();
      window.location.href = initPoint;
      // Mantém o loading ativo durante o redirect (não chega no finally por causa do return).
      return;
    } catch (e) {
      // Gateway não configurado no painel admin (ex.: 503 / PAYMENT_NOT_CONFIGURED).
      const notConfigured =
        e?.status === 503 ||
        e?.code === 'PAYMENT_NOT_CONFIGURED' ||
        e?.code === 'GATEWAY_NOT_CONFIGURED';
      if (notConfigured) {
        toast({
          title: 'Pagamento indisponível',
          description: 'Configure o Mercado Pago no painel admin para concluir a compra.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Não foi possível finalizar o pedido',
          description: e?.message,
          variant: 'destructive',
        });
      }
      setSubmitting(false);
    }
  }

  function handleConfirm() {
    if (!paymentMethod) {
      toast({ title: 'Selecione um método de pagamento.', variant: 'destructive' });
      return;
    }
    if (paymentMethod === 'pix') {
      setShowPix(true);
    } else if (paymentMethod === 'credit') {
      setShowCard(true);
    } else if (paymentMethod === 'boleto') {
      setShowBoleto(true);
    }
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
        {/* ETAPA 1 — MÉTODO DE ENTREGA (dois cards grandes quadrados) */}
        {currentStep === 1 && (
          <div className={styles.stepBody}>
            <header className={styles.stepHeader}>
              <h1 className={styles.stepH1}>Como você quer receber seus produtos?</h1>
              <p className={styles.stepLead}>Escolha o método de entrega.</p>
            </header>

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
            </div>

            <div className={styles.navCenter}>
              <Button onClick={next} size="lg" rightIcon="arrow-right">
                Continuar
              </Button>
            </div>
          </div>
        )}

        {/* ETAPA 2 — FRETE (ou confirmação de retirada presencial) */}
        {currentStep === 2 && isPickup && (
          <div className={styles.stepBody}>
            <header className={styles.stepHeader}>
              <h1 className={styles.stepH1}>Retirada presencial</h1>
              <p className={styles.stepLead}>Combine o encontro com o vendedor pelo chat.</p>
            </header>

            <div className={styles.pickupNote}>
              <Icon name="shield" size={18} className={styles.pickupIcon} />
              <div>
                <div className={styles.pickupTitle}>Como funciona</div>
                <div className={styles.pickupLine}>
                  Após o pagamento, um código de 6 dígitos será gerado para você. Informe-o ao
                  vendedor SOMENTE ao receber o produto para liberar o pagamento.
                </div>
                <div className={styles.pickupWarn}>
                  ⚠️ Encontre-se em local público e movimentado.
                </div>
              </div>
            </div>

            <div className={styles.navBetween}>
              <Button variant="outline" onClick={prev} size="lg" leftIcon="arrow-left">
                Voltar
              </Button>
              <Button onClick={next} size="lg" rightIcon="arrow-right">
                Continuar para o pagamento
              </Button>
            </div>
          </div>
        )}

        {currentStep === 2 && !isPickup && (
          <div className={styles.stepBody}>
            <header className={styles.stepHeader}>
              <h1 className={styles.stepH1}>Endereço e frete</h1>
              <p className={styles.stepLead}>
                Informe para onde enviar e escolha a forma de entrega.
              </p>
            </header>

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

            {addressMode === 'saved' ? (
              !user ? (
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
              ) : addresses.length === 0 ? (
                <p className={styles.fieldError}>
                  Você ainda não tem endereços salvos. Use a aba &quot;Novo endereço&quot;.
                </p>
              ) : (
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
              )
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

            {selectedAddress && (
              <div className={styles.calcShipRow}>
                <Button
                  variant="outline"
                  onClick={loadShipping}
                  loading={shippingLoading}
                  leftIcon="truck"
                >
                  Calcular frete
                </Button>
              </div>
            )}

            {!selectedAddress ? (
              <div className={styles.panel}>
                <h3 className={styles.panelTitle}>
                  <Icon name="truck" size={20} className={styles.panelIcon} />
                  Opções de entrega
                </h3>
                <p className={styles.stepLead}>
                  Selecione ou preencha um endereço para calcular o frete.
                </p>
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

            <div className={styles.navBetween}>
              <Button variant="outline" onClick={prev} size="lg" leftIcon="arrow-left">
                Voltar
              </Button>
              <Button
                onClick={next}
                disabled={!selectedAddress || !selectedShipping}
                size="lg"
                rightIcon="arrow-right"
              >
                Continuar para o pagamento
              </Button>
            </div>
          </div>
        )}

        {/* ETAPA 3 — PAGAMENTO E REVISÃO */}
        {currentStep === 3 && (
          <div className={styles.grid3}>
            {/* Coluna esquerda — resumo entrega */}
            <div className={styles.colMain}>
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
            </div>

            {/* Coluna direita — pagamento + resumo */}
            <div className={styles.colSide}>
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

              {/* Resumo do pedido */}
              <div className={styles.panel}>
                <h3 className={styles.panelTitlePlain}>Resumo do pedido</h3>
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
              </div>

              <Button onClick={handleConfirm} fullWidth size="lg" className={styles.confirmBtn}>
                {confirmLabel}
              </Button>
              <Button variant="outline" onClick={prev} fullWidth leftIcon="arrow-left">
                {isPickup ? 'Voltar' : 'Voltar para o frete'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL PIX */}
      <Modal
        open={showPix}
        onClose={() => setShowPix(false)}
        size="sm"
        title={
          <span className={styles.modalTitle}>
            <Icon name="pix" size={22} className={styles.pixTitleIcon} />
            Pagamento PIX
          </span>
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setShowPix(false)} disabled={submitting}>
              Fechar
            </Button>
            <Button onClick={finishOrder} loading={submitting}>
              Ir para o pagamento
            </Button>
          </>
        }
      >
        <div className={styles.pixQrWrap}>
          <div className={styles.pixQr} aria-label="QR Code PIX">
            <Icon name="pix" size={64} className={styles.pixQrIcon} />
          </div>
        </div>

        <div className={styles.modalInfo}>
          <div className={styles.modalInfoRow}>
            <span>Valor:</span>
            <strong>{BRL.format(total)}</strong>
          </div>
          <div className={styles.modalInfoRow}>
            <span>Método:</span>
            <span>PIX</span>
          </div>
          <div className={styles.modalInfoRow}>
            <span>Status:</span>
            <Badge variant="neutral" size="sm">Aguardando pagamento</Badge>
          </div>
        </div>

        <ol className={styles.pixSteps}>
          <li>Clique em &quot;Ir para o pagamento&quot;</li>
          <li>O QR Code e o Copia e Cola são gerados no Mercado Pago</li>
          <li>Confirme o pagamento no app do seu banco</li>
        </ol>
        <p className={styles.pixHint}>O pagamento será confirmado automaticamente!</p>
      </Modal>

      {/* MODAL CARTÃO */}
      <Modal
        open={showCard}
        onClose={() => setShowCard(false)}
        size="sm"
        title={
          <span className={styles.modalTitle}>
            <Icon name="card" size={22} className={styles.payIconBlue} />
            Cartão de Crédito
          </span>
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCard(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={finishOrder} loading={submitting}>
              Ir para o pagamento
            </Button>
          </>
        }
      >
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
      </Modal>

      {/* MODAL BOLETO */}
      <Modal
        open={showBoleto}
        onClose={() => setShowBoleto(false)}
        size="md"
        title={
          <span className={styles.modalTitle}>
            <Icon name="barcode" size={22} className={styles.payIconOrange} />
            Boleto Bancário
          </span>
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setShowBoleto(false)} disabled={submitting}>
              Fechar
            </Button>
            <Button onClick={finishOrder} loading={submitting}>
              Ir para o pagamento
            </Button>
          </>
        }
      >
        {submitting ? (
          <div className={styles.loadingBox}>
            <Spinner size={32} />
            <p>Redirecionando para o pagamento seguro...</p>
          </div>
        ) : (
          <>
            <div className={styles.boletoBanner}>
              <Icon name="barcode" size={22} className={styles.confirmIcon} />
              <div>
                <div className={styles.confirmTitle}>Boleto pelo Mercado Pago</div>
                <div className={styles.confirmLine}>
                  A linha digitável será emitida na próxima etapa, com vencimento em 3 dias úteis.
                </div>
              </div>
            </div>

            <div className={styles.barcodeStrip} aria-hidden="true">
              <Icon name="barcode" size={48} />
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
    </main>
  );
}
