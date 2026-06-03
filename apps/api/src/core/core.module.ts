import { Global, Module } from '@nestjs/common';
import { EmailService } from './email/email.service';
import { PrismaService } from './prisma/services/prisma.service';
import { BarGateway } from './websockets/bar.gateway';

@Global()
@Module({
  imports: [],
  providers: [PrismaService, EmailService, BarGateway],
  exports: [PrismaService, EmailService, BarGateway],
})
export class CoreModule {}
