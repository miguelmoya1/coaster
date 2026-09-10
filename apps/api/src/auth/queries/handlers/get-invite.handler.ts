import { ErrorCodes } from '@coaster/common';
import { DbAuthTokenPurpose, DbService } from '@coaster/core/db';
import { BadRequestException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { AuthTokenRepository } from '../../data-access/auth-token.repository';
import { GetInviteQuery } from '../impl/get-invite.query';

export interface InviteSummary {
  email: string;
  name: string;
  hasCredentials: boolean;
}

@QueryHandler(GetInviteQuery)
export class GetInviteHandler implements IQueryHandler<GetInviteQuery, InviteSummary> {
  constructor(
    private readonly _tokens: AuthTokenRepository,
    private readonly _db: DbService,
  ) {}

  async execute(query: GetInviteQuery): Promise<InviteSummary> {
    const token = await this._tokens.findUsable(query.token, DbAuthTokenPurpose.INVITE);

    if (!token) {
      throw new BadRequestException(ErrorCodes.INVALID_TOKEN);
    }

    const identities = await this._db.dbAuthIdentity.count({ where: { userId: token.userId } });

    return {
      email: token.user.email,
      name: token.user.name,
      hasCredentials: Boolean(token.user.passwordHash) || identities > 0,
    };
  }
}
