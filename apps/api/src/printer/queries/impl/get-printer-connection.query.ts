import type { BarId } from '@coaster/common';

export class GetPrinterConnectionQuery {
  constructor(public readonly barId: BarId) {}
}
