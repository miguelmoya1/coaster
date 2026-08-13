import type { EstablishmentId } from '@coaster/common';

export class RegisterPrinterIpCommand {
  constructor(
    public readonly establishmentId: EstablishmentId,
    public readonly ipAddress: string,
    public readonly deviceKey: string,
    public readonly port?: number,
  ) {}
}
