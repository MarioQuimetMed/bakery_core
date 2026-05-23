import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/order.dto';
import { PaginationDto, paginateResponse } from '../../common/dto/pagination.dto';
import { OrderStatus, OrderType, ProductionStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  private generateOrderNumber() {
    return `ORD-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
  }

  async create(dto: CreateOrderDto, userId: string) {
    const customer = await this.prisma.customer.findUnique({ where: { id: dto.customerId } });
    if (!customer) throw new NotFoundException('Cliente no encontrado');

    if (dto.orderType === OrderType.DELIVERY && !dto.deliveryAddress?.trim()) {
      throw new BadRequestException('La dirección de entrega es requerida para pedidos de envío a domicilio');
    }

    const totalAmount = dto.details.reduce((sum, d) => sum + d.quantity * d.unitPrice, 0);

    return this.prisma.order.create({
      data: {
        orderNumber: this.generateOrderNumber(),
        customerId: dto.customerId,
        createdById: userId,
        deliveryDate: new Date(dto.deliveryDate),
        notes: dto.notes,
        imageUrl: dto.imageUrl,
        isCustom: dto.isCustom ?? false,
        orderType: dto.orderType ?? OrderType.PICKUP,
        paymentMode: dto.orderType === OrderType.DELIVERY ? (dto.paymentMode ?? 'PRE_PAYMENT') : null,
        deliveryAddress: dto.orderType === OrderType.DELIVERY ? dto.deliveryAddress : null,
        totalAmount,
        orderDetails: {
          create: dto.details.map((d) => ({
            productId: d.productId,
            quantity: d.quantity,
            unitPrice: d.unitPrice,
            subtotal: d.quantity * d.unitPrice,
            notes: d.notes,
          })),
        },
      },
      include: {
        customer: true,
        createdBy: { select: { firstName: true, lastName: true } },
        orderDetails: { include: { product: true } },
      },
    });
  }

  async findAll(pagination: PaginationDto & { status?: OrderStatus; customerId?: string }) {
    const page = Number(pagination.page) || 1;
    const limit = Number(pagination.limit) || 20;
    const { search, status, customerId } = pagination;
    const skip = (page - 1) * limit;
    const where: any = { deletedAt: null };
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;
    if (search) where.orderNumber = { contains: search };

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where, skip, take: limit,
        include: {
          customer: { select: { firstName: true, lastName: true, phone: true } },
          createdBy: { select: { firstName: true, lastName: true } },
          orderDetails: { include: { product: { select: { name: true, price: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return paginateResponse(orders, total, page, limit);
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, deletedAt: null },
      include: {
        customer: true,
        createdBy: { select: { firstName: true, lastName: true } },
        orderDetails: { include: { product: { include: { category: true } } } },
        productionOrders: {
          include: {
            recipe: { include: { product: true } },
            assignee: { select: { firstName: true, lastName: true } },
          },
        },
        delivery: { include: { driver: { select: { firstName: true, lastName: true } } } },
      },
    });
    if (!order) throw new NotFoundException('Pedido no encontrado');
    return order;
  }

  async updateStatus(id: string, status: OrderStatus) {
    const order = await this.findOne(id);

    // IN_PRODUCTION solo lo establece el módulo de Producción (auto-sync), nunca manual
    if (status === OrderStatus.IN_PRODUCTION) {
      throw new BadRequestException(
        'El estado En producción se asigna automáticamente al vincular una orden de producción desde el módulo de Producción',
      );
    }

    // ON_ROUTE solo lo establece el módulo de Delivery al asignar el repartidor, nunca manual
    if (status === OrderStatus.ON_ROUTE) {
      throw new BadRequestException(
        'El estado En camino se asigna automáticamente al asignar el repartidor desde el módulo de Delivery',
      );
    }

    // PAID solo lo establece el módulo de Cobros (al registrar el cobro), nunca manual
    if (status === OrderStatus.PAID) {
      throw new BadRequestException(
        'El estado Pagado se asigna automáticamente al registrar el cobro desde el módulo de Cobros',
      );
    }

    // DELIVERED requiere que el pedido esté en estado PAID primero
    if (status === OrderStatus.DELIVERED && order.status !== OrderStatus.PAID) {
      throw new BadRequestException(
        'Debe registrar el cobro del pedido antes de marcarlo como entregado',
      );
    }

    // READY requiere que todas las producciones vinculadas estén finalizadas
    if (status === OrderStatus.READY) {
      if (order.productionOrders.length === 0) {
        throw new BadRequestException(
          'Para marcar como listo, primero crea y finaliza al menos una orden de producción vinculada a este pedido',
        );
      }
      const pendingCount = order.productionOrders.filter(
        (po: any) => po.status !== ProductionStatus.FINISHED,
      ).length;
      if (pendingCount > 0) {
        throw new BadRequestException(
          `No se puede marcar como listo: ${pendingCount} orden(es) de producción aún no han finalizado`,
        );
      }
    }

    return this.prisma.order.update({
      where: { id },
      data: { status },
      include: { customer: { select: { firstName: true, lastName: true } } },
    });
  }

  async cancel(id: string) {
    const order = await this.findOne(id);
    if (([OrderStatus.DELIVERED, OrderStatus.CANCELLED] as OrderStatus[]).includes(order.status)) {
      throw new BadRequestException('No se puede cancelar este pedido');
    }
    return this.prisma.order.update({ where: { id }, data: { status: OrderStatus.CANCELLED } });
  }
}
