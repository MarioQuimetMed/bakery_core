import { IsString, IsOptional, IsNumber, IsArray, ValidateNested, IsEnum, Min, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

export class SaleDetailDto {
  @ApiProperty() @IsUUID() productId: string;
  @ApiProperty() @Type(() => Number) @Min(1) quantity: number;
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0) unitPrice: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) discount?: number;
}

export class PaymentDto {
  @ApiProperty({ enum: PaymentMethod }) @IsEnum(PaymentMethod) method: PaymentMethod;
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0) amount: number;
  @ApiPropertyOptional() @IsOptional() @IsString() reference?: string;
}

export class CreateSaleDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() customerId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() orderId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() cashRegisterId?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsNumber() @Min(0) discount?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiProperty({ type: [SaleDetailDto] }) @IsArray() @ValidateNested({ each: true }) @Type(() => SaleDetailDto) details: SaleDetailDto[];
  @ApiProperty({ type: [PaymentDto] }) @IsArray() @ValidateNested({ each: true }) @Type(() => PaymentDto) payments: PaymentDto[];
}

export class OpenCashRegisterDto {
  @ApiProperty() @Type(() => Number) @IsNumber() @Min(0) openingAmount: number;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
}
