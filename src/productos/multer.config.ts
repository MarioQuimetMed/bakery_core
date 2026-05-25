import { diskStorage } from 'multer';
import { extname } from 'path';
import { BadRequestException } from '@nestjs/common';

export const multerOptions = {
  storage: diskStorage({
    destination: './uploads/productos',
    filename: (_req, file, callback) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      callback(null, uniqueSuffix + extname(file.originalname));
    },
  }),
  fileFilter: (_req: any, file: Express.Multer.File, callback: any) => {
    if (!file.mimetype.match(/^image\/(jpg|jpeg|png|gif|webp)$/)) {
      return callback(new BadRequestException('Solo se permiten imágenes'), false);
    }
    callback(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
};
