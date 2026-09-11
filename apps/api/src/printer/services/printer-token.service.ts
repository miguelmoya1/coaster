import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SignJWT } from 'jose';

export const PRINTER_TOKEN_TTL_SECONDS = 8 * 24 * 60 * 60;

@Injectable()
export class PrinterTokenService {
  readonly #secret: Uint8Array;

  constructor(configService: ConfigService) {
    const secret = configService.get<string>('PRINTER_JWT_SECRET');

    if (!secret) {
      throw new Error(
        'PRINTER_JWT_SECRET environment variable is required. ' +
          "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
      );
    }

    this.#secret = new TextEncoder().encode(secret);
  }

  public generateToken(establishmentId: string): Promise<string> {
    return new SignJWT({ establishmentId })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt()
      .setExpirationTime(`${PRINTER_TOKEN_TTL_SECONDS}s`)
      .sign(this.#secret);
  }
}
