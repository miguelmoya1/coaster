import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CommandHandlers } from './commands';
import { TemplatesController } from './controllers/templates.controller';
import { TemplatesReadRepository } from './data-access/templates.read.repository';
import { TemplatesWriteRepository } from './data-access/templates.write.repository';
import { QueryHandlers } from './queries';

@Module({
  imports: [CqrsModule],
  controllers: [TemplatesController],
  providers: [TemplatesReadRepository, TemplatesWriteRepository, ...CommandHandlers, ...QueryHandlers],
})
export class TemplatesModule {}
