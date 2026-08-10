import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CommandHandlers } from './commands';
import { EstablishmentMembersController } from './controllers/establishment-members.controller';
import { EstablishmentMembersReadRepository } from './data-access/establishment-members.read.repository';
import { EstablishmentMembersWriteRepository } from './data-access/establishment-members.write.repository';
import { EventHandlers } from './events';
import { QueryHandlers } from './queries';
import { EstablishmentMembersSagas } from './sagas/establishment-members.sagas';

@Module({
  imports: [CqrsModule],
  controllers: [EstablishmentMembersController],
  providers: [
    EstablishmentMembersReadRepository,
    EstablishmentMembersWriteRepository,
    ...CommandHandlers,
    ...QueryHandlers,
    ...EventHandlers,
    EstablishmentMembersSagas,
  ],
})
export class EstablishmentMembersModule {}
