import { Global, Module } from '@nestjs/common';
import { CryptoService } from './crypto/crypto.service';
import { PrismaService } from './prisma/services/prisma.service';

@Global()
@Module({
  providers: [PrismaService, CryptoService],
  exports: [PrismaService],
})
export class CoreModule {}
