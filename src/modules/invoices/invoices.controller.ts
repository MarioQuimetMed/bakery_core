import { Controller, Get, Param, Patch, Body, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import type { Response } from 'express';
import { InvoicesService } from './invoices.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Invoices')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get() @ApiOperation({ summary: 'Listar facturas' })
  findAll(@Query() pagination: PaginationDto & { status?: any }) {
    return this.invoicesService.findAll(pagination);
  }

  @Get(':id') @ApiOperation({ summary: 'Obtener factura' })
  findOne(@Param('id') id: string) { return this.invoicesService.findOne(id); }

  @Get(':id/data') @ApiOperation({ summary: 'Datos de factura para PDF' })
  getInvoiceData(@Param('id') id: string) { return this.invoicesService.getInvoiceData(id); }

  @Get(':id/pdf') @ApiOperation({ summary: 'Descargar factura PDF' })
  async downloadPdf(@Param('id') id: string, @Res() res: Response) {
    const { buffer, filename } = await this.invoicesService.generatePdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Patch(':id/cancel') @ApiOperation({ summary: 'Anular factura' })
  cancel(@Param('id') id: string, @Body('reason') reason: string) {
    return this.invoicesService.cancel(id, reason);
  }
}
