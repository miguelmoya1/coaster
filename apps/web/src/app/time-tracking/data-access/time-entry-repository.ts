import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type {
  AmendTimeEntryDto,
  BarId,
  ClockDto,
  CreateTimeEntryDto,
  RequestTimeCorrectionDto,
  ResolveTimeCorrectionDto,
  TimeEntry,
  TimeEntryId,
  TimeSheetIntegrity,
  UserId,
  VoidTimeEntryDto,
} from '@coaster/common';
import { firstValueFrom } from 'rxjs';

const range = (from: string, to: string, userId?: UserId) =>
  `from=${from}&to=${to}${userId ? `&userId=${userId}` : ''}`;

@Service()
export class TimeEntryRepository {
  readonly #http = inject(HttpClient);

  public readonly routes = {
    mine: (barId: BarId, from: string, to: string) => `/bars/${barId}/time-entries/me?${range(from, to)}`,
    team: (barId: BarId, from: string, to: string, userId?: UserId) =>
      `/bars/${barId}/time-entries?${range(from, to, userId)}`,
    export: (barId: BarId, from: string, to: string, userId?: UserId) =>
      `/bars/${barId}/time-entries/export?${range(from, to, userId)}`,
    integrity: (barId: BarId) => `/bars/${barId}/time-entries/integrity`,
    clock: (barId: BarId) => `/bars/${barId}/time-entries/clock`,
    create: (barId: BarId) => `/bars/${barId}/time-entries`,
    amend: (barId: BarId, entryId: TimeEntryId) => `/bars/${barId}/time-entries/${entryId}/amend`,
    void: (barId: BarId, entryId: TimeEntryId) => `/bars/${barId}/time-entries/${entryId}/void`,
    requestCorrection: (barId: BarId, entryId: TimeEntryId) =>
      `/bars/${barId}/time-entries/${entryId}/request-correction`,
    approveCorrection: (barId: BarId, entryId: TimeEntryId) =>
      `/bars/${barId}/time-entries/${entryId}/approve-correction`,
    rejectCorrection: (barId: BarId, entryId: TimeEntryId) =>
      `/bars/${barId}/time-entries/${entryId}/reject-correction`,
  };

  public clock(barId: BarId, dto: ClockDto): Promise<TimeEntry> {
    return firstValueFrom(this.#http.post<TimeEntry>(this.routes.clock(barId), dto));
  }

  public create(barId: BarId, dto: CreateTimeEntryDto): Promise<TimeEntry> {
    return firstValueFrom(this.#http.post<TimeEntry>(this.routes.create(barId), dto));
  }

  public amend(barId: BarId, entryId: TimeEntryId, dto: AmendTimeEntryDto): Promise<TimeEntry> {
    return firstValueFrom(this.#http.post<TimeEntry>(this.routes.amend(barId, entryId), dto));
  }

  public void(barId: BarId, entryId: TimeEntryId, dto: VoidTimeEntryDto): Promise<TimeEntry> {
    return firstValueFrom(this.#http.post<TimeEntry>(this.routes.void(barId, entryId), dto));
  }

  public requestCorrection(barId: BarId, entryId: TimeEntryId, dto: RequestTimeCorrectionDto): Promise<TimeEntry> {
    return firstValueFrom(this.#http.post<TimeEntry>(this.routes.requestCorrection(barId, entryId), dto));
  }

  public resolveCorrection(
    barId: BarId,
    entryId: TimeEntryId,
    approved: boolean,
    dto: ResolveTimeCorrectionDto,
  ): Promise<TimeEntry> {
    const route = approved ? this.routes.approveCorrection : this.routes.rejectCorrection;

    return firstValueFrom(this.#http.post<TimeEntry>(route(barId, entryId), dto));
  }

  public integrity(barId: BarId): Promise<TimeSheetIntegrity> {
    return firstValueFrom(this.#http.get<TimeSheetIntegrity>(this.routes.integrity(barId)));
  }

  public exportCsv(barId: BarId, from: string, to: string, userId?: UserId): Promise<Blob> {
    return firstValueFrom(
      this.#http.get(this.routes.export(barId, from, to, userId), { responseType: 'blob' }),
    );
  }
}
