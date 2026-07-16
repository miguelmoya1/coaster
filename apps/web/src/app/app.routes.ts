import { Routes } from '@angular/router';
import { adminGuard, authGuard, noAuthGuard } from './core';

export const appRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./presentation/landing/landing'),
  },
  {
    path: 'login',
    redirectTo: 'app/login',
    pathMatch: 'full',
  },
  {
    path: 'bar',
    redirectTo: 'app/bars',
    pathMatch: 'full',
  },
  {
    path: 'bars',
    redirectTo: 'app/bars',
    pathMatch: 'full',
  },
  {
    path: 'app',
    children: [
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
        path: 'admin',
        canActivate: [adminGuard],
        loadChildren: () => import('./presentation/admin/admin.routes'),
      },
      {
        path: '',
        redirectTo: 'bars',
        pathMatch: 'full',
      },
      {
        path: '**',
        redirectTo: 'bars',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full',
  },
];
