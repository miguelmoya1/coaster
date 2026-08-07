import type { BarId } from '@coaster/common';

export class GetPrinterStatusQuery {
  constructor(public readonly barId: BarId) {}
}
