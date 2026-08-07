import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CommandHandlers } from './commands';
import { PrintJobRepository } from './data-access/print-job.repository';
import { PrinterReadRepository } from './data-access/printer.read.repository';
import { PrinterWriteRepository } from './data-access/printer.write.repository';
import { PrinterConnectionController } from './printer-connection.controller';
import { PrinterController } from './printer.controller';
import { QueryHandlers } from './queries';
import { DeviceKeyService } from './services/device-key.service';
import { PrinterReleaseService } from './services/printer-release.service';
import { PrinterTokenService } from './services/printer-token.service';

@Module({
  imports: [CqrsModule],
  controllers: [PrinterController, PrinterConnectionController],
  providers: [
    PrinterReadRepository,
    PrinterWriteRepository,
    PrintJobRepository,
    PrinterTokenService,
    PrinterReleaseService,
    DeviceKeyService,
    ...CommandHandlers,
    ...QueryHandlers,
  ],
})
export class PrinterModule {}
