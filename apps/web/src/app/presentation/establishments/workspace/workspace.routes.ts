import { Routes } from '@angular/router';
import { EstablishmentPermission } from '@coaster/common';
import { permissionGuard } from '@coaster/establishment-members';

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
        canActivate: [permissionGuard(EstablishmentPermission.ESTABLISHMENT_VIEW_DASHBOARD)],
      },
      {
        path: 'pantry',
        loadChildren: () => import('./pages/pantry/pantry.routes'),
        canActivate: [permissionGuard(EstablishmentPermission.ESTABLISHMENT_VIEW_PRODUCTS)],
      },
      {
        path: 'roster',
        loadChildren: () => import('./pages/roster/roster.routes'),
        canActivate: [permissionGuard(EstablishmentPermission.ESTABLISHMENT_VIEW_SHIFTS)],
      },
      {
        path: 'staff',
        loadChildren: () => import('./pages/staff/staff.routes'),
        canActivate: [permissionGuard(EstablishmentPermission.ESTABLISHMENT_VIEW_MEMBERS)],
      },
      {
        path: 'orders',
        loadChildren: () => import('./orders/orders.routes'),
        canActivate: [permissionGuard(EstablishmentPermission.ESTABLISHMENT_VIEW_ORDERS)],
      },
      {
        path: '**',
        redirectTo: 'dashboard',
      },
    ],
  },
];

export default mainRoutes;
