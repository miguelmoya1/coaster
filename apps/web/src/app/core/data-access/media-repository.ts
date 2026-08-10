import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type { EstablishmentId, GenerateUploadUrlsDto, MediaUploadResponse } from '@coaster/common';
import { firstValueFrom } from 'rxjs';

@Service()
export class MediaRepository {
  readonly #http = inject(HttpClient);

  public readonly routes = {
    generateUploadUrls: (establishmentId: EstablishmentId) => `/establishments/${establishmentId}/media/upload-urls`,
  };

  public async generateUploadUrls(
    establishmentId: EstablishmentId,
    dto: GenerateUploadUrlsDto,
  ): Promise<MediaUploadResponse[]> {
    return firstValueFrom(this.#http.post<MediaUploadResponse[]>(this.routes.generateUploadUrls(establishmentId), dto));
  }

  public async uploadFile(uploadUrl: string, file: File, uploadHeaders: Record<string, string> = {}): Promise<void> {
    await firstValueFrom(
      this.#http.put(uploadUrl, file, {
        headers: { ...uploadHeaders, 'Content-Type': file.type },
      }),
    );
  }
}
