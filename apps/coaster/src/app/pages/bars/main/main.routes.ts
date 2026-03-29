import { Routes } from '@angular/router';

const mainRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./main'),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/dashboard'),
      },
      {
        path: 'pantry',
        loadComponent: () => import('./pantry/pantry'),
      },
      {
        path: 'roster',
        loadComponent: () => import('./roster/roster'),
      },
      {
        path: 'staff',
        loadComponent: () => import('./staff/staff'),
      },
      {
        path: '**',
        redirectTo: 'dashboard',
      },
    ],
  },
];

export default mainRoutes;
