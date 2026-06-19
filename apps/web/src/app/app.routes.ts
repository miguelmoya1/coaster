import { Routes } from '@angular/router';
import { adminGuard, authGuard, noAuthGuard } from './core';

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
    path: 'admin/dashboard',
    canActivate: [adminGuard],
    loadComponent: () => import('./presentation/admin/pages/admin-dashboard/admin-dashboard'),
  },
  {
    path: 'admin/templates',
    canActivate: [adminGuard],
    loadComponent: () => import('./presentation/admin/pages/admin-templates/admin-templates'),
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full',
  },
];
