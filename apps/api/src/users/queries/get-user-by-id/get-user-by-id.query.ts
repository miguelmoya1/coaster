import type { UserId } from '@coaster/common';

export class GetUserByIdQuery {
  constructor(public readonly id: UserId) {}
}
