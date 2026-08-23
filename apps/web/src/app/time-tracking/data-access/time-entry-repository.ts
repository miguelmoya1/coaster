import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import type {
  AmendTimeEntryDto,
  EstablishmentId,
  ClockDto,
  CreateTimeEntryDto,
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
    mine: (establishmentId: EstablishmentId, from: string, to: string) =>
      `/establishments/${establishmentId}/time-entries/me?${range(from, to)}`,
    current: (establishmentId: EstablishmentId) => `/establishments/${establishmentId}/time-entries/me/current`,
    team: (establishmentId: EstablishmentId, from: string, to: string, userId?: UserId) =>
      `/establishments/${establishmentId}/time-entries?${range(from, to, userId)}`,
    export: (establishmentId: EstablishmentId, from: string, to: string, userId?: UserId) =>
      `/establishments/${establishmentId}/time-entries/export?${range(from, to, userId)}`,
    integrity: (establishmentId: EstablishmentId) => `/establishments/${establishmentId}/time-entries/integrity`,
    clock: (establishmentId: EstablishmentId) => `/establishments/${establishmentId}/time-entries/clock`,
    create: (establishmentId: EstablishmentId) => `/establishments/${establishmentId}/time-entries`,
    amend: (establishmentId: EstablishmentId, entryId: TimeEntryId) =>
      `/establishments/${establishmentId}/time-entries/${entryId}/amend`,
    void: (establishmentId: EstablishmentId, entryId: TimeEntryId) =>
      `/establishments/${establishmentId}/time-entries/${entryId}/void`,
  };

  public clock(establishmentId: EstablishmentId, dto: ClockDto): Promise<TimeEntry> {
    return firstValueFrom(this.#http.post<TimeEntry>(this.routes.clock(establishmentId), dto));
  }

  public create(establishmentId: EstablishmentId, dto: CreateTimeEntryDto): Promise<TimeEntry> {
    return firstValueFrom(this.#http.post<TimeEntry>(this.routes.create(establishmentId), dto));
  }

  public amend(establishmentId: EstablishmentId, entryId: TimeEntryId, dto: AmendTimeEntryDto): Promise<TimeEntry> {
    return firstValueFrom(this.#http.post<TimeEntry>(this.routes.amend(establishmentId, entryId), dto));
  }

  public void(establishmentId: EstablishmentId, entryId: TimeEntryId, dto: VoidTimeEntryDto): Promise<TimeEntry> {
    return firstValueFrom(this.#http.post<TimeEntry>(this.routes.void(establishmentId, entryId), dto));
  }

  public integrity(establishmentId: EstablishmentId): Promise<TimeSheetIntegrity> {
    return firstValueFrom(this.#http.get<TimeSheetIntegrity>(this.routes.integrity(establishmentId)));
  }

  public exportCsv(establishmentId: EstablishmentId, from: string, to: string, userId?: UserId): Promise<Blob> {
    return firstValueFrom(
      this.#http.get(this.routes.export(establishmentId, from, to, userId), { responseType: 'blob' }),
    );
  }
}
