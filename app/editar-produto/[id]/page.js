'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import styles from './page.module.css';
import { cx } from '@/lib/cx';
import { productService, shipmentService, getToken, ApiError } from '@/lib/api';
import { useToast } from '@/components/providers/ToastProvider';
import Button from '@/components/atoms/Button/Button';
import Input from '@/components/atoms/Input/Input';
import Textarea from '@/components/atoms/Textarea/Textarea';
import Select from '@/components/atoms/Select/Select';
import Icon from '@/components/atoms/Icon/Icon';
import ImageUploader from '@/components/molecules/ImageUploader/ImageUploader';
import ProductSpecifications from '@/components/molecules/ProductSpecifications/ProductSpecifications';
import CategoryPicker from '@/components/organisms/CategoryPicker/CategoryPicker';
import Modal from '@/components/organisms/Modal/Modal';
import FipeHelper from '@/components/organisms/FipeHelper/FipeHelper';

/** Detecta categoria de veículos pela cadeia selecionada (slug `veiculos` ou nome). */
function isVehicleCategory(path) {
  return (path || []).some((n) => {
    const slug = (n.slug || '').toLowerCase();
    const name = (n.name || '').toLowerCase();
    // Cobre slug `veiculos`/`veiculo-*` e nomes "Veículos"/"Veiculos" (com/sem acento).
    return slug.startsWith('veicul') || name.includes('veícul') || name.includes('veicul');
  });
}

/** "R$ 50.000,00" → 50000 (número) | 0. */
function parseFipeValor(str) {
  return Number(String(str || '').replace(/[^\d,]/g, '').replace(',', '.')) || 0;
}

const SHIPPING_METHODS = [
  { id: 'correios-pac', name: 'Correios PAC', icon: '📦', description: 'Mais econômico, 8-12 dias úteis' },
  { id: 'correios-sedex', name: 'Correios SEDEX', icon: '🚀', description: 'Mais rápido, 1-3 dias úteis' },
  { id: 'jadlog', name: 'Jadlog', icon: '🚛', description: 'Econômico, 5-10 dias úteis' },
  { id: 'jt-express', name: 'J&T Express', icon: '⚡', description: 'Rápido e econômico, 3-7 dias úteis' },
  { id: 'loggi', name: 'Loggi', icon: '🏍️', description: 'Same day (regiões metropolitanas)' },
  { id: 'via-brasil', name: 'Via Brasil', icon: '🚐', description: 'Econômico, 7-15 dias úteis' },
];

const STEPS = 3;

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

/** Mapeia o produto retornado pela API para o estado do formulário desta página. */
function productToForm(p) {
  const meta = p.metadata || {};
  const dims = p.dimensions || {};
  const fee = meta.platform_fee != null ? String(meta.platform_fee) : '10';
  return {
    title: p.title || '',
    description: p.description || '',
    price: p.price != null ? String(p.price) : '',
    stock: p.stock != null ? String(p.stock) : '',
    condition: p.condition || 'new',
    categoryId: p.category_id || (p.category && p.category.id) || null,
    packageWeight: p.weight_grams != null ? String(p.weight_grams / 1000) : '',
    packageWidth: dims.width != null ? String(dims.width) : '',
    packageHeight: dims.height != null ? String(dims.height) : '',
    packageLength: dims.length != null ? String(dims.length) : '',
    platformFee: fee === '15' ? '15' : '10',
    shippingMethods: Array.isArray(meta.shipping_methods) ? meta.shipping_methods : [],
    specifications: p.specifications || {},
    customOrder: !!meta.custom_order,
    customOrderDays: meta.custom_order_days != null ? String(meta.custom_order_days) : '3',
    allowPickup: !!meta.allow_pickup,
  };
}

