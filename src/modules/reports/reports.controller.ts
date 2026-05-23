import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Reports')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard') @ApiOperation({ summary: 'Estadísticas del dashboard' })
  getDashboardStats() { return this.reportsService.getDashboardStats(); }

  @Get('sales-chart') @ApiOperation({ summary: 'Gráfico de ventas por día' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  getSalesChart(@Query('days') days?: number) { return this.reportsService.getSalesChart(days ?? 30); }

  @Get('top-products') @ApiOperation({ summary: 'Productos más vendidos' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getTopProducts(@Query('limit') limit?: number) { return this.reportsService.getTopProducts(limit ?? 10); }

  @Get('sales-by-category') @ApiOperation({ summary: 'Ventas por categoría' })
  getSalesByCategory() { return this.reportsService.getSalesByCategory(); }

  @Get('production-summary') @ApiOperation({ summary: 'Resumen de producción' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  getProductionSummary(@Query('days') days?: number) { return this.reportsService.getProductionSummary(days ?? 7); }

  @Get('low-stock') @ApiOperation({ summary: 'Reporte de ingredientes con bajo stock' })
  getLowStockReport() { return this.reportsService.getLowStockReport(); }
}
