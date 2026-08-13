import type { EstablishmentId, ShiftId, UserId } from '@coaster/common';
import { CreateShiftExchangeDto } from '../../dto/create-shift-exchange.dto';

export class RequestExchangeCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly shiftId: ShiftId,
    public readonly requesterId: UserId,
    public readonly dto: CreateShiftExchangeDto,
  ) {}
}
