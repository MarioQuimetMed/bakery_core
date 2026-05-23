import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { CreateIngredientDto, CreateMovementDto } from './dto/inventory.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Inventory')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('alerts/low-stock') @ApiOperation({ summary: 'Alertas de bajo stock' })
  getLowStockAlerts() { return this.inventoryService.getLowStockAlerts(); }

  @Post('ingredients') @ApiOperation({ summary: 'Crear ingrediente' })
  createIngredient(@Body() dto: CreateIngredientDto) { return this.inventoryService.createIngredient(dto); }

  @Get('ingredients') @ApiOperation({ summary: 'Listar ingredientes' })
  findAllIngredients(@Query() pagination: PaginationDto & { lowStock?: string }) {
    return this.inventoryService.findAllIngredients(pagination);
  }

  @Get('ingredients/:id') @ApiOperation({ summary: 'Obtener ingrediente' })
  findOneIngredient(@Param('id') id: string) { return this.inventoryService.findOneIngredient(id); }

  @Patch('ingredients/:id') @ApiOperation({ summary: 'Actualizar ingrediente' })
  updateIngredient(@Param('id') id: string, @Body() dto: Partial<CreateIngredientDto>) {
    return this.inventoryService.updateIngredient(id, dto);
  }

  @Delete('ingredients/:id') @ApiOperation({ summary: 'Eliminar ingrediente' })
  removeIngredient(@Param('id') id: string) { return this.inventoryService.removeIngredient(id); }

  @Post('movements') @ApiOperation({ summary: 'Registrar movimiento de inventario' })
  createMovement(@Body() dto: CreateMovementDto, @CurrentUser('id') userId: string) {
    return this.inventoryService.createMovement(dto, userId);
  }

  @Get('ingredients/:id/kardex') @ApiOperation({ summary: 'Kardex de ingrediente' })
  getKardex(@Param('id') id: string, @Query() pagination: PaginationDto) {
    return this.inventoryService.getKardex(id, pagination);
  }
}
