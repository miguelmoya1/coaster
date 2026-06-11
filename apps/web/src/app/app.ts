import { Component, inject } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { RouterOutlet } from '@angular/router';
import { environment } from '@coaster/env';
import { inject as injectAnalytics } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';

@Component({
  selector: 'coaster-root',
  imports: [RouterOutlet],
  template: ` <router-outlet /> `,
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
