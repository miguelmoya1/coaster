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
    loadChildren: () => import('./pages/auth/auth.routes'),
  },
  {
    path: 'bars',
    canActivate: [authGuard],
    loadChildren: () => import('./pages/bars/bars.routes'),
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full',
  },
];
