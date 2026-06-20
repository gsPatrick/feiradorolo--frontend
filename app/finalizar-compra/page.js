'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { cx } from '@/lib/cx';
import { useCart } from '@/components/providers/CartProvider';
import { useToast } from '@/components/providers/ToastProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { addressService, couponService, shipmentService, orderService } from '@/lib/api';
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

const SHIPPING_OPTIONS = [
  { id: 'pac', name: 'PAC', company: 'Correios', price: 14.8, deliveryTime: '5-8 dias úteis' },
  { id: 'sedex', name: 'SEDEX', company: 'Correios', price: 25.9, deliveryTime: '2-3 dias úteis' },
  { id: 'jadlog', name: 'Expresso', company: 'Jadlog', price: 21.7, deliveryTime: '3-5 dias úteis' },
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

const PIX_MOCK_CODE =
  '00020126580014br.gov.bcb.pix0136a1f3c4e2-9b8d-47a6-bc12-feiradorolo520400005303986540' +
  '5XXXXX5802BR5913FEIRA DO ROLO6009SAO PAULO62070503***6304ABCD';

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

  // Frete
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingFallback, setShippingFallback] = useState(null);
  const [selectedShippingId, setSelectedShippingId] = useState('pac');

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
    () => SHIPPING_OPTIONS.find((o) => o.id === selectedShippingId) || null,
    [selectedShippingId]
  );

  const shippingCost = isPickup
    ? 0
    : shippingFallback != null
    ? shippingFallback
    : selectedShipping
    ? selectedShipping.price
    : 0;
  const discount = Math.min(couponDiscount, totalPrice);
  const total = Math.max(0, totalPrice - discount + shippingCost);
  const boletoCode = '34191.79001 01043.510047 91020.150008 9 99990000' +
    String(Math.round(total * 100)).padStart(8, '0');

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
    setShippingFallback(null);
    setSelectedShippingId((id) => id || 'pac');
    const toZip = (selectedAddress?.cep || '').replace(/\D/g, '');
    try {
      const quote = await shipmentService.quote({
        from_zip: '01001000',
        to_zip: toZip,
        weight: Math.max(0.3, totalItems * 0.5),
      });
      const price = quote?.price ?? quote?.cost ?? quote?.value;
      // Cotação OK: usa o valor; vazio/erro cai no fallback (frete grátis).
      setShippingFallback(price != null ? Number(price) : 0);
    } catch {
      setShippingFallback(0); // provider indisponível → frete grátis (não bloqueia o checkout)
    } finally {
      setShippingLoading(false);
    }
  }

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
      // Na retirada presencial o endereço é opcional e não há cotação de frete.
      if (!isPickup) {
        if (!selectedAddress) {
          toast({
            title: 'Endereço obrigatório',
            description: 'Selecione ou preencha um endereço para continuar.',
            variant: 'destructive',
          });
          return;
        }
        loadShipping();
      }
    } else if (currentStep === 2) {
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

  async function finishOrder() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const created = await orderService.checkout({
        items: items.map((i) => ({ product_id: i.id, quantity: i.qty || i.quantity || 1 })),
        coupon_code: couponApplied || undefined,
        // Na retirada presencial o endereço é opcional.
        address_id:
          !isPickup && addressMode === 'saved' ? selectedAddressId || undefined : undefined,
        delivery_method: deliveryMethod,
      });
      const orders = Array.isArray(created) ? created : created ? [created] : [];
      const orderId = orders[0]?.id;
      setShowPix(false);
      setShowCard(false);
      setShowBoleto(false);
      toast({
        title: 'Pedido confirmado!',
        description: 'Seu pagamento foi processado com sucesso.',
        variant: 'success',
      });
      if (typeof clear === 'function') clear();
      router.push(`/pedido-confirmado/${orderId ?? ''}`);
    } catch (e) {
      toast({
        title: 'Não foi possível finalizar o pedido',
        description: e?.message,
        variant: 'destructive',
      });
    } finally {
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
      setSubmitting(true);
      setShowBoleto(true);
      setTimeout(() => setSubmitting(false), 800);
    }
  }

  function copyToClipboard(text, label) {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      toast({ title: label || 'Copiado!', variant: 'success', duration: 2000 });
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
        {/* ETAPA 1 — ENDEREÇO */}
        {currentStep === 1 && (
          <div className={styles.stepBody}>
            <header className={styles.stepHeader}>
              <h1 className={styles.stepH1}>Como você quer receber seus produtos?</h1>
              <p className={styles.stepLead}>Escolha o método de entrega.</p>
            </header>

            {/* Seletor de método de entrega */}
            <div className={styles.deliveryTabs}>
              <button
                type="button"
                className={cx(styles.deliveryTab, !isPickup && styles.deliveryTabActive)}
                onClick={() => setDeliveryMethod('shipping')}
              >
                <span className={styles.deliveryEmoji}>📦</span>
                <span className={styles.deliveryBody}>
                  <span className={styles.deliveryName}>Envio (Melhor Envio)</span>
                  <span className={styles.deliverySub}>Receba em casa pelos Correios ou transportadora</span>
                </span>
              </button>
              <button
                type="button"
                className={cx(styles.deliveryTab, isPickup && styles.deliveryTabActive)}
                onClick={() => setDeliveryMethod('pickup')}
              >
                <span className={styles.deliveryEmoji}>🤝</span>
                <span className={styles.deliveryBody}>
                  <span className={styles.deliveryName}>Retirada presencial</span>
                  <span className={styles.deliverySub}>Combine o encontro com o vendedor pelo chat</span>
                </span>
              </button>
            </div>

            {isPickup && (
              <div className={styles.pickupNote}>
                <Icon name="shield" size={18} className={styles.pickupIcon} />
                <div>
                  <div className={styles.pickupTitle}>Retirada presencial</div>
                  <div className={styles.pickupLine}>
                    Combine a retirada com o vendedor pelo chat. Um código de 6 dígitos será gerado
                    para liberar o pagamento no encontro.
                  </div>
                  <div className={styles.pickupWarn}>
                    ⚠️ Encontre-se em local público e movimentado.
                  </div>
                </div>
              </div>
            )}

            {!isPickup && (
            <>
            <p className={styles.stepLead} style={{ textAlign: 'center' }}>
              Para onde devemos enviar seus produtos?
            </p>

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
            </>
            )}

            <div className={styles.navCenter}>
              <Button
                onClick={next}
                disabled={!isPickup && !selectedAddress}
                size="lg"
                rightIcon="arrow-right"
              >
                {isPickup ? 'Continuar para o pagamento' : 'Continuar para o frete'}
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
              <h1 className={styles.stepH1}>Escolha o método de entrega</h1>
              <p className={styles.stepLead}>Selecione como você quer receber seus produtos.</p>
            </header>

            <div className={styles.confirmBox}>
              <Icon name="check" size={18} className={styles.confirmIcon} />
              <div>
                <div className={styles.confirmTitle}>Endereço confirmado</div>
                <div className={styles.confirmLine}>
                  {selectedAddress?.street}, {selectedAddress?.number}
                  {selectedAddress?.complement && ` - ${selectedAddress.complement}`}
                </div>
                <div className={styles.confirmLine}>
                  {selectedAddress?.neighborhood}, {selectedAddress?.city} - {selectedAddress?.state}
                </div>
              </div>
            </div>

            {shippingLoading ? (
              <div className={styles.loadingBox}>
                <Spinner size={32} />
                <p>Calculando opções de frete...</p>
              </div>
            ) : (
              <div className={styles.panel}>
                <h3 className={styles.panelTitle}>
                  <Icon name="truck" size={20} className={styles.panelIcon} />
                  Opções de entrega
                </h3>
                <div className={styles.shippingList}>
                  {SHIPPING_OPTIONS.map((opt) => {
                    const sel = selectedShippingId === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        className={cx(styles.shippingRow, sel && styles.shippingRowSel)}
                        onClick={() => setSelectedShippingId(opt.id)}
                      >
                        <span className={styles.shippingLeft}>
                          <span className={cx(styles.radio, sel && styles.radioOn)}>
                            {sel && <span className={styles.radioDot} />}
                          </span>
                          <span>
                            <span className={styles.shippingName}>{opt.name}</span>
                            <span className={styles.shippingSub}>{opt.company}</span>
                            <span className={styles.shippingSub}>{opt.deliveryTime}</span>
                          </span>
                        </span>
                        <span className={styles.shippingPrice}>
                          {opt.price === 0 ? 'GRÁTIS' : BRL.format(opt.price)}
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
              <Button onClick={next} disabled={!selectedShipping} size="lg" rightIcon="arrow-right">
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
                      <div className={styles.reviewStrong}>{selectedShipping?.name}</div>
                      <div className={styles.reviewSub}>{selectedShipping?.company}</div>
                      <div className={styles.reviewSub}>{selectedShipping?.deliveryTime}</div>
                      <div className={styles.reviewShip}>
                        Frete: {shippingCost === 0 ? 'GRÁTIS' : BRL.format(shippingCost)}
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
            <Button variant="outline" onClick={() => setShowPix(false)}>
              Fechar
            </Button>
            <Button onClick={finishOrder}>Confirmar Pagamento</Button>
          </>
        }
      >
        <div className={styles.pixQrWrap}>
          <div className={styles.pixQr} aria-label="QR Code PIX (mock)">
            <Icon name="grid" size={64} className={styles.pixQrIcon} />
          </div>
        </div>

        <label className={styles.label}>Código PIX (Copia e Cola)</label>
        <div className={styles.copyRow}>
          <Input value={PIX_MOCK_CODE} readOnly className={styles.copyInput} />
          <Button variant="outline" onClick={() => copyToClipboard(PIX_MOCK_CODE, 'Código PIX copiado!')}>
            Copiar
          </Button>
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
          <li>Abra o app do seu banco</li>
          <li>Escaneie o QR Code ou cole o código PIX</li>
          <li>Confirme o pagamento</li>
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
            <Button variant="outline" onClick={() => setShowCard(false)}>
              Cancelar
            </Button>
            <Button onClick={finishOrder}>Pagar com Cartão</Button>
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
            <Button variant="outline" onClick={() => setShowBoleto(false)}>
              Fechar
            </Button>
            <Button onClick={finishOrder} disabled={submitting}>
              Confirmar Pedido
            </Button>
          </>
        }
      >
        {submitting ? (
          <div className={styles.loadingBox}>
            <Spinner size={32} />
            <p>Gerando seu boleto...</p>
          </div>
        ) : (
          <>
            <div className={styles.boletoBanner}>
              <Icon name="check" size={22} className={styles.confirmIcon} />
              <div>
                <div className={styles.confirmTitle}>Boleto gerado com sucesso!</div>
                <div className={styles.confirmLine}>Vencimento em 3 dias úteis.</div>
              </div>
            </div>

            <label className={styles.label}>Linha digitável</label>
            <div className={styles.copyRow}>
              <Input value={boletoCode} readOnly className={styles.copyInput} />
              <Button variant="outline" onClick={() => copyToClipboard(boletoCode, 'Linha digitável copiada!')}>
                Copiar
              </Button>
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
