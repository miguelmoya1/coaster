import { provideNativeDateAdapter } from '@angular/material/core';
import { Routes } from '@angular/router';
import { EstablishmentPermission } from '@coaster/common';
import { permissionGuard } from '@coaster/establishment-members';

const ordersRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layouts/orders-layout'),
    children: [
      {
        path: 'tables',
        loadComponent: () => import('./pages/tables/tables'),
      },
      {
        path: 'to-serve',
        loadComponent: () => import('./pages/to-serve/to-serve'),
      },
      {
        path: 'history',
        providers: [provideNativeDateAdapter()],
        loadComponent: () => import('./pages/history/history'),
      },
      {
        path: 'cash-close',
        loadComponent: () => import('./pages/cash-close/cash-close'),
        canActivate: [permissionGuard(EstablishmentPermission.ESTABLISHMENT_CLOSE_CASH)],
      },
      {
        path: '',
        redirectTo: 'tables',
        pathMatch: 'full',
      },
    ],
  },
  {
    path: 'new',
    loadComponent: () => import('./pages/new-order/new-order'),
  },
  {
    path: 'new/:tableId',
    loadComponent: () => import('./pages/new-order/new-order'),
  },
  {
    path: ':orderId/add',
    loadComponent: () => import('./pages/new-order/new-order'),
  },
  {
    path: ':orderId',
    loadComponent: () => import('./pages/order-detail/order-detail'),
  },
];

export default ordersRoutes;
