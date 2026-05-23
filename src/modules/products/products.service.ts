import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto, CreateCategoryDto } from './dto/create-product.dto';
import { PaginationDto, paginateResponse } from '../../common/dto/pagination.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async createCategory(dto: CreateCategoryDto) {
    const exists = await this.prisma.category.findUnique({ where: { name: dto.name } });
    if (exists) throw new ConflictException('Categoría ya existe');
    return this.prisma.category.create({ data: dto });
  }

  async updateCategory(id: string, dto: Partial<CreateCategoryDto>) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Categoría no encontrada');
    if (dto.name && dto.name !== category.name) {
      const exists = await this.prisma.category.findUnique({ where: { name: dto.name } });
      if (exists) throw new ConflictException('Ya existe una categoría con ese nombre');
    }
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async removeCategory(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id }, include: { _count: { select: { products: true } } } });
    if (!category) throw new NotFoundException('Categoría no encontrada');
    if ((category as any)._count.products > 0) throw new ConflictException('No se puede eliminar una categoría con productos asociados');
    return this.prisma.category.update({ where: { id }, data: { isActive: false } });
  }

  async findAllCategories() {
    return this.prisma.category.findMany({
      where: { isActive: true },
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });
  }

  private validateCost(price: number, cost?: number) {
    if (cost !== undefined && cost > price) {
      throw new BadRequestException('El costo no puede ser mayor al precio de venta');
    }
  }

  async create(dto: CreateProductDto) {
    this.validateCost(dto.price, dto.cost);
    const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
    if (!category) throw new NotFoundException('Categoría no encontrada');
    return this.prisma.product.create({
      data: dto,
      include: { category: true },
    });
  }

  async findAll(pagination: PaginationDto & { categoryId?: string; isActive?: string }) {
    const page = Number(pagination.page) || 1;
    const limit = Number(pagination.limit) || 20;
    const { search, categoryId, isActive } = pagination;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (categoryId) where.categoryId = categoryId;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where, skip, take: limit,
        include: { category: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return paginateResponse(products, total, page, limit);
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: { category: true, recipe: { include: { recipeDetails: { include: { ingredient: true } } } } },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');
    return product;
  }

  async update(id: string, dto: Partial<CreateProductDto> & { isActive?: boolean }) {
    const existing = await this.findOne(id);
    const price = dto.price ?? Number(existing.price);
    const cost = dto.cost !== undefined ? dto.cost : (existing.cost ? Number(existing.cost) : undefined);
    this.validateCost(price, cost);
    return this.prisma.product.update({
      where: { id }, data: dto,
      include: { category: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.product.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  }
}
