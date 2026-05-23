import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductionOrderDto, UpdateProductionStatusDto } from './dto/production.dto';
import { PaginationDto, paginateResponse } from '../../common/dto/pagination.dto';
import { ProductionStatus, OrderStatus, OrderType, DeliveryStatus, MovementType } from '@prisma/client';

@Injectable()
export class ProductionService {
  constructor(private prisma: PrismaService) {}

  private generateOrderNumber() {
    return `PROD-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  }

  async create(dto: CreateProductionOrderDto, userId: string) {
    const recipe = await this.prisma.recipe.findUnique({ where: { id: dto.recipeId } });
    if (!recipe) throw new NotFoundException('Receta no encontrada');

    return this.prisma.$transaction(async (tx) => {
      if (dto.orderId) {
        const order = await tx.order.findUnique({ where: { id: dto.orderId } });
        if (!order) throw new NotFoundException('Pedido no encontrado');
        if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.DELIVERED) {
          throw new BadRequestException(
            `No se puede vincular la producción: el pedido ya fue ${order.status === OrderStatus.CANCELLED ? 'cancelado' : 'entregado'}`,
          );
        }
      }

      const created = await tx.productionOrder.create({
        data: { ...dto, orderNumber: this.generateOrderNumber() },
        include: {
          recipe: { include: { product: true } },
          assignee: { select: { firstName: true, lastName: true } },
          order: { select: { orderNumber: true, status: true } },
        },
      });

      // Auto-sync: vincular → pedido pasa a EN PRODUCCIÓN (si está PENDING o CONFIRMED)
      if (dto.orderId) {
        await tx.order.updateMany({
          where: {
            id: dto.orderId,
            status: { in: [OrderStatus.PENDING, OrderStatus.CONFIRMED] },
          },
          data: { status: OrderStatus.IN_PRODUCTION },
        });
      }

      return created;
    });
  }

  async findAll(pagination: PaginationDto & { status?: ProductionStatus }) {
    const page = Number(pagination.page) || 1;
    const limit = Number(pagination.limit) || 20;
    const { status } = pagination;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      this.prisma.productionOrder.findMany({
        where, skip, take: limit,
        include: {
          recipe: { include: { product: { include: { category: true } } } },
          assignee: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.productionOrder.count({ where }),
    ]);

    return paginateResponse(orders, total, page, limit);
  }

  async findOne(id: string) {
    const order = await this.prisma.productionOrder.findUnique({
      where: { id },
      include: {
        recipe: { include: { product: true, recipeDetails: { include: { ingredient: true } } } },
        assignee: { select: { firstName: true, lastName: true, email: true } },
        order: true,
      },
    });
    if (!order) throw new NotFoundException('Orden de producción no encontrada');
    return order;
  }

  async updateStatus(id: string, dto: UpdateProductionStatusDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.productionOrder.findUnique({ where: { id } });
      if (!existing) throw new NotFoundException('Orden de producción no encontrada');

      const data: any = { status: dto.status, notes: dto.notes };
      if (dto.status === ProductionStatus.PREPARING) data.startDate = new Date();
      if (dto.status === ProductionStatus.FINISHED) data.endDate = new Date();

      // Validate ingredient stock when starting preparation
      if (dto.status === ProductionStatus.PREPARING) {
        const recipe = await tx.recipe.findUnique({
          where: { id: existing.recipeId },
          include: { recipeDetails: { include: { ingredient: true } } },
        });

        for (const detail of recipe.recipeDetails) {
          const needed = Number(detail.quantity) * existing.quantity;
          const available = Number(detail.ingredient.stock);
          if (available < needed) {
            throw new BadRequestException(
              `Stock insuficiente de "${detail.ingredient.name}": disponible ${available} ${detail.ingredient.unit}, necesario ${needed} ${detail.ingredient.unit}`,
            );
          }
        }
      }

      const updated = await tx.productionOrder.update({
        where: { id },
        data,
        include: {
          recipe: { include: { product: true } },
          assignee: { select: { firstName: true, lastName: true } },
        },
      });

      if (dto.status === ProductionStatus.FINISHED) {
        const recipe = await tx.recipe.findUnique({
          where: { id: existing.recipeId },
          include: { recipeDetails: { include: { ingredient: true } } },
        });

        // Deduct each ingredient and record the movement
        for (const detail of recipe.recipeDetails) {
          const totalQty = Number(detail.quantity) * existing.quantity;
          const previousStock = Number(detail.ingredient.stock);
          const newStock = previousStock - totalQty;

          await tx.ingredient.update({ where: { id: detail.ingredientId }, data: { stock: newStock } });
          await tx.inventoryMovement.create({
            data: {
              ingredientId: detail.ingredientId,
              type: MovementType.EXIT,
              quantity: totalQty,
              previousStock,
              newStock,
              reason: `Producción ${existing.orderNumber}`,
              reference: existing.orderNumber,
              userId,
            },
          });
        }

        // Free production (no linked order): add finished units to product stock
        if (!existing.orderId) {
          const unitsProduced = recipe.yield * existing.quantity;
          await tx.product.update({
            where: { id: recipe.productId },
            data: { stock: { increment: unitsProduced } },
          });
        }

        // Auto-sync: if all sibling production orders are finished → order → READY
        if (existing.orderId) {
          const siblings = await tx.productionOrder.findMany({
            where: { orderId: existing.orderId },
            select: { status: true },
          });
          if (siblings.every((po) => po.status === ProductionStatus.FINISHED)) {
            const order = await tx.order.findUnique({
              where: { id: existing.orderId },
              select: { status: true, orderType: true, deliveryAddress: true },
            });
            if (order && order.status !== OrderStatus.CANCELLED && order.status !== OrderStatus.DELIVERED) {
              await tx.order.update({
                where: { id: existing.orderId },
                data: { status: OrderStatus.READY },
              });
              // Auto-create delivery record for DELIVERY type orders (if not already existing)
              if (order.orderType === OrderType.DELIVERY && order.deliveryAddress) {
                const existingDelivery = await tx.delivery.findUnique({
                  where: { orderId: existing.orderId },
                });
                if (!existingDelivery) {
                  await tx.delivery.create({
                    data: {
                      orderId: existing.orderId,
                      address: order.deliveryAddress,
                      status: DeliveryStatus.PENDING,
                    },
                  });
                }
              }
            }
          }
        }
      }

      return updated;
    });
  }

  async assignBaker(id: string, assignedTo: string) {
    await this.findOne(id);
    return this.prisma.productionOrder.update({
      where: { id },
      data: { assignedTo },
      include: { recipe: { include: { product: true } }, assignee: { select: { firstName: true, lastName: true } } },
    });
  }
}
