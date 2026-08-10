import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CommandHandlers } from './commands';
import { EstablishmentsController } from './controllers/establishments.controller';
import { EstablishmentReadRepository } from './data-access/establishment.read.repository';
import { EstablishmentWriteRepository } from './data-access/establishment.write.repository';
import { QueryHandlers } from './queries';

@Module({
  imports: [CqrsModule],
  controllers: [EstablishmentsController],
  providers: [EstablishmentReadRepository, EstablishmentWriteRepository, ...CommandHandlers, ...QueryHandlers],
})
export class EstablishmentsModule {}
