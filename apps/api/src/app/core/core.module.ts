import { Global, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from './auth/guards/optional-jwt-auth.guard';
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
    JwtAuthGuard,
    OptionalJwtAuthGuard,
  ],
  exports: [PrismaService, JwtAuthGuard, OptionalJwtAuthGuard],
})
export class CoreModule {}
