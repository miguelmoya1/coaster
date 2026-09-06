import type { AddBetaTesterDto, User } from '@coaster/common';

export class AddBetaTesterCommand {
  constructor(
    public readonly dto: AddBetaTesterDto,
    public readonly actor: User,
  ) {}
}
