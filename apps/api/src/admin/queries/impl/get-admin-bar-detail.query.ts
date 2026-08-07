import type { BarId } from '@coaster/common';

export class GetAdminBarDetailQuery {
  constructor(public readonly barId: BarId) {}
}
