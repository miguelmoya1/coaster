import type { BarId } from '@coaster/common';

export class GenerateDeviceKeyCommand {
  constructor(public readonly barId: BarId) {}
}
