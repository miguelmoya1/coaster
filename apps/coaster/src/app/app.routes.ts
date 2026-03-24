import { Route } from '@angular/router';
import { noAuthGuard } from './core/guards/no-auth-guard';

export const appRoutes: Route[] = [
  {
    path: 'login',
    canActivate: [noAuthGuard],
    loadComponent: () => import('./pages/login/login'),
  },
  {
    path: 'dev-sandbox',
    loadComponent: () => import('./pages/dev-sandbox/dev-sandbox.component'),
  },
  {
    path: '',
    redirectTo: 'dev-sandbox',
    pathMatch: 'full',
  },
];
