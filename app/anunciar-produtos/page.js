'use client';

import { useEffect, useState } from 'react';
import styles from './page.module.css';
import Button from '@/components/atoms/Button/Button';
import Input from '@/components/atoms/Input/Input';
import Textarea from '@/components/atoms/Textarea/Textarea';
import Select from '@/components/atoms/Select/Select';
import Badge from '@/components/atoms/Badge/Badge';
import Icon from '@/components/atoms/Icon/Icon';
import Breadcrumb from '@/components/molecules/Breadcrumb/Breadcrumb';
import { contentService } from '@/lib/api';

/* ----------------------------------------------------------------
   FALLBACK — fiel e completo ao front antigo.
---------------------------------------------------------------- */
const FALLBACK = {
  content: {
    header: {
      title: 'Anunciar Produtos',
      subtitle:
        'Cadastre seus produtos de forma fácil e rápida. Siga nosso guia para criar anúncios que convertem.',
    },
    stepsTitle: 'Como Funciona',
    steps: [
      { number: 1, title: 'Informações Básicas', description: 'Título, categoria e descrição do produto', icon: 'tag' },
      { number: 2, title: 'Fotos e Vídeos', description: 'Imagens de qualidade que vendem', icon: 'camera' },
      { number: 3, title: 'Preço e Estoque', description: 'Definição de valores e quantidade', icon: 'dollar' },
      { number: 4, title: 'Publicação', description: 'Revisão final e publicação', icon: 'check' },
    ],
    form: {
      title: 'Cadastrar Novo Produto',
      description: 'Preencha as informações abaixo para criar seu anúncio',
      basicTitle: 'Informações Básicas',
      titleLabel: 'Título do Produto *',
      titlePlaceholder: 'Ex: iPhone 15 Pro Max 256GB Azul Titânio Novo',
      categoryLabel: 'Categoria *',
      categoryPlaceholder: 'Selecione uma categoria',
      categoryOptions: [
        { value: 'eletronicos', label: 'Eletrônicos' },
        { value: 'roupas', label: 'Roupas e Acessórios' },
        { value: 'casa', label: 'Casa e Jardim' },
        { value: 'esportes', label: 'Esportes' },
        { value: 'livros', label: 'Livros' },
      ],
      descriptionLabel: 'Descrição *',
      descriptionPlaceholder: 'Descreva seu produto detalhadamente...',
      imagesTitle: 'Fotos do Produto',
      dropText: 'Arraste suas fotos aqui ou clique para selecionar',
      dropHint: 'Máximo 10 fotos - JPG, PNG (até 5MB cada)',
      dropBtn: 'Selecionar Fotos',
      pricingTitle: 'Preço e Estoque',
      priceLabel: 'Preço *',
      pricePlaceholder: '0,00',
      stockLabel: 'Quantidade em Estoque',
      stockPlaceholder: '1',
      shippingTitle: 'Entrega',
      weightLabel: 'Peso (kg)',
      weightPlaceholder: '0.5',
      dimensionsLabel: 'Dimensões (cm)',
      dimensionsPlaceholder: '20 x 15 x 10',
      submitLabel: 'Publicar Produto',
      draftLabel: 'Salvar Rascunho',
    },
    tipsTitle: 'Dicas para Vender Mais',
    tips: [
      { title: 'Use fotos de qualidade', description: 'Produtos com boas fotos vendem 3x mais' },
      { title: 'Escreva títulos claros', description: 'Inclua marca, modelo e características principais' },
      { title: 'Preços competitivos', description: 'Pesquise concorrentes antes de definir o preço' },
      { title: 'Descrições completas', description: 'Detalhe medidas, cores, materiais e funcionalidades' },
    ],
    helpTitle: 'Precisa de Ajuda?',
    helpLinks: [
      { emoji: '📚', label: 'Guia de Fotos' },
      { emoji: '💡', label: 'Dicas de Título' },
      { emoji: '💰', label: 'Calculadora de Preços' },
      { emoji: '🎥', label: 'Vídeo Tutorial' },
    ],
  },
};

