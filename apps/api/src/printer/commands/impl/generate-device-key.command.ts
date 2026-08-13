import type { EstablishmentId } from '@coaster/common';

export class GenerateDeviceKeyCommand {
  constructor(public readonly establishmentId: EstablishmentId) {}
}
