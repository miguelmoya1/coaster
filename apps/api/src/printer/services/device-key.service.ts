import type { BarId } from '@coaster/common';
import { ErrorCodes } from '@coaster/common';
import { ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrinterReadRepository } from '../data-access/printer.read.repository';

@Injectable()
export class DeviceKeyService {
  constructor(private readonly _readRepo: PrinterReadRepository) {}

  public async authenticate(barId: BarId, deviceKey: string | undefined): Promise<void> {
    if (!deviceKey) {
      throw new UnauthorizedException('X-Device-Key header is required');
    }

    const config = await this._readRepo.findByBarId(barId);
    if (!config) {
      throw new NotFoundException(ErrorCodes.PRINTER_NOT_CONFIGURED);
    }

    if (!this.matches(config.deviceKey, deviceKey)) {
      throw new ForbiddenException(ErrorCodes.PRINTER_INVALID_DEVICE_KEY);
    }
  }

  private matches(stored: string, provided: string): boolean {
    const storedBuffer = Buffer.from(stored, 'utf8');
    const providedBuffer = Buffer.from(provided, 'utf8');

    if (storedBuffer.length !== providedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(storedBuffer, providedBuffer);
  }
}
