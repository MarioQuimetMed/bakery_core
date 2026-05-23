import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Customers')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post() @ApiOperation({ summary: 'Crear cliente' })
  create(@Body() dto: CreateCustomerDto) { return this.customersService.create(dto); }

  @Get() @ApiOperation({ summary: 'Listar clientes' })
  findAll(@Query() pagination: PaginationDto) { return this.customersService.findAll(pagination); }

  @Get(':id') @ApiOperation({ summary: 'Obtener cliente' })
  findOne(@Param('id') id: string) { return this.customersService.findOne(id); }

  @Patch(':id') @ApiOperation({ summary: 'Actualizar cliente' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateCustomerDto>) { return this.customersService.update(id, dto); }

  @Delete(':id') @ApiOperation({ summary: 'Eliminar cliente' })
  remove(@Param('id') id: string) { return this.customersService.remove(id); }
}
