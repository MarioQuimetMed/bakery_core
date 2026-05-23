import { IsString, IsOptional, IsInt, IsUUID, IsArray, ValidateNested, IsNumber, Min, IsDateString, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { OrderType, PaymentMode } from '@prisma/client';

export class OrderDetailDto {
  @ApiProperty()
  @IsUUID('4', { message: 'El producto seleccionado no es válido' })
  productId: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt({ message: 'La cantidad debe ser un número entero' })
  @Min(1, { message: 'La cantidad debe ser al menos 1' })
  quantity: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({}, { message: 'El precio unitario debe ser un número válido' })
  @Min(0, { message: 'El precio unitario no puede ser negativo' })
  unitPrice: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Las notas deben ser texto' })
  notes?: string;
}

export class CreateOrderDto {
  @ApiProperty()
  @IsUUID('4', { message: 'Selecciona un cliente válido' })
  customerId: string;

  @ApiProperty()
  @IsDateString({}, { message: 'La fecha de entrega no es válida' })
  deliveryDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Las notas deben ser texto' })
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'La URL de imagen debe ser texto' })
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean({ message: 'El campo personalizado debe ser verdadero o falso' })
  isCustom?: boolean;

  @ApiProperty({ enum: OrderType })
  @IsEnum(OrderType, { message: 'El tipo de pedido debe ser DELIVERY o PICKUP' })
  orderType: OrderType;

  @ApiPropertyOptional({ enum: PaymentMode })
  @IsOptional()
  @IsEnum(PaymentMode, { message: 'El modo de pago debe ser PRE_PAYMENT u ON_DELIVERY' })
  paymentMode?: PaymentMode;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'La dirección de entrega debe ser texto' })
  deliveryAddress?: string;

  @ApiProperty({ type: [OrderDetailDto] })
  @IsArray({ message: 'Se requiere al menos un producto en el pedido' })
  @ValidateNested({ each: true })
  @Type(() => OrderDetailDto)
  details: OrderDetailDto[];
}
