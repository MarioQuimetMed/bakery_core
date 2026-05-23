# Bakery Pro — Backend API

API REST construida con **NestJS** y **TypeScript** que expone todos los servicios del sistema de gestión de pastelería. Gestiona autenticación, usuarios, inventario, producción, ventas, facturación y delivery.

## Tabla de Contenidos

- [Requisitos previos](#requisitos-previos)
- [Instalación y ejecución](#instalación-y-ejecución)
- [Variables de entorno](#variables-de-entorno)
- [Base de datos y Prisma](#base-de-datos-y-prisma)
- [Endpoints de la API](#endpoints-de-la-api)
- [Scripts disponibles](#scripts-disponibles)

---

## Requisitos Previos

- **Node.js** >= 24.x
- **pnpm** >= 9.x
- **PostgreSQL** >= 16 corriendo localmente (o vía Docker)

> Para levantar solo la base de datos con Docker:
> ```bash
> docker-compose up -d
> ```

---

## Instalación y Ejecución

### 1. Instalar dependencias

```bash
pnpm install
```

### 2. Configurar variables de entorno

```bash
cp .env.template .env
```

Editar `.env` con los valores correctos (ver sección [Variables de entorno](#variables-de-entorno)).

### 3. Generar el cliente Prisma

```bash
pnpm run prisma:generate
```

### 4. Ejecutar las migraciones

```bash
# Modo desarrollo (crea la migración y la aplica)
pnpm run prisma:migrate

# Modo producción (aplica migraciones existentes sin crear nuevas)
pnpm run prisma:migrate:prod
```

### 5. Poblar datos iniciales

```bash
pnpm run prisma:seed
```

Crea: usuarios de prueba (5 roles), categorías de ejemplo y productos base.

### 6. Iniciar el servidor

```bash
# Desarrollo con hot-reload
pnpm run start:dev

# Producción
pnpm run build
pnpm run start:prod
```

El servidor estará disponible en: `http://localhost:3000`

---

## Variables de Entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | Cadena de conexión PostgreSQL | `postgresql://user:pass@localhost:5432/bakery_db` |
| `JWT_SECRET` | Clave secreta para access tokens | cadena aleatoria larga |
| `JWT_EXPIRES_IN` | Expiración del access token | `15m` |
| `JWT_REFRESH_SECRET` | Clave secreta para refresh tokens | cadena aleatoria larga |
| `JWT_REFRESH_EXPIRES_IN` | Expiración del refresh token | `7d` |
| `PORT` | Puerto del servidor | `3000` |
| `API_PREFIX` | Prefijo global de la API | `api/v1` |

> **Seguridad:** Nunca subas el archivo `.env` al repositorio. Usa valores fuertes y únicos para `JWT_SECRET` y `JWT_REFRESH_SECRET` en producción.

---

## Base de Datos y Prisma

### Modelos principales

| Modelo | Descripción |
|--------|-------------|
| `User` | Usuarios del sistema con roles |
| `Customer` | Clientes de la pastelería |
| `Category` | Categorías de productos |
| `Product` | Productos con precio y stock |
| `Ingredient` | Ingredientes del inventario |
| `InventoryMovement` | Movimientos de stock (kardex) |
| `Recipe` | Recetas vinculadas a productos |
| `RecipeDetail` | Líneas de ingredientes de una receta |
| `Order` | Pedidos personalizados de clientes |
| `OrderDetail` | Líneas de productos de un pedido |
| `ProductionOrder` | Órdenes de producción |
| `Sale` | Transacciones de venta |
| `SaleDetail` | Líneas de una venta |
| `Payment` | Pagos asociados a una venta |
| `Invoice` | Facturas generadas |
| `Delivery` | Registro de entregas a domicilio |
| `CashRegister` | Sesiones de caja |

### Comandos de Prisma

```bash
# Generar cliente tras cambiar el schema
pnpm run prisma:generate

# Crear migración en desarrollo
pnpm run prisma:migrate

# Aplicar migraciones en producción
pnpm run prisma:migrate:prod

# Resetear BD (solo desarrollo)
pnpm run prisma:reset

# Poblar datos iniciales
pnpm run prisma:seed

# Abrir GUI de base de datos
pnpm run prisma:studio
```

---

## Endpoints de la API

Todos los endpoints tienen el prefijo `/api/v1`. La documentación completa e interactiva está en `/api/docs`.

### Autenticación

```
POST   /auth/login               Iniciar sesión
POST   /auth/refresh             Renovar access token
POST   /auth/logout              Cerrar sesión
GET    /auth/profile             Perfil del usuario actual
PATCH  /auth/profile             Actualizar perfil propio
PATCH  /auth/profile/password    Cambiar contraseña
```

### Usuarios

```
GET    /users                    Listar usuarios (paginado, filtro por rol)
POST   /users                    Crear usuario
GET    /users/:id                Obtener usuario por ID
PATCH  /users/:id                Actualizar usuario
PATCH  /users/:id/toggle-active  Activar / desactivar usuario
DELETE /users/:id                Eliminar usuario (soft delete)
```

### Clientes

```
GET    /customers                Listar clientes (paginado, búsqueda)
POST   /customers                Crear cliente
GET    /customers/:id            Obtener cliente
PATCH  /customers/:id            Actualizar cliente
DELETE /customers/:id            Eliminar cliente
```

### Productos y Categorías

```
GET    /products                 Listar productos (filtros: categoría, búsqueda)
POST   /products                 Crear producto
GET    /products/:id             Obtener producto
PATCH  /products/:id             Actualizar producto
DELETE /products/:id             Eliminar producto

GET    /products/categories      Listar categorías
POST   /products/categories      Crear categoría
PATCH  /products/categories/:id  Actualizar categoría
DELETE /products/categories/:id  Eliminar categoría
```

### Inventario

```
GET    /inventory/ingredients              Listar ingredientes (paginado)
POST   /inventory/ingredients              Crear ingrediente
GET    /inventory/ingredients/:id          Obtener ingrediente
PATCH  /inventory/ingredients/:id          Actualizar ingrediente
DELETE /inventory/ingredients/:id          Eliminar ingrediente
GET    /inventory/ingredients/:id/kardex   Kardex del ingrediente
POST   /inventory/movements                Registrar movimiento (entrada/salida/ajuste)
GET    /inventory/alerts/low-stock         Ingredientes con stock bajo
```

### Recetas

```
GET    /recipes              Listar recetas
POST   /recipes              Crear receta con ingredientes
GET    /recipes/:id          Obtener receta con detalle
PATCH  /recipes/:id          Actualizar receta
DELETE /recipes/:id          Eliminar receta
GET    /recipes/:id/cost     Calcular costo de la receta
```

### Producción

```
GET    /production           Listar órdenes (filtro por estado)
POST   /production           Crear orden de producción
GET    /production/:id       Obtener orden con detalle
PATCH  /production/:id/status   Avanzar estado
PATCH  /production/:id/assign   Asignar pastelero
```

### Pedidos

```
GET    /orders               Listar pedidos (filtros: estado, búsqueda)
POST   /orders               Crear pedido
GET    /orders/:id           Obtener pedido completo
PATCH  /orders/:id/status    Cambiar estado manualmente
PATCH  /orders/:id/cancel    Cancelar pedido
```

### Ventas

```
GET    /sales                Listar ventas (filtros: estado, búsqueda)
POST   /sales                Registrar venta (POS o cobro de pedido)
GET    /sales/summary/daily  Resumen diario de ventas
PATCH  /sales/:id/complete   Completar venta pendiente
POST   /sales/cash-register/open         Abrir caja
POST   /sales/cash-register/:id/close    Cerrar caja
```

### Facturas

```
GET    /invoices             Listar facturas
GET    /invoices/:id         Obtener factura
GET    /invoices/:id/data    Datos para imprimir
GET    /invoices/:id/pdf     Descargar PDF
PATCH  /invoices/:id/cancel  Anular factura
```

### Delivery

```
POST   /delivery                        Crear registro de entrega
GET    /delivery                        Listar entregas (filtro por estado)
GET    /delivery/:id                    Obtener entrega
PATCH  /delivery/:id/assign             Asignar repartidor
PATCH  /delivery/:id/status             Actualizar estado de entrega
POST   /delivery/:id/register-payment   Registrar pago contra entrega
```

### Reportes

```
GET    /reports/dashboard          Estadísticas generales
GET    /reports/sales-chart        Gráfico de ventas por día
GET    /reports/top-products       Productos más vendidos
GET    /reports/sales-by-category  Ventas por categoría
GET    /reports/production-summary Resumen de producción
GET    /reports/low-stock          Ingredientes con stock bajo
```

### Upload

```
POST   /upload               Subir imagen optimizada (devuelve URL pública)
```

---

## Scripts Disponibles

```bash
pnpm run start:dev           # Desarrollo con hot-reload
pnpm run start:debug         # Desarrollo con inspector de Node
pnpm run build               # Compilar TypeScript
pnpm run start:prod          # Ejecutar build compilado

pnpm run lint                # ESLint
pnpm run format              # Prettier

pnpm run test                # Tests unitarios (Jest)
pnpm run test:watch          # Tests en modo watch
pnpm run test:cov            # Tests con reporte de cobertura
pnpm run test:e2e            # Tests end-to-end

pnpm run prisma:generate     # Generar cliente Prisma
pnpm run prisma:migrate      # Crear y aplicar migración (dev)
pnpm run prisma:migrate:prod # Aplicar migraciones (prod)
pnpm run prisma:seed         # Datos iniciales
pnpm run prisma:studio       # GUI visual de la BD
pnpm run prisma:reset        # Resetear BD completa (dev)
```