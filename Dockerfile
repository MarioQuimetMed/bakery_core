# --- Etapa 1: Compilar ---
FROM node:22-alpine AS builder
WORKDIR /app

# OpenSSL + herramientas de compilación para módulos nativos (bcrypt)
RUN apk add --no-cache openssl python3 make g++

# Habilitar pnpm v9 (compatible con lockfileVersion 9.0)
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# Aprovechar caché de capas instalando dependencias primero
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copiar código fuente y schema de Prisma
COPY . .

# Generar cliente de Prisma y compilar
RUN pnpm prisma:generate
RUN pnpm run build

# Verificar que el build generó el dist
RUN ls -la dist/

# Eliminar devDependencies
RUN pnpm prune --prod

# --- Etapa 2: Producción ---
FROM node:22-alpine
WORKDIR /app

# OpenSSL requerido por Prisma en runtime
RUN apk add --no-cache openssl

COPY package.json ./

# Copiar artefactos del builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY prisma ./prisma
COPY start.sh .
RUN chmod +x start.sh

# Verificar que dist existe antes de arrancar
RUN ls -la dist/

EXPOSE 3000
CMD ["sh", "start.sh"]
