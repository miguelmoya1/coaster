import { signal } from '@angular/core';
import { Routes } from '@angular/router';
import { EstablishmentModule, EstablishmentPermission } from '@coaster/common';
import { establishmentIdOf, nonBlockingResources } from '@coaster/core';
import { membersResource, permissionGuard } from '@coaster/establishment-members';
import { moduleGuard } from '@coaster/establishments';
import { productsResource } from '@coaster/products';
import { dayRangeOf, timeSheetRangeOf } from '@coaster/schedule';
import { shiftsResource } from '@coaster/shifts';
import { statsResource } from '@coaster/stats';
import { currentWorkdayResource, myWorkdaysResource } from '@coaster/time-tracking';
import { accessibleEstablishmentId, DASHBOARD_ACCESS } from './pages/dashboard/dashboard-access';

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
        resources: nonBlockingResources((context) => {
          const establishmentId = establishmentIdOf(context);
          const allowed = (access: (typeof DASHBOARD_ACCESS)[keyof typeof DASHBOARD_ACCESS]) =>
            accessibleEstablishmentId(establishmentId, access);
          const now = new Date();

          return {
            stats: statsResource(allowed(DASHBOARD_ACCESS.takings)),
            products: productsResource(allowed(DASHBOARD_ACCESS.inventory)),
            todayShifts: shiftsResource(allowed(DASHBOARD_ACCESS.team), signal(dayRangeOf(now))),
            members: membersResource(allowed(DASHBOARD_ACCESS.team)),
            myWorkdays: myWorkdaysResource(allowed(DASHBOARD_ACCESS.clock), signal(timeSheetRangeOf(now, 'week'))),
            runningWorkday: currentWorkdayResource(allowed(DASHBOARD_ACCESS.clock)),
          };
        }),
      },
      {
        path: 'pantry',
        redirectTo: 'inventory',
      },
      {
        path: 'inventory',
        loadChildren: () => import('./pages/inventory/inventory.routes'),
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
