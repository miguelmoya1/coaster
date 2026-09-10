import { ErrorCodes } from '@coaster/common';
import { DbAuthProvider, DbService } from '@coaster/core/db';
import { NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetAccountQuery } from '../impl/get-account.query';

export interface LinkedIdentity {
  provider: DbAuthProvider;
  email: string;
  linkedAt: Date;
}

export interface AccountSummary {
  email: string;
  name: string;
  emailVerified: boolean;
  hasPassword: boolean;
  identities: LinkedIdentity[];
}

@QueryHandler(GetAccountQuery)
export class GetAccountHandler implements IQueryHandler<GetAccountQuery, AccountSummary> {
  constructor(private readonly _db: DbService) {}

  async execute(query: GetAccountQuery): Promise<AccountSummary> {
    const user = await this._db.dbUser.findUnique({
      where: { id: query.userId },
      include: { identities: { orderBy: { createdAt: 'asc' } } },
    });

    if (!user) {
      throw new NotFoundException(ErrorCodes.USER_NOT_FOUND);
    }

    return {
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerifiedAt !== null,
      hasPassword: user.passwordHash !== null,
      identities: user.identities.map((identity) => ({
        provider: identity.provider,
        email: identity.email,
        linkedAt: identity.createdAt,
      })),
    };
  }
}
