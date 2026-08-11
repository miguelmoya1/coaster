import { Routes } from '@angular/router';
import { adminGuard } from '@coaster/admin';
import { authGuard, noAuthGuard } from '@coaster/core';

export const appRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./presentation/landing/landing'),
  },
  {
    path: 'm/:slug',
    loadComponent: () => import('./presentation/public-menu/public-menu'),
  },
  {
    path: 'login',
    canActivate: [noAuthGuard],
    loadChildren: () => import('./presentation/auth/auth.routes'),
  },
  {
    path: 'establishments',
    canActivate: [authGuard],
    loadChildren: () => import('./presentation/establishments/establishments.routes'),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadChildren: () => import('./presentation/admin/admin.routes'),
  },
  {
    path: 'establishment',
    redirectTo: 'establishments',
    pathMatch: 'full',
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full',
  },
];
