import type { EstablishmentId } from '@coaster/common';
import { CreateShiftDto } from '../../dto/create-shift.dto';

export class CreateShiftCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly dto: CreateShiftDto,
  ) {}
}
