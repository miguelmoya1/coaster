import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CommandHandlers } from './commands';
import { BarMembersController } from './controllers/bar-members.controller';
import { BarMembersReadRepository } from './data-access/bar-members.read.repository';
import { BarMembersWriteRepository } from './data-access/bar-members.write.repository';
import { EventHandlers } from './events';
import { QueryHandlers } from './queries';
import { BarMembersSagas } from './sagas/bar-members.sagas';

@Module({
  imports: [CqrsModule],
  controllers: [BarMembersController],
  providers: [
    BarMembersReadRepository,
    BarMembersWriteRepository,
    ...CommandHandlers,
    ...QueryHandlers,
    ...EventHandlers,
    BarMembersSagas,
  ],
})
export class BarMembersModule {}
