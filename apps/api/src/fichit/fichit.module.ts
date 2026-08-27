import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { FichitRepository } from './data-access/fichit.repository';
import { ClockingMovedGuard } from './guards/clocking-moved.guard';
import { EventHandlers } from './events';
import { FichitApi, FichitSync } from './services';

@Module({
  imports: [CqrsModule],
  providers: [FichitApi, FichitRepository, FichitSync, ClockingMovedGuard, ...EventHandlers],
  exports: [FichitApi, FichitSync, ClockingMovedGuard],
})
export class FichitModule {}
