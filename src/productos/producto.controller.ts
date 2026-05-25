import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { multerOptions } from './multer.config';
import { ProductoService } from './producto.service';
import { CreateProductoDto } from './dto/create-producto.dto';

@ApiTags('Productos')
@Controller('productos')
export class ProductoController {
  constructor(private readonly productoService: ProductoService) {}

  @Post()
  @UseInterceptors(FileInterceptor('imagen', multerOptions))
  @ApiOperation({ summary: 'Crear un nuevo producto' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['nombre'],
      properties: {
        nombre: { type: 'string', example: 'Pan de molde' },
        descripcion: { type: 'string', example: 'Pan blanco suave', nullable: true },
        imagen: { type: 'string', format: 'binary', description: 'Imagen del producto (JPG, PNG, GIF, WebP — máx. 5MB)' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Producto creado exitosamente' })
  @ApiResponse({ status: 400, description: 'Tipo de archivo no permitido' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  create(
    @Body() dto: CreateProductoDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const urlImagen = file ? `/uploads/productos/${file.filename}` : undefined;
    return this.productoService.create(dto, urlImagen);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los productos' })
  @ApiResponse({ status: 200, description: 'Lista de productos ordenada por fecha de creación' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  findAll() {
    return this.productoService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un producto por ID' })
  @ApiParam({ name: 'id', type: 'number', description: 'ID del producto' })
  @ApiResponse({ status: 200, description: 'Producto encontrado' })
  findOne(@Param('id') id: string) {
    return this.productoService.findOne(+id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar un producto por ID' })
  @ApiParam({ name: 'id', type: 'number', description: 'ID del producto' })
  @ApiBody({ 
    description: 'Datos a actualizar del producto',
    type: CreateProductoDto, 
    required: false 
  })
  @ApiResponse({ status: 200, description: 'Producto actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  update(@Param('id') id: string, @Body() updateData: Partial<CreateProductoDto>) {
    return this.productoService.update(+id, updateData);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un producto por ID' })
  @ApiParam({ name: 'id', type: 'number', description: 'ID del producto' })
  @ApiResponse({ status: 204, description: 'Producto eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Producto no encontrado' })
  remove(@Param('id') id: string) {
    return this.productoService.remove(+id);
  }
}
