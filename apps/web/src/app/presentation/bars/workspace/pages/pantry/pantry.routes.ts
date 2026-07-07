import { Routes } from '@angular/router';
import { BarPermission } from '@coaster/core';
import { permissionGuard } from '@coaster/core';

const pantryRoutes: Routes = [
  { path: '', loadComponent: () => import('./pantry') },

  {
    path: 'import',
    loadComponent: () => import('./pages/import/import-templates'),
    canActivate: [permissionGuard(BarPermission.IMPORT_TEMPLATES)],
  },
];

export default pantryRoutes;
