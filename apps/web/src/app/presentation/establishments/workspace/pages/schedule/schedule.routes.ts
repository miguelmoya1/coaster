import { provideNativeDateAdapter } from '@angular/material/core';
import { Routes } from '@angular/router';
import { permissionGuard } from '@coaster/establishment-members';
import { EstablishmentPermission } from '@coaster/common';

const scheduleRoutes: Routes = [
  { path: '', providers: [provideNativeDateAdapter()], loadComponent: () => import('./schedule') },
  {
    path: 'new',
    providers: [provideNativeDateAdapter()],
    loadComponent: () => import('./schedule'),
    canActivate: [permissionGuard(EstablishmentPermission.ESTABLISHMENT_CREATE_SHIFT)],
  },
];

export default scheduleRoutes;
