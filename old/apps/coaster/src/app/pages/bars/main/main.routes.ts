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
        children: [
          { path: '', loadComponent: () => import('./pantry/pantry') },
          { path: 'new', loadComponent: () => import('./pantry/pantry') },
        ],
      },
      {
        path: 'roster',
        children: [
          { path: '', loadComponent: () => import('./roster/roster') },
          { path: 'new', loadComponent: () => import('./roster/roster') },
        ],
      },
      {
        path: 'staff',
        children: [
          { path: '', loadComponent: () => import('./staff/staff') },
          { path: 'invite', loadComponent: () => import('./staff/staff') },
        ],
      },
      {
        path: '**',
        redirectTo: 'dashboard',
      },
    ],
  },
];

export default mainRoutes;
