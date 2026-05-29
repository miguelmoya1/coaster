import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CommandHandlers } from './commands';
import { TemplatesController } from './controllers/templates.controller';
import { TemplatesRepository } from './data-access/templates.repository';
import { QueryHandlers } from './queries';

@Module({
  imports: [CqrsModule],
  controllers: [TemplatesController],
  providers: [TemplatesRepository, ...CommandHandlers, ...QueryHandlers],
})
export class TemplatesModule {}
