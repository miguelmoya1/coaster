import type { UpdateAdminUserDto, User, UserId } from '@coaster/common';

export class UpdateAdminUserCommand {
  constructor(
    public readonly userId: UserId,
    public readonly dto: UpdateAdminUserDto,
    public readonly actor: User,
  ) {}
}
