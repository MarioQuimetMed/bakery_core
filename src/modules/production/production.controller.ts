import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProductionService } from './production.service';
import { CreateProductionOrderDto, UpdateProductionStatusDto } from './dto/production.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Production')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('production')
export class ProductionController {
  constructor(private readonly productionService: ProductionService) {}

  @Post() @ApiOperation({ summary: 'Crear orden de producción' })
  create(@Body() dto: CreateProductionOrderDto, @CurrentUser('id') userId: string) {
    return this.productionService.create(dto, userId);
  }

  @Get() @ApiOperation({ summary: 'Listar órdenes de producción' })
  findAll(@Query() pagination: PaginationDto & { status?: any }) {
    return this.productionService.findAll(pagination);
  }

  @Get(':id') @ApiOperation({ summary: 'Obtener orden de producción' })
  findOne(@Param('id') id: string) { return this.productionService.findOne(id); }

  @Patch(':id/status') @ApiOperation({ summary: 'Actualizar estado de producción' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateProductionStatusDto, @CurrentUser('id') userId: string) {
    return this.productionService.updateStatus(id, dto, userId);
  }

  @Patch(':id/assign') @ApiOperation({ summary: 'Asignar pastelero' })
  assignBaker(@Param('id') id: string, @Body('assignedTo') assignedTo: string) {
    return this.productionService.assignBaker(id, assignedTo);
  }
}
