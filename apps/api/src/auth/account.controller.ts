import type { User } from '@coaster/common';
import { DbAuthProvider } from '@coaster/core/db';
import { Body, Controller, Delete, Get, HttpCode, Param, ParseEnumPipe, Post, Put, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { seconds, Throttle } from '@nestjs/throttler';
import { RequestEmailVerificationCommand, SetPasswordCommand, UnlinkIdentityCommand } from './commands';
import { CurrentUser } from './decorators/current-user.decorator';
import type { SessionClaims } from './decorators/current-session.decorator';
import { CurrentSession } from './decorators/current-session.decorator';
import { SetPasswordDto } from './dto/set-password.dto';
import { AuthGuard } from './guards/auth.guard';
import { GetAccountQuery } from './queries';
import type { AccountSummary } from './queries/handlers/get-account.handler';

@ApiTags('Account')
@Controller('account')
@UseGuards(AuthGuard)
export class AccountController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @ApiOperation({ summary: 'How this person can sign in, and whether their address is confirmed' })
  @ApiResponse({ status: 200, description: 'The account summary' })
  async account(@CurrentUser() user: User): Promise<AccountSummary> {
    return this.queryBus.execute<GetAccountQuery, AccountSummary>(new GetAccountQuery(user.id));
  }

  @Post('verify-email')
  @HttpCode(204)
  @Throttle({ default: { ttl: seconds(60), limit: 3 } })
  @ApiOperation({ summary: 'Emails a link to confirm the address' })
  @ApiResponse({ status: 204, description: 'Sent, or already confirmed and nothing to send' })
  async requestVerification(@CurrentUser() user: User): Promise<void> {
    await this.commandBus.execute<RequestEmailVerificationCommand, void>(
      new RequestEmailVerificationCommand(user.id),
    );
  }

  @Put('password')
  @HttpCode(204)
  @Throttle({ default: { ttl: seconds(60), limit: 5 } })
  @ApiOperation({ summary: 'Sets a password, or changes the one already there' })
  @ApiResponse({ status: 204, description: 'Password set; every other session was closed' })
  @ApiResponse({ status: 401, description: 'The current password does not match' })
  async setPassword(
    @CurrentUser() user: User,
    @CurrentSession() session: SessionClaims,
    @Body() dto: SetPasswordDto,
  ): Promise<void> {
    await this.commandBus.execute<SetPasswordCommand, void>(
      new SetPasswordCommand(user.id, session.sid, dto.password, dto.currentPassword),
    );
  }

  @Delete('identities/:provider')
  @HttpCode(204)
  @ApiOperation({ summary: 'Unlinks a sign-in provider from the account' })
  @ApiResponse({ status: 204, description: 'Unlinked' })
  @ApiResponse({ status: 400, description: 'Not linked, or the only way left to sign in' })
  async unlink(
    @CurrentUser() user: User,
    @Param('provider', new ParseEnumPipe(DbAuthProvider)) provider: DbAuthProvider,
  ): Promise<void> {
    await this.commandBus.execute<UnlinkIdentityCommand, void>(new UnlinkIdentityCommand(user.id, provider));
  }
}
