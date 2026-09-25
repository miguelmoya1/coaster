import { computed, type Signal } from '@angular/core';
import { provideNativeDateAdapter } from '@angular/material/core';
import { Routes } from '@angular/router';
import { cashClosePreviewResource, cashClosesResource } from '@coaster/cash-close';
import { categoriesResource } from '@coaster/categories';
import { EstablishmentPermission, type EstablishmentId, type OrderId } from '@coaster/common';
import { establishmentIdOf, nonBlockingResources, queryParam, routeParam } from '@coaster/core';
import { permissionGuard } from '@coaster/establishment-members';
import { openOrdersResource, orderHistoryResource, orderResource, todayIso } from '@coaster/orders';
import { productsResource } from '@coaster/products';
import { tablesResource } from '@coaster/tables';

const catalogue = (establishmentId: Signal<EstablishmentId | undefined>) => ({
  products: productsResource(establishmentId),
  categories: categoriesResource(establishmentId),
  tables: tablesResource(establishmentId),
});

const ordersRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layouts/orders-layout'),
    children: [
      {
        path: 'tables',
        loadComponent: () => import('./pages/tables/tables'),
        resources: nonBlockingResources((context) => {
          const establishmentId = establishmentIdOf(context);

          return {
            tables: tablesResource(establishmentId),
            openOrders: openOrdersResource(establishmentId),
          };
        }),
      },
      {
        path: 'to-serve',
        loadComponent: () => import('./pages/to-serve/to-serve'),
        resources: nonBlockingResources((context) => ({
          openOrders: openOrdersResource(establishmentIdOf(context)),
        })),
      },
      {
        path: 'history',
        providers: [provideNativeDateAdapter()],
        loadComponent: () => import('./pages/history/history'),
        resources: nonBlockingResources((context) => {
          const date = queryParam(context, 'date');

          return {
            history: orderHistoryResource(
              establishmentIdOf(context),
              computed(() => date() ?? todayIso()),
            ),
          };
        }),
      },
      {
        path: 'cash-close',
        loadComponent: () => import('./pages/cash-close/cash-close'),
        canActivate: [permissionGuard(EstablishmentPermission.ESTABLISHMENT_CLOSE_CASH)],
        resources: nonBlockingResources((context) => {
          const establishmentId = establishmentIdOf(context);

          return {
            preview: cashClosePreviewResource(establishmentId),
            history: cashClosesResource(establishmentId),
          };
        }),
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
    resources: nonBlockingResources((context) => catalogue(establishmentIdOf(context))),
  },
  {
    path: 'new/:tableId',
    loadComponent: () => import('./pages/new-order/new-order'),
    resources: nonBlockingResources((context) => catalogue(establishmentIdOf(context))),
  },
  {
    path: ':orderId/add',
    loadComponent: () => import('./pages/new-order/new-order'),
    resources: nonBlockingResources((context) => {
      const establishmentId = establishmentIdOf(context);

      return {
        ...catalogue(establishmentId),
        order: orderResource(establishmentId, routeParam<OrderId>(context, 'orderId')),
      };
    }),
  },
  {
    path: ':orderId',
    loadComponent: () => import('./pages/order-detail/order-detail'),
    resources: nonBlockingResources((context) => {
      const establishmentId = establishmentIdOf(context);

      return {
        order: orderResource(establishmentId, routeParam<OrderId>(context, 'orderId')),
        tables: tablesResource(establishmentId),
        openOrders: openOrdersResource(establishmentId),
      };
    }),
  },
];

export default ordersRoutes;
