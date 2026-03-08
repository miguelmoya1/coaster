import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthRepository } from './auth/data-access/auth.repository';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from './auth/guards/optional-jwt-auth.guard';
import { AuthService } from './auth/services/auth.service';
import { JwtStrategy } from './auth/strategies/jwt.strategy';
import { CryptoService } from './crypto/crypto.service';
import { PrismaService } from './prisma/services/prisma.service';

@Global()
@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1d' },
    }),
  ],
  providers: [
    PrismaService,
    CryptoService,
    AuthService,
    AuthRepository,
    JwtStrategy,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
  ],
  exports: [
    PrismaService,
    CryptoService,
    AuthService,
    JwtAuthGuard,
    OptionalJwtAuthGuard,
  ],
})
export class CoreModule {}
