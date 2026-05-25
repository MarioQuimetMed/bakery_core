FROM node:24-alpine
WORKDIR /app

# Activar pnpm
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# Copiar manifiestos
COPY package.json pnpm-lock.yaml ./

# Instalar SOLO dependencias de producción (es rapidísimo y ligero)
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

# Copiar la carpeta dist que Azure DevOps ya compiló y envió
COPY dist ./dist

EXPOSE 3000

CMD ["node", "dist/main"]