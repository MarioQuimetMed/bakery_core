import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SalesService } from './sales.service';
import { CreateSaleDto, OpenCashRegisterDto } from './dto/sale.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Sales')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post() @ApiOperation({ summary: 'Registrar venta' })
  create(@Body() dto: CreateSaleDto, @CurrentUser('id') userId: string) {
    return this.salesService.create(dto, userId);
  }

  @Get() @ApiOperation({ summary: 'Listar ventas' })
  findAll(@Query() pagination: PaginationDto & { startDate?: string; endDate?: string; status?: string }) {
    return this.salesService.findAll(pagination);
  }

  @Get('summary/daily') @ApiOperation({ summary: 'Resumen diario de ventas' })
  getDailySummary(@Query('date') date?: string) { return this.salesService.getDailySummary(date); }

  @Get(':id') @ApiOperation({ summary: 'Obtener venta' })
  findOne(@Param('id') id: string) { return this.salesService.findOne(id); }

  @Patch(':id/complete') @ApiOperation({ summary: 'Completar venta pendiente (entregar y descontar stock)' })
  completeSale(@Param('id') id: string) { return this.salesService.completeSale(id); }

  @Post('cash-register/open') @ApiOperation({ summary: 'Abrir caja' })
  openCashRegister(@Body() dto: OpenCashRegisterDto, @CurrentUser('id') userId: string) {
    return this.salesService.openCashRegister(dto, userId);
  }

  @Post('cash-register/:id/close') @ApiOperation({ summary: 'Cerrar caja' })
  closeCashRegister(@Param('id') id: string, @Body('closingAmount') closingAmount: number) {
    return this.salesService.closeCashRegister(id, closingAmount);
  }
}
