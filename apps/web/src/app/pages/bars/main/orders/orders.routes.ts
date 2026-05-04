import { Routes } from '@angular/router';

const ordersRoutes: Routes = [
  {
    path: '',
    redirectTo: 'tables',
    pathMatch: 'full',
  },
  {
    path: 'tables',
    loadComponent: () => import('./tables/tables'),
  },
  {
    path: 'tables/:tableId',
    loadComponent: () => import('./table-detail/table-detail'),
  },
  {
    path: 'history',
    loadComponent: () => import('./history/history'),
  },
  {
    path: 'bar/:orderId',
    loadComponent: () => import('./bar-order-detail/bar-order-detail'),
  },
  {
    path: 'new',
    loadComponent: () => import('./new-order/new-order'),
  },
  {
    path: 'new/:tableId',
    loadComponent: () => import('./new-order/new-order'),
  },
  {
    path: ':orderId/add',
    loadComponent: () => import('./new-order/new-order'),
  },
];

export default ordersRoutes;
