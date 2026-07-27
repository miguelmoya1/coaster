import { Routes } from '@angular/router';

const adminRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layouts/admin-layout'),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/admin-dashboard/admin-dashboard'),
      },
      {
        path: 'templates',
        loadComponent: () => import('./pages/admin-templates/admin-templates'),
      },
    ],
  },
];

export default adminRoutes;
