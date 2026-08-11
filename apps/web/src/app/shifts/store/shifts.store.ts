import { asShiftId } from '@coaster/common';
import { httpResource } from '@angular/common/http';
import { effect, inject, Service, signal } from '@angular/core';
import type { EstablishmentId, CreateShiftDto, Shift } from '@coaster/common';
import { ErrorCodes } from '@coaster/common';
import { Socket } from '@coaster/core';
import { ShiftRepository } from '../data-access/shift-repository';
import { shiftArrayMapper } from '../mappers/shift.mapper';
import { EstablishmentShifts } from '../services/establishment-shifts';
import { CreateShift } from '../services/create-shift';
import { DeleteShift } from '../services/delete-shift';

@Service()
export class ShiftsStore {
  readonly #establishmentShifts = inject(EstablishmentShifts);
  readonly #createShift = inject(CreateShift);
  readonly #deleteShift = inject(DeleteShift);
  readonly #shiftRepository = inject(ShiftRepository);
  readonly #socketService = inject(Socket);

  readonly #currentEstablishmentId = signal<EstablishmentId | undefined>(undefined);
  readonly #startDate = signal<string | undefined>(undefined);
  readonly #endDate = signal<string | undefined>(undefined);

  readonly #shiftsResource = httpResource(
    () => this.#establishmentShifts.execute(this.#currentEstablishmentId(), this.#startDate(), this.#endDate()),
    {
      parse: shiftArrayMapper,
    },
  );

  readonly shifts = this.#shiftsResource.asReadonly();

  constructor() {
    effect(() => {
      const created = this.#socketService.shiftCreated();
      if (created) {
        this.reload();
      }
    });

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

  public setEstablishmentId(establishmentId: EstablishmentId | undefined) {
    this.#currentEstablishmentId.set(establishmentId);
  }

  public setDateRange(start: string | undefined, end: string | undefined) {
    this.#startDate.set(start);
    this.#endDate.set(end);
  }

  public reload() {
    this.#shiftsResource.reload();
  }

  /** Reads a past week so it can be copied forward. Not the rota on screen, which is a resource. */
  public async listBetween(startDate: string, endDate: string): Promise<Shift[]> {
    const establishmentId = this.#currentEstablishmentId();

    return establishmentId ? this.#shiftRepository.listBetween(establishmentId, startDate, endDate) : [];
  }

  public async create(createShiftDto: CreateShiftDto) {
    const establishmentId = this.#currentEstablishmentId();

    if (!establishmentId) {
      throw new Error(ErrorCodes.MISSING_ESTABLISHMENT_ID);
    }

    await this.#createShift.execute(establishmentId, createShiftDto);
    this.reload();
  }

  public async delete(shiftId: string) {
    const establishmentId = this.#currentEstablishmentId();

    if (!establishmentId) {
      throw new Error(ErrorCodes.MISSING_ESTABLISHMENT_ID);
    }

    await this.#deleteShift.execute(establishmentId, asShiftId(shiftId));
    this.reload();
  }
}
