import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/order.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Orders')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post() @ApiOperation({ summary: 'Crear pedido' })
  create(@Body() dto: CreateOrderDto, @CurrentUser('id') userId: string) {
    return this.ordersService.create(dto, userId);
  }

  @Get() @ApiOperation({ summary: 'Listar pedidos' })
  findAll(@Query() pagination: PaginationDto & { status?: any; customerId?: string }) {
    return this.ordersService.findAll(pagination);
  }

  @Get(':id') @ApiOperation({ summary: 'Obtener pedido' })
  findOne(@Param('id') id: string) { return this.ordersService.findOne(id); }

  @Patch(':id/status') @ApiOperation({ summary: 'Actualizar estado del pedido' })
  updateStatus(@Param('id') id: string, @Body('status') status: any) {
    return this.ordersService.updateStatus(id, status);
  }

  @Patch(':id/cancel') @ApiOperation({ summary: 'Cancelar pedido' })
  cancel(@Param('id') id: string) { return this.ordersService.cancel(id); }
}
