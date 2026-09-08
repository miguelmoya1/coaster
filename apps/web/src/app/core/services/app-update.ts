import { inject, Service } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SwUpdate } from '@angular/service-worker';
import { TranslateService } from '@ngx-translate/core';

@Service()
export class AppUpdate {
  readonly #updates = inject(SwUpdate);
  readonly #snackBar = inject(MatSnackBar);
  readonly #translate = inject(TranslateService);

  public watch(): void {
    if (!this.#updates.isEnabled) {
      return;
    }

    this.#updates.versionUpdates.subscribe((event) => {
      if (event.type !== 'VERSION_READY') {
        return;
      }

      const snack = this.#snackBar.open(
        this.#translate.instant('app.update_ready'),
        this.#translate.instant('app.update_reload'),
        { horizontalPosition: 'center', verticalPosition: 'bottom', panelClass: ['snackbar-info'] },
      );

      snack.onAction().subscribe(() => document.location.reload());
    });
  }
}
