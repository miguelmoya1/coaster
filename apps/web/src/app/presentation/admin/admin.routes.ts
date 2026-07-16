import { Routes } from '@angular/router';

const adminRoutes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/admin-dashboard/admin-dashboard'),
  },
  {
    path: 'templates',
    loadComponent: () => import('./pages/admin-templates/admin-templates'),
  },
];

export default adminRoutes;
