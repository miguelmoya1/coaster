import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { BarMembersController } from './controllers/bar-members.controller';
import { BarMembersRepository } from './data-access/bar-members.repository';
import { CommandHandlers } from './commands';
import { QueryHandlers } from './queries';

@Module({
  imports: [CqrsModule],
  controllers: [BarMembersController],
  providers: [BarMembersRepository, ...CommandHandlers, ...QueryHandlers],
})
export class BarMembersModule {}
