import { Routes } from '@angular/router';

const staffRoutes: Routes = [
  { path: '', loadComponent: () => import('./staff') },
  { path: 'invite', loadComponent: () => import('./staff') },
];

export default staffRoutes;
