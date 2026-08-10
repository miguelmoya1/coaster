import { provideNativeDateAdapter } from '@angular/material/core';
import { Routes } from '@angular/router';
import { permissionGuard } from '@coaster/establishment-members';
import { EstablishmentPermission } from '@coaster/common';

const rosterRoutes: Routes = [
  { path: '', providers: [provideNativeDateAdapter()], loadComponent: () => import('./roster') },
  {
    path: 'new',
    providers: [provideNativeDateAdapter()],
    loadComponent: () => import('./roster'),
    canActivate: [permissionGuard(EstablishmentPermission.ESTABLISHMENT_CREATE_SHIFT)],
  },
];

export default rosterRoutes;
