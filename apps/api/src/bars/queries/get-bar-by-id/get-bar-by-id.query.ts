import type { BarId } from '@coaster/common';

export class GetBarByIdQuery {
  constructor(public readonly barId: BarId) {}
}
