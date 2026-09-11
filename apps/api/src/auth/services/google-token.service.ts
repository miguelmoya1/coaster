import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify } from 'jose';

export const GOOGLE_CLIENT_ID = 'GOOGLE_CLIENT_ID';

const CERTS_URL = new URL('https://www.googleapis.com/oauth2/v3/certs');

const ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

export interface GoogleIdentity {
  subject: string;
  email: string;
  name: string | null;
  picture: string | null;
}

@Injectable()
export class GoogleTokenService {
  readonly #clientId: string | undefined;
  readonly #keys: ReturnType<typeof createRemoteJWKSet> | null;

  constructor(config: ConfigService) {
    this.#clientId = config.get<string>(GOOGLE_CLIENT_ID) || undefined;
    this.#keys = this.#clientId ? createRemoteJWKSet(CERTS_URL) : null;
  }

  public get configured(): boolean {
    return Boolean(this.#clientId);
  }

  public async verify(credential: string | undefined | null): Promise<GoogleIdentity | null> {
    if (!this.#keys || !this.#clientId || !credential) {
      return null;
    }

    try {
      const { payload } = await jwtVerify(credential, this.#keys, {
        algorithms: ['RS256'],
        issuer: ISSUERS,
        audience: this.#clientId,
      });

      return this.#identity(payload);
    } catch {
      return null;
    }
  }

  #identity(claims: Record<string, unknown>): GoogleIdentity | null {
    const verified = claims.email_verified === true || claims.email_verified === 'true';

    if (typeof claims.sub !== 'string' || typeof claims.email !== 'string' || !verified) {
      return null;
    }

    return {
      subject: claims.sub,
      email: claims.email.toLowerCase(),
      name: typeof claims.name === 'string' ? claims.name : null,
      picture: typeof claims.picture === 'string' ? claims.picture : null,
    };
  }
}
