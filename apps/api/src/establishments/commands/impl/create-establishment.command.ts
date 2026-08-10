import type { User } from '@coaster/common';
import { CreateEstablishmentDto } from '../../dto/create-establishment.dto';

export class CreateEstablishmentCommand {
  constructor(
    public readonly dto: CreateEstablishmentDto,
    public readonly user: User,
  ) {}
}
