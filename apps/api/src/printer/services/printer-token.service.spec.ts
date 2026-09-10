import { createHmac } from 'crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { PRINTER_TOKEN_TTL_SECONDS, PrinterTokenService } from './printer-token.service';

const SECRET = 'the-secret-the-bridge-also-has';

const config = { get: () => SECRET } as any;

const decode = (part: string) => JSON.parse(Buffer.from(part, 'base64url').toString()) as Record<string, unknown>;

describe('PrinterTokenService', () => {
  let service: PrinterTokenService;

  beforeEach(() => {
    service = new PrinterTokenService(config);
  });

  it('should refuse to start without a secret', () => {
    expect(() => new PrinterTokenService({ get: () => undefined } as any)).toThrow(/PRINTER_JWT_SECRET/);
  });

  it('should sign an HS256 token over the header and the payload, which is what the Go bridge verifies', async () => {
    const [header, payload, signature] = (await service.generateToken('establishment-1')).split('.');

    expect(decode(header)).toEqual({ alg: 'HS256', typ: 'JWT' });
    expect(signature).toBe(createHmac('sha256', SECRET).update(`${header}.${payload}`).digest('base64url'));
  });

  it('should name the establishment in the claim the bridge reads', async () => {
    const [, payload] = (await service.generateToken('establishment-1')).split('.');

    expect(decode(payload).establishmentId).toBe('establishment-1');
  });

  it('should always carry exp, because the bridge rejects a token without one', async () => {
    const [, payload] = (await service.generateToken('establishment-1')).split('.');
    const { iat, exp } = decode(payload) as { iat: number; exp: number };

    expect(exp).toBeTypeOf('number');
    expect(exp - iat).toBe(PRINTER_TOKEN_TTL_SECONDS);
  });
});
