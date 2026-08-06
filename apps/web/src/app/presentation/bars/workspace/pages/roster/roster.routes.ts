import { provideNativeDateAdapter } from '@angular/material/core';
import { Routes } from '@angular/router';
import { permissionGuard } from '@coaster/bar-members';
import { BarPermission } from '@coaster/common';

const rosterRoutes: Routes = [
  { path: '', providers: [provideNativeDateAdapter()], loadComponent: () => import('./roster') },
  {
    path: 'new',
    providers: [provideNativeDateAdapter()],
    loadComponent: () => import('./roster'),
    canActivate: [permissionGuard(BarPermission.BAR_CREATE_SHIFT)],
  },
];

export default rosterRoutes;
