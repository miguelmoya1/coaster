import type { UpdateUserDto, UserId } from '@coaster/common';

export class UpdateUserCommand {
  constructor(
    public readonly id: UserId,
    public readonly dto: UpdateUserDto,
  ) {}
}
