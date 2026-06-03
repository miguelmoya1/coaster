import { Routes } from '@angular/router';
import { BarPermission } from '@coaster/core';
import { permissionGuard } from '@coaster/core';

const pantryRoutes: Routes = [
  { path: '', loadComponent: () => import('./pantry') },
  {
    path: 'new',
    loadComponent: () => import('./pantry'),
    canActivate: [permissionGuard(BarPermission.CREATE_PRODUCT)],
  },
  {
    path: 'import',
    loadComponent: () => import('./pages/import/import-templates'),
    canActivate: [permissionGuard(BarPermission.IMPORT_TEMPLATES)],
  },
];

export default pantryRoutes;
