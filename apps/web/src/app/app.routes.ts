import { Routes } from '@angular/router';
import { authGuard, noAuthGuard } from './core';

export const appRoutes: Routes = [
  {
    path: '',
    redirectTo: 'bars',
    pathMatch: 'full',
  },
  {
    path: 'login',
    canActivate: [noAuthGuard],
    loadChildren: () => import('./presentation/auth/auth.routes'),
  },
  {
    path: 'bars',
    canActivate: [authGuard],
    loadChildren: () => import('./presentation/bars/bars.routes'),
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full',
  },
];
