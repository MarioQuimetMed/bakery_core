import { Injectable, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService implements OnModuleInit {
	async onModuleInit() {
		const cloudinaryUrl = process.env.CLOUDINARY_URL;

		if (!cloudinaryUrl) {
			throw new InternalServerErrorException('CLOUDINARY_URL no está configurada');
		}

		let parsedUrl: URL;

		try {
			parsedUrl = new URL(cloudinaryUrl);
		} catch {
			throw new InternalServerErrorException('CLOUDINARY_URL tiene un formato inválido');
		}

		const apiKey = parsedUrl.username;
		const apiSecret = parsedUrl.password;
		const cloudName = parsedUrl.hostname;

		if (!apiKey || !apiSecret || !cloudName) {
			throw new InternalServerErrorException('CLOUDINARY_URL debe incluir api_key, api_secret y cloud_name');
		}

		cloudinary.config({
			cloud_name: cloudName,
			api_key: apiKey,
			api_secret: apiSecret,
			secure: true,
		});
	}

	async uploadImage(filePath: string): Promise<string> {
		try {
			const result = await cloudinary.uploader.upload(filePath, {
				folder: 'bakery_core/productos',
				resource_type: 'image',
			});

			return result.secure_url;
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Error desconocido';
			throw new InternalServerErrorException(`Error al subir imagen a Cloudinary: ${message}`);
		}
	}
}
