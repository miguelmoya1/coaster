import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: 'dev-sandbox',
    loadComponent: () => import('./dev-sandbox/dev-sandbox.component')
  }
];
