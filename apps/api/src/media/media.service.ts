import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { getStorage } from 'firebase-admin/storage';
import { MediaFileRequestDto } from './dto/generate-upload-urls.dto';
import { MediaUploadResponse } from '@coaster/common';

const UPLOAD_URL_TTL_MS = 15 * 60 * 1000;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif']);

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(private readonly _config: ConfigService) {}

  async generateUploadUrls(
    establishmentId: string,
    entityType: string,
    files: MediaFileRequestDto[],
  ): Promise<MediaUploadResponse[]> {
    const bucketName = this._config.get<string>('MEDIA_BUCKET') ?? 'imagenes-clientes-app';
    const bucket = getStorage().bucket(bucketName);
    const responses: MediaUploadResponse[] = [];

    for (const fileReq of files) {
      const contentType = fileReq.contentType;
      const objectName = `${randomUUID()}${this.safeExtension(fileReq.filename)}`;
      const filePath = `establishments/${establishmentId}/${entityType}/${objectName}`;

      const uploadHeaders = { 'x-goog-content-length-range': `0,${MAX_UPLOAD_BYTES}` };

      try {
        const file = bucket.file(filePath);

        const [signedUrl] = await file.getSignedUrl({
          version: 'v4',
          action: 'write',
          expires: Date.now() + UPLOAD_URL_TTL_MS,
          contentType,
          extensionHeaders: uploadHeaders,
        });

        responses.push({
          uploadUrl: signedUrl,
          publicUrl: `https://storage.googleapis.com/${bucketName}/${filePath}`,
          uploadHeaders,
        });
      } catch (error) {
        this.logger.error(`Error generating signed URL for ${objectName}`, error);
        throw error;
      }
    }

    return responses;
  }

  private safeExtension(filename: string): string {
    const extension = extname(filename).toLowerCase();

    return ALLOWED_EXTENSIONS.has(extension) ? extension : '';
  }
}
