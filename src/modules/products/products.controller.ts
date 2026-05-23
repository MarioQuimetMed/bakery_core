import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Products')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post() @ApiOperation({ summary: 'Crear producto' })
  create(@Body() dto: CreateProductDto) { return this.productsService.create(dto); }

  @Get() @ApiOperation({ summary: 'Listar productos' })
  findAll(@Query() pagination: PaginationDto & { categoryId?: string; isActive?: string }) {
    return this.productsService.findAll(pagination);
  }

  @Get(':id') @ApiOperation({ summary: 'Obtener producto' })
  findOne(@Param('id') id: string) { return this.productsService.findOne(id); }

  @Patch(':id') @ApiOperation({ summary: 'Actualizar producto' })
  update(@Param('id') id: string, @Body() dto: any) { return this.productsService.update(id, dto); }

  @Delete(':id') @ApiOperation({ summary: 'Eliminar producto' })
  remove(@Param('id') id: string) { return this.productsService.remove(id); }
}
