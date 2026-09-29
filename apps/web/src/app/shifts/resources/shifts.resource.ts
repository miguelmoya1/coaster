import { httpResource } from '@angular/common/http';
import { inject, type Signal } from '@angular/core';
import { onRealtime, Realtime, removeById, updateLoaded, type EstablishmentId } from '@coaster/core';
import { ShiftRepository } from '../data-access/shift-repository';
import { shiftArrayMapper } from '../mappers/shift.mapper';
import type { Shift } from '../models/shift.interface';

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

  onRealtime(realtime.on<Shift>('shiftCreated'), () => shifts.reload());
  onRealtime(realtime.on<{ id: string }>('shiftDeleted'), ({ id }) =>
    updateLoaded(shifts, (list) => removeById(list, id)),
  );

  return shifts;
};
