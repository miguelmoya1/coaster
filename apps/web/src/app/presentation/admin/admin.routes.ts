import { computed } from '@angular/core';
import { Routes } from '@angular/router';
import {
  ADMIN_PAGE_SIZE,
  adminAuditResource,
  adminBetaTestersResource,
  adminEstablishmentDetailResource,
  adminEstablishmentsResource,
  adminMetricsResource,
  adminRecentActivityResource,
  adminUsersResource,
  flagOf,
  oneOf,
  pageOf,
  searchOf,
} from '@coaster/admin';
import { AdminAuditAction, EstablishmentBillingSource, Role, SubscriptionStatus } from '@coaster/common';
import { establishmentIdOf, nonBlockingResources } from '@coaster/core';

const adminRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layouts/admin-layout'),
    children: [
      {
        path: '',
        redirectTo: 'overview',
        pathMatch: 'full',
      },
      {
        path: 'overview',
        loadComponent: () => import('./pages/admin-overview/admin-overview'),
        resources: nonBlockingResources(() => ({
          metrics: adminMetricsResource(),
          activity: adminRecentActivityResource(),
        })),
      },
      {
        path: 'establishments',
        loadComponent: () => import('./pages/admin-establishments/admin-establishments'),
        resources: nonBlockingResources((context) => ({
          results: adminEstablishmentsResource(
            computed(() => {
              const params = context.queryParams();

              return {
                q: searchOf(params['q']),
                billingSource: oneOf(Object.values(EstablishmentBillingSource), params['billingSource']),
                status: oneOf(Object.values(SubscriptionStatus), params['status']),
                page: pageOf(params['page']),
                pageSize: ADMIN_PAGE_SIZE.establishments,
              };
            }),
          ),
        })),
      },
      {
        path: 'establishments/:establishmentId',
        loadComponent: () => import('./pages/admin-establishment-detail/admin-establishment-detail'),
        resources: nonBlockingResources((context) => ({
          detail: adminEstablishmentDetailResource(establishmentIdOf(context)),
        })),
      },
      {
        path: 'users',
        loadComponent: () => import('./pages/admin-users/admin-users'),
        resources: nonBlockingResources((context) => ({
          results: adminUsersResource(
            computed(() => {
              const params = context.queryParams();

              return {
                q: searchOf(params['q']),
                role: oneOf(Object.values(Role), params['role']),
                active: flagOf(params['active']),
                page: pageOf(params['page']),
                pageSize: ADMIN_PAGE_SIZE.users,
              };
            }),
          ),
        })),
      },
      {
        path: 'beta-testers',
        loadComponent: () => import('./pages/admin-beta-testers/admin-beta-testers'),
        resources: nonBlockingResources((context) => ({
          results: adminBetaTestersResource(
            computed(() => {
              const params = context.queryParams();

              return { q: searchOf(params['q']), page: pageOf(params['page']), pageSize: ADMIN_PAGE_SIZE.betaTesters };
            }),
          ),
        })),
      },
      {
        path: 'audit',
        loadComponent: () => import('./pages/admin-audit/admin-audit'),
        resources: nonBlockingResources((context) => ({
          audit: adminAuditResource(
            computed(() => {
              const params = context.queryParams();

              return {
                action: oneOf(Object.values(AdminAuditAction), params['action']),
                page: pageOf(params['page']),
                pageSize: ADMIN_PAGE_SIZE.audit,
              };
            }),
          ),
        })),
      },
      {
        path: 'dashboard',
        redirectTo: 'overview',
      },
    ],
  },
];

export default adminRoutes;
