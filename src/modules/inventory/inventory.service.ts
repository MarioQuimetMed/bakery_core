import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateIngredientDto, CreateMovementDto } from './dto/inventory.dto';
import { PaginationDto, paginateResponse } from '../../common/dto/pagination.dto';
import { MovementType } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async createIngredient(dto: CreateIngredientDto) {
    return this.prisma.ingredient.create({ data: dto as any });
  }

  async findAllIngredients(pagination: PaginationDto & { lowStock?: string }) {
    const page = Number(pagination.page) || 1;
    const limit = Number(pagination.limit) || 20;
    const { search, lowStock } = pagination;
    const skip = (page - 1) * limit;
    const where: any = { deletedAt: null };
    if (search) where.name = { contains: search, mode: 'insensitive' };
    if (lowStock === 'true') where.stock = { lte: this.prisma.ingredient.fields.minStock };

    const [ingredients, total] = await Promise.all([
      this.prisma.ingredient.findMany({ where, skip, take: limit, orderBy: { name: 'asc' } }),
      this.prisma.ingredient.count({ where }),
    ]);

    const data = ingredients.map((i) => ({
      ...i,
      isLowStock: Number(i.stock) <= Number(i.minStock),
    }));

    return paginateResponse(data, total, page, limit);
  }

  async findOneIngredient(id: string) {
    const ingredient = await this.prisma.ingredient.findFirst({
      where: { id, deletedAt: null },
      include: { inventoryMovements: { take: 20, orderBy: { createdAt: 'desc' }, include: { user: { select: { firstName: true, lastName: true } } } } },
    });
    if (!ingredient) throw new NotFoundException('Ingrediente no encontrado');
    return ingredient;
  }

  async updateIngredient(id: string, dto: Partial<CreateIngredientDto>) {
    await this.findOneIngredient(id);
    return this.prisma.ingredient.update({ where: { id }, data: dto as any });
  }

  async removeIngredient(id: string) {
    await this.findOneIngredient(id);
    return this.prisma.ingredient.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async createMovement(dto: CreateMovementDto, userId: string) {
    const ingredient = await this.prisma.ingredient.findUnique({ where: { id: dto.ingredientId } });
    if (!ingredient) throw new NotFoundException('Ingrediente no encontrado');

    const previousStock = Number(ingredient.stock);
    let newStock: number;

    if (dto.type === MovementType.ENTRY || dto.type === MovementType.ADJUSTMENT) {
      newStock = previousStock + dto.quantity;
    } else {
      newStock = previousStock - dto.quantity;
      if (newStock < 0) throw new BadRequestException('Stock insuficiente');
    }

    const [movement] = await this.prisma.$transaction([
      this.prisma.inventoryMovement.create({
        data: {
          ingredientId: dto.ingredientId,
          type: dto.type,
          quantity: dto.quantity,
          previousStock,
          newStock,
          reason: dto.reason,
          reference: dto.reference,
          userId,
        },
        include: { ingredient: true, user: { select: { firstName: true, lastName: true } } },
      }),
      this.prisma.ingredient.update({
        where: { id: dto.ingredientId },
        data: { stock: newStock },
      }),
    ]);

    return movement;
  }

  async getKardex(ingredientId: string, pagination: PaginationDto) {
    const { page = 1, limit = 50 } = pagination;
    const skip = (page - 1) * limit;

    await this.findOneIngredient(ingredientId);

    const [movements, total] = await Promise.all([
      this.prisma.inventoryMovement.findMany({
        where: { ingredientId },
        skip, take: limit,
        include: { user: { select: { firstName: true, lastName: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.inventoryMovement.count({ where: { ingredientId } }),
    ]);

    return paginateResponse(movements, total, page, limit);
  }

  async getLowStockAlerts() {
    const ingredients = await this.prisma.ingredient.findMany({
      where: { deletedAt: null, isActive: true },
    });
    return ingredients.filter((i) => Number(i.stock) <= Number(i.minStock));
  }
}
