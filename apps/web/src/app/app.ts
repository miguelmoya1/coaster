import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { environment } from '@coaster/env';
import { inject as injectAnalytics } from '@vercel/analytics';
import { injectSpeedInsights } from '@vercel/speed-insights';
import { ToastContainer } from './presentation/components/toast/toast-container';

@Component({
  selector: 'coaster-root',
  imports: [RouterModule, ToastContainer],
  template: `
    <router-outlet />
    <coaster-toast-container />
  `,
})
export class App {
  protected title = 'coaster';

  constructor() {
    if (environment.production) {
      injectAnalytics();
      injectSpeedInsights();
    }
  }
}
