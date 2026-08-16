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
import { ClockState, ErrorCodes, ESTABLISHMENT_TIME_ZONE } from '@coaster/common';
import { TimeEntryRepository } from '../data-access/time-entry-repository';
import { workdayArrayMapper } from '../mappers/workday.mapper';

const A_DAY_IN_MS = 24 * 60 * 60 * 1000;

const workdayDate = (instant: Date): string => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ESTABLISHMENT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);

  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)!.value;

  return `${value('year')}-${value('month')}-${value('day')}`;
};

export const today = () => workdayDate(new Date());
export const lastNight = () => workdayDate(new Date(Date.now() - A_DAY_IN_MS));

/**
 * Mirrors the rule the server punches by: a shift that ran past midnight is still the day it started
 * until the small hours are over. After that the worker opens a new day and the old one is left for
 * somebody to correct.
 */
const NIGHT_SHIFT_ENDS_AT_HOUR = 6;

const stillNight = () =>
  Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: ESTABLISHMENT_TIME_ZONE,
      hour: '2-digit',
      hour12: false,
    }).format(new Date()),
  ) < NIGHT_SHIFT_ENDS_AT_HOUR;

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

  readonly #actionableResource = httpResource(
    () => {
      const establishmentId = this.#establishmentId();

      return establishmentId ? this.#repository.routes.mine(establishmentId, lastNight(), today()) : undefined;
    },
    { parse: workdayArrayMapper },
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

  readonly #openWorkdays = computed<Workday[]>(() =>
    this.#actionableResource.hasValue()
      ? (this.#actionableResource.value() ?? []).filter((workday) => workday.state !== ClockState.OUT)
      : [],
  );

  public readonly actionableWorkday = computed<Workday | undefined>(() => {
    if (!this.#actionableResource.hasValue()) {
      return undefined;
    }

    const workdays = this.#actionableResource.value() ?? [];
    const runningIntoTonight = stillNight()
      ? this.#openWorkdays().find((workday) => workday.date === lastNight())
      : undefined;

    return runningIntoTonight ?? workdays.find((workday) => workday.date === today());
  });

  public readonly clockState = computed<ClockState>(() => this.actionableWorkday()?.state ?? ClockState.OUT);

  /** A day nobody closed: the worker can still clock in today, but somebody has to correct it. */
  public readonly unclosedWorkday = computed<Workday | undefined>(() =>
    this.#openWorkdays().find((workday) => workday.date !== this.actionableWorkday()?.date),
  );

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
    this.#actionableResource.reload();

    if (this.#teamEnabled()) {
      this.#teamResource.reload();
    }
  }

  public async clock(type: TimeEntryType, coordinates?: { latitude: number; longitude: number }) {
    await this.#repository.clock(this.#requireEstablishmentId(), { type, ...coordinates });
    this.reload();
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
