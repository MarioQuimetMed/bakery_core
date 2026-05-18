# ETAPA 1: Construcción (Build)
FROM node:22-alpine AS builder
WORKDIR /app

# Habilitamos pnpm con corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copiar solo los archivos de configuración para aprovechar la caché de capas de Docker
COPY package.json pnpm-lock.yaml ./

# Instalar las dependencias (tanto de desarrollo como producción)
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copiar el resto del código fuente del proyecto
COPY . .

# Compilar el proyecto NestJS (genera la carpeta dist/)
RUN pnpm run build

# Eliminar dependencias de desarrollo para dejar solo las necesarias en producción
RUN pnpm prune --prod

# ETAPA 2: Entorno de Ejecución (Runtime)
FROM node:22-alpine AS runner
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

# Copiar solo lo necesario desde el builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# Puerto expuesto por NestJS
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["node", "dist/main"]

