import { httpResource } from '@angular/common/http';
import { inject, type Signal } from '@angular/core';
import type { EstablishmentId } from '@coaster/common';
import { TimeEntryRepository } from '../data-access/time-entry-repository';
import { workdayArrayMapper, workdayMapper } from '../mappers/workday.mapper';

export interface TimeSheetRange {
  from: string;
  to: string;
}

export const myWorkdaysResource = (
  establishmentId: Signal<EstablishmentId | undefined>,
  range: Signal<TimeSheetRange>,
) => {
  const repository = inject(TimeEntryRepository);

  return httpResource(
    () => {
      const id = establishmentId();
      const { from, to } = range();
      return id ? repository.routes.mine(id, from, to) : undefined;
    },
    { parse: workdayArrayMapper },
  );
};

export const currentWorkdayResource = (establishmentId: Signal<EstablishmentId | undefined>) => {
  const repository = inject(TimeEntryRepository);

  return httpResource(
    () => {
      const id = establishmentId();
      return id ? repository.routes.current(id) : undefined;
    },
    { parse: workdayMapper },
  );
};

export const teamWorkdaysResource = (
  establishmentId: Signal<EstablishmentId | undefined>,
  range: Signal<TimeSheetRange>,
) => {
  const repository = inject(TimeEntryRepository);

  return httpResource(
    () => {
      const id = establishmentId();
      const { from, to } = range();
      return id ? repository.routes.team(id, from, to) : undefined;
    },
    { parse: workdayArrayMapper },
  );
};
