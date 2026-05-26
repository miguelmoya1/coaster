import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { CommandHandlers } from './commands';
import { BarMembersController } from './controllers/bar-members.controller';
import { BarMembersRepository } from './data-access/bar-members.repository';
import { EventHandlers } from './events';
import { QueryHandlers } from './queries';

@Module({
  imports: [CqrsModule],
  controllers: [BarMembersController],
  providers: [BarMembersRepository, ...CommandHandlers, ...QueryHandlers, ...EventHandlers],
})
export class BarMembersModule {}
