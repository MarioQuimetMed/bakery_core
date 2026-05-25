import { Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
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
    try {
      const { rows } = await this.pool.query(
        `SELECT id, TRIM(nombre) AS nombre, TRIM(descripcion) AS descripcion, url_image, created_at, update_at
         FROM producto WHERE id = $1`,
        [id],
      );
      if (rows.length === 0) {
        throw new NotFoundException(`Producto con ID ${id} no encontrado`);
      }
      return rows[0];
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException(`Error al obtener el producto: ${err.message}`);
    }
  }

  async update(id: number, updateData: Partial<CreateProductoDto>) {
    try {
      const { rows } = await this.pool.query(
        `UPDATE producto 
         SET nombre = COALESCE($1, nombre), 
             descripcion = COALESCE($2, descripcion), 
             update_at = NOW() 
         WHERE id = $3 
         RETURNING id, TRIM(nombre) AS nombre, TRIM(descripcion) AS descripcion, url_image, created_at, update_at`,
        [updateData.nombre ?? null, updateData.descripcion ?? null, id],
      );
      if (rows.length === 0) {
        throw new NotFoundException(`Producto con ID ${id} no encontrado`);
      }
      return rows[0];
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException(`Error al actualizar el producto: ${err.message}`);
    }
  }

  async remove(id: number) {
    try {
      const { rows } = await this.pool.query(
        `DELETE FROM producto WHERE id = $1 RETURNING id`,
        [id],
      );
      if (rows.length === 0) {
        throw new NotFoundException(`Producto con ID ${id} no encontrado`);
      }
      return { message: `Producto con ID ${id} eliminado correctamente` };
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      throw new InternalServerErrorException(`Error al eliminar el producto: ${err.message}`);
    }
  }
}
