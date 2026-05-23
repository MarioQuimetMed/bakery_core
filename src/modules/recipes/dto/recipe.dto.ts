import { IsString, IsOptional, IsInt, IsUUID, IsArray, ValidateNested, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class RecipeDetailDto {
  @ApiProperty()
  @IsUUID('4', { message: 'Selecciona un ingrediente válido' })
  ingredientId: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({}, { message: 'La cantidad debe ser un número válido' })
  @Min(0.001, { message: 'La cantidad debe ser mayor a 0' })
  quantity: number;

  @ApiProperty()
  @IsString({ message: 'La unidad es requerida' })
  unit: string;
}

export class CreateRecipeDto {
  @ApiProperty()
  @IsUUID('4', { message: 'Selecciona un producto válido' })
  productId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'La descripción debe ser texto' })
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El rendimiento debe ser un número entero' })
  yield?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El tiempo de preparación debe ser un número entero' })
  preparationTime?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Las instrucciones deben ser texto' })
  instructions?: string;

  @ApiProperty({ type: [RecipeDetailDto] })
  @IsArray({ message: 'Se requiere al menos un ingrediente' })
  @ValidateNested({ each: true })
  @Type(() => RecipeDetailDto)
  details: RecipeDetailDto[];
}
