import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CommandHandlers } from './commands';
import { AiUsageRepository } from './data-access/ai-usage.repository';
import { QueryHandlers } from './queries';
import { AiControllers } from './controllers';

@Module({
  imports: [CqrsModule],
  controllers: [...AiControllers],
  providers: [AiUsageRepository, ...CommandHandlers, ...QueryHandlers],
})
export class AiModule {}
