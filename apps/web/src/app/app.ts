import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { environment } from '@coaster/env';
import { inject as injectAnalytics } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';
import { MatIconRegistry } from '@angular/material/icon';

@Component({
  selector: 'coaster-root',
  imports: [RouterModule],
  template: `
    <router-outlet />
  `,
})
export class App {
  protected title = 'coaster';
  readonly #iconRegistry = inject(MatIconRegistry);

  constructor() {
    this.#iconRegistry.setDefaultFontSetClass('material-symbols-outlined');

    if (environment.production) {
      injectAnalytics();
      injectSpeedInsights();
    }
  }
}
