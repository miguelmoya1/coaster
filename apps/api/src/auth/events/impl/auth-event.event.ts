import type { RecordAuthEvent } from '../../data-access/auth-event.repository';

/**
 * Something happened to the way somebody signs in. It is published rather than written on the
 * spot so that a log the database will not take never costs anyone their login.
 */
export class AuthEventOccurred {
  constructor(public readonly entry: RecordAuthEvent) {}
}
