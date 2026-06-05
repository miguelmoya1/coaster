import type { BarId } from '@coaster/common';

export class GetMembersQuery {
  constructor(public readonly barId: BarId) {}
}
