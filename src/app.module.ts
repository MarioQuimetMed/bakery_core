import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { ProductoModule } from './productos/producto.module';

@Module({
  imports: [DatabaseModule, ProductoModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
