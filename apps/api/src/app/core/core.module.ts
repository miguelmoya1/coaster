import { Global, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { FirebaseAuthGuard } from './auth/guards/firebase-auth.guard';
import { OptionalFirebaseAuthGuard } from './auth/guards/optional-firebase-auth.guard';
import { GoogleOAuthService } from './auth/services/google-oauth.service';
import { JwtStrategy } from './auth/strategies/jwt.strategy';
import { PrismaService } from './prisma/services/prisma.service';

@Global()
@Module({
  imports: [PassportModule],
  providers: [
    PrismaService,
    GoogleOAuthService,
    JwtStrategy,
    FirebaseAuthGuard,
    OptionalFirebaseAuthGuard,
  ],
  exports: [PrismaService, FirebaseAuthGuard, OptionalFirebaseAuthGuard],
})
export class CoreModule {}
