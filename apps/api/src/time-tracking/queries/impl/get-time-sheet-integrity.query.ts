import type { EstablishmentId } from '@coaster/common';

export class GetTimeSheetIntegrityQuery {
  constructor(public readonly establishmentId: EstablishmentId) {}
}
