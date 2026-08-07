import type { AdminUsersQuery } from '@coaster/common';

export class ListAdminUsersQuery {
  constructor(public readonly filters: AdminUsersQuery) {}
}
