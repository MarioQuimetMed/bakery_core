import { IsString, IsOptional, IsUUID, IsEnum, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DeliveryStatus, PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateDeliveryDto {
  @ApiProperty()
  @IsUUID('4', { message: 'Selecciona un pedido válido' })
  orderId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4', { message: 'El conductor seleccionado no es válido' })
  driverId?: string;

  @ApiProperty()
  @IsString({ message: 'La dirección de entrega es requerida' })
  address: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Las notas deben ser texto' })
  notes?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'El costo de delivery debe ser un número válido' })
  @Min(0, { message: 'El costo de delivery no puede ser negativo' })
  deliveryCost?: number;
}

export class AssignDriverDto {
  @ApiProperty()
  @IsUUID('4', { message: 'El repartidor seleccionado no es válido' })
  driverId: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'El costo de delivery debe ser un número válido' })
  @Min(0, { message: 'El costo de delivery no puede ser negativo' })
  deliveryCost?: number;
}

export class UpdateDeliveryStatusDto {
  @ApiProperty({ enum: DeliveryStatus })
  @IsEnum(DeliveryStatus, { message: 'El estado seleccionado no es válido' })
  status: DeliveryStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Las notas deben ser texto' })
  notes?: string;
}

export class RegisterDeliveryPaymentDto {
  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod, { message: 'El método de pago seleccionado no es válido' })
  paymentMethod: PaymentMethod;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber({}, { message: 'El monto debe ser un número válido' })
  @Min(0.01, { message: 'El monto debe ser mayor a cero' })
  amount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
