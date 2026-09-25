import { computed } from '@angular/core';
import { provideNativeDateAdapter } from '@angular/material/core';
import { Routes, type ResourceContext } from '@angular/router';
import { EstablishmentPermission } from '@coaster/common';
import { establishmentIdOf, nonBlockingResources, queryParam } from '@coaster/core';
import { membersResource, permissionGuard, permittedEstablishmentId } from '@coaster/establishment-members';
import { exchangesResource } from '@coaster/exchanges';
import { scheduleDateOf, scheduleViewOf, shiftsRangeOf, timeSheetRangeOf } from '@coaster/schedule';
import { shiftsResource } from '@coaster/shifts';
import { currentWorkdayResource, myWorkdaysResource, teamWorkdaysResource } from '@coaster/time-tracking';

const scheduleResources = nonBlockingResources((context: ResourceContext) => {
  const establishmentId = establishmentIdOf(context);
  const date = queryParam(context, 'date');
  const view = queryParam(context, 'view');
  const selected = computed(() => scheduleDateOf(date()));
  const shown = computed(() => scheduleViewOf(view()));
  const timeSheet = computed(() => timeSheetRangeOf(selected(), shown()));

  return {
    shifts: shiftsResource(
      establishmentId,
      computed(() => shiftsRangeOf(selected(), shown())),
    ),
    exchanges: exchangesResource(establishmentId),
    members: membersResource(establishmentId),
    myWorkdays: myWorkdaysResource(establishmentId, timeSheet),
    runningWorkday: currentWorkdayResource(establishmentId),
    teamWorkdays: teamWorkdaysResource(
      permittedEstablishmentId(establishmentId, EstablishmentPermission.ESTABLISHMENT_VIEW_TIME_ENTRIES),
      timeSheet,
    ),
  };
});

const scheduleRoutes: Routes = [
  {
    path: '',
    providers: [provideNativeDateAdapter()],
    loadComponent: () => import('./schedule'),
    resources: scheduleResources,
  },
  {
    path: 'new',
    providers: [provideNativeDateAdapter()],
    loadComponent: () => import('./schedule'),
    canActivate: [permissionGuard(EstablishmentPermission.ESTABLISHMENT_CREATE_SHIFT)],
    resources: scheduleResources,
  },
];

export default scheduleRoutes;
