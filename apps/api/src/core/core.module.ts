import { Global, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { FirebaseAuthGuard } from './auth/guards/firebase-auth.guard';
import { OptionalFirebaseAuthGuard } from './auth/guards/optional-firebase-auth.guard';
import { JwtStrategy } from './auth/strategies/jwt.strategy';
import { EmailService } from './email/email.service';
import { PrismaService } from './prisma/services/prisma.service';
import { BarGateway } from './websockets/bar.gateway';

@Global()
@Module({
  imports: [PassportModule],
  providers: [PrismaService, JwtStrategy, FirebaseAuthGuard, OptionalFirebaseAuthGuard, EmailService, BarGateway],
  exports: [PrismaService, FirebaseAuthGuard, OptionalFirebaseAuthGuard, EmailService, BarGateway],
})
export class CoreModule {}
