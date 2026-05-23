import { IsString, IsNumber, IsOptional, IsEnum, IsUUID, Min, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { MovementType } from '@prisma/client';

export class CreateIngredientDto {
  @ApiProperty()
  @IsString({ message: 'El nombre es requerido' })
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'La descripción debe ser texto' })
  description?: string;

  @ApiProperty({ example: 'kg' })
  @IsString({ message: 'La unidad de medida es requerida' })
  unit: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'El stock debe ser un número válido' })
  @Min(0, { message: 'El stock no puede ser negativo' })
  stock?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'El stock mínimo debe ser un número válido' })
  @Min(0, { message: 'El stock mínimo no puede ser negativo' })
  minStock?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'El costo debe ser un número válido' })
  @Min(0, { message: 'El costo no puede ser negativo' })
  cost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de vencimiento no es válida' })
  expiryDate?: string;
}

export class CreateMovementDto {
  @ApiProperty()
  @IsUUID('4', { message: 'El ingrediente no es válido' })
  ingredientId: string;

  @ApiProperty({ enum: MovementType })
  @IsEnum(MovementType, { message: 'El tipo de movimiento no es válido' })
  type: MovementType;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({}, { message: 'La cantidad debe ser un número válido' })
  @Min(0.001, { message: 'La cantidad debe ser mayor a 0' })
  quantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'El motivo debe ser texto' })
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'La referencia debe ser texto' })
  reference?: string;
}
