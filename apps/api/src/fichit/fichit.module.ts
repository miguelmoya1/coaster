import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { FichitRepository } from './data-access/fichit.repository';
import { EventHandlers } from './events';
import { FichitApi, FichitSync } from './services';

@Module({
  imports: [CqrsModule],
  providers: [FichitApi, FichitRepository, FichitSync, ...EventHandlers],
  exports: [FichitApi, FichitSync],
})
export class FichitModule {}
