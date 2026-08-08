import { httpResource } from '@angular/common/http';
import { computed, inject, Service, signal } from '@angular/core';
import type {
  AmendTimeEntryDto,
  BarId,
  CreateTimeEntryDto,
  RequestTimeCorrectionDto,
  ResolveTimeCorrectionDto,
  TimeEntryId,
  TimeEntryType,
  UserId,
  VoidTimeEntryDto,
  Workday,
} from '@coaster/common';
import { ClockState, ErrorCodes } from '@coaster/common';
import { TimeEntryRepository } from '../data-access/time-entry-repository';
import { workdayArrayMapper } from '../mappers/workday.mapper';

@Service()
export class TimeTrackingStore {
  readonly #repository = inject(TimeEntryRepository);

  readonly #barId = signal<BarId | undefined>(undefined);
  readonly #from = signal<string | undefined>(undefined);
  readonly #to = signal<string | undefined>(undefined);
  readonly #teamUserId = signal<UserId | undefined>(undefined);
  readonly #teamEnabled = signal(false);

  readonly #mineResource = httpResource(
    () => {
      const barId = this.#barId();
      const from = this.#from();
      const to = this.#to();

      return barId && from && to ? this.#repository.routes.mine(barId, from, to) : undefined;
    },
    { parse: workdayArrayMapper },
  );

  readonly #teamResource = httpResource(
    () => {
      const barId = this.#barId();
      const from = this.#from();
      const to = this.#to();

      return barId && from && to && this.#teamEnabled()
        ? this.#repository.routes.team(barId, from, to, this.#teamUserId())
        : undefined;
    },
    { parse: workdayArrayMapper },
  );

  public readonly myWorkdays = this.#mineResource.asReadonly();
  public readonly teamWorkdays = this.#teamResource.asReadonly();

  public readonly myWorkday = computed<Workday | undefined>(() =>
    this.myWorkdays.hasValue() ? this.myWorkdays.value()?.[0] : undefined,
  );

  public readonly clockState = computed<ClockState>(() => this.myWorkday()?.state ?? ClockState.OUT);

  public setBarId(barId: BarId | undefined) {
    this.#barId.set(barId);
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

    if (this.#teamEnabled()) {
      this.#teamResource.reload();
    }
  }

  public async clock(type: TimeEntryType, coordinates?: { latitude: number; longitude: number }) {
    await this.#repository.clock(this.#requireBarId(), { type, ...coordinates });
    this.reload();
  }

  public async createEntry(dto: CreateTimeEntryDto) {
    await this.#repository.create(this.#requireBarId(), dto);
    this.reload();
  }

  public async amend(entryId: TimeEntryId, dto: AmendTimeEntryDto) {
    await this.#repository.amend(this.#requireBarId(), entryId, dto);
    this.reload();
  }

  public async voidEntry(entryId: TimeEntryId, dto: VoidTimeEntryDto) {
    await this.#repository.void(this.#requireBarId(), entryId, dto);
    this.reload();
  }

  public async requestCorrection(entryId: TimeEntryId, dto: RequestTimeCorrectionDto) {
    await this.#repository.requestCorrection(this.#requireBarId(), entryId, dto);
    this.reload();
  }

  public async resolveCorrection(entryId: TimeEntryId, approved: boolean, dto: ResolveTimeCorrectionDto = {}) {
    await this.#repository.resolveCorrection(this.#requireBarId(), entryId, approved, dto);
    this.reload();
  }

  public verifyIntegrity() {
    return this.#repository.integrity(this.#requireBarId());
  }

  public exportCsv() {
    const from = this.#from();
    const to = this.#to();

    if (!from || !to) {
      throw new Error(ErrorCodes.INVALID_DATE);
    }

    return this.#repository.exportCsv(this.#requireBarId(), from, to, this.#teamUserId());
  }

  #requireBarId(): BarId {
    const barId = this.#barId();

    if (!barId) {
      throw new Error(ErrorCodes.MISSING_BAR_ID);
    }

    return barId;
  }
}
