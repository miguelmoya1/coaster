import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class PrinterTokenService {
  private readonly secretKey: string;

  constructor(configService: ConfigService) {
    const secret = configService.get<string>('PRINTER_JWT_SECRET');
    if (!secret) {
      throw new Error(
        'PRINTER_JWT_SECRET environment variable is required. ' +
          "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
      );
    }
    this.secretKey = secret;
  }

  public generateToken(barId: string): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');

    const now = Math.floor(Date.now() / 1000);
    const payload = Buffer.from(
      JSON.stringify({
        barId,
        iat: now,
        exp: now + 8 * 24 * 60 * 60, // 8 days expiry
      }),
    ).toString('base64url');

    const signature = crypto.createHmac('sha256', this.secretKey).update(`${header}.${payload}`).digest('base64url');

    return `${header}.${payload}.${signature}`;
  }
}
