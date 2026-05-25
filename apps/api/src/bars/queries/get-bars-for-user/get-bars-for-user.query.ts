import { User } from '@coaster/common';

export class GetBarsForUserQuery {
  constructor(public readonly user: User) {}
}
