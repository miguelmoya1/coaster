import type { User } from '@coaster/common';

export class GetEstablishmentsForUserQuery {
  constructor(public readonly user: User) {}
}
