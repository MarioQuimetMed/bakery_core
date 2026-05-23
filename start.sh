#!/bin/sh
echo "Ejecutando migraciones..."
npx prisma migrate deploy
echo "Iniciando servidor..."
exec node dist/main