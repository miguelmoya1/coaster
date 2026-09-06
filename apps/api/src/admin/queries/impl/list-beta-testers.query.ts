import type { AdminBetaTestersQuery } from '@coaster/common';

export class ListBetaTestersQuery {
  constructor(public readonly filters: AdminBetaTestersQuery) {}
}
