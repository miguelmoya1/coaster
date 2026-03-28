import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { checkParamIdGuard } from './core/guards/check-param-id-guard';
import { noAuthGuard } from './core/guards/no-auth-guard';

export const appRoutes: Routes = [
  {
    path: 'login',
    canActivate: [noAuthGuard],
    loadChildren: () => import('./pages/auth/auth.routes'),
  },
  {
    path: 'dev-sandbox',
    loadComponent: () => import('./pages/dev-sandbox/dev-sandbox'),
  },
  {
    path: 'bars',
    canActivate: [authGuard],
    loadChildren: () => import('./pages/bars/bars.routes'),
  },
  {
    path: ':barId',
    canActivate: [authGuard, checkParamIdGuard('barId')],
    loadChildren: () => import('./pages/main/main.routes'),
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full',
  },
];
