import { inject, Service } from '@angular/core';
import { Auth, type EstablishmentId } from '@coaster/core';
import { AiVoiceRepository } from './ai-voice-repository';

@Service()
export class AiUsageService {
  readonly #repository = inject(AiVoiceRepository);
  readonly #auth = inject(Auth);

  public execute(establishmentId: EstablishmentId | undefined) {
    if (!this.#auth.isAuthLoaded() || !this.#auth.isAuthenticated() || !establishmentId) {
      return undefined;
    }

    return this.#repository.routes.usage(establishmentId);
  }
}
