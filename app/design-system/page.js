'use client';

import { useState } from 'react';
import styles from './page.module.css';
import Button from '@/components/atoms/Button/Button';
import Badge from '@/components/atoms/Badge/Badge';
import Spinner from '@/components/atoms/Spinner/Spinner';
import FormField from '@/components/molecules/FormField/FormField';
import SearchInput from '@/components/molecules/SearchInput/SearchInput';
import ProductCardMini from '@/components/molecules/ProductCardMini/ProductCardMini';
import EmptyState from '@/components/molecules/EmptyState/EmptyState';

const SWATCHES = [
  ['Primary', 'hsl(222, 47%, 11%)', '--primary'],
  ['Feira Yellow', '#FFD700', '--feira-yellow'],
  ['Background', '#ffffff', '--background'],
  ['Muted', 'hsl(210, 40%, 96%)', '--muted'],
  ['Border', 'hsl(214, 32%, 91%)', '--border'],
  ['Green', 'hsl(142, 71%, 45%)', '--feira-green'],
  ['Destructive', 'hsl(0, 84%, 60%)', '--destructive'],
  ['Foreground', 'hsl(222, 84%, 4.9%)', '--foreground'],
];

const PRODUCT = {
  title: 'Tênis de corrida edição limitada Aurora',
  price: 459.9,
  oldPrice: 699.9,
  seller: 'AtletaStore',
  tier: 'gold',
  freeShipping: true,
  image:
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=800&auto=format&fit=crop',
};

function Section({ id, eyebrow, title, children }) {
  return (
    <section className={styles.section} id={id}>
      <header className={styles.sectionHead}>
        <span className={styles.eyebrow}>{eyebrow}</span>
        <h2 className={styles.sectionTitle}>{title}</h2>
      </header>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  const [email, setEmail] = useState('');
  const [loadingCards, setLoadingCards] = useState(false);

  const emailError = email && !email.includes('@') ? 'Informe um e-mail válido.' : '';

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.hero}>
          <Badge variant="brand" dot>
            Design System · Atomic
          </Badge>
          <h1 className={styles.heroTitle}>
            A base visual da <span className={styles.grad}>Feira do Rolo</span>
          </h1>
          <p className={styles.heroSub}>
            Átomos e moléculas consistentes, cinematográficos e prontos para escalar o
            marketplace inteiro com a mesma linguagem.
          </p>
        </header>

        <Section id="cores" eyebrow="Foundations" title="Paleta & superfícies">
          <div className={styles.swatches}>
            {SWATCHES.map(([name, bg, token]) => (
              <div key={name} className={styles.swatch}>
                <span className={styles.swatchColor} style={{ background: bg }} />
                <div className={styles.swatchMeta}>
                  <strong>{name}</strong>
                  <code>{token}</code>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section id="botoes" eyebrow="Atoms" title="Botões">
          <div className={styles.row}>
            <Button variant="primary">Anunciar agora</Button>
            <Button variant="secondary">Explorar</Button>
            <Button variant="outline">Ver planos</Button>
            <Button variant="ghost">Saiba mais</Button>
            <Button variant="danger">Excluir</Button>
          </div>
          <div className={styles.row}>
            <Button size="sm" leftIcon="plus">
              Pequeno
            </Button>
            <Button size="md" rightIcon="arrow-right">
              Médio
            </Button>
            <Button size="lg" leftIcon="cart">
              Grande
            </Button>
            <Button loading>Processando</Button>
            <Button disabled>Indisponível</Button>
            <Button variant="secondary" leftIcon="heart" aria-label="Favoritar" />
          </div>
        </Section>

        <Section id="inputs" eyebrow="Atoms · Molecules" title="Inputs & formulários">
          <div className={styles.grid2}>
            <FormField
              label="E-mail"
              type="email"
              placeholder="voce@email.com"
              leftIcon="mail"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={emailError}
              helper={!emailError ? 'Usaremos para enviar atualizações dos seus pedidos.' : ''}
            />
            <FormField
              label="Senha"
              type="password"
              placeholder="••••••••"
              leftIcon="lock"
              rightIcon="eye"
              helper="Mínimo de 8 caracteres."
            />
          </div>
          <SearchInput
            className={styles.search}
            onSubmit={(q) => console.log('buscar:', q)}
          />
        </Section>

        <Section id="badges" eyebrow="Atoms" title="Badges & tiers de destaque">
          <div className={styles.row}>
            <Badge variant="brand">Premium</Badge>
            <Badge variant="success" dot>
              Pago
            </Badge>
            <Badge variant="danger">Em disputa</Badge>
            <Badge variant="info">Novo</Badge>
            <Badge variant="neutral">Rascunho</Badge>
            <Badge variant="outline">Categoria</Badge>
          </div>
          <div className={styles.row}>
            <Badge variant="silver">Prata · R$ 7,99</Badge>
            <Badge variant="gold">Ouro · R$ 14,99</Badge>
            <Badge variant="diamond">Diamante · R$ 21,99</Badge>
          </div>
        </Section>

        <Section id="cards" eyebrow="Molecules" title="Cards de produto & estados">
          <div className={styles.toolbar}>
            <Button size="sm" variant="secondary" onClick={() => setLoadingCards((v) => !v)}>
              {loadingCards ? 'Mostrar conteúdo' : 'Simular carregamento'}
            </Button>
            <span className={styles.hint}>
              <Spinner size={14} /> Estados de loading e vazio inclusos
            </span>
          </div>
          <div className={styles.cards}>
            {[0, 1, 2, 3].map((i) => (
              <ProductCardMini key={i} product={PRODUCT} loading={loadingCards} />
            ))}
          </div>
          <EmptyState
            className={styles.empty}
            icon="search"
            title="Nenhum resultado por aqui"
            description="Tente ajustar os filtros ou explore outras categorias do marketplace."
            action={
              <Button variant="primary" rightIcon="arrow-right">
                Explorar categorias
              </Button>
            }
          />
        </Section>
      </div>
    </main>
  );
}
