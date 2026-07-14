import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CommandHandlers } from './commands';
import { PrinterReadRepository } from './data-access/printer.read.repository';
import { PrinterWriteRepository } from './data-access/printer.write.repository';
import { PrinterConnectionController } from './printer-connection.controller';
import { PrinterController } from './printer.controller';
import { QueryHandlers } from './queries';
import { PrinterTokenService } from './services/printer-token.service';

@Module({
  imports: [CqrsModule],
  controllers: [PrinterController, PrinterConnectionController],
  providers: [PrinterReadRepository, PrinterWriteRepository, PrinterTokenService, ...CommandHandlers, ...QueryHandlers],
})
export class PrinterModule {}
