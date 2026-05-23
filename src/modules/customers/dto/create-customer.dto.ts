import { IsString, IsEmail, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomerDto {
  @ApiProperty()
  @IsString({ message: 'El nombre es requerido' })
  firstName: string;

  @ApiProperty()
  @IsString({ message: 'El apellido es requerido' })
  lastName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail({}, { message: 'El email no es válido' })
  email?: string;

  @ApiProperty()
  @IsString({ message: 'El teléfono es requerido' })
  phone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'La dirección debe ser texto' })
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'Las notas deben ser texto' })
  notes?: string;
}
