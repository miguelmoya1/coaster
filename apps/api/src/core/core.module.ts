import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma/services/prisma.service';

@Global()
@Module({
  imports: [],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class CoreModule {}
