import type { BarId } from '@coaster/common';

export class GetTimeSheetIntegrityQuery {
  constructor(public readonly barId: BarId) {}
}
