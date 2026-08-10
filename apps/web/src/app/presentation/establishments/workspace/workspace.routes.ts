import { Routes } from '@angular/router';
import { EstablishmentModule, EstablishmentPermission } from '@coaster/common';
import { moduleGuard } from '@coaster/establishments';
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
        canActivate: [
          moduleGuard(EstablishmentModule.INVENTORY),
          permissionGuard(EstablishmentPermission.ESTABLISHMENT_VIEW_PRODUCTS),
        ],
      },
      {
        path: 'roster',
        redirectTo: 'schedule',
      },
      {
        path: 'schedule',
        loadChildren: () => import('./pages/schedule/schedule.routes'),
        canActivate: [permissionGuard(EstablishmentPermission.ESTABLISHMENT_VIEW_SHIFTS)],
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings'),
        canActivate: [permissionGuard(EstablishmentPermission.ESTABLISHMENT_MANAGE_SETTINGS)],
      },
      {
        path: 'staff',
        loadChildren: () => import('./pages/staff/staff.routes'),
        canActivate: [permissionGuard(EstablishmentPermission.ESTABLISHMENT_VIEW_MEMBERS)],
      },
      {
        path: 'orders',
        loadChildren: () => import('./orders/orders.routes'),
        canActivate: [
          moduleGuard(EstablishmentModule.ORDERS),
          permissionGuard(EstablishmentPermission.ESTABLISHMENT_VIEW_ORDERS),
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
