import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RecipesService } from './recipes.service';
import { CreateRecipeDto } from './dto/recipe.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Recipes')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Post() @ApiOperation({ summary: 'Crear receta' })
  create(@Body() dto: CreateRecipeDto) { return this.recipesService.create(dto); }

  @Get() @ApiOperation({ summary: 'Listar recetas' })
  findAll() { return this.recipesService.findAll(); }

  @Get(':id') @ApiOperation({ summary: 'Obtener receta' })
  findOne(@Param('id') id: string) { return this.recipesService.findOne(id); }

  @Get(':id/cost') @ApiOperation({ summary: 'Calcular costo de receta' })
  calculateCost(@Param('id') id: string) { return this.recipesService.calculateCost(id); }

  @Patch(':id') @ApiOperation({ summary: 'Actualizar receta' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateRecipeDto>) { return this.recipesService.update(id, dto); }

  @Delete(':id') @ApiOperation({ summary: 'Eliminar receta' })
  remove(@Param('id') id: string) { return this.recipesService.remove(id); }
}
