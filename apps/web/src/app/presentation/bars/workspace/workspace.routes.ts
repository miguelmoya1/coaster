import { Routes } from '@angular/router';

const mainRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layouts/workspace-layout'),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard'),
      },
      {
        path: 'pantry',
        loadChildren: () => import('./pages/pantry/pantry.routes'),
      },
      {
        path: 'roster',
        loadChildren: () => import('./pages/roster/roster.routes'),
      },
      {
        path: 'staff',
        loadChildren: () => import('./pages/staff/staff.routes'),
      },
      {
        path: 'orders',
        loadChildren: () => import('./orders/orders.routes'),
      },
      {
        path: '**',
        redirectTo: 'dashboard',
      },
    ],
  },
];

export default mainRoutes;
