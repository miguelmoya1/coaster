import { inject, Injector, Service } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

export type ToastType = 'success' | 'error' | 'info';

@Service()
export class Toast {
  readonly #snackBar = inject(MatSnackBar);
  readonly #injector = inject(Injector);

  public show(message: string, type: ToastType = 'info', duration = 3000) {
    // Lazy inject to avoid circular dependency:
    // TranslateHttpLoader → HttpClient → errorInterceptor → Toast → TranslateService
    const translate = this.#injector.get(TranslateService);
    const translatedMessage = translate.instant(message);

    this.#snackBar.open(translatedMessage, '✕', {
      duration,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: [`snackbar-${type}`],
    });
  }

  public success(message: string, duration = 3000) {
    this.show(message, 'success', duration);
  }

  public error(message: string, duration = 5000) {
    this.show(message, 'error', duration);
  }

  public remove(_id: string) {
    this.#snackBar.dismiss();
  }
}
