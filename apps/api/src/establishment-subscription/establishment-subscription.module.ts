import { SUBSCRIPTION_REFRESHER } from '@coaster/core';
import { StripeModule } from '@coaster/stripe';
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CommandHandlers } from './commands';
import { EstablishmentSubscriptionControllers } from './controllers';
import { EstablishmentSubscriptionReadRepository, EstablishmentSubscriptionWriteRepository } from './data-access';
import { EventHandlers } from './events';
import { QueryHandlers } from './queries';
import { StripeSubscriptionRefresher } from './services/stripe-subscription-refresher';

@Module({
  imports: [CqrsModule, StripeModule],
  controllers: [...EstablishmentSubscriptionControllers],
  providers: [
    EstablishmentSubscriptionReadRepository,
    EstablishmentSubscriptionWriteRepository,
    ...CommandHandlers,
    ...QueryHandlers,
    ...EventHandlers,
    StripeSubscriptionRefresher,
    { provide: SUBSCRIPTION_REFRESHER, useExisting: StripeSubscriptionRefresher },
  ],
  exports: [EstablishmentSubscriptionReadRepository, EstablishmentSubscriptionWriteRepository, SUBSCRIPTION_REFRESHER],
})
export class EstablishmentSubscriptionModule {}
