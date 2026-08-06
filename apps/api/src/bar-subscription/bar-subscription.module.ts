import { StripeModule } from '@coaster/stripe';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CommandHandlers } from './commands';
import { BarSubscriptionControllers } from './controllers';
import { BarSubscriptionReadRepository, BarSubscriptionWriteRepository } from './data-access';
import { EventHandlers } from './events';
import { QueryHandlers } from './queries';
import { WebhookConsumers } from './consumers';

@Module({
  imports: [CqrsModule, StripeModule],
  controllers: [...BarSubscriptionControllers],
  providers: [
    BarSubscriptionReadRepository,
    BarSubscriptionWriteRepository,
    ...CommandHandlers,
    ...QueryHandlers,
    ...EventHandlers,
    ...WebhookConsumers,
  ],
  exports: [BarSubscriptionReadRepository, BarSubscriptionWriteRepository],
})
export class BarSubscriptionModule {}
