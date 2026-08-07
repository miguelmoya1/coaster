import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CommandHandlers } from './commands';
import { AiControllers } from './controllers';

@Module({
  imports: [CqrsModule],
  controllers: [...AiControllers],
  providers: [...CommandHandlers],
})
export class AiModule {}
