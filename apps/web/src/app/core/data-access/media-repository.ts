import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type { BarId, GenerateUploadUrlsDto, MediaUploadResponse } from '@coaster/common';
import { firstValueFrom } from 'rxjs';

@Service()
export class MediaRepository {
  readonly #http = inject(HttpClient);

  public readonly routes = {
    generateUploadUrls: (barId: BarId) => `/bars/${barId}/media/upload-urls`,
  };

  public async generateUploadUrls(barId: BarId, dto: GenerateUploadUrlsDto): Promise<MediaUploadResponse[]> {
    return firstValueFrom(this.#http.post<MediaUploadResponse[]>(this.routes.generateUploadUrls(barId), dto));
  }
}
