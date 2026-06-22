'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { cx } from '@/lib/cx';
import { productService, configService, shipmentService, getToken, ApiError } from '@/lib/api';
import { useToast } from '@/components/providers/ToastProvider';
import Button from '@/components/atoms/Button/Button';
import Input from '@/components/atoms/Input/Input';
import Textarea from '@/components/atoms/Textarea/Textarea';
import Select from '@/components/atoms/Select/Select';
import Icon from '@/components/atoms/Icon/Icon';
import ImageUploader from '@/components/molecules/ImageUploader/ImageUploader';
import ProductSpecifications from '@/components/molecules/ProductSpecifications/ProductSpecifications';
import CategoryPicker from '@/components/organisms/CategoryPicker/CategoryPicker';
import HighlightPurchase from '@/components/organisms/HighlightPurchase/HighlightPurchase';

const EMPTY_FORM = {
  title: '',
  description: '',
  price: '',
  stock: '',
  condition: 'new',
  categoryId: null,
  packageWeight: '',
  packageWidth: '',
  packageHeight: '',
  packageLength: '',
  platformFee: '10',
  shippingMethods: [],
  specifications: {},
  customOrder: false,
  customOrderDays: '3',
  allowPickup: false,
};

const SHIPPING_METHODS = [
  { id: 'correios-pac', name: 'Correios PAC', icon: '📦', description: 'Mais econômico, 8-12 dias úteis' },
  { id: 'correios-sedex', name: 'Correios SEDEX', icon: '🚀', description: 'Mais rápido, 1-3 dias úteis' },
  { id: 'jadlog', name: 'Jadlog', icon: '🚛', description: 'Econômico, 5-10 dias úteis' },
  { id: 'jt-express', name: 'J&T Express', icon: '⚡', description: 'Rápido e econômico, 3-7 dias úteis' },
  { id: 'loggi', name: 'Loggi', icon: '🏍️', description: 'Same day (regiões metropolitanas)' },
  { id: 'via-brasil', name: 'Via Brasil', icon: '🚐', description: 'Econômico, 7-15 dias úteis' },
];

const STEPS = 3;

