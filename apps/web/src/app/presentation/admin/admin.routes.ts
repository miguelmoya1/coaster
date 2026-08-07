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
        path: 'bars',
        loadComponent: () => import('./pages/admin-bars/admin-bars'),
      },
      {
        path: 'bars/:barId',
        loadComponent: () => import('./pages/admin-bar-detail/admin-bar-detail'),
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
        path: 'templates',
        loadComponent: () => import('./pages/admin-templates/admin-templates'),
      },
      {
        path: 'dashboard',
        redirectTo: 'overview',
      },
    ],
  },
];

export default adminRoutes;
