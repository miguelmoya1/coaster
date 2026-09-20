import { ErrorCodes } from '@coaster/common';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';

export const PWNED_PASSWORDS_ENABLED = 'PWNED_PASSWORDS_ENABLED';

export const isPwnedCheckEnabled = (value: string | undefined): boolean => value !== 'false';

const RANGE_URL = 'https://api.pwnedpasswords.com/range/';

const TIMEOUT_MS = 2_500;

const APPEARANCES_ALLOWED = 0;

@Injectable()
export class PwnedPasswordsService {
  readonly #logger = new Logger(PwnedPasswordsService.name);
  readonly #enabled: boolean;

  constructor(config: ConfigService) {
    this.#enabled = isPwnedCheckEnabled(config.get<string>(PWNED_PASSWORDS_ENABLED));
  }

  public async assertNotCompromised(password: string): Promise<void> {
    if (await this.compromised(password)) {
      throw new BadRequestException(ErrorCodes.PASSWORD_COMPROMISED);
    }
  }

  public async compromised(password: string): Promise<boolean> {
    if (!this.#enabled) {
      return false;
    }

    const digest = createHash('sha1').update(password, 'utf8').digest('hex').toUpperCase();
    const range = await this.#range(digest.slice(0, 5));

    return range === null ? false : this.#appearancesOf(range, digest.slice(5)) > APPEARANCES_ALLOWED;
  }

  async #range(prefix: string): Promise<string | null> {
    try {
      const response = await fetch(`${RANGE_URL}${prefix}`, {
        headers: { 'Add-Padding': 'true', 'User-Agent': 'coaster' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (!response.ok) {
        this.#logger.warn(`Have I Been Pwned answered ${response.status}; letting the password through`);

        return null;
      }

      return await response.text();
    } catch (error) {
      this.#logger.warn(`Could not ask Have I Been Pwned (${(error as Error).message}); letting the password through`);

      return null;
    }
  }

  #appearancesOf(range: string, suffix: string): number {
    for (const line of range.split('\n')) {
      const [candidate, count] = line.trim().split(':');

      if (candidate === suffix) {
        return Number.parseInt(count, 10) || 0;
      }
    }

    return 0;
  }
}
