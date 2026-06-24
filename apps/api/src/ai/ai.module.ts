import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CommandHandlers } from './commands';
import { AiController } from './controllers/ai.controller';

@Module({
  imports: [CqrsModule],
  controllers: [AiController],
  providers: [...CommandHandlers],
})
export class AiModule {}
