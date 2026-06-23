# =============================================================================
# Feira do Rolo — Frontend (Next.js 14 · App Router · output standalone)
# =============================================================================
# A URL da API é embutida no bundle do cliente em BUILD TIME. Passe-a:
#   docker build \
#     --build-arg NEXT_PUBLIC_API_URL=https://api.seu-dominio.com/api/v1 \
#     -t feiradorolo-frontend .
#   docker run -d -p 3000:3000 feiradorolo-frontend
# =============================================================================

# --- 1) Dependências -------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- 2) Build --------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Garante que a pasta public exista mesmo se vazia (evita flake do BuildKit
# "/app/public: not found" no COPY do estágio runner).
RUN mkdir -p /app/public
# Default aponta para a API de produção (easypanel). Sobrescreva com --build-arg se precisar.
ARG NEXT_PUBLIC_API_URL=https://geral-feiradorolo--api.r954jc.easypanel.host/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- 3) Runtime (imagem enxuta, usuário não-root) --------------------------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Saída "standalone" do Next: server mínimo + assets.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
