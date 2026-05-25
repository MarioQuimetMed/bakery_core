import { Module } from '@nestjs/common';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { ProductoController } from './producto.controller';
import { ProductoService } from './producto.service';

@Module({
  imports: [CloudinaryModule],
  controllers: [ProductoController],
  providers: [ProductoService],
})
export class ProductoModule {}
