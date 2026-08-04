import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CommandHandlers } from './commands';
import { BarSubscriptionReadRepository, BarSubscriptionWriteRepository } from './data-access';
import { EventHandlers } from './events';
import { QueryHandlers } from './queries';
import { BarSubscriptionSagas } from './sagas';

@Module({
  imports: [CqrsModule],
  providers: [
    BarSubscriptionReadRepository,
    BarSubscriptionWriteRepository,
    ...CommandHandlers,
    ...QueryHandlers,
    ...EventHandlers,
    ...BarSubscriptionSagas,
  ],
  exports: [BarSubscriptionReadRepository, BarSubscriptionWriteRepository],
})
export class BarSubscriptionModule {}
