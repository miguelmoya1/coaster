import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type { BarId } from '@coaster/common';
import { firstValueFrom } from 'rxjs';

export interface AiResponse {
  text: string;
  isError?: boolean;
  errorKey?: string;
}

@Service()
export class AiVoiceRepository {
  readonly #http = inject(HttpClient);

  public async executeCommand(barId: BarId, prompt: string): Promise<AiResponse> {
    return await firstValueFrom(
      this.#http.post<AiResponse>(`/bars/${barId}/ai`, { prompt })
    );
  }
}
