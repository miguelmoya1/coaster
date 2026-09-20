import { ErrorCodes } from '@coaster/common';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';

/** Set it to `false` to stop asking; anything else, unset included, keeps the check on. */
export const PWNED_PASSWORDS_ENABLED = 'PWNED_PASSWORDS_ENABLED';

export const isPwnedCheckEnabled = (value: string | undefined): boolean => value !== 'false';

const RANGE_URL = 'https://api.pwnedpasswords.com/range/';

/** Long enough for a slow answer, short enough that nobody waits on it to open an account. */
const TIMEOUT_MS = 2_500;

/** Appearances in the breach corpus before the password is refused. One is plenty. */
const APPEARANCES_ALLOWED = 0;

/**
 * Checks a password against Have I Been Pwned without letting them —or anyone on the way— know
 * which password it is. Only the first five characters of its SHA-1 leave the service; the
 * answer is the few hundred hashes that start the same way, and the match is made here. That is
 * the k-anonymity model their range endpoint is built for, and `Add-Padding` keeps the size of
 * the answer from saying anything either.
 *
 * When the service cannot be reached the password goes through. Somebody opening an account is
 * not the right person to pay for an outage at a third party, and refusing them would turn a
 * bad afternoon at Cloudflare into an afternoon where nobody can sign up.
 */
@Injectable()
export class PwnedPasswordsService {
  readonly #logger = new Logger(PwnedPasswordsService.name);
  readonly #enabled: boolean;

  constructor(config: ConfigService) {
    this.#enabled = isPwnedCheckEnabled(config.get<string>(PWNED_PASSWORDS_ENABLED));
  }

  /** Refuses a password that is already in somebody's dictionary. */
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

  /**
   * Each line is the rest of a hash and how many times it turned up, and the padded ones come
   * back with a count of zero, so counting is all it takes to tell them apart.
   */
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
