import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      todaySales,
      todayRevenue,
      monthRevenue,
      pendingOrders,
      activeProductionOrders,
      totalProducts,
      totalCustomers,
      lowStockIngredients,
      pendingDeliveries,
    ] = await Promise.all([
      this.prisma.sale.count({ where: { createdAt: { gte: startOfDay, lte: endOfDay }, status: 'COMPLETED' } }),
      this.prisma.sale.aggregate({
        where: { createdAt: { gte: startOfDay, lte: endOfDay }, status: 'COMPLETED' },
        _sum: { total: true },
      }),
      this.prisma.sale.aggregate({
        where: { createdAt: { gte: startOfMonth }, status: 'COMPLETED' },
        _sum: { total: true },
      }),
      this.prisma.order.count({ where: { status: { in: ['PENDING', 'CONFIRMED'] } } }),
      this.prisma.productionOrder.count({ where: { status: { in: ['PENDING', 'PREPARING', 'DECORATING'] } } }),
      this.prisma.product.count({ where: { isActive: true, deletedAt: null } }),
      this.prisma.customer.count({ where: { deletedAt: null } }),
      this.prisma.ingredient.count({ where: { deletedAt: null } }),
      this.prisma.delivery.count({ where: { status: { in: ['PENDING', 'ASSIGNED', 'IN_TRANSIT'] } } }),
    ]);

    return {
      todaySales,
      todayRevenue: todayRevenue._sum.total ?? 0,
      monthRevenue: monthRevenue._sum.total ?? 0,
      pendingOrders,
      activeProductionOrders,
      totalProducts,
      totalCustomers,
      lowStockIngredients,
      pendingDeliveries,
    };
  }

  async getSalesChart(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const sales = await this.prisma.sale.findMany({
      where: { createdAt: { gte: startDate }, status: 'COMPLETED' },
      select: { createdAt: true, total: true },
      orderBy: { createdAt: 'asc' },
    });

    const grouped = sales.reduce((acc: Record<string, number>, sale) => {
      const date = sale.createdAt.toISOString().split('T')[0];
      acc[date] = (acc[date] ?? 0) + Number(sale.total);
      return acc;
    }, {});

    return Object.entries(grouped).map(([date, total]) => ({ date, total }));
  }

  async getTopProducts(limit: number = 10) {
    const result = await this.prisma.saleDetail.groupBy({
      by: ['productId'],
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });

    const productIds = result.map((r) => r.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, price: true, category: { select: { name: true } } },
    });

    return result.map((r) => ({
      ...r,
      product: products.find((p) => p.id === r.productId),
    }));
  }

  async getSalesByCategory() {
    const details = await this.prisma.saleDetail.findMany({
      include: { product: { include: { category: { select: { name: true } } } } },
    });

    const grouped = details.reduce((acc: Record<string, number>, d) => {
      const cat = d.product.category?.name ?? 'Sin categoría';
      acc[cat] = (acc[cat] ?? 0) + Number(d.subtotal);
      return acc;
    }, {});

    return Object.entries(grouped).map(([category, total]) => ({ category, total }));
  }

  async getProductionSummary(days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.prisma.productionOrder.groupBy({
      by: ['status'],
      where: { createdAt: { gte: startDate } },
      _count: { id: true },
    });
  }

  async getLowStockReport() {
    const ingredients = await this.prisma.ingredient.findMany({
      where: { deletedAt: null, isActive: true },
    });
    return ingredients
      .filter((i) => Number(i.stock) <= Number(i.minStock))
      .map((i) => ({ ...i, deficit: Number(i.minStock) - Number(i.stock) }));
  }
}
