# Stage 1: Build stage
FROM node:22-slim AS builder

WORKDIR /app

# Install openssl needed by Prisma CLI/engine
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy root package files
COPY package.json package-lock.json ./

# Copy package.json of all workspaces to ensure npm workspaces install successfully
COPY packages/common/package.json ./packages/common/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install all dependencies (including devDependencies needed for build)
RUN npm ci

# Copy the source code of the necessary packages
COPY packages/common ./packages/common
COPY apps/api ./apps/api

# Generate Prisma Client (uses relative output path specified in schema.prisma)
RUN npm run db:gen -w apps/api

# Build common first, then build api
RUN npm run build -w packages/common
RUN npm run build -w apps/api

# Stage 2: Production dependencies stage
FROM node:22-slim AS runner-deps

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json ./

# Copy workspace package.json files
COPY packages/common/package.json ./packages/common/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install ONLY production dependencies
RUN npm ci --omit=dev

# Copy generated Prisma Client from builder into node_modules of production deps
# COPY --from=builder /app/node_modules/.prisma /app/node_modules/.prisma
# COPY --from=builder /app/node_modules/@prisma/client /app/node_modules/@prisma/client

# Stage 3: Runner stage (slim runtime)
FROM node:22-slim AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install openssl as it's needed by Prisma Client
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy node_modules from runner-deps (includes both root and package-level production dependencies)
COPY --from=runner-deps /app/node_modules ./node_modules

# Copy built outputs
COPY --from=builder /app/packages/common/dist ./packages/common/dist
COPY --from=builder /app/packages/common/package.json ./packages/common/package.json

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/prisma.config.ts ./apps/api/prisma.config.ts

EXPOSE 8080

ENV PORT=8080

CMD ["node", "apps/api/dist/main"]
