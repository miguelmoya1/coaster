import { Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class PrinterService {
  getLatestVersion(os: string) {
    const version = '1.0.3'; // Simulated new version to trigger update
    const baseUrl = process.env.PUBLIC_URL || 'http://localhost:3000';

    if (os === 'windows') {
      return {
        version,
        url: `${baseUrl}/public/downloads/printer-service-windows.exe`,
      };
    } else if (os === 'linux') {
      return {
        version,
        url: `${baseUrl}/public/downloads/printer-service-linux`,
      };
    }

    throw new BadRequestException('Unsupported OS');
  }
}
