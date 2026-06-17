import type { UserId } from '@coaster/common';
import { UpdateUserDto } from '../../dto/update-user.dto';

export class UpdateUserCommand {
  constructor(
    public readonly id: UserId,
    public readonly updateUserDto: UpdateUserDto,
  ) {}
}
