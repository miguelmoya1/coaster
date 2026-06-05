import { httpResource } from '@angular/common/http';
import { effect, inject, Service, signal } from '@angular/core';
import type { BarId, CreateShiftDto } from '@coaster/common';
import { asShiftId } from '@coaster/core';
import { handleErrorFormField, Socket } from '@coaster/core';
import { shiftArrayMapper } from '../mappers/shift.mapper';
import { BarShifts } from '../services/bar-shifts';
import { CreateShift } from '../services/create-shift';
import { DeleteShift } from '../services/delete-shift';

@Service()
export class ShiftsStore {
  readonly #barshifts = inject(BarShifts);
  readonly #createShift = inject(CreateShift);
  readonly #deleteShift = inject(DeleteShift);
  readonly #socketService = inject(Socket);

  readonly #currentBarId = signal<BarId | undefined>(undefined);
  readonly #startDate = signal<string | undefined>(undefined);
  readonly #endDate = signal<string | undefined>(undefined);

  readonly #shiftsResource = httpResource(
    () => this.#barshifts.execute(this.#currentBarId(), this.#startDate(), this.#endDate()),
    {
      parse: shiftArrayMapper,
    },
  );

  readonly shifts = this.#shiftsResource.asReadonly();

  constructor() {
    // Shift created
    effect(() => {
      const created = this.#socketService.shiftCreated();
      if (created) {
        this.reload();
      }
    });

    // Shift deleted
    effect(() => {
      const deleted = this.#socketService.shiftDeleted();
      if (deleted) {
        this.#shiftsResource.update((shifts) => {
          if (!shifts) {
            return undefined;
          }
          return shifts.filter((s) => s.id !== deleted.id);
        });
      }
    });
  }

  public setBarId(barId: BarId | undefined) {
    this.#currentBarId.set(barId);
  }

  public setDateRange(start: string | undefined, end: string | undefined) {
    this.#startDate.set(start);
    this.#endDate.set(end);
  }

  public reload() {
    this.#shiftsResource.reload();
  }

  public async create(createShiftDto: CreateShiftDto) {
    const barId = this.#currentBarId();

    if (!barId) {
      return null;
    }

    try {
      await this.#createShift.execute(barId, createShiftDto);
      this.reload();
      return null;
    } catch (error) {
      return handleErrorFormField(error);
    }
  }

  public async delete(shiftId: string) {
    const barId = this.#currentBarId();

    if (!barId) {
      return null;
    }

    try {
      await this.#deleteShift.execute(barId, asShiftId(shiftId));
      this.reload();
      return null;
    } catch (error) {
      return handleErrorFormField(error);
    }
  }
}
