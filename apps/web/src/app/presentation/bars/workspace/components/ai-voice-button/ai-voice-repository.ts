import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type { AiMessage, AiResponse, BarId } from '@coaster/common';
import { Auth } from '@coaster/core';
import { environment } from '@coaster/env';
import { firstValueFrom } from 'rxjs';

const API_VERSION = 'api/v1';

@Service()
export class AiVoiceRepository {
  readonly #http = inject(HttpClient);
  readonly #auth = inject(Auth);

  public async executeCommand(barId: BarId, prompt: string, messages?: AiMessage[]): Promise<AiResponse> {
    return await firstValueFrom(this.#http.post<AiResponse>(`/bars/${barId}/ai`, { prompt, messages }));
  }

  public async streamCommand(
    barId: BarId,
    prompt: string,
    messages: AiMessage[] | undefined,
    onDelta: (delta: string) => void,
  ): Promise<AiResponse> {
    try {
      return await this.#readStream(barId, prompt, messages, onDelta);
    } catch {
      return await this.executeCommand(barId, prompt, messages);
    }
  }

  async #readStream(
    barId: BarId,
    prompt: string,
    messages: AiMessage[] | undefined,
    onDelta: (delta: string) => void,
  ): Promise<AiResponse> {
    const token = this.#auth.idToken();

    const response = await fetch(`${environment.apiUrl}/${API_VERSION}/bars/${barId}/ai/stream`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ prompt, messages }),
    });

    if (!response.ok || !response.body) {
      return await this.executeCommand(barId, prompt, messages);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let final: AiResponse | null = null;

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });

      const frames = buffer.split('\n\n');
      buffer = frames.pop() ?? '';

      for (const frame of frames) {
        const eventLine = frame.split('\n').find((line) => line.startsWith('event: '));
        const dataLine = frame.split('\n').find((line) => line.startsWith('data: '));

        if (!eventLine || !dataLine) {
          continue;
        }

        const payload = JSON.parse(dataLine.slice(6)) as { delta?: string } & AiResponse;

        if (eventLine.slice(7) === 'delta' && payload.delta) {
          onDelta(payload.delta);
        } else if (eventLine.slice(7) === 'done') {
          final = payload;
        }
      }
    }

    return final ?? { text: '' };
  }
}
