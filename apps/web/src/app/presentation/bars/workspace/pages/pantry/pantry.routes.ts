import { Routes } from '@angular/router';
import { BarPermission } from '@coaster/common';
import { permissionGuard } from '@coaster/core';

const pantryRoutes: Routes = [
  { path: '', loadComponent: () => import('./pantry') },

  {
    path: 'import',
    loadComponent: () => import('./pages/import/import-templates'),
    canActivate: [permissionGuard(BarPermission.BAR_IMPORT_TEMPLATES)],
  },
];

export default pantryRoutes;
