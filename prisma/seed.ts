import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@bakery.com' },
    update: {},
    create: {
      email: 'admin@bakery.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'Sistema',
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  const bakerPassword = await bcrypt.hash('Baker123!', 10);
  const baker = await prisma.user.upsert({
    where: { email: 'baker@bakery.com' },
    update: {},
    create: {
      email: 'baker@bakery.com',
      password: bakerPassword,
      firstName: 'Chef',
      lastName: 'Pastelero',
      role: UserRole.BAKER,
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'cashier@bakery.com' },
    update: {},
    create: {
      email: 'cashier@bakery.com',
      password: await bcrypt.hash('Cashier123!', 10),
      firstName: 'Cajero',
      lastName: 'Principal',
      role: UserRole.CASHIER,
      isActive: true,
    },
  });

  await prisma.user.upsert({
    where: { email: 'delivery@bakery.com' },
    update: {},
    create: {
      email: 'delivery@bakery.com',
      password: await bcrypt.hash('Delivery123!', 10),
      firstName: 'Repartidor',
      lastName: 'Uno',
      role: UserRole.DELIVERY,
      isActive: true,
    },
  });

  const categories = [
    { name: 'Tortas', description: 'Tortas personalizadas y de vitrina' },
    { name: 'Cupcakes', description: 'Cupcakes decorados artesanalmente' },
    { name: 'Postres', description: 'Postres individuales y colectivos' },
    { name: 'Bebidas', description: 'Bebidas calientes y frías' },
    { name: 'Combos', description: 'Combos especiales y paquetes' },
  ];

  const createdCategories: Record<string, string> = {};
  for (const cat of categories) {
    const created = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
    createdCategories[cat.name] = created.id;
  }

  const products = [
    { name: 'Torta de Chocolate', description: 'Deliciosa torta de chocolate belga', price: 85.00, cost: 35.00, categoryName: 'Tortas' },
    { name: 'Torta de Vainilla', description: 'Torta esponjosa de vainilla con crema', price: 75.00, cost: 28.00, categoryName: 'Tortas' },
    { name: 'Torta Red Velvet', description: 'Elegante torta red velvet con queso crema', price: 95.00, cost: 42.00, categoryName: 'Tortas' },
    { name: 'Cupcake Chocolate', description: 'Cupcake de chocolate con ganache', price: 8.50, cost: 3.20, categoryName: 'Cupcakes' },
    { name: 'Cupcake Vainilla', description: 'Cupcake de vainilla con buttercream', price: 7.50, cost: 2.80, categoryName: 'Cupcakes' },
    { name: 'Cheesecake', description: 'Cheesecake cremoso de frutos rojos', price: 12.00, cost: 5.50, categoryName: 'Postres' },
    { name: 'Tiramisú', description: 'Auténtico tiramisú italiano', price: 11.00, cost: 4.80, categoryName: 'Postres' },
    { name: 'Café Americano', description: 'Café negro premium', price: 5.00, cost: 1.50, categoryName: 'Bebidas' },
    { name: 'Cappuccino', description: 'Espresso con leche vaporizada', price: 7.00, cost: 2.20, categoryName: 'Bebidas' },
    { name: 'Combo Cumpleaños', description: 'Torta + 12 cupcakes + bebidas', price: 180.00, cost: 75.00, categoryName: 'Combos' },
  ];

  for (const product of products) {
    const exists = await prisma.product.findFirst({ where: { name: product.name } });
    if (!exists) {
      await prisma.product.create({
        data: {
          name: product.name,
          description: product.description,
          price: product.price,
          cost: product.cost,
          categoryId: createdCategories[product.categoryName],
          isActive: true,
        },
      });
    }
  }

  const ingredients = [
    { name: 'Harina de trigo', unit: 'kg', stock: 50, minStock: 10, cost: 2.50 },
    { name: 'Azúcar', unit: 'kg', stock: 30, minStock: 5, cost: 1.80 },
    { name: 'Mantequilla', unit: 'kg', stock: 20, minStock: 5, cost: 8.50 },
    { name: 'Huevos', unit: 'unidad', stock: 200, minStock: 30, cost: 0.25 },
    { name: 'Leche', unit: 'litro', stock: 25, minStock: 5, cost: 1.20 },
    { name: 'Chocolate negro', unit: 'kg', stock: 15, minStock: 3, cost: 12.00 },
    { name: 'Queso crema', unit: 'kg', stock: 10, minStock: 2, cost: 9.50 },
    { name: 'Vainilla esencia', unit: 'ml', stock: 500, minStock: 100, cost: 0.05 },
    { name: 'Polvo de hornear', unit: 'g', stock: 2000, minStock: 500, cost: 0.008 },
    { name: 'Crema de leche', unit: 'litro', stock: 15, minStock: 3, cost: 4.50 },
    { name: 'Café espresso', unit: 'g', stock: 3000, minStock: 500, cost: 0.04 },
    { name: 'Frutos rojos', unit: 'kg', stock: 5, minStock: 1, cost: 15.00 },
  ];

  for (const ingredient of ingredients) {
    const exists = await prisma.ingredient.findFirst({ where: { name: ingredient.name } });
    if (!exists) {
      await prisma.ingredient.create({ data: ingredient });
    }
  }

  await prisma.customer.upsert({
    where: { email: 'maria@example.com' },
    update: {},
    create: {
      firstName: 'María',
      lastName: 'González',
      email: 'maria@example.com',
      phone: '+591 70000001',
      address: 'Av. Blanco Galindo 1234',
    },
  });

  await prisma.customer.upsert({
    where: { email: 'carlos@example.com' },
    update: {},
    create: {
      firstName: 'Carlos',
      lastName: 'Mendoza',
      email: 'carlos@example.com',
      phone: '+591 70000002',
      address: 'Calle Sucre 567',
    },
  });

  console.log('✅ Seed completed successfully!');
  console.log('');
  console.log('👤 Default users:');
  console.log('   Admin:    admin@bakery.com    / Admin123!');
  console.log('   Baker:    baker@bakery.com    / Baker123!');
  console.log('   Cashier:  cashier@bakery.com  / Cashier123!');
  console.log('   Delivery: delivery@bakery.com / Delivery123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
