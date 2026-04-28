import { httpResource } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { BarId } from '@coaster/interfaces';
import { ShiftRepository } from '../data-access/shift-repository';
import { shiftArrayMapper } from '../mappers/shift.mapper';

@Injectable({
  providedIn: 'root',
})
export class BarShifts {
  readonly #shiftRepository = inject(ShiftRepository);
  readonly #barId = signal<BarId | undefined>(undefined);
  readonly #startDate = signal<string | undefined>(undefined);
  readonly #endDate = signal<string | undefined>(undefined);

  readonly #all = httpResource(
    () => {
      const barId = this.#barId();
      const startDate = this.#startDate();
      const endDate = this.#endDate();

      if (!barId || !startDate || !endDate) {
        return undefined;
      }
      return this.#shiftRepository.routes.list(barId, startDate, endDate);
    },
    {
      parse: (shifts) => shiftArrayMapper(shifts),
    },
  );

  readonly all = this.#all.asReadonly();

  public setContext(barId: BarId) {
    this.#barId.set(barId);
  }

  public setDateRange(start: string, end: string) {
    this.#startDate.set(start);
    this.#endDate.set(end);
  }

  public reload() {
    this.#all.reload();
  }
}
