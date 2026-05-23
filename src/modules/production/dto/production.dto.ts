import { IsString, IsOptional, IsInt, IsUUID, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ProductionStatus } from '@prisma/client';

export class CreateProductionOrderDto {
  @ApiProperty()
  @IsUUID('4', { message: 'Selecciona una receta válida' })
  recipeId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: 'El pedido asociado no es válido' })
  orderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: 'El panadero asignado no es válido' })
  assignedTo?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(1, { message: 'La cantidad debe ser al menos 1' })
  quantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Las notas deben ser texto' })
  notes?: string;
}

export class UpdateProductionStatusDto {
  @ApiProperty({ enum: ProductionStatus })
  @IsEnum(ProductionStatus, { message: 'El estado seleccionado no es válido' })
  status: ProductionStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Las notas deben ser texto' })
  notes?: string;
}
