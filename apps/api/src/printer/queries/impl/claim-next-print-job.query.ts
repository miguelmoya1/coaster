import type { BarId } from '@coaster/common';

export class ClaimNextPrintJobQuery {
  constructor(
    public readonly barId: BarId,
    public readonly deviceKey: string | undefined,
  ) {}
}
