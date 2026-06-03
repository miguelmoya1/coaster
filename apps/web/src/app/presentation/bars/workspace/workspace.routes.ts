import { Routes } from '@angular/router';
import { BarPermission } from '@coaster/core';
import { permissionGuard } from '@coaster/core';

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
        canActivate: [permissionGuard(BarPermission.VIEW_PRODUCTS)],
      },
      {
        path: 'roster',
        loadChildren: () => import('./pages/roster/roster.routes'),
        canActivate: [permissionGuard(BarPermission.VIEW_SHIFTS)],
      },
      {
        path: 'staff',
        loadChildren: () => import('./pages/staff/staff.routes'),
        canActivate: [permissionGuard(BarPermission.VIEW_MEMBERS)],
      },
      {
        path: 'orders',
        loadChildren: () => import('./orders/orders.routes'),
        canActivate: [permissionGuard(BarPermission.VIEW_ORDERS)],
      },
      {
        path: '**',
        redirectTo: 'dashboard',
      },
    ],
  },
];

export default mainRoutes;
