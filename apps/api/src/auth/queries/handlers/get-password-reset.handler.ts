import { ErrorCodes } from '@coaster/common';
import { DbAuthTokenPurpose } from '@coaster/core/db';
import { BadRequestException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { AuthTokenRepository } from '../../data-access/auth-token.repository';
import { GetPasswordResetQuery } from '../impl/get-password-reset.query';

export interface PasswordResetSummary {
  email: string;
}

@QueryHandler(GetPasswordResetQuery)
export class GetPasswordResetHandler implements IQueryHandler<GetPasswordResetQuery, PasswordResetSummary> {
  constructor(private readonly _tokens: AuthTokenRepository) {}

  async execute(query: GetPasswordResetQuery): Promise<PasswordResetSummary> {
    const token = await this._tokens.findUsable(query.token, DbAuthTokenPurpose.PASSWORD_RESET);

    if (!token) {
      throw new BadRequestException(ErrorCodes.INVALID_TOKEN);
    }

    return { email: token.user.email };
  }
}