export default function AdicionarProdutoPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState(EMPTY_FORM);
  const [images, setImages] = useState([]);
  const [categoryPath, setCategoryPath] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Transportadoras reais do Melhor Envio (com fallback para a lista fixa em caso de erro).
  const [carriers, setCarriers] = useState(SHIPPING_METHODS);
  useEffect(() => {
    shipmentService
      .carriers()
      .then((list) => {
        if (Array.isArray(list) && list.length) {
          setCarriers(
            list.map((c) => ({
              id: c.code,
              name: c.name,
              description: c.description || c.company || 'Calculado pelo Melhor Envio',
              picture: c.picture,
              company: c.company,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  // Geolocalização (opcional — exigida por algumas categorias).
  const [geo, setGeo] = useState({ latitude: null, longitude: null });
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoRequired, setGeoRequired] = useState(false);
  const geoRef = useRef(null);

  // Modal de plano exigido pela categoria (PLAN_REQUIRED).
  const [planModal, setPlanModal] = useState(false);

  // Upsell de destaque pós-publicação.
  const [createdProduct, setCreatedProduct] = useState(null);
  const [highlightPaid, setHighlightPaid] = useState(false);

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  function captureLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      toast({ title: 'Geolocalização indisponível neste navegador.', variant: 'destructive' });
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
        });
        setGeoRequired(false);
        setGeoLoading(false);
        toast({ title: 'Localização capturada!', variant: 'success', duration: 2500 });
      },
      (err) => {
        setGeoLoading(false);
        toast({
          title: 'Não foi possível obter sua localização',
          description: err && err.message ? err.message : 'Permita o acesso à localização e tente novamente.',
          variant: 'destructive',
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function clearLocation() {
    setGeo({ latitude: null, longitude: null });
  }

  function goToUpgrade() {
    setPlanModal(false);
    router.push('/upgrade-conta');
  }

  // Pagamento aprovado do destaque (callback do HighlightPurchase).
  function onHighlightPaid() {
    setHighlightPaid(true);
    toast({ title: 'Destaque ativado!', description: 'Seu produto agora aparece em destaque.', variant: 'success', duration: 3500 });
  }

  function goToMyProducts() {
    setCreatedProduct(null);
    router.push('/minha-conta?tab=meus-produtos');
  }

  // Comissão padrão real (refletindo o que o admin edita no painel).
  const [stdFee, setStdFee] = useState(10);
  useEffect(() => {
    configService.fees().then((f) => f && f.commission_percent != null && setStdFee(Number(f.commission_percent))).catch(() => {});
  }, []);

  const feePercent = form.platformFee === '15' ? 0.15 : stdFee / 100;
  const price = Number(form.price) || 0;

  const categoryLabel = categoryPath.map((c) => c.name).join(' → ');
  const categoryIcon = categoryPath.length ? categoryPath[categoryPath.length - 1].icon || categoryPath[0].icon : null;

  function toggleShipping(id) {
    set({
      shippingMethods: form.shippingMethods.includes(id)
        ? form.shippingMethods.filter((m) => m !== id)
        : [...form.shippingMethods, id],
    });
  }

  function handleConfirmCategory(node, path) {
    set({ categoryId: node.id });
    setCategoryPath(path);
    setShowCategoryModal(false);
    toast({ title: `Categoria selecionada: ${node.name}`, variant: 'success', duration: 2500 });
  }

  function next() {
    if (currentStep < STEPS) setCurrentStep(currentStep + 1);
  }
  function prev() {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  }

  async function handleSubmit() {
    if (!form.title || !form.price || !form.stock) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha título, preço e estoque antes de publicar.',
        variant: 'destructive',
      });
      return;
    }
    if (!form.categoryId) {
      toast({ title: 'Selecione uma categoria na Etapa 1.', variant: 'destructive' });
      return;
    }
    if (!getToken()) {
      toast({ title: 'Faça login para publicar seu produto.', variant: 'destructive' });
      router.push('/login');
      return;
    }

    const payload = {
      title: form.title.trim(),
      description: form.description,
      price: Number(form.price) || 0,
      stock: Number(form.stock) || 0,
      condition: form.condition,
      category_id: form.categoryId,
      specifications: form.specifications,
      images: images.map((im) => im.preview),
      requires_shipping: true,
      ...(geo.latitude != null && geo.longitude != null
        ? { latitude: geo.latitude, longitude: geo.longitude }
        : {}),
      ...(form.city ? { city: form.city } : {}),
      ...(form.state ? { state: form.state } : {}),
      weight_grams: form.packageWeight ? Math.round(Number(form.packageWeight) * 1000) : null,
      dimensions: {
        width: Number(form.packageWidth) || null,
        height: Number(form.packageHeight) || null,
        length: Number(form.packageLength) || null,
      },
      metadata: {
        platform_fee: form.platformFee,
        shipping_methods: form.shippingMethods,
        save_shipping_as_default: saveAsDefault,
        custom_order: form.customOrder,
        custom_order_days: form.customOrder ? Number(form.customOrderDays) : null,
        allow_pickup: form.allowPickup,
      },
    };

    setSubmitting(true);
    try {
      const product = await productService.create(payload);
      toast({
        title: 'Produto criado com sucesso!',
        description: `"${product?.title || form.title}" foi publicado.`,
        variant: 'success',
      });
      // Em vez de redirecionar direto, abre o upsell de destaque.
      setCreatedProduct({ id: product?.id, title: product?.title || form.title });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'GEO_REQUIRED') {
        setGeoRequired(true);
        toast({
          title: 'Localização obrigatória',
          description: 'Esta categoria exige geolocalização. Use "Usar minha localização" na Etapa 2.',
          variant: 'destructive',
          duration: 6000,
        });
        setCurrentStep(2);
        // Rola até a seção de geo após renderizar a etapa.
        setTimeout(() => {
          if (geoRef.current) geoRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 120);
      } else if (err instanceof ApiError && err.code === 'PLAN_REQUIRED') {
        setPlanModal(true);
        toast({
          title: 'Plano necessário',
          description: 'Esta categoria exige um plano ativo para publicar produtos.',
          variant: 'destructive',
          duration: 6000,
        });
      } else {
        toast({
          title: 'Erro ao criar produto',
          description: err instanceof ApiError ? err.message : 'Tente novamente.',
          variant: 'destructive',
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <h1 className={styles.cardTitle}>Adicionar Produto — Passo {currentStep} de {STEPS}</h1>
          </div>

          <div className={styles.cardBody}>
            {/* Indicadores de passo */}
            <div className={styles.steps}>
              {[1, 2, 3].map((step) => (
                <div key={step} className={styles.stepWrap}>
                  <div className={cx(styles.stepDot, currentStep >= step && styles.stepActive)}>{step}</div>
                  {step < STEPS && <div className={cx(styles.stepBar, currentStep > step && styles.stepBarActive)} />}
                </div>
              ))}
            </div>

            {/* ETAPA 1: BÁSICO */}
            {currentStep === 1 && (
              <div className={styles.section}>
                <h2 className={styles.stepTitle}>ETAPA 1: BÁSICO</h2>

                <div className={styles.field}>
                  <label className={styles.label}>Nome do Produto *</label>
                  <Input
                    value={form.title}
                    onChange={(e) => set({ title: e.target.value })}
                    placeholder="Ex: iPhone 13 Pro Max 256GB"
                  />
                  <p className={styles.hint}>Seja específico para melhor visibilidade</p>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Categoria *</label>
                  <button
                    type="button"
                    className={styles.categoryBtn}
                    onClick={() => setShowCategoryModal(true)}
                    title={categoryLabel}
                  >
                    {form.categoryId && categoryPath.length ? (
                      <span className={styles.categorySelected}>
                        {categoryIcon && <span className={styles.categoryEmoji}>{categoryIcon}</span>}
                        <span className={styles.categoryText}>{categoryLabel}</span>
                      </span>
                    ) : (
                      <span className={styles.categoryPlaceholder}>Clique para selecionar categoria</span>
                    )}
                  </button>
                  {form.title.length > 3 && (
                    <div className={styles.suggestBox}>
                      <p className={styles.suggestTitle}>💡 Sugestões automáticas</p>
                      <p className={styles.suggestText}>
                        Baseado no nome do produto, sugerimos verificar as categorias relacionadas
                      </p>
                    </div>
                  )}
                </div>

                <ImageUploader images={images} onChange={setImages} />
              </div>
            )}

            {/* ETAPA 2: DETALHES */}
            {currentStep === 2 && (
              <div className={styles.section}>
                <h2 className={styles.stepTitle}>ETAPA 2: DETALHES</h2>

                <div className={styles.field}>
                  <label className={styles.label}>Descrição *</label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => set({ description: e.target.value })}
                    placeholder="Descreva características importantes, estado do produto, o que inclui na caixa..."
                  />
                  <p className={styles.hint}>Descrições detalhadas aumentam as vendas em 40%</p>
                </div>

                {/* Características específicas */}
                <div className={styles.panel}>
                  <h3 className={styles.panelTitle}>Características Específicas</h3>
                  {form.categoryId ? (
                    <div className={styles.field}>
                      <p className={styles.categoryRef}>
                        Categoria: <strong>{categoryLabel}</strong>
                      </p>
                      <label className={styles.label}>Condição</label>
                      <Select
                        value={form.condition}
                        onChange={(e) => set({ condition: e.target.value })}
                        options={[
                          { value: 'new', label: 'Novo' },
                          { value: 'used', label: 'Usado' },
                          { value: 'refurbished', label: 'Recondicionado' },
                        ]}
                      />
                    </div>
                  ) : (
                    <p className={styles.hint}>
                      Selecione uma categoria na etapa anterior para ver campos específicos
                    </p>
                  )}
                </div>

                {/* Especificações dinâmicas */}
                {form.categoryId && (
                  <div className={styles.panel}>
                    <h3 className={styles.panelTitle}>Especificações do Produto</h3>
                    <ProductSpecifications
                      categoryId={form.categoryId}
                      values={form.specifications}
                      onChange={(specs) => set({ specifications: specs })}
                    />
                  </div>
                )}

                {/* Localização (opcional / exigida por algumas categorias) */}
                <div
                  ref={geoRef}
                  className={cx(styles.geoBox, geoRequired && styles.geoBoxRequired)}
                >
                  <div className={styles.geoHead}>
                    <Icon name="map-pin" size={18} className={styles.info} />
                    <h3 className={styles.panelTitle}>Localização (entrega)</h3>
                  </div>
                  <p className={styles.hint}>
                    Capture sua localização para anúncios com retirada/entrega local. Algumas
                    categorias exigem geolocalização para publicar.
                  </p>
                  <div className={styles.geoRow}>
                    <Button variant="outline" size="sm" onClick={captureLocation} loading={geoLoading}>
                      {geoLoading ? 'Capturando...' : 'Usar minha localização'}
                    </Button>
                    {geo.latitude != null && geo.longitude != null && (
                      <>
                        <span className={styles.geoCoords}>
                          📍 {geo.latitude}, {geo.longitude}
                        </span>
                        <button type="button" className={styles.geoClear} onClick={clearLocation}>
                          Limpar
                        </button>
                      </>
                    )}
                  </div>
                  {geoRequired && geo.latitude == null && (
                    <p className={styles.geoWarn}>Esta categoria exige geolocalização para publicar.</p>
                  )}
                </div>

                {/* Dados de envio */}
                <div className={styles.field}>
                  <h3 className={styles.panelTitle}>Dados de Envio (Peso/Dimensões)</h3>
                  <div className={styles.dimsGrid}>
                    <div>
                      <label className={styles.labelSm}>Peso (kg) *</label>
                      <Input type="number" step="0.1" value={form.packageWeight}
                        onChange={(e) => set({ packageWeight: e.target.value })} placeholder="1.0" />
                    </div>
                    <div>
                      <label className={styles.labelSm}>Largura (cm) *</label>
                      <Input type="number" value={form.packageWidth}
                        onChange={(e) => set({ packageWidth: e.target.value })} placeholder="20" />
                    </div>
                    <div>
                      <label className={styles.labelSm}>Altura (cm) *</label>
                      <Input type="number" value={form.packageHeight}
                        onChange={(e) => set({ packageHeight: e.target.value })} placeholder="15" />
                    </div>
                    <div>
                      <label className={styles.labelSm}>Comprimento (cm) *</label>
                      <Input type="number" value={form.packageLength}
                        onChange={(e) => set({ packageLength: e.target.value })} placeholder="25" />
                    </div>
                  </div>
                  <p className={styles.hintXs}>Dados precisos reduzem problemas de entrega</p>
                </div>

                {/* Métodos de envio */}
                <div className={styles.field}>
                  <div className={styles.shipHead}>
                    <div className={styles.shipHeadLabel}>
                      <Icon name="truck" size={18} className={styles.info} />
                      <h3 className={styles.panelTitle}>Métodos de Envio Disponíveis</h3>
                    </div>
                    <div className={styles.shipActions}>
                      <Button variant="outline" size="sm"
                        onClick={() => set({ shippingMethods: carriers.map((m) => m.id) })}>
                        Selecionar Todos
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => set({ shippingMethods: [] })}>
                        Limpar
                      </Button>
                    </div>
                  </div>
                  <p className={styles.hint}>
                    Selecione quais transportadoras você deseja oferecer para este produto. Os preços
                    serão calculados automaticamente pelo Melhor Envio.
                  </p>

                  <div className={styles.shipGrid}>
                    {carriers.map((method) => {
                      const active = form.shippingMethods.includes(method.id);
                      return (
                        <button
                          key={method.id}
                          type="button"
                          className={cx(styles.shipCard, active && styles.shipCardActive)}
                          onClick={() => toggleShipping(method.id)}
                        >
                          <span className={styles.shipInfo}>
                            {method.picture ? (
                              <img
                                src={method.picture}
                                alt={method.name}
                                className={styles.shipIcon}
                                style={{ objectFit: 'contain' }}
                              />
                            ) : (
                              <span className={styles.shipIcon}>{method.icon}</span>
                            )}
                            <span>
                              <span className={styles.shipName}>{method.name}</span>
                              <span className={styles.shipDesc}>{method.description}</span>
                            </span>
                          </span>
                          <span className={cx(styles.shipCheck, active && styles.shipCheckActive)}>
                            {active && <span className={styles.shipDot} />}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {form.shippingMethods.length === 0 ? (
                    <div className={styles.warnBox}>
                      <Icon name="package" size={16} className={styles.warnIcon} />
                      <div>
                        <p className={styles.warnTitle}>Selecione pelo menos um método de envio</p>
                        <p className={styles.warnText}>
                          Recomendamos oferecer PAC + SEDEX para mais opções aos compradores
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className={styles.okBox}>
                        <p className={styles.okTitle}>✅ {form.shippingMethods.length} método(s) selecionado(s)</p>
                        <p className={styles.okText}>
                          Os compradores poderão escolher entre as opções selecionadas durante a compra
                        </p>
                      </div>
                      <div className={styles.defaultBox}>
                        <input
                          id="saveAsDefault"
                          type="checkbox"
                          checked={saveAsDefault}
                          onChange={(e) => setSaveAsDefault(e.target.checked)}
                          className={styles.defaultCheck}
                        />
                        <div>
                          <label htmlFor="saveAsDefault" className={styles.defaultLabel}>
                            Usar estes métodos em todas as minhas vendas
                          </label>
                          <p className={styles.defaultText}>
                            Marque esta opção para que os métodos selecionados sejam aplicados
                            automaticamente em todos os seus próximos produtos, economizando tempo no cadastro.
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Retirada presencial */}
                <div className={styles.panel}>
                  <h3 className={styles.panelTitleSm}>Retirada presencial</h3>
                  <div className={styles.defaultBox}>
                    <input
                      id="allowPickup"
                      type="checkbox"
                      checked={form.allowPickup}
                      onChange={(e) => set({ allowPickup: e.target.checked })}
                      className={styles.defaultCheck}
                    />
                    <div>
                      <label htmlFor="allowPickup" className={styles.defaultLabel}>
                        Aceitar retirada presencial (entrega em mãos)
                      </label>
                      <p className={styles.defaultText}>
                        O comprador pode combinar a retirada com você; um código de 6 dígitos
                        protege a entrega.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sob encomenda */}
                <div className={styles.panel}>
                  <h3 className={styles.panelTitleSm}>Sob encomenda</h3>
                  <div className={styles.radioRow}>
                    <label className={styles.radio}>
                      <input type="radio" name="customOrder" checked={!form.customOrder}
                        onChange={() => set({ customOrder: false })} />
                      <span>Não</span>
                    </label>
                    <label className={styles.radio}>
                      <input type="radio" name="customOrder" checked={form.customOrder}
                        onChange={() => set({ customOrder: true })} />
                      <span>Sim</span>
                    </label>
                  </div>
                  {!form.customOrder ? (
                    <p className={styles.hintXs}>Enviarei conforme a política de prazo de envio dos pedidos.</p>
                  ) : (
                    <div className={styles.customDays}>
                      <span>Eu preciso de</span>
                      <Input
                        type="number"
                        min="3"
                        max="15"
                        value={form.customOrderDays}
                        onChange={(e) => set({ customOrderDays: e.target.value })}
                        onBlur={(e) => {
                          const v = parseInt(e.target.value, 10);
                          if (e.target.value === '' || isNaN(v) || v < 3) set({ customOrderDays: '3' });
                          else if (v > 15) set({ customOrderDays: '15' });
                          else set({ customOrderDays: String(v) });
                        }}
                        className={styles.daysInput}
                        wrapperClassName={styles.daysWrapper}
                      />
                      <span>dias para postar o pedido (Você pode preencher entre 3 e 15)</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ETAPA 3: FINANCEIRO */}
            {currentStep === 3 && (
              <div className={styles.section}>
                <h2 className={styles.stepTitle}>ETAPA 3: FINANCEIRO</h2>

                <div className={styles.priceGrid}>
                  <div>
                    <label className={styles.label}>Preço de Venda (R$) *</label>
                    <Input type="number" step="0.01" value={form.price}
                      onChange={(e) => set({ price: e.target.value })} placeholder="99.90" className={styles.bigInput} />
                  </div>
                  <div>
                    <label className={styles.label}>Estoque Disponível *</label>
                    <Input type="number" value={form.stock}
                      onChange={(e) => set({ stock: e.target.value })} placeholder="10" className={styles.bigInput} />
                  </div>
                </div>

                {/* Escolha de taxa */}
                <div className={styles.feeBox}>
                  <h3 className={styles.feeTitle}>Escolha sua Taxa de Plataforma</h3>
                  <div className={styles.feeGrid}>
                    <button
                      type="button"
                      className={cx(styles.feeCard, form.platformFee === '10' && styles.feeCardActive)}
                      onClick={() => set({ platformFee: '10' })}
                    >
                      <div className={styles.feeCardHead}>
                        <h4>Taxa Padrão</h4>
                        <span className={styles.feeBadgeBlue}>{stdFee}%</span>
                      </div>
                      <p className={styles.feeCardSub}>Mais lucro para você</p>
                      <ul className={styles.feeList}>
                        <li>• Suporte básico</li>
                        <li>• Ferramentas padrão</li>
                        <li>• Visibilidade normal</li>
                      </ul>
                    </button>

                    <button
                      type="button"
                      className={cx(styles.feeCard, form.platformFee === '15' && styles.feeCardActive)}
                      onClick={() => set({ platformFee: '15' })}
                    >
                      <div className={styles.feeCardHead}>
                        <h4>Taxa Premium</h4>
                        <span className={styles.feeBadgeOrange}>15%</span>
                      </div>
                      <p className={styles.feeCardSub}>Mais recursos e visibilidade</p>
                      <ul className={styles.feeList}>
                        <li>• Suporte prioritário</li>
                        <li>• Ferramentas avançadas</li>
                        <li>• Destaque nos resultados</li>
                      </ul>
                    </button>
                  </div>
                </div>

                {/* Preview de ganhos */}
                {form.price && (
                  <div className={styles.earnBox}>
                    <h3 className={styles.earnTitle}>💰 Preview dos Seus Ganhos</h3>
                    <div className={styles.earnRows}>
                      <div className={styles.earnRow}>
                        <span>Preço do produto:</span>
                        <span className={styles.earnStrong}>R$ {price.toFixed(2)}</span>
                      </div>
                      <div className={cx(styles.earnRow, styles.earnFee)}>
                        <span>Taxa da plataforma ({(feePercent * 100).toFixed(0)}%):</span>
                        <span>- R$ {(price * feePercent).toFixed(2)}</span>
                      </div>
                      <div className={styles.earnTotal}>
                        <span>Você recebe:</span>
                        <span>R$ {(price * (1 - feePercent)).toFixed(2)}</span>
                      </div>
                    </div>
                    {form.stock && (
                      <p className={styles.earnPotential}>
                        Com {form.stock} unidades, seu potencial de faturamento é de{' '}
                        <strong>R$ {(price * Number(form.stock) * (1 - feePercent)).toFixed(2)}</strong>
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Navegação */}
            <div className={styles.nav}>
              {currentStep > 1 && (
                <Button variant="outline" onClick={prev}>
                  Anterior
                </Button>
              )}
              {currentStep < STEPS ? (
                <Button onClick={next} className={styles.navRight}>
                  Próximo
                </Button>
              ) : (
                <Button onClick={handleSubmit} loading={submitting} className={styles.navRight}>
                  {submitting ? 'Publicando...' : 'Publicar Produto'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <CategoryPicker
        open={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onConfirm={handleConfirmCategory}
      />

      {/* Modal: categoria exige plano ativo */}
      {planModal && (
        <div className={styles.modalOverlay} onClick={() => setPlanModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Plano necessário</h3>
            <p className={styles.modalText}>
              A categoria selecionada exige um plano ativo para publicar produtos. Contrate um plano
              para liberar a publicação nesta categoria.
            </p>
            <div className={styles.modalActions}>
              <Button variant="outline" onClick={() => setPlanModal(false)}>
                Agora não
              </Button>
              <Button onClick={goToUpgrade}>Ver planos</Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: upsell de destaque pós-publicação (pagamento inline, sem navegar) */}
      {createdProduct && (
        <div className={styles.modalOverlay}>
          <div className={cx(styles.modal, styles.modalWide)} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Destaque seu produto 🚀</h3>
            <p className={styles.modalText}>
              "{createdProduct.title}" foi publicado! Quer aparecer no topo e vender mais rápido?
              Escolha um destaque e pague com Pix aqui mesmo:
            </p>

            <HighlightPurchase
              productId={createdProduct.id}
              productName={createdProduct.title}
              onPaid={onHighlightPaid}
              onClose={goToMyProducts}
            />

            {!highlightPaid && (
              <div className={styles.modalActions}>
                <Button variant="outline" onClick={goToMyProducts}>
                  Pular
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
