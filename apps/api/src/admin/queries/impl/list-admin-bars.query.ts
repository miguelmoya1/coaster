import type { AdminBarsQuery } from '@coaster/common';

export class ListAdminBarsQuery {
  constructor(public readonly filters: AdminBarsQuery) {}
}
