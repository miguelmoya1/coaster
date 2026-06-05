import { Global, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { FirebaseAuthGuard } from './guards/firebase-auth.guard';
import { OptionalFirebaseAuthGuard } from './guards/optional-firebase-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';

@Global()
@Module({
  imports: [PassportModule],
  providers: [JwtStrategy, FirebaseAuthGuard, OptionalFirebaseAuthGuard],
  exports: [FirebaseAuthGuard, OptionalFirebaseAuthGuard],
})
export class AuthModule {}
