import { Routes } from '@angular/router';

const pantryRoutes: Routes = [
  { path: '', loadComponent: () => import('./pantry') },
  { path: 'new', loadComponent: () => import('./pantry') },
  { path: 'import', loadComponent: () => import('./pages/import/import-templates') },
];

export default pantryRoutes;
