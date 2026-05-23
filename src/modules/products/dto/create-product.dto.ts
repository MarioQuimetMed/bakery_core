import { IsString, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @ApiProperty()
  @IsString({ message: 'El nombre es requerido' })
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'La descripción debe ser texto' })
  description?: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({}, { message: 'El precio debe ser un número válido' })
  @Min(0, { message: 'El precio no puede ser negativo' })
  price: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'El costo debe ser un número válido' })
  @Min(0, { message: 'El costo no puede ser negativo' })
  cost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'La URL de imagen debe ser texto' })
  imageUrl?: string;

  @ApiProperty()
  @IsUUID('4', { message: 'Selecciona una categoría válida' })
  categoryId: string;
}

export class CreateCategoryDto {
  @ApiProperty()
  @IsString({ message: 'El nombre es requerido' })
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'La descripción debe ser texto' })
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'La URL debe ser texto' })
  imageUrl?: string;
}
