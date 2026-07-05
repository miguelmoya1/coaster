FROM node:26-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/common/package.json ./packages/common/
COPY apps/api/package.json ./apps/api/
RUN npm ci

COPY packages/common ./packages/common
COPY apps/api ./apps/api

RUN npm run db:gen -w apps/api
RUN npm run build -w packages/common
RUN npm run build -w apps/api

FROM node:26-slim AS runner-deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/common/package.json ./packages/common/
COPY apps/api/package.json ./apps/api/

RUN npm ci --omit=dev

FROM node:26-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=runner-deps /app/node_modules ./node_modules

COPY --from=builder /app/packages/common/dist ./packages/common/dist
COPY --from=builder /app/packages/common/package.json ./packages/common/package.json

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/prisma.config.ts ./apps/api/prisma.config.ts

EXPOSE 8080

CMD ["node", "apps/api/dist/main.js"]