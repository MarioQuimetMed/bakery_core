import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDeliveryDto, UpdateDeliveryStatusDto, RegisterDeliveryPaymentDto, AssignDriverDto } from './dto/delivery.dto';
import { PaginationDto, paginateResponse } from '../../common/dto/pagination.dto';
import { DeliveryStatus, OrderStatus, PaymentMode } from '@prisma/client';

@Injectable()
export class DeliveryService {
  constructor(private prisma: PrismaService) {}

  private generateSaleNumber() {
    return `VTA-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Date.now().toString().slice(-5)}`;
  }

  async create(dto: CreateDeliveryDto) {
    const order = await this.prisma.order.findUnique({ where: { id: dto.orderId } });
    if (!order) throw new NotFoundException('Pedido no encontrado');

    return this.prisma.delivery.create({
      data: dto,
      include: {
        order: { include: { customer: { select: { firstName: true, lastName: true, phone: true } } } },
        driver: { select: { firstName: true, lastName: true, phone: true } },
      },
    });
  }

  async findAll(pagination: PaginationDto & { status?: DeliveryStatus; driverId?: string }) {
    const page = Number(pagination.page) || 1;
    const limit = Number(pagination.limit) || 20;
    const { status, driverId } = pagination;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (driverId) where.driverId = driverId;

    const [deliveries, total] = await Promise.all([
      this.prisma.delivery.findMany({
        where, skip, take: limit,
        include: {
          order: { include: { customer: { select: { firstName: true, lastName: true, phone: true } } } },
          driver: { select: { firstName: true, lastName: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.delivery.count({ where }),
    ]);

    return paginateResponse(deliveries, total, page, limit);
  }

  async findOne(id: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      include: {
        order: { include: { customer: true, orderDetails: { include: { product: true } } } },
        driver: { select: { firstName: true, lastName: true, phone: true, email: true } },
      },
    });
    if (!delivery) throw new NotFoundException('Delivery no encontrado');
    return delivery;
  }

  async updateStatus(id: string, dto: UpdateDeliveryStatusDto) {
    const delivery = await this.findOne(id);

    if (dto.status === DeliveryStatus.DELIVERED) {
      const order = delivery.order;
      const isPaid = order?.status === OrderStatus.PAID;
      const isPrePaymentOnRoute = order?.status === OrderStatus.ON_ROUTE && order?.paymentMode === PaymentMode.PRE_PAYMENT;
      if (!order || (!isPaid && !isPrePaymentOnRoute)) {
        const isOnDelivery = order?.paymentMode === PaymentMode.ON_DELIVERY;
        throw new BadRequestException(
          isOnDelivery
            ? 'Debe registrar el pago contra entrega antes de marcar como entregado. Usa el botón "Registrar pago".'
            : 'Debe registrar el cobro del pedido antes de marcarlo como entregado. Vaya al módulo de Cobros.',
        );
      }
      return this.prisma.$transaction(async (tx) => {
        await tx.order.update({ where: { id: delivery.orderId }, data: { status: OrderStatus.DELIVERED } });
        return tx.delivery.update({
          where: { id },
          data: { status: dto.status, notes: dto.notes, deliveredAt: new Date() },
          include: {
            order: { include: { customer: { select: { firstName: true, lastName: true, phone: true } } } },
            driver: { select: { firstName: true, lastName: true, phone: true } },
          },
        });
      });
    }

    const data: any = { status: dto.status, notes: dto.notes };
    if (dto.status === DeliveryStatus.ASSIGNED) data.assignedAt = new Date();

    return this.prisma.delivery.update({ where: { id }, data });
  }

  async assignDriver(id: string, dto: AssignDriverDto) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      include: { order: { select: { status: true, paymentMode: true, orderType: true } } },
    });
    if (!delivery) throw new NotFoundException('Delivery no encontrado');

    if (
      delivery.order?.paymentMode === PaymentMode.PRE_PAYMENT &&
      delivery.order?.status !== OrderStatus.PAID
    ) {
      throw new BadRequestException(
        'El pedido debe ser pagado primero antes de asignar el repartidor. Registra el cobro en el módulo de Cobros.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedDelivery = await tx.delivery.update({
        where: { id },
        data: {
          driverId: dto.driverId,
          status: DeliveryStatus.ASSIGNED,
          assignedAt: new Date(),
          ...(dto.deliveryCost !== undefined && { deliveryCost: dto.deliveryCost }),
        },
        include: { driver: { select: { firstName: true, lastName: true } } },
      });
      await tx.order.update({
        where: { id: delivery.orderId },
        data: { status: OrderStatus.ON_ROUTE },
      });
      return updatedDelivery;
    });
  }

  async registerPayment(id: string, dto: RegisterDeliveryPaymentDto, userId: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      include: {
        order: {
          include: {
            orderDetails: true,
          },
        },
      },
    });
    if (!delivery) throw new NotFoundException('Delivery no encontrado');

    const order = delivery.order;
    if (!order) throw new NotFoundException('Pedido no encontrado');

    if (order.paymentMode !== PaymentMode.ON_DELIVERY) {
      throw new BadRequestException(
        'Este pedido no es de pago contra entrega. Registra el pago desde el módulo de Cobros.',
      );
    }
    if (order.status === OrderStatus.PAID) {
      throw new BadRequestException('El pago de este pedido ya fue registrado.');
    }
    if (order.status !== OrderStatus.READY && order.status !== OrderStatus.ON_ROUTE) {
      throw new BadRequestException('El pedido debe estar en estado Listo o En camino para registrar el pago.');
    }

    const orderTotal = Number(order.totalAmount);
    const deliveryCost = Number(delivery.deliveryCost ?? 0);
    const totalToPay = orderTotal + deliveryCost;

    if (dto.amount < totalToPay) {
      throw new BadRequestException(
        `Monto insuficiente: se requiere ${totalToPay} (pedido: ${orderTotal} + delivery: ${deliveryCost}), se recibió ${dto.amount}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const saleNumber = this.generateSaleNumber();
      const notesLines = [dto.notes, deliveryCost > 0 ? `Costo de delivery: ${deliveryCost}` : null]
        .filter(Boolean)
        .join(' | ');

      const sale = await tx.sale.create({
        data: {
          saleNumber,
          customerId: order.customerId,
          orderId: order.id,
          userId,
          subtotal: totalToPay,
          discount: 0,
          tax: 0,
          total: totalToPay,
          notes: notesLines || null,
          saleDetails: {
            create: order.orderDetails.map((d) => ({
              productId: d.productId,
              quantity: d.quantity,
              unitPrice: Number(d.unitPrice),
              subtotal: Number(d.subtotal),
              discount: 0,
            })),
          },
          payments: {
            create: [{ method: dto.paymentMethod, amount: dto.amount }],
          },
        },
        select: { id: true },
      });

      await tx.order.update({ where: { id: order.id }, data: { status: OrderStatus.DELIVERED } });

      await tx.invoice.create({
        data: {
          invoiceNumber: `FAC-${saleNumber}`,
          saleId: sale.id,
          customerId: order.customerId,
          userId,
          subtotal: totalToPay,
          tax: 0,
          total: totalToPay,
        },
      });

      await tx.delivery.update({
        where: { id },
        data: { status: DeliveryStatus.DELIVERED, deliveredAt: new Date() },
      });

      return tx.delivery.findUnique({
        where: { id },
        include: {
          order: { include: { customer: { select: { firstName: true, lastName: true, phone: true } } } },
          driver: { select: { firstName: true, lastName: true, phone: true } },
        },
      });
    });
  }
}
