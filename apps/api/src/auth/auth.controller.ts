import type { AuthSession, User } from '@coaster/common';
import { ACCESS_TOKEN_TTL_SECONDS } from '@coaster/core';
import { Body, Controller, Get, HttpCode, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle, seconds } from '@nestjs/throttler';
import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  AcceptInviteCommand,
  LoginWithGoogleCommand,
  LoginWithPasswordCommand,
  RefreshSessionCommand,
  RegisterCommand,
  RequestPasswordResetCommand,
  ResetPasswordCommand,
  VerifyEmailCommand,
} from './commands';
import { CurrentUser } from './decorators/current-user.decorator';
import { REFRESH_COOKIE_NAME, REFRESH_COOKIE_PATH } from './domain/session';
import { EmailDto } from './dto/email.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { TokenDto } from './dto/token.dto';
import { TokenWithPasswordDto } from './dto/token-with-password.dto';
import { GetInviteQuery } from './queries';
import type { InviteSummary } from './queries/handlers/get-invite.handler';
import { AuthGuard } from './guards/auth.guard';
import { IssuedSession, SessionOrigin, SessionService } from './services/session.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  readonly #secure: boolean;

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly sessions: SessionService,
    config: ConfigService,
  ) {
    this.#secure = config.get<string>('NODE_ENV') === 'production';
  }

  @Post('register')
  @HttpCode(201)
  @Throttle({ default: { ttl: seconds(60), limit: 10 } })
  @ApiOperation({ summary: 'Opens an account with an email and a password' })
  @ApiResponse({ status: 201, description: 'Account created and signed in' })
  @ApiResponse({ status: 409, description: 'The email already has an account' })
  async register(
    @Body() dto: RegisterDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthSession> {
    const issued = await this.commandBus.execute<RegisterCommand, IssuedSession>(
      new RegisterCommand(dto.email, dto.password, dto.name, dto.language, this.#origin(request)),
    );

    return this.#respond(reply, issued);
  }

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { ttl: seconds(60), limit: 10 } })
  @ApiOperation({ summary: 'Signs in with an email and a password' })
  @ApiResponse({ status: 200, description: 'Signed in' })
  @ApiResponse({ status: 401, description: 'Wrong email or password' })
  async login(
    @Body() dto: LoginDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthSession> {
    const issued = await this.commandBus.execute<LoginWithPasswordCommand, IssuedSession>(
      new LoginWithPasswordCommand(dto.email, dto.password, this.#origin(request)),
    );

    return this.#respond(reply, issued);
  }

  @Post('google')
  @HttpCode(200)
  @Throttle({ default: { ttl: seconds(60), limit: 10 } })
  @ApiOperation({ summary: 'Signs in with a Google identity token' })
  @ApiResponse({ status: 200, description: 'Signed in, linking or opening the account as needed' })
  @ApiResponse({ status: 401, description: 'Google did not vouch for this token' })
  async google(
    @Body() dto: GoogleLoginDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthSession> {
    const issued = await this.commandBus.execute<LoginWithGoogleCommand, IssuedSession>(
      new LoginWithGoogleCommand(dto.credential, this.#origin(request)),
    );

    return this.#respond(reply, issued);
  }

  @Post('refresh')
  @HttpCode(200)
  @Throttle({ default: { ttl: seconds(60), limit: 60 } })
  @ApiOperation({ summary: 'Trades the session cookie for a fresh access token' })
  @ApiResponse({ status: 200, description: 'A new access token, and the cookie rotated' })
  @ApiResponse({ status: 401, description: 'No session, or one that is no longer valid' })
  async refresh(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthSession> {
    const issued = await this.commandBus.execute<RefreshSessionCommand, IssuedSession>(
      new RefreshSessionCommand(request.cookies?.[REFRESH_COOKIE_NAME], this.#origin(request)),
    );

    return this.#respond(reply, issued);
  }

  @Post('forgot-password')
  @HttpCode(204)
  @Throttle({ default: { ttl: seconds(60), limit: 5 } })
  @ApiOperation({ summary: 'Emails a link to choose a new password' })
  @ApiResponse({ status: 204, description: 'Answered the same way whether or not the address has an account' })
  async forgotPassword(@Body() dto: EmailDto): Promise<void> {
    await this.commandBus.execute<RequestPasswordResetCommand, void>(new RequestPasswordResetCommand(dto.email));
  }

  @Post('reset-password')
  @HttpCode(200)
  @Throttle({ default: { ttl: seconds(60), limit: 10 } })
  @ApiOperation({ summary: 'Sets a new password from an emailed link and signs in' })
  @ApiResponse({ status: 200, description: 'Password changed, every other session closed' })
  @ApiResponse({ status: 400, description: 'The link has expired or was used already' })
  async resetPassword(
    @Body() dto: TokenWithPasswordDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthSession> {
    const issued = await this.commandBus.execute<ResetPasswordCommand, IssuedSession>(
      new ResetPasswordCommand(dto.token, dto.password, this.#origin(request)),
    );

    return this.#respond(reply, issued);
  }

  @Post('verify-email')
  @HttpCode(204)
  @Throttle({ default: { ttl: seconds(60), limit: 10 } })
  @ApiOperation({ summary: 'Confirms an address from an emailed link' })
  @ApiResponse({ status: 204, description: 'Address confirmed' })
  @ApiResponse({ status: 400, description: 'The link has expired or was used already' })
  async verifyEmail(@Body() dto: TokenDto): Promise<void> {
    await this.commandBus.execute<VerifyEmailCommand, void>(new VerifyEmailCommand(dto.token));
  }

  @Get('invite/:token')
  @Throttle({ default: { ttl: seconds(60), limit: 20 } })
  @ApiOperation({ summary: 'Tells the invitation page who the invitation is for' })
  @ApiResponse({ status: 200, description: 'Whose invitation it is, and whether they can already sign in' })
  @ApiResponse({ status: 400, description: 'The invitation has expired or was used already' })
  async invite(@Param('token') token: string): Promise<InviteSummary> {
    return this.queryBus.execute<GetInviteQuery, InviteSummary>(new GetInviteQuery(token));
  }

  @Post('invite')
  @HttpCode(200)
  @Throttle({ default: { ttl: seconds(60), limit: 10 } })
  @ApiOperation({ summary: 'Claims an invitation with a password and signs in' })
  @ApiResponse({ status: 200, description: 'Invitation claimed' })
  @ApiResponse({ status: 400, description: 'The invitation has expired, was used already, or is not claimable' })
  async acceptInvite(
    @Body() dto: TokenWithPasswordDto,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<AuthSession> {
    const issued = await this.commandBus.execute<AcceptInviteCommand, IssuedSession>(
      new AcceptInviteCommand(dto.token, dto.password, this.#origin(request)),
    );

    return this.#respond(reply, issued);
  }

  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'Ends this session' })
  @ApiResponse({ status: 204, description: 'Session ended and cookie cleared' })
  async logout(@Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply): Promise<void> {
    await this.sessions.revoke(request.cookies?.[REFRESH_COOKIE_NAME]);

    reply.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
  }

  @Post('logout-everywhere')
  @HttpCode(204)
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Ends every session this user has open, on every device' })
  @ApiResponse({ status: 204, description: 'Every session ended' })
  async logoutEverywhere(@CurrentUser() user: User, @Res({ passthrough: true }) reply: FastifyReply): Promise<void> {
    await this.sessions.revokeEverySessionOf(user.id);

    reply.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
  }

  #origin(request: FastifyRequest): SessionOrigin {
    return { userAgent: request.headers['user-agent'], ip: request.ip };
  }

  #respond(reply: FastifyReply, issued: IssuedSession): AuthSession {
    reply.setCookie(REFRESH_COOKIE_NAME, issued.refreshToken, {
      httpOnly: true,
      secure: this.#secure,
      sameSite: 'lax',
      path: REFRESH_COOKIE_PATH,
      expires: issued.refreshExpiresAt,
    });

    return { user: issued.user, accessToken: issued.accessToken, expiresIn: ACCESS_TOKEN_TTL_SECONDS };
  }
}
