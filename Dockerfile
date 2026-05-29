# Stage 1: Build stage
FROM node:22-alpine AS builder

WORKDIR /app

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
FROM node:22-alpine AS runner-deps

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
COPY --from=builder /app/node_modules/.prisma /app/node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client /app/node_modules/@prisma/client

# Stage 3: Runner stage (slim runtime)
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install openssl as it's needed by Prisma Client in alpine environments
RUN apk add --no-cache openssl

# Copy node_modules from runner-deps (includes both root and package-level production dependencies)
COPY --from=runner-deps /app/node_modules ./node_modules

# Copy built outputs
COPY --from=builder /app/packages/common/dist ./packages/common/dist
COPY --from=builder /app/packages/common/package.json ./packages/common/package.json

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

EXPOSE 3000

ENV PORT=3000

CMD ["node", "apps/api/dist/main"]
