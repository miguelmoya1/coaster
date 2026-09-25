import { inject, Service } from '@angular/core';
import type {
  AmendTimeEntryDto,
  CreateTimeEntryDto,
  EstablishmentId,
  TimeEntryId,
  TimeEntryType,
  VoidTimeEntryDto,
} from '@coaster/common';
import { TimeEntryRepository } from '../data-access/time-entry-repository';

@Service()
export class ManageTimeEntries {
  readonly #repository = inject(TimeEntryRepository);

  public async clock(
    establishmentId: EstablishmentId,
    type: TimeEntryType,
    coordinates?: { latitude: number; longitude: number },
  ): Promise<void> {
    await this.#repository.clock(establishmentId, { type, ...coordinates });
  }

  public async create(establishmentId: EstablishmentId, dto: CreateTimeEntryDto): Promise<void> {
    await this.#repository.create(establishmentId, dto);
  }

  public async amend(establishmentId: EstablishmentId, entryId: TimeEntryId, dto: AmendTimeEntryDto): Promise<void> {
    await this.#repository.amend(establishmentId, entryId, dto);
  }

  public async void(establishmentId: EstablishmentId, entryId: TimeEntryId, dto: VoidTimeEntryDto): Promise<void> {
    await this.#repository.void(establishmentId, entryId, dto);
  }

  public verifyIntegrity(establishmentId: EstablishmentId) {
    return this.#repository.integrity(establishmentId);
  }

  public exportCsv(establishmentId: EstablishmentId, range: { from: string; to: string }): Promise<Blob> {
    return this.#repository.exportCsv(establishmentId, range.from, range.to);
  }
}
