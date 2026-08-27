import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { FichitRepository } from './data-access/fichit.repository';
import { EventHandlers } from './events';
import { TimeSheetController } from './controllers/time-sheet.controller';
import { FichitApi, FichitSync } from './services';
import { FichitTimeSheet } from './services/fichit-timesheet.service';

@Module({
  imports: [CqrsModule],
  controllers: [TimeSheetController],
  providers: [FichitApi, FichitRepository, FichitSync, FichitTimeSheet, ...EventHandlers],
  exports: [FichitApi, FichitSync, FichitTimeSheet],
})
export class FichitModule {}