export default function EditarProdutoPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();

  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState(EMPTY_FORM);
  const [images, setImages] = useState([]);
  const [categoryPath, setCategoryPath] = useState([]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Validação das especificações obrigatórias da categoria.
  const [missingSpecs, setMissingSpecs] = useState([]);
  const [showSpecErrors, setShowSpecErrors] = useState(false);
  const specsRef = useRef(null);

  // Carregamento do produto real.
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

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

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  // Busca o produto real na API e popula o formulário.
  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    setLoadError(null);
    productService
      .getById(id)
      .then((p) => {
        if (!active) return;
        if (!p) {
          setLoadError({ code: 'PRODUCT_NOT_FOUND', message: 'Produto não encontrado.' });
          return;
        }
        setForm(productToForm(p));
        const imgs = Array.isArray(p.images) ? p.images : [];
        setImages(imgs.map((url, i) => ({ id: `existing-${i}`, url, preview: url })));
        const cat = p.category;
        setCategoryPath(cat ? [{ id: cat.id, name: cat.name, icon: cat.icon || null, slug: cat.slug || null }] : []);
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(
          err instanceof ApiError
            ? { code: err.code, status: err.status, message: err.message }
            : { message: 'Erro ao carregar o produto.' }
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const feePercent = form.platformFee === '15' ? 0.15 : 0.1;
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
    set({ categoryId: node.id, specifications: {} });
    setCategoryPath(path);
    setShowCategoryModal(false);
    setShowSpecErrors(false);
    toast({ title: `Categoria selecionada: ${node.name}`, variant: 'success', duration: 2500 });
  }

  // Auxiliar FIPE: preenche marca/modelo/ano e sugere o preço (só se ainda vazio).
  function handleFipeFill({ marca, modelo, ano, valor }) {
    const num = parseFipeValor(valor);
    setForm((prev) => {
      const next = { ...prev, specifications: { ...prev.specifications, marca, modelo, ano } };
      if (num > 0 && !prev.price) next.price = String(num);
      return next;
    });
    toast({
      title: 'Dados da FIPE aplicados',
      description: 'Marca, modelo e ano preenchidos. Confira e ajuste se necessário.',
      variant: 'success',
      duration: 3500,
    });
  }

  const isVehicle = isVehicleCategory(categoryPath);

  // Monta a mensagem amigável listando até 5 campos obrigatórios faltantes.
  function missingSpecsMessage() {
    const labels = missingSpecs.map((m) => m.label);
    const shown = labels.slice(0, 5);
    const extra = labels.length - shown.length;
    return shown.join(', ') + (extra > 0 ? ` e mais ${extra}` : '');
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
        description: 'Preencha título, preço e estoque antes de salvar.',
        variant: 'destructive',
      });
      return;
    }
    if (!form.categoryId) {
      toast({ title: 'Selecione uma categoria na Etapa 1.', variant: 'destructive' });
      return;
    }
    // Especificações obrigatórias da categoria precisam estar preenchidas.
    if (missingSpecs.length > 0) {
      setShowSpecErrors(true);
      toast({
        title: 'Preencha os campos obrigatórios',
        description: `Faltam: ${missingSpecsMessage()}.`,
        variant: 'destructive',
        duration: 6000,
      });
      setCurrentStep(2);
      setTimeout(() => {
        if (specsRef.current) specsRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 120);
      return;
    }
    if (!getToken()) {
      toast({ title: 'Faça login para salvar as alterações.', variant: 'destructive' });
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
      await productService.update(id, payload);
      toast({
        title: 'Alterações salvas com sucesso!',
        description: `"${form.title}" foi atualizado.`,
        variant: 'success',
      });
      router.push('/minha-conta?tab=meus-produtos');
    } catch (err) {
      const notOwner = err instanceof ApiError && (err.status === 403 || err.code === 'NOT_PRODUCT_OWNER');
      toast({
        title: notOwner ? 'Você não pode editar este produto' : 'Erro ao salvar alterações',
        description: notOwner
          ? 'Apenas o dono do anúncio pode editá-lo.'
          : err instanceof ApiError
          ? err.message
          : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    await new Promise((r) => setTimeout(r, 400));
    setDeleting(false);
    setShowDeleteModal(false);
    toast({ title: 'Produto excluído', variant: 'success' });
    router.push('/minha-conta?tab=meus-produtos');
  }

  // Estado de carregamento: não exibe o formulário enquanto busca o produto real.
  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.card}>
            <div className={styles.stateBox}>
              <span className={styles.spinner} aria-hidden="true" />
              <p className={styles.stateText}>Carregando produto...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Estado de erro (404 / 403 / falha de rede) com mensagem amigável e botão de voltar.
  if (loadError) {
    const notOwner = loadError.status === 403 || loadError.code === 'NOT_PRODUCT_OWNER';
    const notFound = loadError.status === 404 || loadError.code === 'PRODUCT_NOT_FOUND';
    const title = notOwner
      ? 'Você não pode editar este produto'
      : notFound
      ? 'Produto não encontrado'
      : 'Erro ao carregar';
    const message = notOwner
      ? 'Apenas o dono do anúncio pode editá-lo.'
      : notFound
      ? 'O produto que você tentou editar não existe ou foi removido.'
      : loadError.message || 'Não foi possível carregar o produto. Tente novamente.';
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.card}>
            <div className={styles.stateBox}>
              <Icon name="package" size={32} className={styles.stateIcon} />
              <h1 className={styles.stateTitle}>{title}</h1>
              <p className={styles.stateText}>{message}</p>
              <Button onClick={() => router.push('/minha-conta?tab=meus-produtos')}>
                Voltar para meus produtos
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.cardHead}>
            <h1 className={styles.cardTitle}>Editar Produto — Passo {currentStep} de {STEPS}</h1>
            <Button
              variant="outline"
              size="sm"
              className={styles.deleteBtn}
              onClick={() => setShowDeleteModal(true)}
            >
              <Icon name="trash" size={16} />
              Excluir produto
            </Button>
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

                {/* Auxiliar FIPE (apenas categorias de veículos) */}
                {form.categoryId && isVehicle && (
                  <FipeHelper active onFill={handleFipeFill} />
                )}

                {/* Especificações dinâmicas */}
                {form.categoryId && (
                  <div className={styles.panel} ref={specsRef}>
                    <h3 className={styles.panelTitle}>Especificações do Produto</h3>
                    <ProductSpecifications
                      categoryId={form.categoryId}
                      values={form.specifications}
                      onChange={(specs) => set({ specifications: specs })}
                      onValidityChange={setMissingSpecs}
                      showErrors={showSpecErrors}
                    />
                  </div>
                )}

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
                        inputMode="numeric"
                        pattern="[0-9]*"
                        min={1}
                        max="15"
                        value={form.customOrderDays}
                        onChange={(e) => set({ customOrderDays: e.target.value.replace(/\D/g, '') })}
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
                        <span className={styles.feeBadgeBlue}>10%</span>
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
                  {submitting ? 'Salvando...' : 'Salvar alterações'}
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

      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Excluir produto"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDelete} loading={deleting}>
              {deleting ? 'Excluindo...' : 'Excluir produto'}
            </Button>
          </>
        }
      >
        <p className={styles.confirmText}>
          Tem certeza? Esta ação não pode ser desfeita.
        </p>
        <p className={styles.confirmWarn}>
          O produto "{form.title}" será removido permanentemente.
        </p>
      </Modal>
    </div>
  );
}
