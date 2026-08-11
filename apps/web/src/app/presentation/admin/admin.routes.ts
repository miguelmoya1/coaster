import { Routes } from '@angular/router';

const adminRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layouts/admin-layout'),
    children: [
      {
        path: '',
        redirectTo: 'overview',
        pathMatch: 'full',
      },
      {
        path: 'overview',
        loadComponent: () => import('./pages/admin-overview/admin-overview'),
      },
      {
        path: 'establishments',
        loadComponent: () => import('./pages/admin-establishments/admin-establishments'),
      },
      {
        path: 'establishments/:establishmentId',
        loadComponent: () => import('./pages/admin-establishment-detail/admin-establishment-detail'),
      },
      {
        path: 'users',
        loadComponent: () => import('./pages/admin-users/admin-users'),
      },
      {
        path: 'audit',
        loadComponent: () => import('./pages/admin-audit/admin-audit'),
      },
      {
        path: 'dashboard',
        redirectTo: 'overview',
      },
    ],
  },
];

export default adminRoutes;
