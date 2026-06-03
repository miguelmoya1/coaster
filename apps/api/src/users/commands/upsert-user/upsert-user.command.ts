import type { CreateUserDto } from '@coaster/common';

export class UpsertUserCommand {
  constructor(public readonly dto: CreateUserDto) {}
}
