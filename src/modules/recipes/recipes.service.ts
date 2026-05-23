import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRecipeDto } from './dto/recipe.dto';

@Injectable()
export class RecipesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateRecipeDto) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('Producto no encontrado');

    const exists = await this.prisma.recipe.findUnique({ where: { productId: dto.productId } });
    if (exists) throw new ConflictException('Ya existe una receta para este producto');

    const { details, ...recipeData } = dto;
    return this.prisma.recipe.create({
      data: {
        ...recipeData,
        recipeDetails: { create: details },
      },
      include: { product: true, recipeDetails: { include: { ingredient: true } } },
    });
  }

  async findAll() {
    return this.prisma.recipe.findMany({
      include: { product: { include: { category: true } }, recipeDetails: { include: { ingredient: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const recipe = await this.prisma.recipe.findUnique({
      where: { id },
      include: { product: { include: { category: true } }, recipeDetails: { include: { ingredient: true } } },
    });
    if (!recipe) throw new NotFoundException('Receta no encontrada');
    return recipe;
  }

  async update(id: string, dto: Partial<CreateRecipeDto>) {
    await this.findOne(id);
    const { details, ...recipeData } = dto;

    if (details) {
      await this.prisma.recipeDetail.deleteMany({ where: { recipeId: id } });
    }

    return this.prisma.recipe.update({
      where: { id },
      data: {
        ...recipeData,
        ...(details ? { recipeDetails: { create: details } } : {}),
      },
      include: { product: true, recipeDetails: { include: { ingredient: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.recipe.delete({ where: { id } });
  }

  async calculateCost(id: string) {
    const recipe = await this.findOne(id);
    const totalCost = recipe.recipeDetails.reduce((sum, detail) => {
      const costPerUnit = Number(detail.ingredient.cost);
      return sum + costPerUnit * Number(detail.quantity);
    }, 0);
    return { recipe, totalCost, costPerUnit: totalCost / (recipe.yield || 1) };
  }
}
