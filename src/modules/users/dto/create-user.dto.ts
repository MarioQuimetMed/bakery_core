import { IsEmail, IsString, MinLength, IsEnum, IsOptional, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ example: 'john@bakery.com' })
  @IsEmail({}, { message: 'El email no es válido' })
  email: string;

  @ApiProperty({ minLength: 6 })
  @IsString({ message: 'La contraseña es requerida' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @ApiProperty()
  @IsString({ message: 'El nombre es requerido' })
  firstName: string;

  @ApiProperty()
  @IsString({ message: 'El apellido es requerido' })
  lastName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser texto' })
  phone?: string;

  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole, { message: 'El rol seleccionado no es válido' })
  role: UserRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString({ message: 'La URL del avatar debe ser texto' })
  avatarUrl?: string;
}
