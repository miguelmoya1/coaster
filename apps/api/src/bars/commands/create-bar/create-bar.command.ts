import type { User } from '@coaster/common';
import { CreateBarDto } from '../../dto/create-bar.dto';

export class CreateBarCommand {
  constructor(
    public readonly dto: CreateBarDto,
    public readonly user: User,
  ) {}
}
