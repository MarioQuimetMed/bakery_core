import { Controller, Get, Post, Body, Patch, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DeliveryService } from './delivery.service';
import { CreateDeliveryDto, UpdateDeliveryStatusDto, RegisterDeliveryPaymentDto, AssignDriverDto } from './dto/delivery.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Delivery')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('delivery')
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Post() @ApiOperation({ summary: 'Crear registro de delivery' })
  create(@Body() dto: CreateDeliveryDto) { return this.deliveryService.create(dto); }

  @Get() @ApiOperation({ summary: 'Listar deliveries' })
  findAll(@Query() pagination: PaginationDto & { status?: any; driverId?: string }) {
    return this.deliveryService.findAll(pagination);
  }

  @Get(':id') @ApiOperation({ summary: 'Obtener delivery' })
  findOne(@Param('id') id: string) { return this.deliveryService.findOne(id); }

  @Patch(':id/status') @ApiOperation({ summary: 'Actualizar estado' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateDeliveryStatusDto) {
    return this.deliveryService.updateStatus(id, dto);
  }

  @Patch(':id/assign') @ApiOperation({ summary: 'Asignar repartidor' })
  assignDriver(@Param('id') id: string, @Body() dto: AssignDriverDto) {
    return this.deliveryService.assignDriver(id, dto);
  }

  @Post(':id/register-payment') @ApiOperation({ summary: 'Registrar pago contra entrega (ON_DELIVERY)' })
  registerPayment(@Param('id') id: string, @Body() dto: RegisterDeliveryPaymentDto, @Request() req: any) {
    return this.deliveryService.registerPayment(id, dto, req.user.id);
  }
}
