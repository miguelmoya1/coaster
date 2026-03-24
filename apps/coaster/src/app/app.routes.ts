import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { noAuthGuard } from './core/guards/no-auth-guard';

export const appRoutes: Routes = [
  {
    path: 'login',
    canActivate: [noAuthGuard],
    loadChildren: () => import('./pages/login/auth.routes'),
  },
  {
    path: 'dev-sandbox',
    loadComponent: () => import('./pages/dev-sandbox/dev-sandbox'),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadChildren: () => import('./pages/main/main.routes'),
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full',
  },
];
