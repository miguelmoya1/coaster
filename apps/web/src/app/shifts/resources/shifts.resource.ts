import { httpResource } from '@angular/common/http';
import { inject, type Signal } from '@angular/core';
import type { EstablishmentId } from '@coaster/common';
import { onRealtime, Realtime, removeById, updateLoaded } from '@coaster/core';
import { ShiftRepository } from '../data-access/shift-repository';
import { shiftArrayMapper } from '../mappers/shift.mapper';

export interface ShiftRange {
  startIso: string;
  endIso: string;
}

export const shiftsResource = (establishmentId: Signal<EstablishmentId | undefined>, range: Signal<ShiftRange>) => {
  const repository = inject(ShiftRepository);
  const realtime = inject(Realtime);

  const shifts = httpResource(
    () => {
      const id = establishmentId();
      const { startIso, endIso } = range();
      return id ? repository.routes.list(id, startIso, endIso) : undefined;
    },
    { parse: shiftArrayMapper },
  );

  onRealtime(realtime.shiftCreated, () => shifts.reload());
  onRealtime(realtime.shiftDeleted, ({ id }) => updateLoaded(shifts, (list) => removeById(list, id)));

  return shifts;
};
