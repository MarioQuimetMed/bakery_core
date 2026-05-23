import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import sharp from 'sharp';
import { v4 as uuid } from 'uuid';

@Injectable()
export class UploadService {
  private readonly uploadDir = join(process.cwd(), 'uploads');
  private readonly baseUrl: string;

  constructor(private config: ConfigService) {
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
    const port = this.config.get<number>('PORT', 3000);
    this.baseUrl = `http://localhost:${port}`;
  }

  async uploadImage(file: Express.Multer.File): Promise<string> {
    if (!file) throw new BadRequestException('No se proporcionó ningún archivo');

    const filename = `${uuid()}.webp`;
    const filepath = join(this.uploadDir, filename);

    await (sharp as any)(file.buffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(filepath);

    return `${this.baseUrl}/uploads/${filename}`;
  }
}
