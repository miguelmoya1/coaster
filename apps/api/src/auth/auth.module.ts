import { Global, Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { AccountController } from './account.controller';
import { AuthController } from './auth.controller';
import { AcceptInviteHandler } from './commands/handlers/accept-invite.handler';
import { LoginWithGoogleHandler } from './commands/handlers/login-with-google.handler';
import { LoginWithPasswordHandler } from './commands/handlers/login-with-password.handler';
import { RefreshSessionHandler } from './commands/handlers/refresh-session.handler';
import { RegisterHandler } from './commands/handlers/register.handler';
import { RequestEmailVerificationHandler } from './commands/handlers/request-email-verification.handler';
import { RequestPasswordResetHandler } from './commands/handlers/request-password-reset.handler';
import { ResetPasswordHandler } from './commands/handlers/reset-password.handler';
import { SetPasswordHandler } from './commands/handlers/set-password.handler';
import { UnlinkIdentityHandler } from './commands/handlers/unlink-identity.handler';
import { VerifyEmailHandler } from './commands/handlers/verify-email.handler';
import { AuthIdentityRepository } from './data-access/auth-identity.repository';
import { AuthSessionRepository } from './data-access/auth-session.repository';
import { AuthTokenRepository } from './data-access/auth-token.repository';
import { AuthUserRepository } from './data-access/auth-user.repository';
import { AuthGuard } from './guards/auth.guard';
import { OptionalAuthGuard } from './guards/optional-auth.guard';
import { GetAccountHandler } from './queries/handlers/get-account.handler';
import { GetInviteHandler } from './queries/handlers/get-invite.handler';
import { GoogleTokenService } from './services/google-token.service';
import { SessionService } from './services/session.service';

const CommandHandlers = [
  RegisterHandler,
  LoginWithPasswordHandler,
  LoginWithGoogleHandler,
  RefreshSessionHandler,
  RequestEmailVerificationHandler,
  VerifyEmailHandler,
  RequestPasswordResetHandler,
  ResetPasswordHandler,
  AcceptInviteHandler,
  SetPasswordHandler,
  UnlinkIdentityHandler,
];

const QueryHandlers = [GetInviteHandler, GetAccountHandler];

@Global()
@Module({
  imports: [CqrsModule],
  controllers: [AuthController, AccountController],
  providers: [
    AuthGuard,
    OptionalAuthGuard,
    AuthIdentityRepository,
    AuthSessionRepository,
    AuthTokenRepository,
    AuthUserRepository,
    SessionService,
    GoogleTokenService,
    ...CommandHandlers,
    ...QueryHandlers,
  ],
  exports: [AuthGuard, OptionalAuthGuard, SessionService, AuthTokenRepository],
})
export class AuthModule {}
