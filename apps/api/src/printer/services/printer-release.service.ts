import { DOWNLOADS_ROOT } from '@coaster/core';
import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { createReadStream, existsSync } from 'fs';
import { join } from 'path';

export const PRINTER_BRIDGE_VERSION = '1.1.0';

const BINARIES: Record<string, string> = {
  windows: 'printer-service-windows.exe',
  linux: 'printer-service-linux',
};

export interface PrinterRelease {
  version: string;
  url: string;
  sha256: string;
}

@Injectable()
export class PrinterReleaseService {
  private readonly _logger = new Logger(PrinterReleaseService.name);
  private readonly _checksums = new Map<string, string>();

  public async find(os: string): Promise<PrinterRelease | null> {
    const filename = BINARIES[os];
    if (!filename) {
      return null;
    }

    const sha256 = await this.checksum(filename);
    if (!sha256) {
      this._logger.error(
        `No binary at public/downloads/${filename}. Bridges on ${os} cannot update until it is published.`,
      );
      return null;
    }

    return {
      version: PRINTER_BRIDGE_VERSION,
      url: `${this.baseUrl()}/public/downloads/${filename}`,
      sha256,
    };
  }

  private baseUrl(): string {
    const configured = process.env['PUBLIC_URL'];
    if (configured) {
      return configured.replace(/\/+$/, '');
    }

    this._logger.warn('PUBLIC_URL is not set; advertising downloads on localhost, which no establishment can reach.');
    return 'http://localhost:3000';
  }

  private async checksum(filename: string): Promise<string | null> {
    const cached = this._checksums.get(filename);
    if (cached) {
      return cached;
    }

    const path = join(DOWNLOADS_ROOT, filename);
    if (!existsSync(path)) {
      return null;
    }

    const digest = await this.hashFile(path);
    this._checksums.set(filename, digest);
    return digest;
  }

  private hashFile(path: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = createHash('sha256');
      const stream = createReadStream(path);

      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(hash.digest('hex')));
    });
  }
}