export default function AnunciarProdutosPage() {
  const [content, setContent] = useState(FALLBACK.content);

  useEffect(() => {
    contentService
      .get('anunciar-produtos')
      .then((p) => p?.content && setContent(p.content))
      .catch(() => {});
  }, []);

  const c = content;
  const f = c.form;

  return (
    <main className={styles.page}>
      {/* Breadcrumb */}
      <div className={styles.crumbBar}>
        <div className={styles.container}>
          <Breadcrumb
            items={[
              { label: 'Início', href: '/' },
              { label: 'Anunciar Produtos' },
            ]}
          />
        </div>
      </div>

      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>{c.header.title}</h1>
          <p className={styles.subtitle}>{c.header.subtitle}</p>
        </div>

        {/* Steps */}
        <section className={styles.stepsSection}>
          <h2 className={styles.sectionTitle}>{c.stepsTitle}</h2>
          <div className={styles.stepsGrid}>
            {c.steps.map((step) => (
              <article key={step.number} className={styles.stepCard}>
                <div className={styles.stepCardHead}>
                  <div className={styles.stepIcon}>
                    <Icon name={step.icon} size={24} />
                  </div>
                  <Badge variant="neutral" className={styles.stepBadge}>
                    Passo {step.number}
                  </Badge>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                </div>
                <p className={styles.stepDesc}>{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <div className={styles.layout}>
          {/* Product form */}
          <div className={styles.formCol}>
            <div className={styles.card}>
              <div className={styles.cardHead}>
                <h2 className={styles.cardTitle}>
                  <Icon name="package" size={20} className={styles.cardTitleIcon} />
                  {f.title}
                </h2>
                <p className={styles.cardDesc}>{f.description}</p>
              </div>
              <div className={styles.cardBody}>
                {/* Basic info */}
                <div className={styles.block}>
                  <h3 className={styles.blockTitle}>{f.basicTitle}</h3>
                  <div className={styles.stack}>
                    <div className={styles.field}>
                      <label className={styles.label} htmlFor="title">{f.titleLabel}</label>
                      <Input id="title" placeholder={f.titlePlaceholder} />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label} htmlFor="category">{f.categoryLabel}</label>
                      <Select id="category" placeholder={f.categoryPlaceholder} defaultValue=""
                        options={f.categoryOptions}
                      />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label} htmlFor="description">{f.descriptionLabel}</label>
                      <Textarea id="description" rows={4} placeholder={f.descriptionPlaceholder} />
                    </div>
                  </div>
                </div>

                {/* Images */}
                <div className={styles.block}>
                  <h3 className={styles.blockTitle}>{f.imagesTitle}</h3>
                  <div className={styles.dropzone}>
                    <Icon name="download" size={48} className={styles.dropIcon} />
                    <p className={styles.dropText}>{f.dropText}</p>
                    <p className={styles.dropHint}>{f.dropHint}</p>
                    <Button variant="outline" href="/adicionar-produto" className={styles.dropBtn}>
                      {f.dropBtn}
                    </Button>
                  </div>
                </div>

                {/* Pricing */}
                <div className={styles.block}>
                  <h3 className={styles.blockTitle}>{f.pricingTitle}</h3>
                  <div className={styles.grid2}>
                    <div className={styles.field}>
                      <label className={styles.label} htmlFor="price">{f.priceLabel}</label>
                      <Input id="price" type="number" placeholder={f.pricePlaceholder} />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label} htmlFor="stock">{f.stockLabel}</label>
                      <Input id="stock" type="number" placeholder={f.stockPlaceholder} />
                    </div>
                  </div>
                </div>

                {/* Shipping */}
                <div className={styles.block}>
                  <h3 className={styles.blockTitle}>{f.shippingTitle}</h3>
                  <div className={styles.grid2}>
                    <div className={styles.field}>
                      <label className={styles.label} htmlFor="weight">{f.weightLabel}</label>
                      <Input id="weight" type="number" step="0.1" placeholder={f.weightPlaceholder} />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label} htmlFor="dimensions">{f.dimensionsLabel}</label>
                      <Input id="dimensions" placeholder={f.dimensionsPlaceholder} />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className={styles.actions}>
                  <Button href="/adicionar-produto" className={styles.actionMain}>
                    {f.submitLabel}
                  </Button>
                  <Button variant="outline" href="/adicionar-produto" className={styles.actionSecondary}>
                    {f.draftLabel}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Tips sidebar */}
          <aside className={styles.sideCol}>
            <div className={styles.card}>
              <div className={styles.cardHead}>
                <h2 className={styles.cardTitle}>{c.tipsTitle}</h2>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.tips}>
                  {c.tips.map((tip, i) => (
                    <div key={i} className={styles.tip}>
                      <span className={styles.tipDot} />
                      <div>
                        <h4 className={styles.tipTitle}>{tip.title}</h4>
                        <p className={styles.tipDesc}>{tip.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHead}>
                <h2 className={styles.cardTitleLg}>{c.helpTitle}</h2>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.helpList}>
                  {c.helpLinks.map((link) => (
                    <Button key={link.label} variant="outline" fullWidth className={styles.helpBtn}>
                      {link.emoji} {link.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
