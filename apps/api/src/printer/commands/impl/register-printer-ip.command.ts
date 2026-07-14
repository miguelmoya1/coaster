import type { BarId } from '@coaster/common';

export class RegisterPrinterIpCommand {
  constructor(
    public readonly barId: BarId,
    public readonly ipAddress: string,
    public readonly deviceKey: string,
  ) {}
}
