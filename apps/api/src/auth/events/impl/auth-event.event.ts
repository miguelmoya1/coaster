import type { RecordAuthEvent } from '../../data-access/auth-event.repository';

export class AuthEventOccurred {
  constructor(public readonly entry: RecordAuthEvent) {}
}
