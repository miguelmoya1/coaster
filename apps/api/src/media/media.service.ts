import { Injectable, Logger } from '@nestjs/common';
import { getStorage } from 'firebase-admin/storage';
import { v4 as uuidv4 } from 'uuid';
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
        const filePath = `bars/${barId}/${entityType}/${uuidv4()}-${fileReq.filename}`;
        const file = bucket.file(filePath);

        const [signedUrl] = await file.getSignedUrl({
          version: 'v4',
          action: 'write',
          expires: Date.now() + 15 * 60 * 1000, // 15 minutes
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
