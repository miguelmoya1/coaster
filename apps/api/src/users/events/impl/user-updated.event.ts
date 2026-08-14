import type { UserId } from '@coaster/common';

export class UserUpdatedEvent {
  constructor(
    public readonly userId: UserId,
    public readonly googleId: string | null,
  ) {}
}
