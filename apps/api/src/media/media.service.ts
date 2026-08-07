import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { getStorage } from 'firebase-admin/storage';
import { MediaFileRequestDto } from './dto/generate-upload-urls.dto';
import { MediaUploadResponse } from '@coaster/common';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  async generateUploadUrls(
    barId: string,
    entityType: string,
    files: MediaFileRequestDto[],
  ): Promise<MediaUploadResponse[]> {
    const bucketName = 'imagenes-clientes-app';
    const bucket = getStorage().bucket(bucketName);
    const responses: MediaUploadResponse[] = [];

    for (const fileReq of files) {
      try {
        const filePath = `bars/${barId}/${entityType}/${randomUUID()}-${fileReq.filename}`;
        const file = bucket.file(filePath);

        const [signedUrl] = await file.getSignedUrl({
          version: 'v4',
          action: 'write',
          expires: Date.now() + 15 * 60 * 1000,
          contentType: fileReq.contentType,
        });

        responses.push({
          uploadUrl: signedUrl,
          publicUrl: `https://storage.googleapis.com/${bucketName}/${filePath}`,
        });
      } catch (error) {
        this.logger.error(`Error generating signed URL for ${fileReq.filename}`, error);
        throw error;
      }
    }

    return responses;
  }
}
