import { Inject, Injectable, InternalServerErrorException } from '@nestjs/common';
import { Pool } from 'pg';
import { DATABASE_POOL } from '../database/database.provider';
import { CreateProductoDto } from './dto/create-producto.dto';

@Injectable()
export class ProductoService {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  async create(dto: CreateProductoDto, urlImagen?: string) {
    try {
      const { rows } = await this.pool.query(
        `INSERT INTO producto (nombre, descripcion, url_image, created_at, update_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING id, TRIM(nombre) AS nombre, TRIM(descripcion) AS descripcion, url_image, created_at, update_at`,
        [dto.nombre, dto.descripcion ?? null, urlImagen ?? null],
      );
      return rows[0];
    } catch (err) {
      throw new InternalServerErrorException(`Error al crear producto: ${err.message}`);
    }
  }

  async findAll() {
    try {
      const { rows } = await this.pool.query(
        `SELECT id, TRIM(nombre) AS nombre, TRIM(descripcion) AS descripcion, url_image, created_at, update_at
         FROM producto ORDER BY created_at DESC`,
      );
      return rows;
    } catch (err) {
      throw new InternalServerErrorException(`Error al obtener productos: ${err.message}`);
    }
  }

  async findOne(id: number) {
    return { message: `findOne #${id} - not implemented` };
  }

  async update(id: number, _updateData: any) {
    return { message: `update #${id} - not implemented` };
  }

  async remove(id: number) {
    return { message: `remove #${id} - not implemented` };
  }
}
