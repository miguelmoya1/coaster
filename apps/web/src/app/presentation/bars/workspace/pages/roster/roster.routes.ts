import { Routes } from '@angular/router';

const rosterRoutes: Routes = [
  { path: '', loadComponent: () => import('./roster') },
  { path: 'new', loadComponent: () => import('./roster') },
];

export default rosterRoutes;
