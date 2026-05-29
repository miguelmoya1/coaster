import { CreateBarDto, User } from '@coaster/common';

export class CreateBarCommand {
  constructor(
    public readonly dto: CreateBarDto,
    public readonly user: User,
  ) {}
}
