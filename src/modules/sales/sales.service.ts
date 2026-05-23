import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSaleDto, OpenCashRegisterDto } from './dto/sale.dto';
import { PaginationDto, paginateResponse } from '../../common/dto/pagination.dto';
import { OrderStatus, SaleStatus } from '@prisma/client';

@Injectable()
export class SalesService {
  constructor(private prisma: PrismaService) {}

  private generateSaleNumber() {
    return `VTA-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Date.now().toString().slice(-5)}`;
  }

  async create(dto: CreateSaleDto, userId: string) {
    const subtotal = dto.details.reduce((sum, d) => sum + d.quantity * d.unitPrice - (d.discount ?? 0), 0);
    const discount = dto.discount ?? 0;
    const tax = 0;
    const total = subtotal - discount + tax;

    const totalPaid = dto.payments.reduce((sum, p) => sum + p.amount, 0);
    if (totalPaid < total) {
      throw new BadRequestException(`Monto pagado (${totalPaid}) es insuficiente (${total})`);
    }

    let saleStatus: SaleStatus = SaleStatus.COMPLETED;

    return this.prisma.$transaction(async (tx) => {
      if (dto.orderId) {
        const order = await tx.order.findUnique({ where: { id: dto.orderId } });
        if (!order) throw new NotFoundException('Pedido no encontrado');
        if (order.status !== OrderStatus.READY) {
          const labels: Record<string, string> = {
            PENDING: 'Pendiente', CONFIRMED: 'Confirmado', IN_PRODUCTION: 'En producción',
            PAID: 'Ya pagado', DELIVERED: 'Ya entregado', CANCELLED: 'Cancelado',
          };
          throw new BadRequestException(
            `No se puede cobrar: el pedido está en estado "${labels[order.status] ?? order.status}". Solo se pueden cobrar pedidos en estado Listo`,
          );
        }
      } else {
        // Direct/counter sale: check stock for all items
        let allHaveStock = true;
        for (const detail of dto.details) {
          const product = await tx.product.findUnique({ where: { id: detail.productId } });
          if (!product) throw new NotFoundException(`Producto no encontrado`);
          if (product.stock < detail.quantity) allHaveStock = false;
        }

        if (allHaveStock) {
          for (const detail of dto.details) {
            await tx.product.update({
              where: { id: detail.productId },
              data: { stock: { decrement: detail.quantity } },
            });
          }
        }
        // If not allHaveStock → PENDING sale, no stock decrement now
        saleStatus = allHaveStock ? SaleStatus.COMPLETED : SaleStatus.PENDING;
      }

      const sale = await tx.sale.create({
        data: {
          saleNumber: this.generateSaleNumber(),
          customerId: dto.customerId,
          orderId: dto.orderId,
          userId,
          cashRegisterId: dto.cashRegisterId,
          status: saleStatus,
          subtotal,
          discount,
          tax,
          total,
          notes: dto.notes,
          saleDetails: {
            create: dto.details.map((d) => ({
              productId: d.productId,
              quantity: d.quantity,
              unitPrice: d.unitPrice,
              subtotal: d.quantity * d.unitPrice - (d.discount ?? 0),
              discount: d.discount ?? 0,
            })),
          },
          payments: { create: dto.payments },
        },
        include: {
          customer: { select: { firstName: true, lastName: true } },
          saleDetails: { include: { product: { select: { name: true } } } },
          payments: true,
          user: { select: { firstName: true, lastName: true } },
        },
      });

      if (dto.orderId) {
        await tx.order.update({ where: { id: dto.orderId }, data: { status: OrderStatus.PAID } });
      }

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber: `FAC-${sale.saleNumber}`,
          saleId: sale.id,
          customerId: dto.customerId,
          userId,
          subtotal,
          tax,
          total,
        },
      });

      return { ...sale, invoice };
    });
  }

  async findAll(pagination: PaginationDto & { startDate?: string; endDate?: string; status?: string }) {
    const page = Number(pagination.page) || 1;
    const limit = Number(pagination.limit) || 20;
    const { startDate, endDate, status } = pagination;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (startDate && endDate) {
      where.createdAt = { gte: new Date(startDate), lte: new Date(endDate) };
    }
    if (status) where.status = status;

    const [sales, total] = await Promise.all([
      this.prisma.sale.findMany({
        where, skip, take: limit,
        include: {
          customer: { select: { firstName: true, lastName: true } },
          saleDetails: { include: { product: { select: { name: true } } } },
          payments: true,
          user: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.sale.count({ where }),
    ]);

    return paginateResponse(sales, total, page, limit);
  }

  async findOne(id: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        customer: true,
        saleDetails: { include: { product: { include: { category: true } } } },
        payments: true,
        invoice: true,
        user: { select: { firstName: true, lastName: true } },
        order: { select: { orderNumber: true } },
      },
    });
    if (!sale) throw new NotFoundException('Venta no encontrada');
    return sale;
  }

  async getDailySummary(date?: string) {
    const target = date ? new Date(date) : new Date();
    const start = new Date(target.setHours(0, 0, 0, 0));
    const end = new Date(target.setHours(23, 59, 59, 999));

    const [sales, totalRevenue, byMethod] = await Promise.all([
      this.prisma.sale.count({ where: { createdAt: { gte: start, lte: end }, status: 'COMPLETED' } }),
      this.prisma.sale.aggregate({
        where: { createdAt: { gte: start, lte: end }, status: 'COMPLETED' },
        _sum: { total: true },
      }),
      this.prisma.payment.groupBy({
        by: ['method'],
        where: { sale: { createdAt: { gte: start, lte: end }, status: 'COMPLETED' } },
        _sum: { amount: true },
      }),
    ]);

    return { date: start, totalSales: sales, totalRevenue: totalRevenue._sum.total ?? 0, byPaymentMethod: byMethod };
  }

  async completeSale(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id },
        include: { saleDetails: { include: { product: { select: { name: true, stock: true } } } } },
      });
      if (!sale) throw new NotFoundException('Venta no encontrada');
      if (sale.status !== SaleStatus.PENDING) {
        throw new BadRequestException('Solo se pueden completar ventas en estado pendiente');
      }

      for (const detail of sale.saleDetails) {
        if (!detail.product) throw new NotFoundException('Producto no encontrado');
        if (detail.product.stock < detail.quantity) {
          throw new BadRequestException(
            `Stock insuficiente de "${detail.product.name}": disponible ${detail.product.stock}, requerido ${detail.quantity}`,
          );
        }
      }

      for (const detail of sale.saleDetails) {
        await tx.product.update({
          where: { id: detail.productId },
          data: { stock: { decrement: detail.quantity } },
        });
      }

      return tx.sale.update({
        where: { id },
        data: { status: SaleStatus.COMPLETED },
        include: {
          customer: { select: { firstName: true, lastName: true } },
          saleDetails: { include: { product: { select: { name: true } } } },
          payments: true,
          user: { select: { firstName: true, lastName: true } },
        },
      });
    });
  }

  async openCashRegister(dto: OpenCashRegisterDto, userId: string) {
    return this.prisma.cashRegister.create({
      data: { userId, openingAmount: dto.openingAmount, notes: dto.notes },
    });
  }

  async closeCashRegister(id: string, closingAmount: number) {
    return this.prisma.cashRegister.update({
      where: { id },
      data: { closingAmount, closedAt: new Date() },
      include: { sales: { select: { total: true } } },
    });
  }
}
