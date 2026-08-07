import type { UserId } from '@coaster/common';

export class GetAdminUserDetailQuery {
  constructor(public readonly userId: UserId) {}
}
