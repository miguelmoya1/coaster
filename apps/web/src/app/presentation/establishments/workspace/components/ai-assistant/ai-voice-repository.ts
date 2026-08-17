import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type { AiMessage, AiResponse, EstablishmentId } from '@coaster/common';
import { Auth, readSse } from '@coaster/core';
import { environment } from '@coaster/env';
import { firstValueFrom } from 'rxjs';

const API_VERSION = 'api/v1';

@Service()
export class AiVoiceRepository {
  readonly #http = inject(HttpClient);
  readonly #auth = inject(Auth);

  public readonly routes = {
    usage: (establishmentId: EstablishmentId) => `/establishments/${establishmentId}/ai/usage`,
  };

  public async executeCommand(
    establishmentId: EstablishmentId,
    prompt: string,
    messages?: AiMessage[],
  ): Promise<AiResponse> {
    return await firstValueFrom(
      this.#http.post<AiResponse>(`/establishments/${establishmentId}/ai`, { prompt, messages }),
    );
  }

  public async streamCommand(
    establishmentId: EstablishmentId,
    prompt: string,
    messages: AiMessage[] | undefined,
    onDelta: (delta: string) => void,
  ): Promise<AiResponse> {
    try {
      return await this.#readStream(establishmentId, prompt, messages, onDelta);
    } catch {
      return await this.executeCommand(establishmentId, prompt, messages);
    }
  }

  async #readStream(
    establishmentId: EstablishmentId,
    prompt: string,
    messages: AiMessage[] | undefined,
    onDelta: (delta: string) => void,
  ): Promise<AiResponse> {
    const token = this.#auth.idToken();

    const response = await fetch(`${environment.apiUrl}/${API_VERSION}/establishments/${establishmentId}/ai/stream`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ prompt, messages }),
    });

    if (!response.ok || !response.body) {
      return await this.executeCommand(establishmentId, prompt, messages);
    }

    let final: AiResponse | null = null;

    for await (const frame of readSse(response.body)) {
      const payload = JSON.parse(frame.data) as { delta?: string } & AiResponse;

      if (frame.event === 'delta' && payload.delta) {
        onDelta(payload.delta);
      } else if (frame.event === 'done') {
        final = payload;
      }
    }

    return final ?? { text: '' };
  }
}
