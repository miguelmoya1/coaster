import { BarId } from '@coaster/common';

export class CreateCustomerPortalSessionCommand {
  constructor(public readonly barId: BarId) {}
}
