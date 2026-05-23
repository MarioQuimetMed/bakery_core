import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { CategoriesController } from './categories.controller';
import { ProductsService } from './products.service';

@Module({ controllers: [CategoriesController, ProductsController], providers: [ProductsService], exports: [ProductsService] })
export class ProductsModule {}
