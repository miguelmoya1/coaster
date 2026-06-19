import { Component, computed, inject } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { RouterOutlet } from '@angular/router';
import { CurrentUser, Role } from '@coaster/core';
import { AdminFloatingButton } from './presentation/admin/components/admin-floating-button/admin-floating-button';
import { environment } from '@coaster/env';
import { inject as injectAnalytics } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';

@Component({
  selector: 'coaster-root',
  imports: [RouterOutlet, AdminFloatingButton],
  template: `
    <router-outlet />
    @if (isAdmin()) {
      <coaster-admin-floating-button />
    }
  `,
})
export class App {
  protected title = 'coaster';
  readonly #iconRegistry = inject(MatIconRegistry);
  readonly #currentUser = inject(CurrentUser);

  readonly isAdmin = computed(() => {
    return this.#currentUser.current.value()?.role === Role.ADMIN;
  });

  constructor() {
    this.#iconRegistry.setDefaultFontSetClass('material-symbols-outlined');

    if (environment.production) {
      injectAnalytics();
      injectSpeedInsights();
    }
  }
}
