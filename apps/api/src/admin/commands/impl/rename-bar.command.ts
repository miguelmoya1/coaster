import type { BarId, User } from '@coaster/common';

export class RenameBarCommand {
  constructor(
    public readonly barId: BarId,
    public readonly name: string,
    public readonly actor: User,
  ) {}
}
