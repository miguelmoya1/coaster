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
        children: [
          { path: '', loadComponent: () => import('./pages/pantry/pantry') },
          { path: 'new', loadComponent: () => import('./pages/pantry/pantry') },
          { path: 'import', loadComponent: () => import('./pages/pantry/import/import-templates') },
        ],
      },
      {
        path: 'roster',
        children: [
          { path: '', loadComponent: () => import('./pages/roster/roster') },
          { path: 'new', loadComponent: () => import('./pages/roster/roster') },
        ],
      },
      {
        path: 'staff',
        children: [
          { path: '', loadComponent: () => import('./pages/staff/staff') },
          { path: 'invite', loadComponent: () => import('./pages/staff/staff') },
        ],
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
