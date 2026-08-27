import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { FichitRepository } from './data-access/fichit.repository';
import { EventHandlers } from './events';
import { TimeSheetController } from './controllers/time-sheet.controller';
import { FichitApi, FichitSync } from './services';
import { FichitSettings } from './services/fichit-settings.service';
import { FichitTimeSheet } from './services/fichit-timesheet.service';

@Module({
  imports: [CqrsModule],
  controllers: [TimeSheetController],
  providers: [FichitApi, FichitRepository, FichitSettings, FichitSync, FichitTimeSheet, ...EventHandlers],
  exports: [FichitApi, FichitSettings, FichitSync, FichitTimeSheet],
})
export class FichitModule {}
