import { DOCUMENT, inject, Service, signal } from '@angular/core';
import { environment } from '@coaster/env';

const GSI_SRC = 'https://accounts.google.com/gsi/client';

interface GoogleIdentityServices {
  accounts: {
    id: {
      initialize(options: { client_id: string; callback: (response: { credential: string }) => void }): void;
      renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
    };
  };
}

@Service()
export class GoogleSignIn {
  readonly #document = inject(DOCUMENT);

  #loading: Promise<GoogleIdentityServices | null> | null = null;

  public readonly available = signal(Boolean(environment.googleClientId));

  public async renderButton(parent: HTMLElement, onCredential: (credential: string) => void): Promise<void> {
    const google = await this.#load();

    if (!google) {
      this.available.set(false);

      return;
    }

    google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: ({ credential }) => onCredential(credential),
    });

    google.accounts.id.renderButton(parent, {
      type: 'standard',
      theme: 'filled_black',
      size: 'large',
      shape: 'pill',
      text: 'continue_with',
      width: parent.clientWidth || 320,
    });
  }

  #load(): Promise<GoogleIdentityServices | null> {
    if (!environment.googleClientId) {
      return Promise.resolve(null);
    }

    this.#loading ??= new Promise<GoogleIdentityServices | null>((resolve) => {
      const window = this.#document.defaultView as (Window & { google?: GoogleIdentityServices }) | null;

      if (!window) {
        resolve(null);

        return;
      }

      if (window.google) {
        resolve(window.google);

        return;
      }

      const script = this.#document.createElement('script');

      script.src = GSI_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(window.google ?? null);
      script.onerror = () => resolve(null);

      this.#document.head.appendChild(script);
    });

    return this.#loading;
  }
}
