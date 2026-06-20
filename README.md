# Feira do Rolo — Frontend

Cliente web do marketplace **Feira do Rolo** — construído em **Next.js 14 (App Router)**, **JavaScript puro** (sem TypeScript), **CSS Modules** e **Atomic Design**. Consome a [API](https://github.com/gsPatrick/feiradorolo--api) (Node/Express) e inclui o **Painel Administrativo** completo.

> **Stack:** Next.js 14.2 · React 18 · CSS Modules · socket.io-client
> **Backend:** [`feiradorolo--api`](https://github.com/gsPatrick/feiradorolo--api)

---

## Índice

1. [Visão geral](#1-visão-geral)
2. [Princípios de arquitetura](#2-princípios-de-arquitetura)
3. [Estrutura de pastas](#3-estrutura-de-pastas)
4. [Atomic Design](#4-atomic-design)
5. [Páginas (rotas)](#5-páginas-rotas)
6. [Painel administrativo](#6-painel-administrativo)
7. [Camada de integração com a API](#7-camada-de-integração-com-a-api)
8. [Tempo real e recursos especiais](#8-tempo-real-e-recursos-especiais)
9. [Conteúdo dirigido por dados (CMS leve)](#9-conteúdo-dirigido-por-dados-cms-leve)
10. [Variáveis de ambiente](#10-variáveis-de-ambiente)
11. [Rodando localmente](#11-rodando-localmente)
12. [Docker e deploy](#12-docker-e-deploy)
13. [Convenções de UX](#13-convenções-de-ux)

---

## 1. Visão geral

A interface cobre toda a jornada do marketplace:

- **Vitrine:** home com hero/banners, flash sale, cards de acesso rápido, seções de produtos e grade de categorias.
- **Descoberta:** busca (inclusive **por voz**), categorias, promoções, "perto de você", loja do vendedor.
- **Produto:** galeria, specs dinâmicas, avaliações, perguntas, cálculo de frete e **opção de retirada presencial**.
- **Compra:** carrinho, **checkout** (envio ou retirada), cupons, endereços, pagamento.
- **Conta:** perfil, pedidos, vendas, favoritos, mensagens (chat), notificações.
- **Segurança da transação:** exibição do **token de retirada**, status de **escrow**, verificação facial.
- **Páginas institucionais:** quem somos, como vender, planos e taxas, ajuda, FAQ, políticas — todas **editáveis pelo admin**.
- **Painel Admin:** 14 áreas de gestão (pedidos, financeiro, usuários, segurança, integrações, personalização do site, etc.).

---

## 2. Princípios de arquitetura

- **Next.js App Router** (`app/`) com componentes majoritariamente *client* (`'use client'`) onde há interatividade.
- **JavaScript puro** — sem TypeScript, por decisão do projeto.
- **CSS Modules** em todo lugar: cada componente tem seu `*.module.css`. Sem CSS global vazando (apenas tokens em `app/globals.css`).
- **Atomic Design**: `atoms → molecules → organisms → templates`, com `providers` para estado transversal.
- **Tokens de design** em `app/globals.css` (cores como `--feira-yellow`, espaçamentos, raios, sombras, tipografia mono).
- **Sem mocks**: dados sempre vêm da API. Quando não há dados, mostram-se **skeletons**, **estados vazios** e **erros amigáveis** — nunca conteúdo fabricado.

---

## 3. Estrutura de pastas

```
feiradorolo--frontend/
├── app/                    # rotas (App Router) — uma pasta por página
│   ├── globals.css         # tokens de design + reset
│   ├── layout.js           # layout raiz (providers, header, footer)
│   ├── page.js             # home
│   └── <rota>/page.js      # demais páginas (ver seção 5)
├── components/
│   ├── atoms/              # Button, Icon, Badge, Input, Select, Spinner…
│   ├── molecules/          # SearchBar, SearchInput, cards compostos…
│   ├── organisms/          # Header, SiteFooter, HeroBanner, AppPromo, admin/*
│   ├── templates/          # estruturas de página
│   └── providers/          # AuthProvider, ToastProvider…
├── lib/
│   ├── api.js              # cliente HTTP + todos os serviços
│   ├── socket.js           # conexão socket.io
│   └── masks.js            # máscaras/validações (CPF, CNPJ, telefone, CEP)
├── public/                 # imagens estáticas (logos das lojas de app, etc.)
└── next.config.mjs         # output: 'standalone' para Docker
```

---

## 4. Atomic Design

| Nível | Exemplos | Papel |
|---|---|---|
| **Atoms** | `Button`, `Icon`, `Badge`, `Input`, `Select`, `Spinner` | Blocos básicos, sem regra de negócio. |
| **Molecules** | `SearchBar` (com busca por voz), `SearchInput` | Combinações pequenas e reutilizáveis. |
| **Organisms** | `Header`, `SiteFooter`, `HeroBanner`, `QuickAccessCards`, `AppPromo`, `AuthModal`, `admin/*` | Seções completas com lógica/integração. |
| **Templates** | layouts de página | Compõem organisms numa página. |
| **Providers** | `AuthProvider`, `ToastProvider` | Estado/contexto global (sessão, toasts). |

> Regra prática: o ícone vem **sempre** do átomo `Icon` (`components/atoms/Icon/Icon.js`); ícones inexistentes são adicionados como SVG inline no componente — **nunca** se edita o `Icon.js` ad-hoc.

---

## 5. Páginas (rotas)

| Rota | Página |
|---|---|
| `/` | Home (vitrine completa) |
| `/buscar` | Resultados de busca |
| `/categoria/[...]`, `/categorias` | Navegação por categoria |
| `/produto/[id]` | Detalhe do produto (specs, avaliações, perguntas, frete, retirada) |
| `/loja/[id]` | Loja do vendedor |
| `/promocoes`, `/proximos`, `/recomendacoes` | Listagens temáticas |
| `/carrinho`, `/finalizar-compra` | Carrinho e **checkout** (envio/retirada) |
| `/pedido/[id]`, `/pedido-confirmado` | Detalhe do pedido + **token de retirada** |
| `/minha-conta` | Perfil, pedidos, favoritos (tabs) |
| `/minhas-vendas` | Painel do vendedor (libera retirada por token) |
| `/mensagens` | Chat em tempo real |
| `/adicionar-produto`, `/editar-produto/[id]` | Anunciar/editar (com taxa real de comissão) |
| `/cupons`, `/avaliacoes` | Cupons e avaliações |
| `/login`, `/forgot-password`, `/reset-password` | Autenticação |
| **Institucionais** | `/quem-somos`, `/como-vender`, `/planos-e-taxas`, `/academia-do-vendedor`, `/anunciar-produtos`, `/upgrade-conta`, `/central-de-ajuda`, `/frete-e-entrega`, `/trocas-e-devolucoes`, `/garantia`, `/formas-de-pagamento`, `/seguranca`, `/suporte`, `/quem-somos`, `/politica-de-privacidade`, `/termos-de-uso`, `/trabalhe-conosco` — **todas editáveis pelo admin** |
| `/admin` | Painel administrativo |

---

## 6. Painel administrativo

Acessível em `/admin` (protegido por gate de login — só `is_admin`/`admin_role`). 14 abas:

**Pedidos · Financeiro · Receitas · Emails · Auditoria · Especificações · Testes · Segurança · Push · Performance · Analytics · Personalização · Integrações.**

Destaques:
- **Financeiro:** edita comissão, **frete com markup** e planos de destaque (apenas edição das regras existentes).
- **Segurança:** palavras bloqueadas (moderação) + logs.
- **Push:** envio/broadcast de notificações + histórico com limpeza (lixeira).
- **Integrações:** cards por serviço (Mercado Pago, Melhor Envio, Brevo, Firebase, FCM, OneSignal) com instruções e campos de chave (cifradas no servidor).
- **Personalização:** topbar, menus, banners/home, rodapé, redes/contato e **páginas institucionais & FAQ** com **editor amigável** (sem JSON) — edita só os textos, preservando layout e ícones.
- Todos os painéis consomem **dados reais** (sem mock), com loading/empty/erro.

---

## 7. Camada de integração com a API

Tudo passa por **`lib/api.js`** — um cliente `fetch` com tratamento de erro (`ApiError`), token de sessão e serviços por domínio:

`authService`, `userService`, `productService`, `categoryService`, `configService` (inclui `fees()` para refletir a comissão real), `orderService`, `escrowService`, `couponService`, `addressService`, `shipmentService`, `reviewService`, `questionService`, `chatService`, `favoriteService`, `notificationService`, `bannerService`, `contentService`, `adminService`, `adminConfigService`, `uploadImage`.

- A base vem de `NEXT_PUBLIC_API_URL` (embutida no build).
- Sessão e usuário ficam no **`AuthProvider`** (expõe `authReady`, usado para o gate do admin).

---

## 8. Tempo real e recursos especiais

- **Socket.io** (`lib/socket.js`): o **chat** atualiza em tempo real e o **sino de notificações** escuta `notification:new` (entrega in-app instantânea, mesmo sem provedor de push no backend).
- **Busca por voz:** o microfone na `SearchBar` usa a **Web Speech API** — abre um modal "Ouvindo…", transcreve a fala (pt-BR) e dispara a busca; trata permissão negada, silêncio e navegador sem suporte.
- **Retirada presencial:** o comprador vê o **token de 6 dígitos** no `/pedido/[id]`; o vendedor o informa em `/minhas-vendas` para liberar a custódia.
- **Uploads:** imagens (avatar, produtos, banners) via `uploadImage()` (multipart) para a API.

---

## 9. Conteúdo dirigido por dados (CMS leve)

As **páginas institucionais** carregam seu conteúdo da API (`content_pages`) com **fallback local**: cada página tem um objeto `FALLBACK.content` e faz `contentService.get(slug)` — se a API trouxer conteúdo, ele sobrescreve. Assim o admin edita os textos no painel (**Personalização → Páginas & FAQ**, com editor amigável) e o site reflete na hora, mantendo o layout pixel-perfect.

---

## 10. Variáveis de ambiente

```env
# Base da API (backend feiradorolo--api). Embutida no build do cliente.
NEXT_PUBLIC_API_URL=http://localhost:3333/api/v1
```

> Em produção, aponte para a URL pública da API (ex.: `https://api.seu-dominio.com/api/v1`). Por ser `NEXT_PUBLIC_*`, precisa estar definida **em build time** (veja o Docker abaixo).

---

## 11. Rodando localmente

Pré-requisitos: **Node 20+** e a [API](https://github.com/gsPatrick/feiradorolo--api) rodando.

```bash
cp .env.example .env.local        # ajuste NEXT_PUBLIC_API_URL
npm install
npm run dev                       # http://localhost:3000
```

Scripts:

```bash
npm run dev      # desenvolvimento (hot reload)
npm run build    # build de produção (gera .next/standalone)
npm start        # serve o build
npm run lint     # ESLint (next lint)
```

---

## 12. Docker e deploy

Como `NEXT_PUBLIC_API_URL` é embutida no bundle, passe-a no **build**:

```bash
# Build (informe a URL pública da API)
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://api.seu-dominio.com/api/v1 \
  -t feiradorolo-frontend .

# Run
docker run -d --name feiradorolo-frontend -p 3000:3000 feiradorolo-frontend
```

A imagem usa **multi-stage** + **`output: 'standalone'`** (Next), resultando num runtime enxuto que sobe com `node server.js` em usuário não-root. Coloque um proxy/HTTPS (Nginx/Caddy/te plataforma) na frente.

---

## 13. Convenções de UX

- **Skeletons** durante o carregamento, **estados vazios** com mensagem e **erros amigáveis** em queda de rede — nunca cards em branco nem dados falsos.
- **Header sem refresh** ao trocar de página (sessão mantida via provider).
- **Pixel-perfect**: mudanças não quebram layouts existentes.
- **Acessibilidade**: `aria-label` nos controles, foco visível, modais com `role="dialog"`.

---

Para o backend (API, banco, escrow, KYC, integrações), veja o repositório da [API](https://github.com/gsPatrick/feiradorolo--api).
