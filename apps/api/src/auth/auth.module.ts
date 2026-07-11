import { Global, Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { SyncUserHandler } from './commands/handlers/sync-user.handler';
import { FirebaseAuthGuard } from './guards/firebase-auth.guard';
import { OptionalFirebaseAuthGuard } from './guards/optional-firebase-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';

const CommandHandlers = [SyncUserHandler];

@Global()
@Module({
  imports: [PassportModule, CqrsModule],
  controllers: [AuthController],
  providers: [JwtStrategy, FirebaseAuthGuard, OptionalFirebaseAuthGuard, ...CommandHandlers],
  exports: [FirebaseAuthGuard, OptionalFirebaseAuthGuard],
})
export class AuthModule {}
