import { ApiProperty } from '@nestjs/swagger';

export class CreateProductoDto {
  @ApiProperty({ description: 'Nombre del producto', example: 'Pan de molde' })
  nombre: string;

  @ApiProperty({ description: 'Descripción del producto', example: 'Pan blanco suave', required: false })
  descripcion?: string;
}
