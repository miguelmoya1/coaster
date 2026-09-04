import { httpResource } from '@angular/common/http';
import { computed, inject, Service, signal } from '@angular/core';
import type {
  AmendTimeEntryDto,
  EstablishmentId,
  CreateTimeEntryDto,
  TimeEntryId,
  TimeEntryType,
  UserId,
  VoidTimeEntryDto,
  Workday,
} from '@coaster/common';
import { ClockState, ErrorCodes } from '@coaster/common';
import { TimeEntryRepository } from '../data-access/time-entry-repository';
import { workdayArrayMapper, workdayMapper } from '../mappers/workday.mapper';

@Service()
export class TimeTrackingStore {
  readonly #repository = inject(TimeEntryRepository);

  readonly #establishmentId = signal<EstablishmentId | undefined>(undefined);
  readonly #from = signal<string | undefined>(undefined);
  readonly #to = signal<string | undefined>(undefined);
  readonly #teamUserId = signal<UserId | undefined>(undefined);
  readonly #teamEnabled = signal(false);

  readonly #mineResource = httpResource(
    () => {
      const establishmentId = this.#establishmentId();
      const from = this.#from();
      const to = this.#to();

      return establishmentId && from && to ? this.#repository.routes.mine(establishmentId, from, to) : undefined;
    },
    { parse: workdayArrayMapper },
  );

  readonly #currentResource = httpResource(
    () => {
      const establishmentId = this.#establishmentId();

      return establishmentId ? this.#repository.routes.current(establishmentId) : undefined;
    },
    { parse: workdayMapper },
  );

  readonly #teamResource = httpResource(
    () => {
      const establishmentId = this.#establishmentId();
      const from = this.#from();
      const to = this.#to();

      return establishmentId && from && to && this.#teamEnabled()
        ? this.#repository.routes.team(establishmentId, from, to, this.#teamUserId())
        : undefined;
    },
    { parse: workdayArrayMapper },
  );

  public readonly myWorkdays = this.#mineResource.asReadonly();
  public readonly teamWorkdays = this.#teamResource.asReadonly();

  public readonly myWorkday = computed<Workday | undefined>(() => {
    const day = this.#from();

    return this.myWorkdays.hasValue() ? this.myWorkdays.value()?.find((workday) => workday.date === day) : undefined;
  });

  public readonly currentWorkday = computed<Workday | undefined>(() =>
    this.#currentResource.hasValue() ? (this.#currentResource.value() ?? undefined) : undefined,
  );

  public readonly clockState = computed<ClockState>(() => this.currentWorkday()?.state ?? ClockState.OUT);

  public readonly isClockLoading = this.#currentResource.isLoading;

  public setEstablishmentId(establishmentId: EstablishmentId | undefined) {
    this.#establishmentId.set(establishmentId);
  }

  public setRange(from: string | undefined, to: string | undefined) {
    this.#from.set(from);
    this.#to.set(to);
  }

  public setTeamEnabled(enabled: boolean) {
    this.#teamEnabled.set(enabled);
  }

  public setTeamUserId(userId: UserId | undefined) {
    this.#teamUserId.set(userId);
  }

  public reload() {
    this.#mineResource.reload();
    this.#currentResource.reload();

    if (this.#teamEnabled()) {
      this.#teamResource.reload();
    }
  }

  public async clock(type: TimeEntryType, coordinates?: { latitude: number; longitude: number }) {
    const establishmentId = this.#requireEstablishmentId();

    try {
      await this.#repository.clock(establishmentId, { type, ...coordinates });
    } finally {
      this.reload();
    }
  }

  public async createEntry(dto: CreateTimeEntryDto) {
    await this.#repository.create(this.#requireEstablishmentId(), dto);
    this.reload();
  }

  public async amend(entryId: TimeEntryId, dto: AmendTimeEntryDto) {
    await this.#repository.amend(this.#requireEstablishmentId(), entryId, dto);
    this.reload();
  }

  public async voidEntry(entryId: TimeEntryId, dto: VoidTimeEntryDto) {
    await this.#repository.void(this.#requireEstablishmentId(), entryId, dto);
    this.reload();
  }

  public verifyIntegrity() {
    return this.#repository.integrity(this.#requireEstablishmentId());
  }

  public exportCsv(range?: { from: string; to: string }) {
    const from = range?.from ?? this.#from();
    const to = range?.to ?? this.#to();

    if (!from || !to) {
      throw new Error(ErrorCodes.INVALID_DATE);
    }

    return this.#repository.exportCsv(this.#requireEstablishmentId(), from, to, this.#teamUserId());
  }

  #requireEstablishmentId(): EstablishmentId {
    const establishmentId = this.#establishmentId();

    if (!establishmentId) {
      throw new Error(ErrorCodes.MISSING_ESTABLISHMENT_ID);
    }

    return establishmentId;
  }
}
