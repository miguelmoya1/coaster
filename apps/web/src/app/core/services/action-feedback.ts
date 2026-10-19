import { inject, Service } from '@angular/core';
import { environment } from '@coaster/env';
import { ApiError } from '../errors/api-error';
import { getErrorMessage } from '../utils/errors.utils';
import { Toast } from './toast';

@Service()
export class ActionFeedback {
  readonly #toast = inject(Toast, { optional: true });

  error(error: unknown) {
    if (!environment.production) {
      console.error(error);
    }

    if (error instanceof ApiError) {
      return;
    }

    this.#toast?.error(getErrorMessage(error));
  }

  success(message: string) {
    this.#toast?.success(message);
  }

  info(message: string, duration?: number) {
    this.#toast?.show(message, 'info', duration);
  }
}
